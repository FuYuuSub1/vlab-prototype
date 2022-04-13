import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as chaiSubset from 'chai-subset';
import { MongoDBUtils, TemplateCollections, KubernetesTemplateNames } from '../src/utils/mongodb'
import * as secrets from './configs/secrets.test.json'
import { readFileSync } from 'fs';
import * as path from 'path';

let mongoDBUtils: MongoDBUtils
const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(chaiSubset);

describe("MongoDB", function () {
    before(async () => {
        const host = secrets.mongodb.host;
        const port = secrets.mongodb.port;
        const username = secrets.mongodb.username;
        const password = secrets.mongodb.password;
        const database = secrets.mongodb.database;
        mongoDBUtils = new MongoDBUtils(host, port, username, password, database);
        await mongoDBUtils.connect();
    });

    after(async () => {
        await mongoDBUtils.close();
    })

    it("upsert mysql LabTemplates", async () => {
        const templateString = readFileSync(path.join(__dirname, './templates/specs/mysql.test.art'), 'utf-8');
        const name = "mysql";
        const doc = await mongoDBUtils.upsertTemplateDoc(TemplateCollections.LAB_TEMPLATES, name, templateString, true);
    })

    it("upsert docker LabTemplates", async () => {
        const templateString = readFileSync(path.join(__dirname, './templates/specs/docker.test.art'), 'utf-8');
        const name = "docker";
        const doc = await mongoDBUtils.upsertTemplateDoc(TemplateCollections.LAB_TEMPLATES, name, templateString, true);
    })

    it("upsert user resource templates", async () => {
        let templateString = readFileSync(path.join(__dirname, './templates/userResources/namespace_network_policy.test.art'), 'utf-8');
        let name = KubernetesTemplateNames.USER_RESOURCES.NETWORK_POLICY_IN_NAMESPACE;
        await mongoDBUtils.upsertTemplateDoc(TemplateCollections.KUBERNETES_USER_RESOURCES_TEMPLATES, name, templateString);
        templateString = readFileSync(path.join(__dirname, './templates/userResources/ingress_network_policy.test.art'), 'utf-8');
        name = KubernetesTemplateNames.USER_RESOURCES.NETWORK_POLICY_INGRESS;
        await mongoDBUtils.upsertTemplateDoc(TemplateCollections.KUBERNETES_USER_RESOURCES_TEMPLATES, name, templateString);
        templateString = readFileSync(path.join(__dirname, './templates/userResources/egress_network_policy.test.art'), 'utf-8');
        name = KubernetesTemplateNames.USER_RESOURCES.NETWORK_POLICY_EGRESS;
        await mongoDBUtils.upsertTemplateDoc(TemplateCollections.KUBERNETES_USER_RESOURCES_TEMPLATES, name, templateString);
        templateString = readFileSync(path.join(__dirname, './templates/userResources/pvc.test.art'), 'utf-8');
        name = KubernetesTemplateNames.USER_RESOURCES.PVC;
        await mongoDBUtils.upsertTemplateDoc(TemplateCollections.KUBERNETES_USER_RESOURCES_TEMPLATES, name, templateString);
    })

    it("upsert controller templates", async () => {
        let templateString = readFileSync(path.join(__dirname, './templates/controller/deployment.test.art'), 'utf-8');
        let name = KubernetesTemplateNames.CONTROLLER.DEPLOYMENT;
        await mongoDBUtils.upsertTemplateDoc(TemplateCollections.KUBERNETES_CONTROLLER_TEMPLATES, name, templateString);
        templateString = readFileSync(path.join(__dirname, './templates/controller/ingress_portal.test.art'), 'utf-8');
        name = KubernetesTemplateNames.CONTROLLER.INGRESS_PORTAL;
        await mongoDBUtils.upsertTemplateDoc(TemplateCollections.KUBERNETES_CONTROLLER_TEMPLATES, name, templateString);
        templateString = readFileSync(path.join(__dirname, './templates/controller/ingress_wildcard.test.art'), 'utf-8');
        name = KubernetesTemplateNames.CONTROLLER.INGRESS_WILDCARD;
        await mongoDBUtils.upsertTemplateDoc(TemplateCollections.KUBERNETES_CONTROLLER_TEMPLATES, name, templateString);
        templateString = readFileSync(path.join(__dirname, './templates/controller/service.test.art'), 'utf-8');
        name = KubernetesTemplateNames.CONTROLLER.SERVICE;
        await mongoDBUtils.upsertTemplateDoc(TemplateCollections.KUBERNETES_CONTROLLER_TEMPLATES, name, templateString);
    })

    it("upsert configset templates", async () => {
        let templateString = readFileSync(path.join(__dirname, './templates/configset/pvc.test.art'), 'utf-8');
        let name = KubernetesTemplateNames.CONFIG_SET.PVC;
        await mongoDBUtils.upsertTemplateDoc(TemplateCollections.KUBERNETES_CONFIG_SET_TEMPLATES, name, templateString);
        templateString = readFileSync(path.join(__dirname, './templates/configset/statefulset.test.art'), 'utf-8');
        name = KubernetesTemplateNames.CONFIG_SET.STATEFUL_SET;
        await mongoDBUtils.upsertTemplateDoc(TemplateCollections.KUBERNETES_CONFIG_SET_TEMPLATES, name, templateString);
    })

    it("upsert application template", async () => {
        let templateString = readFileSync(path.join(__dirname, './templates/application.json.test.art'), 'utf-8');
        let name = KubernetesTemplateNames.APPLICATION;
        await mongoDBUtils.upsertTemplateDoc(TemplateCollections.KUBERNETES_CONTROLLER_APPLICATION_TEMPLATES, name, templateString);
    })

    it("read LabTemplate", async () => {
        const name = "mysql";
        const doc = await mongoDBUtils.readTemplateDoc(TemplateCollections.LAB_TEMPLATES, name);
    })

    // it ("drop LabTemplate", async () => {
    //     await mongoDBUtils.dropTemplateDoc(TemplateCollections.LAB_TEMPLATES, "mysql");
    //     const labTemplates = await mongoDBUtils.readAllTemplateDocs(TemplateCollections.LAB_TEMPLATES);
    //     expect(labTemplates).not.have.deep.property("name", "mysql");
    // })
});