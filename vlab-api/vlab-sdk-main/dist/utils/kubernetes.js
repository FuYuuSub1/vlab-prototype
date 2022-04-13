"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KubernetesUtils = exports.KubernetesUtilsError = void 0;
const client_node_1 = require("@kubernetes/client-node");
const VLabError_1 = require("../model/VLabError");
const tmpfs = require("tmp");
const tar = require("tar-fs");
const path = require("path");
const fs = require("fs");
const stream_buffers_1 = require("stream-buffers");
class KubernetesUtilsError extends VLabError_1.VLabError {
    constructor(type, errMsg) {
        super(type, errMsg);
        this.name = KubernetesUtilsError.name;
    }
}
exports.KubernetesUtilsError = KubernetesUtilsError;
class KubernetesUtils {
    constructor(kubeConfigFilePath) {
        this.apply = async (kubeObject, namespace) => {
            const client = client_node_1.KubernetesObjectApi.makeApiClient(this.kubeConfig);
            if (!(kubeObject && kubeObject.kind)) {
                throw new KubernetesUtilsError("Can't apply resource", "Invaild kubernetes object");
            }
            kubeObject.metadata = kubeObject.metadata || {};
            if (namespace) {
                kubeObject.metadata.namespace = namespace;
            }
            kubeObject.metadata.annotations = kubeObject.metadata.annotations || {};
            delete kubeObject.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'];
            kubeObject.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'] = JSON.stringify(kubeObject);
            try {
                await client.read(kubeObject);
                const response = await client.patch(kubeObject);
                return response;
            }
            catch (err) {
                if (err instanceof client_node_1.HttpError && err.statusCode == 404) {
                    const response = await client.create(kubeObject);
                    return response;
                }
                throw err;
            }
        };
        this.delete = async (kubeObject, namespace) => {
            const client = client_node_1.KubernetesObjectApi.makeApiClient(this.kubeConfig);
            if (!(kubeObject && kubeObject.kind)) {
                throw new KubernetesUtilsError("Can't delete resource", "Invaild kubernetes object");
            }
            kubeObject.metadata = kubeObject.metadata || {};
            if (namespace) {
                kubeObject.metadata.namespace = namespace;
            }
            try {
                const target = await client.read(kubeObject);
                const result = await client.delete(target.body, undefined, undefined, 5, undefined, "Foreground");
                return result;
            }
            catch (err) {
                return;
            }
        };
        this.listPods = async (namespace) => {
            const client = this.kubeConfig.makeApiClient(client_node_1.CoreV1Api);
            const result = await client.listNamespacedPod(namespace);
            return result.body.items;
        };
        this.listDeployments = async (namespace) => {
            const client = this.kubeConfig.makeApiClient(client_node_1.AppsV1Api);
            const result = await client.listNamespacedDeployment(namespace);
            return result.body.items;
        };
        this.getPodFromName = async (namespace, podName) => {
            const client = this.kubeConfig.makeApiClient(client_node_1.CoreV1Api);
            const result = await client.readNamespacedPod(podName, namespace);
            return result.body;
        };
        this.createNamespace = async (namespace) => {
            var _a;
            const client = this.kubeConfig.makeApiClient(client_node_1.CoreV1Api);
            const namespaceObject = {
                metadata: {
                    name: namespace
                }
            };
            try {
                let namespaceInstance = await client.readNamespace(namespace);
                if (((_a = namespaceInstance.body.status) === null || _a === void 0 ? void 0 : _a.phase) === 'Terminating') {
                    throw new KubernetesUtilsError("Can't create namespace", `namespace ${namespace} is terminating`);
                }
                return namespaceInstance;
            }
            catch (err) {
                if (err instanceof client_node_1.HttpError && err.statusCode == 404) {
                    let namespaceInstance = await client.createNamespace(namespaceObject);
                    return namespaceInstance;
                }
                throw err;
            }
        };
        this.deleteNamespace = async (namespace) => {
            var _a;
            const client = this.kubeConfig.makeApiClient(client_node_1.CoreV1Api);
            try {
                let namespaceInstance = await client.readNamespace(namespace);
                if (((_a = namespaceInstance.body.status) === null || _a === void 0 ? void 0 : _a.phase) === 'Active') {
                    client.deleteNamespace(namespace, undefined, undefined, 5, undefined, "Background");
                }
            }
            catch (err) {
                return;
            }
        };
        this.copyToPod = async (namespace, podName, sourcePath, targetPath, containerName) => {
            if (!containerName) {
                const pod = await this.getPodFromName(namespace, podName);
                containerName = pod.spec.containers[0].name;
            }
            await this.cpToPod(namespace, podName, containerName, sourcePath, targetPath);
        };
        /**
          * Official cp.cpToPod is quite hard to use and buggy (it will copy full path stucture to {tgtPath}, so you will get {tgtPath}/{srcPath})
          * this cpToPod function is aim to support "kubectl cp {srcPath} {tgtPath}" by rewriting packing .tar file part
        */
        this.cpToPod = async (namespace, podName, containerName, srcPath, tgtPath) => {
            const cp = new client_node_1.Cp(this.kubeConfig);
            const tmpFile = tmpfs.fileSync();
            const stream = fs.createWriteStream(tmpFile.name);
            const command = ['tar', 'xf', '-', '-C', '/'];
            if (fs.lstatSync(srcPath).isDirectory()) {
                tar.pack(srcPath, {
                    map: (header) => {
                        header.name = `${tgtPath}/${header.name}`;
                        return header;
                    }
                }).pipe(stream);
            }
            else if (fs.lstatSync(srcPath).isFile()) {
                tar.pack(path.dirname(srcPath), {
                    entries: [path.basename(srcPath)],
                    map: (header) => {
                        header.name = tgtPath;
                        return header;
                    }
                }).pipe(stream);
            }
            stream.on("close", () => {
                const readStream = fs.createReadStream(tmpFile.name);
                const errStream = new stream_buffers_1.WritableStreamBuffer();
                cp.execInstance.exec(namespace, podName, containerName, command, null, errStream, readStream, false, async () => {
                    if (errStream.size()) {
                        throw new Error(`Error from cpToPod - details: \n ${errStream.getContentsAsString()}`);
                    }
                });
            });
            tmpFile.removeCallback();
        };
        this.kubeConfig = new client_node_1.KubeConfig();
        if (kubeConfigFilePath) {
            this.kubeConfig.loadFromFile(kubeConfigFilePath);
        }
        else if (process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT) {
            this.kubeConfig.loadFromCluster();
        }
        else {
            this.kubeConfig.loadFromDefault();
        }
    }
}
exports.KubernetesUtils = KubernetesUtils;
