import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as chaiSubset from 'chai-subset';
import { readFile } from 'fs/promises';
import { readFileSync } from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as _ from 'lodash';

import { TemplateUtils } from '../src/utils/template';
import { VLabContext } from '../src/model/VLabContext';
const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(chaiSubset);

let templateUtils: TemplateUtils;
let context: VLabContext;

describe("Template", function () {
    before(() => {
        templateUtils = new TemplateUtils();
        let contextString = readFileSync(path.join(__dirname, './configs/context_full_example.test.json'), 'utf-8');
        context = JSON.parse(contextString) as VLabContext;
    })

    it("application template", async () => {
        let readControllerConfigTemplateFunc = async () => {
            return await readFile(path.join(__dirname, './templates/application.json.test.art'), 'utf-8');
        }
        let readLabSpecTemplateFunc = async (templateName: string) => {
            return await readFile(path.join(__dirname, `./templates/specs/${templateName}.test.art`), 'utf-8');
        }
        let templateObject = await templateUtils.renderControllerApplicationConfig(readControllerConfigTemplateFunc, readLabSpecTemplateFunc, context);
        let yaml = templateUtils.dumpYAML(templateObject);
    });

    it("controller: deployment template", () => {
        let deploymentTemplate = readFileSync(path.join(__dirname, './templates/controller/deployment.test.art'), 'utf-8');
        let output = templateUtils.renderAnyTemplate(deploymentTemplate, context);
        let templateObject = JSON.parse(output);
        // console.log(util.inspect(templateObject, false, null, true));
    });

    it("controller: service template", () => {
        let serviceTemplate = readFileSync(path.join(__dirname, './templates/controller/service.test.art'), 'utf-8');
        let output = templateUtils.renderAnyTemplate(serviceTemplate, context);
        let templateObject = JSON.parse(output);
    });

    it("controller: portal ingress template", () => {
        let ingressTemplate = readFileSync(path.join(__dirname, './templates/controller/ingress_portal.test.art'), 'utf-8');
        let output = templateUtils.renderAnyTemplate(ingressTemplate, context);
        let templateObject = JSON.parse(output);
    });

    it("controller: wildcard ingress template", () => {
        let ingressTemplate = readFileSync(path.join(__dirname, './templates/controller/ingress_wildcard.test.art'), 'utf-8');
        let output = templateUtils.renderAnyTemplate(ingressTemplate, context);
        let templateObject = JSON.parse(output);
    });

    it("configset: pvc template", () => {
        let configsetTemplate = readFileSync(path.join(__dirname, './templates/configset/pvc.test.art'), 'utf-8');
        let output = templateUtils.renderAnyTemplate(configsetTemplate, context);
        let templateObject = JSON.parse(output);
    });

    it("configset: statefulset template", () => {
        let configsetTemplate = readFileSync(path.join(__dirname, './templates/configset/statefulset.test.art'), 'utf-8');
        let output = templateUtils.renderAnyTemplate(configsetTemplate, context);
        let templateObject = JSON.parse(output);
    });

    it("user resources: pvc template", () => {
        let pvcTemplate = readFileSync(path.join(__dirname, './templates/userResources/pvc.test.art'), 'utf-8')
        let output = templateUtils.renderAnyTemplate(pvcTemplate, context);
        let templateObject = JSON.parse(output);
    })

    it("user resources: ingress network policy template", () => {
        let ingressTempalte = readFileSync(path.join(__dirname, './templates/userResources/ingress_network_policy.test.art'), 'utf-8')
        let output = templateUtils.renderAnyTemplate(ingressTempalte, context);
        let templateObject = JSON.parse(output);
    })

    it("user resources: egress network policy template", () => {
        let egressTempalte = readFileSync(path.join(__dirname, './templates/userResources/egress_network_policy.test.art'), 'utf-8')
        let output = templateUtils.renderAnyTemplate(egressTempalte, context);
        let templateObject = JSON.parse(output);
    })

    it("user resources: traffic in namespace network policy template", () => {
        let ingressTempalte = readFileSync(path.join(__dirname, './templates/userResources/namespace_network_policy.test.art'), 'utf-8')
        let output = templateUtils.renderAnyTemplate(ingressTempalte, context);
        let templateObject = JSON.parse(output);
    })
})