import * as mongo from 'mongodb';
export declare const enum TemplateCollections {
    LAB_TEMPLATES = "LabTemplates",
    KUBERNETES_USER_RESOURCES_TEMPLATES = "UserResources",
    KUBERNETES_CONTROLLER_TEMPLATES = "Controller",
    KUBERNETES_CONFIG_SET_TEMPLATES = "ConfigSet",
    KUBERNETES_CONTROLLER_APPLICATION_TEMPLATES = "Application"
}
export declare const KubernetesTemplateNames: {
    USER_RESOURCES: {
        PVC: string;
        NETWORK_POLICY_IN_NAMESPACE: string;
        NETWORK_POLICY_EGRESS: string;
        NETWORK_POLICY_INGRESS: string;
    };
    CONTROLLER: {
        DEPLOYMENT: string;
        SERVICE: string;
        INGRESS_PORTAL: string;
        INGRESS_WILDCARD: string;
    };
    CONFIG_SET: {
        PVC: string;
        STATEFUL_SET: string;
    };
    APPLICATION: string;
};
export declare class MongoDBUtils {
    database: string;
    client: mongo.MongoClient;
    constructor(host: string, port: string | number, username: string, password: string, database: string);
    connect: () => Promise<void>;
    close: () => Promise<void>;
    readAllTemplateDocs: (collection: string) => Promise<mongo.WithId<mongo.Document>[]>;
    upsertTemplateDoc: (collection: string, templateName: string, templateString: string, isPublic?: boolean | undefined) => Promise<mongo.ModifyResult<mongo.Document>>;
    readTemplateDoc: (collection: string, templateName: string) => Promise<mongo.WithId<mongo.Document> | null>;
    dropTemplateDoc: (collection: string, templateName: string) => Promise<void>;
}
