"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoDBUtils = exports.KubernetesTemplateNames = void 0;
const mongo = require("mongodb");
exports.KubernetesTemplateNames = {
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
};
class MongoDBUtils {
    constructor(host, port, username, password, database) {
        this.connect = async () => {
            await this.client.connect();
        };
        this.close = async () => {
            await this.client.close();
        };
        this.readAllTemplateDocs = async (collection) => {
            const db = this.client.db(this.database);
            const collectionInstance = db.collection(collection);
            return await collectionInstance.find({}).toArray();
        };
        this.upsertTemplateDoc = async (collection, templateName, templateString, isPublic) => {
            const db = this.client.db(this.database);
            const collectionInstance = db.collection(collection);
            const update = {
                $set: {
                    name: templateName,
                    public: isPublic !== null && isPublic !== void 0 ? isPublic : true,
                    content: templateString
                }
            };
            const options = {
                upsert: true,
                returnDocument: 'after'
            };
            return await collectionInstance.findOneAndUpdate({ name: templateName }, update, options);
        };
        this.readTemplateDoc = async (collection, templateName) => {
            const db = this.client.db(this.database);
            const collectionInstance = db.collection(collection);
            return await collectionInstance.findOne({ name: templateName });
        };
        this.dropTemplateDoc = async (collection, templateName) => {
            const db = this.client.db(this.database);
            const collectionInstance = db.collection(collection);
            await collectionInstance.findOneAndDelete({ name: templateName });
        };
        this.database = database;
        this.client = new mongo.MongoClient(`mongodb://${username}:${password}@${host}:${port}`);
    }
}
exports.MongoDBUtils = MongoDBUtils;
