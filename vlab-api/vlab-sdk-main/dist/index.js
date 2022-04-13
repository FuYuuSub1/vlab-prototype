"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VLabSDK = void 0;
const keycloak_1 = require("./utils/keycloak");
const template_1 = require("./utils/template");
const kubernetes_1 = require("./utils/kubernetes");
const mongodb_1 = require("./utils/mongodb");
const VLabError_1 = require("./model/VLabError");
const fs = require("fs");
const _ = require("lodash");
const tmpfs = require("tmp");
class VLabSDKError extends VLabError_1.VLabError {
    constructor(type, errMsg) {
        super(type, errMsg);
        this.name = VLabSDKError.name;
    }
}
var courseStatus;
(function (courseStatus) {
    courseStatus["DEPLOYED"] = "Deployed";
    courseStatus["DEPLOYING"] = "Deploying";
    courseStatus["INACTIVE"] = "Inactive";
    courseStatus["FAILED"] = "Failed";
})(courseStatus || (courseStatus = {}));
class VLabSDK {
    constructor(secretPath, configPath) {
        this.init = async () => {
            await this.keycloakUtils.connect();
            await this.mongoDBUtils.connect();
        };
        this.close = async () => {
            this.keycloakUtils.close();
            await this.mongoDBUtils.close();
        };
        this.listCourses = async () => {
            const namespace = this.configs.proxy.namespace;
            const deployments = await this.kubernetesUtils.listDeployments(namespace);
            const filteredDeployments = deployments.filter(deployment => deployment.metadata.name.includes("vlab-controller"));
            const courses = filteredDeployments.map(deployments => deployments.metadata.name.split("-", 3)[2]);
            return courses;
        };
        this.readCourseStatus = async (courseId) => {
            var _a, _b;
            const namespace = this.configs.proxy.namespace;
            const pods = await this.kubernetesUtils.listPods(namespace);
            const coursePod = pods.filter(pod => { var _a; return ((_a = pod.metadata.labels) === null || _a === void 0 ? void 0 : _a['vl.comp.polyu.edu.hk/instance']) === courseId; })[0];
            if (_.isEmpty(coursePod)) {
                return courseStatus.INACTIVE;
            }
            if (((_a = coursePod.status) === null || _a === void 0 ? void 0 : _a.phase) === "Running") {
                return courseStatus.DEPLOYED;
            }
            else if (((_b = coursePod.status) === null || _b === void 0 ? void 0 : _b.phase) === "Pending") {
                return courseStatus.DEPLOYING;
            }
            return courseStatus.FAILED;
        };
        this.deployCourse = async (courseConfig, labEnvironments) => {
            const courses = await this.listCourses();
            const courseId = courseConfig.id;
            const tmpFileObj = tmpfs.fileSync();
            if (courses.includes(courseId)) {
                throw new VLabSDKError("Can't deploy course", `${courseId} exists`);
            }
            const context = {
                secrets: this.secrets,
                proxy: this.configs.proxy,
                course: courseConfig,
                labs: labEnvironments
            };
            let readApplicationTemplateFunc = async () => {
                return (await this.mongoDBUtils.readTemplateDoc("Application" /* KUBERNETES_CONTROLLER_APPLICATION_TEMPLATES */, mongodb_1.KubernetesTemplateNames.APPLICATION)).content;
            };
            let readLabTemplateFunc = async (templateName) => {
                var _a;
                return (_a = (await this.mongoDBUtils.readTemplateDoc("LabTemplates" /* LAB_TEMPLATES */, templateName))) === null || _a === void 0 ? void 0 : _a.content;
            };
            let applicationYAML = this.templateUtils.dumpYAML(await this.templateUtils.renderControllerApplicationConfig(readApplicationTemplateFunc, readLabTemplateFunc, context));
            fs.writeFileSync(tmpFileObj.fd, applicationYAML);
            await this.kubernetesUtils.copyToPod(this.configs.proxy.namespace, "vlab-controller-configs-0", tmpFileObj.name, `/etc/vlab-controller/config/${courseId}/application.yml`);
            const templateDocs = await this.mongoDBUtils.readAllTemplateDocs("Controller" /* KUBERNETES_CONTROLLER_TEMPLATES */);
            for (let doc of templateDocs) {
                let templateString = doc.content;
                let resourceObj = JSON.parse(this.templateUtils.renderAnyTemplate(templateString, context));
                await this.kubernetesUtils.apply(resourceObj);
            }
            const studentGroup = `${courseId.toLowerCase()}_student`;
            const teachersGroup = `${courseId.toLowerCase()}_teacher`;
            const courseRole = `${courseId.toLowerCase()}`;
            const keycloakClient = this.secrets.keycloak.client;
            await this.keycloakUtils.createGroup(studentGroup);
            await this.keycloakUtils.createGroup(teachersGroup);
            await this.keycloakUtils.createClientRole(courseRole, keycloakClient);
            await this.keycloakUtils.assignClientRoleToGroup(courseRole, "super_admin", keycloakClient);
            await this.keycloakUtils.assignClientRoleToGroup("admins", teachersGroup, keycloakClient);
            await this.keycloakUtils.assignClientRoleToGroup(courseRole, teachersGroup, keycloakClient);
            await this.keycloakUtils.assignClientRoleToGroup(courseRole, studentGroup, keycloakClient);
        };
        this.initKubernetesEnvironment = async () => {
            const context = {
                secrets: this.secrets,
                proxy: this.configs.proxy,
            };
            const templateDocs = await this.mongoDBUtils.readAllTemplateDocs("ConfigSet" /* KUBERNETES_CONFIG_SET_TEMPLATES */);
            for (let doc of templateDocs) {
                let templateString = doc.content;
                let resourceObj = JSON.parse(this.templateUtils.renderAnyTemplate(templateString, context));
                await this.kubernetesUtils.apply(resourceObj);
            }
        };
        this.listLabTemplate = async () => {
            const docs = await this.mongoDBUtils.readAllTemplateDocs("LabTemplates" /* LAB_TEMPLATES */);
            let result = [];
            for (let doc of docs) {
                let content = JSON.parse(doc.content);
                let entryPoints = content.containerSpecs.flatMap((containerSpec) => { var _a; return (_a = containerSpec.entryPoints) !== null && _a !== void 0 ? _a : []; });
                result.push({
                    name: doc.name,
                    applications: entryPoints.map((e) => e['display-name'])
                });
            }
            return result;
        };
        this.secrets = JSON.parse(fs.readFileSync(secretPath, 'utf-8'));
        this.configs = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        this.keycloakUtils = new keycloak_1.KeycloakUtils({
            baseUrl: this.secrets.keycloak.url,
            realmName: this.secrets.keycloak.realm
        }, {
            grantType: "client_credentials",
            clientId: "admin-cli",
            clientSecret: this.secrets.keycloak.adminSecret
        });
        this.templateUtils = new template_1.TemplateUtils();
        this.kubernetesUtils = new kubernetes_1.KubernetesUtils();
        const host = this.secrets.mongodb.host;
        const port = this.secrets.mongodb.port;
        const username = this.secrets.mongodb.username;
        const password = this.secrets.mongodb.password;
        const database = this.secrets.mongodb.database;
        this.mongoDBUtils = new mongodb_1.MongoDBUtils(host, port, username, password, database);
    }
}
exports.VLabSDK = VLabSDK;
