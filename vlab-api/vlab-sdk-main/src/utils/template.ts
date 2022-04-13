import * as template from "art-template";
import * as _ from 'lodash';
import * as yaml from 'js-yaml';
import { LabEnvironment, VLabContext } from "../model/VLabContext";


function upper (value: string) {
    return value.toUpperCase();
}

function lower (value: string) {
    return value.toLowerCase();
}

export class TemplateUtils {
    constructor () {
        template.defaults.imports.upper = upper;
        template.defaults.imports.lower = lower;
    }

    renderAnyTemplate = (templateString: string, context: any) => {
        return template.render(templateString, context);
    }
    
    private renderLabTemplates = async (readLabTemplateFunc: (templateName: string) => Promise<string>, vlabContext: VLabContext) => {
        let environment: VLabContext = _.omit(vlabContext, 'labs');
        let labList: LabEnvironment[] = _.result(vlabContext, 'labs', []);
        let result = [];
        for (let lab of labList) {
            let specTemplate = await readLabTemplateFunc(lab.template);
            let labContext = _.merge(lab, environment);
            let output = template.render(specTemplate, labContext);
            let templateObject = JSON.parse(output);
            if (!_.isEmpty(lab.applications)) {
                for (let containerSpec of templateObject.containerSpecs) {
                    if (!_.isEmpty(containerSpec.entryPoints)) {
                        containerSpec.entryPoints = _.filter(containerSpec.entryPoints, (p: any) => {
                            return _.includes(lab.applications, p["display-name"])
                        })
                    }
                }
            }
            if (lab.invisible) {
                templateObject["access-groups"] = "admins";
            }

            result.push(templateObject)
        }
        return result;
    }
    
    renderControllerApplicationConfig = async (readControllerConfigTemplateFunc: () => Promise<string>, readLabSpecTemplateFunc: (templateName: string) => Promise<string>, vlabContext: VLabContext) => {
        let configTemplateString = await readControllerConfigTemplateFunc();
        let configObject = JSON.parse(template.render(configTemplateString, vlabContext));
        configObject.proxy.specs = await this.renderLabTemplates(readLabSpecTemplateFunc, vlabContext);
        return configObject;
    }

    dumpYAML = (sourceObj: any) => {
        return yaml.dump(sourceObj, {
            noArrayIndent: true,
            lineWidth: -1,
            quotingType: '"'
        })
    }
}