import * as mongo from 'mongodb'
import { FindOneAndUpdateOptions } from 'mongodb';

export const enum TemplateCollections {
    LAB_TEMPLATES = "LabTemplates",
    KUBERNETES_USER_RESOURCES_TEMPLATES = "UserResources",
    KUBERNETES_CONTROLLER_TEMPLATES = "Controller",
    KUBERNETES_CONFIG_SET_TEMPLATES = "ConfigSet",
    KUBERNETES_CONTROLLER_APPLICATION_TEMPLATES = "Application"
}

export const KubernetesTemplateNames = {
   USER_RESOURCES: {
       PVC: "pvc",
       NETWORK_POLICY_IN_NAMESPACE: "namespaceNetworkPolicy",
       NETWORK_POLICY_EGRESS: "egressNetworkPolicy",
       NETWORK_POLICY_INGRESS: "ingressNetworkPolicy"
   },
   CONTROLLER: {
       DEPLOYMENT: "deployment",
       SERVICE: "service",
       INGRESS_PORTAL: "ingressPortal",
       INGRESS_WILDCARD: "ingressWildcard",
   },
   CONFIG_SET: {
       PVC: "pvc",
       STATEFUL_SET: "statefulSet"
   },
   APPLICATION: "application"
}

export class MongoDBUtils {
    database: string
    client: mongo.MongoClient
    constructor(host: string, port: string | number, username: string, password: string, database: string) {
        this.database = database;
        this.client = new mongo.MongoClient(`mongodb://${username}:${password}@${host}:${port}`)
    }

    connect = async () => {
        await this.client.connect();
    }

    close = async () => {
        await this.client.close()
    }

    readAllTemplateDocs = async (collection: string) => {
        const db = this.client.db(this.database);
        const collectionInstance = db.collection(collection);
        return await collectionInstance.find({}).toArray();
    }

    upsertTemplateDoc = async (collection: string, templateName: string, templateString: string, isPublic?: boolean) => {
        const db = this.client.db(this.database);
        const collectionInstance = db.collection(collection);
        const update = {
            $set: {
                name: templateName,
                public: isPublic ?? true,
                content: templateString
            }
        }
        const options: FindOneAndUpdateOptions = {
            upsert: true,
            returnDocument: 'after'
        }
        return await collectionInstance.findOneAndUpdate({name: templateName}, update, options);
    }

    readTemplateDoc = async (collection: string, templateName: string) => {
        const db = this.client.db(this.database);
        const collectionInstance = db.collection(collection);
        return await collectionInstance.findOne({name: templateName});
    }

    dropTemplateDoc = async (collection: string, templateName: string) => {
        const db = this.client.db(this.database);
        const collectionInstance = db.collection(collection);
        await collectionInstance.findOneAndDelete({name: templateName});
    }

}