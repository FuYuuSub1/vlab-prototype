import { VLabConfigs } from "./model/VLabConfigs";
import { CourseConfig, LabEnvironment, Secrets } from "./model/VLabContext";
import { KeycloakUtils } from "./utils/keycloak";
import { TemplateUtils } from "./utils/template";
import { KubernetesUtils } from "./utils/kubernetes";
import { MongoDBUtils } from "./utils/mongodb";
import { LabTemplate } from './model/VLabContext';
declare enum courseStatus {
    DEPLOYED = "Deployed",
    DEPLOYING = "Deploying",
    INACTIVE = "Inactive",
    FAILED = "Failed"
}
export declare class VLabSDK {
    secrets: Secrets;
    configs: VLabConfigs;
    keycloakUtils: KeycloakUtils;
    templateUtils: TemplateUtils;
    kubernetesUtils: KubernetesUtils;
    mongoDBUtils: MongoDBUtils;
    constructor(secretPath: string, configPath: string);
    init: () => Promise<void>;
    close: () => Promise<void>;
    listCourses: () => Promise<string[]>;
    readCourseStatus: (courseId: string) => Promise<courseStatus>;
    deployCourse: (courseConfig: CourseConfig, labEnvironments: LabEnvironment[]) => Promise<void>;
    initKubernetesEnvironment: () => Promise<void>;
    listLabTemplate: () => Promise<LabTemplate[]>;
}
export {};
