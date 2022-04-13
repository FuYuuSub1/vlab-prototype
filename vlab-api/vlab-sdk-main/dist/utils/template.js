"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateUtils = void 0;
const template = require("art-template");
const _ = require("lodash");
const yaml = require("js-yaml");
function upper(value) {
    return value.toUpperCase();
}
function lower(value) {
    return value.toLowerCase();
}
class TemplateUtils {
    constructor() {
        this.renderAnyTemplate = (templateString, context) => {
            return template.render(templateString, context);
        };
        this.renderLabTemplates = async (readLabTemplateFunc, vlabContext) => {
            let environment = _.omit(vlabContext, 'labs');
            let labList = _.result(vlabContext, 'labs', []);
            let result = [];
            for (let lab of labList) {
                let specTemplate = await readLabTemplateFunc(lab.template);
                let labContext = _.merge(lab, environment);
                let output = template.render(specTemplate, labContext);
                let templateObject = JSON.parse(output);
                if (!_.isEmpty(lab.applications)) {
                    for (let containerSpec of templateObject.containerSpecs) {
                        if (!_.isEmpty(containerSpec.entryPoints)) {
                            containerSpec.entryPoints = _.filter(containerSpec.entryPoints, (p) => {
                                return _.includes(lab.applications, p["display-name"]);
                            });
                        }
                    }
                }
                if (lab.invisible) {
                    templateObject["access-groups"] = "admins";
                }
                result.push(templateObject);
            }
            return result;
        };
        this.renderControllerApplicationConfig = async (readControllerConfigTemplateFunc, readLabSpecTemplateFunc, vlabContext) => {
            let configTemplateString = await readControllerConfigTemplateFunc();
            let configObject = JSON.parse(template.render(configTemplateString, vlabContext));
            configObject.proxy.specs = await this.renderLabTemplates(readLabSpecTemplateFunc, vlabContext);
            return configObject;
        };
        this.dumpYAML = (sourceObj) => {
            return yaml.dump(sourceObj, {
                noArrayIndent: true,
                lineWidth: -1,
                quotingType: '"'
            });
        };
        template.defaults.imports.upper = upper;
        template.defaults.imports.lower = lower;
    }
}
exports.TemplateUtils = TemplateUtils;
