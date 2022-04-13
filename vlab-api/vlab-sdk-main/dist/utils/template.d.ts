import { VLabContext } from "../model/VLabContext";
export declare class TemplateUtils {
    constructor();
    renderAnyTemplate: (templateString: string, context: any) => string;
    private renderLabTemplates;
    renderControllerApplicationConfig: (readControllerConfigTemplateFunc: () => Promise<string>, readLabSpecTemplateFunc: (templateName: string) => Promise<string>, vlabContext: VLabContext) => Promise<any>;
    dumpYAML: (sourceObj: any) => string;
}
