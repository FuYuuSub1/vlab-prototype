import { VLabConfigs } from "./model/VLabConfigs";
import { CourseConfig, LabEnvironment, Secrets, VLabContext } from "./model/VLabContext";
import { KeycloakUtils } from "./utils/keycloak";
import { TemplateUtils } from "./utils/template";
import { KubernetesUtils, quantityToScalar } from "./utils/kubernetes";
import { MongoDBUtils, TemplateCollections, KubernetesTemplateNames } from "./utils/mongodb";
import { VLabError } from "./model/VLabError";
import { LabTemplate } from './model/VLabContext';
import { KubernetesObject, V1ClusterRoleBinding } from "@kubernetes/client-node";
import { VLabUser } from "./model/VLabUser";
import * as fs from 'fs';
import * as _ from 'lodash';
import * as tmpfs from 'tmp';

const SUPER_ADMIN_GROUP = "super_admin";
const TEACHER_CLIENT_ROLE = "admins";

class VLabSDKError extends VLabError {
    constructor(type: string, errMsg: string) {
        super(type, errMsg);
        this.name = VLabSDKError.name;
    }
}

enum courseStatus {
    DEPLOYED = "Deployed",
    DEPLOYING = "Deploying",
    INACTIVE = "Inactive",
    FAILED = "Failed"
}

export class VLabSDK {
    secrets: Secrets
    configs: VLabConfigs
    keycloakUtils: KeycloakUtils
    templateUtils: TemplateUtils
    kubernetesUtils: KubernetesUtils
    mongoDBUtils: MongoDBUtils
    constructor(secretPath: string, configPath: string) {
        this.secrets = JSON.parse(fs.readFileSync(secretPath, 'utf-8'));
        this.configs = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        this.keycloakUtils = new KeycloakUtils({
            baseUrl: this.secrets.keycloak.url,
            realmName: this.secrets.keycloak.realm
        }, {
            grantType: "client_credentials",
            clientId: "admin-cli",
            clientSecret: this.secrets.keycloak.adminSecret
        });
        this.templateUtils = new TemplateUtils();
        this.kubernetesUtils = new KubernetesUtils();
        const host = this.secrets.mongodb.host;
        const port = this.secrets.mongodb.port;
        const username = this.secrets.mongodb.username;
        const password = this.secrets.mongodb.password;
        const database = this.secrets.mongodb.database;
        this.mongoDBUtils = new MongoDBUtils(host, port, username, password, database);
    }

    init = async () => {
        await this.keycloakUtils.connect();
        await this.mongoDBUtils.connect();
        await this.initKubernetesEnvironment();
    }

    close = async () => {
        this.keycloakUtils.close();
        await this.mongoDBUtils.close();
    }

    listCourses = async () => {
        const namespace = this.configs.proxy.namespace;
        const deployments = await this.kubernetesUtils.listDeployments(namespace);
        const filteredDeployments = deployments.filter(deployment => deployment.metadata!.name!.includes("vlab-controller"));
        const courses = filteredDeployments.map(deployments => deployments.metadata!.name!.split("-", 3)[2]);
        return courses;
    }

    readCourseStatus = async (courseId: string) => {
        const namespace = this.configs.proxy.namespace;
        const pods = await this.kubernetesUtils.listPods(namespace);
        const coursePod = pods.filter(pod => pod.metadata!.labels?.['vl.comp.polyu.edu.hk/instance'] === courseId)[0];
        if (_.isEmpty(coursePod)) {
            return courseStatus.INACTIVE;
        }
        if (coursePod.status?.phase === "Running") {
            return courseStatus.DEPLOYED;
        } else if (coursePod.status?.phase === "Pending") {
            return courseStatus.DEPLOYING;
        }
        return courseStatus.FAILED;
    }

    deployCourse = async (courseConfig: CourseConfig, labEnvironments: LabEnvironment[]) => {
        const courses = await this.listCourses();
        const courseId = courseConfig.id;
        const tmpFileObj = tmpfs.fileSync()
        const context: VLabContext = {
            secrets: this.secrets,
            proxy: this.configs.proxy,
            course: courseConfig,
            labs: labEnvironments
        }
        let upgrade = false;
        if (courses.includes(courseId)) {
            upgrade = true;
        }
        let readApplicationTemplateFunc = async () => {
            return (await this.mongoDBUtils.readTemplateDoc(TemplateCollections.KUBERNETES_CONTROLLER_APPLICATION_TEMPLATES, KubernetesTemplateNames.APPLICATION))!.content;
        }
        let readLabTemplateFunc = async (templateName: string) => {
            return (await this.mongoDBUtils.readTemplateDoc(TemplateCollections.LAB_TEMPLATES, templateName))?.content;
        }
        let applicationYAML = this.templateUtils.dumpYAML(await this.templateUtils.renderControllerApplicationConfig(readApplicationTemplateFunc, readLabTemplateFunc, context));
        fs.writeFileSync(tmpFileObj.fd, applicationYAML);
        await this.kubernetesUtils.copyToPod(this.configs.proxy.namespace, "vlab-controller-configs-0", tmpFileObj.name, `/etc/vlab-controller/config/${courseId}/application.yml`);
        const templateDocs = await this.mongoDBUtils.readAllTemplateDocs(TemplateCollections.KUBERNETES_CONTROLLER_TEMPLATES);
        for (let doc of templateDocs) {
            let templateString = doc.content;
            let resourceObj: KubernetesObject = JSON.parse(this.templateUtils.renderAnyTemplate(templateString, context));
            await this.kubernetesUtils.apply(resourceObj);
        }
        if (!upgrade) {
            const studentGroup = `${courseId.toLowerCase()}_student`;
            const teachersGroup = `${courseId.toLowerCase()}_teacher`;
            const courseRole = `${courseId.toLowerCase()}`
            const keycloakClient = this.secrets.keycloak.client
            await this.keycloakUtils.createGroup(studentGroup);
            await this.keycloakUtils.createGroup(teachersGroup);
            await this.keycloakUtils.createClientRole(courseRole, keycloakClient);
            await this.keycloakUtils.assignClientRoleToGroup(courseRole, SUPER_ADMIN_GROUP, keycloakClient);
            await this.keycloakUtils.assignClientRoleToGroup(TEACHER_CLIENT_ROLE, teachersGroup, keycloakClient);
            await this.keycloakUtils.assignClientRoleToGroup(courseRole, teachersGroup, keycloakClient);
            await this.keycloakUtils.assignClientRoleToGroup(courseRole, studentGroup, keycloakClient);
        }
        return {
            courseId: courseId,
            courseConfig: courseConfig,
            labEnvironments: labEnvironments,
            new: !upgrade
        }
    }

    updateCourse = async (courseConfig: CourseConfig, labEnvironments: LabEnvironment[]) => {
        const courses = await this.listCourses();
        const courseId = courseConfig.id;
        const tmpFileObj = tmpfs.fileSync()
        const context: VLabContext = {
            secrets: this.secrets,
            proxy: this.configs.proxy,
            course: courseConfig,
            labs: labEnvironments
        }
        if (!courses.includes(courseId)) {
            throw new VLabSDKError("Can't update non-existent course", `${courseId}`);
        }
        let readApplicationTemplateFunc = async () => {
            return (await this.mongoDBUtils.readTemplateDoc(TemplateCollections.KUBERNETES_CONTROLLER_APPLICATION_TEMPLATES, KubernetesTemplateNames.APPLICATION))!.content;
        }
        let readLabTemplateFunc = async (templateName: string) => {
            return (await this.mongoDBUtils.readTemplateDoc(TemplateCollections.LAB_TEMPLATES, templateName))?.content;
        }
        let applicationYAML = this.templateUtils.dumpYAML(await this.templateUtils.renderControllerApplicationConfig(readApplicationTemplateFunc, readLabTemplateFunc, context));
        fs.writeFileSync(tmpFileObj.fd, applicationYAML);
        await this.kubernetesUtils.copyToPod(this.configs.proxy.namespace, "vlab-controller-configs-0", tmpFileObj.name, `/etc/vlab-controller/config/${courseId}/application.yml`);
        return {
            courseId: courseId,
            courseConfig: courseConfig,
            labEnvironments: labEnvironments,
            new: false
        }
    }

    undeployCourse = async (courseId: string, deleteUsers?: boolean) => {
        const courses = await this.listCourses();
        if (!courses.includes(courseId)) {
            throw new VLabSDKError("Can't undeploy non-existent course", `${courseId}`);
        }
        const context: VLabContext = {
            secrets: this.secrets,
            proxy: this.configs.proxy,
            course: {
                id: courseId
            }
        }
        const templateDocs = await this.mongoDBUtils.readAllTemplateDocs(TemplateCollections.KUBERNETES_CONTROLLER_TEMPLATES);
        for (let doc of templateDocs) {
            let templateString = doc.content;
            let resourceObj: KubernetesObject = JSON.parse(this.templateUtils.renderAnyTemplate(templateString, context));
            await this.kubernetesUtils.delete(resourceObj);
        }

        const courseRole = `${courseId.toLowerCase()}`;
        const keycloakClient = this.secrets.keycloak.client;
        const studentGroup = `${courseId.toLowerCase()}_student`;
        const teachersGroup = `${courseId.toLowerCase()}_teacher`;
        const students = await this.keycloakUtils.findGroupMembers(studentGroup);
        const teachers = await this.keycloakUtils.findGroupMembers(teachersGroup);

        await this.keycloakUtils.deleteGroupByName(studentGroup);
        await this.keycloakUtils.deleteGroupByName(teachersGroup);
        await this.keycloakUtils.deleteClientRole(courseRole, keycloakClient);

        let deletedStudents: string[] = [];
        let deletedTeachers: string[] = [];

        if (deleteUsers) {
            for (let student of students) {
                let groupCount = (await this.keycloakUtils.listUserGroups(student)).length;
                if (groupCount < 1) {
                    deletedStudents.push(await this.deleteUser(student.username!));
                }
            }
            for (let teacher of teachers) {
                let groupCount = (await this.keycloakUtils.listUserGroups(teacher)).length;
                if (groupCount < 1) {
                    deletedTeachers.push(await this.deleteUser(teacher.username!));
                }
            }
        }

        // TODO: remove NFS folders

        return {
            courseId: courseId,
            deletedUsers: {
                students: deletedStudents,
                teachers: deletedTeachers
            }
        }
    }

    enrollStudent = async () => {}

    unenrollStudent = async () => {}

    /**
     * Users' role should be specified before creating their account
     * which means user can have only one role (student/assistant/teacher/superadmin)
     */
    createUser = async (userinfo: {username: string, email: string, firstName?: string, lastName?: string}, role: "student" | "teacher" | "assistant" | "superadmin", defaultPassword?: string) => {
        let quota = role === "teacher" ? this.configs.courseQuota : 0;
        if (role === "superadmin") {
            quota = Number.MAX_SAFE_INTEGER;
        } else if (role === "teacher") {
            quota = this.configs.courseQuota;
        }
        const userObject: VLabUser = {
            username: userinfo.username,
            email: userinfo.email,
            firstName: userinfo.firstName,
            lastName: userinfo.lastName,
            attributes: { 
                courseQuota: quota, 
                role: role
            }
        }
        const context: VLabContext = {      
            secrets: this.secrets,
            proxy: this.configs.proxy
        }

        const user = await this.keycloakUtils.createUser(userObject, defaultPassword);
        if (role === "superadmin") {
            await this.keycloakUtils.assignUserToGroup(userinfo.username, SUPER_ADMIN_GROUP);
        }

        const templateDocs = await this.mongoDBUtils.readAllTemplateDocs(TemplateCollections.KUBERNETES_USER_RESOURCES_TEMPLATES);
        const namespace = `${this.configs.proxy.userNamespacePrefix}-${userinfo.username}`;
        for (let doc of templateDocs) {
            let templateString = doc.content;
            let resourceObj: KubernetesObject = JSON.parse(this.templateUtils.renderAnyTemplate(templateString, context));
            resourceObj.metadata = resourceObj.metadata || {};
            resourceObj.metadata.namespace = namespace;
            await this.kubernetesUtils.apply(resourceObj);
        }
        return {
            user,
            role
        }
    }

    assignUserToCourse = async (username: string, courseId: string) => {
        const user = await this.keycloakUtils.getUserByName(username);
        const role = user.attributes?.role ?? "student";
        const studentGroup = `${courseId.toLowerCase()}_student`;
        const teacherGroup = `${courseId.toLowerCase()}_teacher`;
        if (role === "student") {
            await this.keycloakUtils.assignUserToGroup(username, studentGroup);
        } else if (role === "teacher" || role === "assistant") {
            await this.keycloakUtils.assignUserToGroup(username, teacherGroup);
        }
        return {
            user,
            courseId,
            role
        }
    }

    removeUserFromCourse = async (username: string, courseId: string) => {
        const user = await this.keycloakUtils.getUserByName(username);
        const studentGroup = `${courseId.toLowerCase()}_student`;
        const teacherGroup = `${courseId.toLowerCase()}_teacher`;
        const groups = (await this.keycloakUtils.listUserGroups(user)).filter(group => group.name === studentGroup || group.name === teacherGroup);
        for (let group of groups) {
            await this.keycloakUtils.removeUserFromGroup(username, group.name!);
        }
        return {
            user,
            courseId
        }
    }

    deleteUser = async (username: string) => {
        await this.keycloakUtils.deleteUserByName(username);
        await this.kubernetesUtils.deleteNamespace(`${this.configs.proxy.userNamespacePrefix ?? 'vlab'}-${username}`);
        return username;
    }

    pruneUsers = async () => {
        const pruneList = await this.keycloakUtils.prune();
        for (let user of pruneList) {
            await this.kubernetesUtils.deleteNamespace(`${this.configs.proxy.userNamespacePrefix ?? 'vlab'}-${user.username}`);
        }
        return pruneList;
    }

    readUserCourseQuota = async (username: string) => {
        const user = await this.keycloakUtils.getUserByName(username);
        return user.attributes?.courseQuota ?? 0;
    }

    readUserStorageQuota = async (username: string) => {
        const namespace = `${this.configs.proxy.userNamespacePrefix}-${username}`;
        const pvcs = await this.kubernetesUtils.listPersistentVolumeClaims(namespace);
        const storagePVCObject = pvcs.filter(pvc => pvc.metadata?.name === "user-data")[0];
        return storagePVCObject.status!.capacity!.storage;
    }

    increaseUserStorageQuota = async (username: string, newQuotaQuantity: string) => {
        const newQuotaScala = quantityToScalar(newQuotaQuantity);
        const namespace = `${this.configs.proxy.userNamespacePrefix}-${username}`;
        const pvcs = await this.kubernetesUtils.listPersistentVolumeClaims(namespace);
        const storagePVCObject = pvcs.filter(pvc => pvc.metadata?.name === "user-data")[0];
        const oldQuotaQuantity = storagePVCObject.status!.capacity!.storage;
        const oldQuotaScala = quantityToScalar(oldQuotaQuantity);
        if (oldQuotaScala > newQuotaScala) {
            throw new VLabSDKError("Can't decrease user's storage quota", `${oldQuotaQuantity} -> ${newQuotaQuantity}`);
        }
        storagePVCObject.spec!.resources!.requests!.storage = newQuotaQuantity;
        await this.kubernetesUtils.apply(storagePVCObject);
        return {
            username: username,
            oldQuota: oldQuotaQuantity,
            newQuota: newQuotaQuantity
        }
    }

    initKubernetesEnvironment = async () => {
        const context: VLabContext = {
            secrets: this.secrets,
            proxy: this.configs.proxy,
        }
        await this.kubernetesUtils.createNamespace(this.configs.proxy.namespace);
        const roleBinding: V1ClusterRoleBinding = {
            apiVersion: "rbac.authorization.k8s.io/v1",
            kind: "ClusterRoleBinding",
            metadata: {
                name: "portal-auth"
            },
            roleRef: {
                apiGroup: "rbac.authorization.k8s.io",
                kind: "ClusterRole",
                name: "cluster-admin"
            },
            subjects: [
                {
                    kind: "ServiceAccount",
                    name: "default",
                    namespace: this.configs.proxy.namespace
                }
            ]
        }
        await this.kubernetesUtils.apply(roleBinding);
        const templateDocs = await this.mongoDBUtils.readAllTemplateDocs(TemplateCollections.KUBERNETES_CONFIG_SET_TEMPLATES)
        for (let doc of templateDocs) {
            let templateString = doc.content;
            let resourceObj = JSON.parse(this.templateUtils.renderAnyTemplate(templateString, context));
            await this.kubernetesUtils.apply(resourceObj);
        }
    }

    listLabTemplate = async () => {
        const docs = await this.mongoDBUtils.readAllTemplateDocs(TemplateCollections.LAB_TEMPLATES);
        let result: LabTemplate[] = []
        for (let doc of docs) {
            let content = JSON.parse(doc.content);
            let entryPoints = content.containerSpecs.flatMap((containerSpec: { entryPoints?: any; }) => containerSpec.entryPoints ?? [])
            result.push({
                name: doc.name,
                applications: entryPoints.map((e: { 'display-name': string }) => e['display-name'])
            })
        }
        return result;
    }
}