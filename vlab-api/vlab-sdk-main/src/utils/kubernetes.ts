import { CoreV1Api, HttpError, KubeConfig, KubernetesObject, KubernetesObjectApi, Cp, AppsV1Api} from '@kubernetes/client-node'
import { VLabError } from '../model/VLabError';
import * as tmpfs from 'tmp';
import * as tar from 'tar-fs';
import * as path from 'path';
import * as fs from 'fs';
import { WritableStreamBuffer } from 'stream-buffers';

export { quantityToScalar } from '@kubernetes/client-node/dist/util'

export class KubernetesUtilsError extends VLabError {
    constructor(type: string, errMsg: string) {
        super(type, errMsg);
        this.name = KubernetesUtilsError.name;
    }
}
export class KubernetesUtils {
    kubeConfig: KubeConfig
    constructor(kubeConfigFilePath?: string) {
        this.kubeConfig = new KubeConfig();
        if (kubeConfigFilePath) {
            this.kubeConfig.loadFromFile(kubeConfigFilePath);
        } else if (process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT) {
            this.kubeConfig.loadFromCluster();
        } else {
            this.kubeConfig.loadFromDefault();
        }
    }

    apply = async (kubeObject: KubernetesObject, namespace?: string) => {
        const client = KubernetesObjectApi.makeApiClient(this.kubeConfig);
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
        } catch (err) {
            if (err instanceof HttpError && err.statusCode == 404) {
                const response = await client.create(kubeObject);
                return response;
            }
            throw err;
        }
    }

    delete = async (kubeObject: KubernetesObject, namespace?: string) => {
        const client = KubernetesObjectApi.makeApiClient(this.kubeConfig);
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
            return result
        } catch (err) {
            return;
        }
    }

    listPods = async (namespace: string) => {
        const client = this.kubeConfig.makeApiClient(CoreV1Api);
        const result = await client.listNamespacedPod(namespace);
        return result.body.items;
    }

    listDeployments = async (namespace: string) => {
        const client = this.kubeConfig.makeApiClient(AppsV1Api);
        const result = await client.listNamespacedDeployment(namespace);
        return result.body.items;
    }

    listPersistentVolumeClaims = async (namespace: string) => {
        const client = this.kubeConfig.makeApiClient(CoreV1Api);
        const result = await client.listNamespacedPersistentVolumeClaim(namespace);
        return result.body.items;
    }

    getPodFromName = async (namespace: string, podName: string) => {
        const client = this.kubeConfig.makeApiClient(CoreV1Api);
        const result = await client.readNamespacedPod(podName, namespace);
        return result.body;
    }

    createNamespace = async (namespace: string) => {
        const client = this.kubeConfig.makeApiClient(CoreV1Api);
        const namespaceObject = {
            metadata: {
                name: namespace
            }
        }
        try {
            let namespaceInstance = await client.readNamespace(namespace);
            if (namespaceInstance.body.status?.phase === 'Terminating') {
                throw new KubernetesUtilsError("Can't create namespace", `namespace ${namespace} is terminating`);
            }
            return namespaceInstance;
        } catch (err) {
            if (err instanceof HttpError && err.statusCode == 404) {
                let namespaceInstance = await client.createNamespace(namespaceObject);
                return namespaceInstance;
            }
            throw err;
        }
    }

    deleteNamespace = async (namespace: string) => {
        const client = this.kubeConfig.makeApiClient(CoreV1Api);
        try {
            let namespaceInstance = await client.readNamespace(namespace);
            if (namespaceInstance.body.status?.phase === 'Active') {
                client.deleteNamespace(namespace, undefined, undefined, 5, undefined, "Background");
            }
        } catch (err) {
            return;
        }
    }

    copyToPod = async (namespace: string, podName: string, sourcePath: string, targetPath: string, containerName?: string) => {
        if (!containerName) {
            const pod = await this.getPodFromName(namespace, podName);
            containerName = pod.spec!.containers[0].name
        }
        await this.cpToPod(namespace, podName, containerName, sourcePath, targetPath);
    }

    /** 
      * Official cp.cpToPod is quite hard to use and buggy (it will copy full path stucture to {tgtPath}, so you will get {tgtPath}/{srcPath})
      * this cpToPod function is aim to support "kubectl cp {srcPath} {tgtPath}" by rewriting packing .tar file part
    */
    cpToPod = async (namespace: string, podName: string, containerName: string, srcPath: string, tgtPath: string) => {
        const cp = new Cp(this.kubeConfig);
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
        } else if (fs.lstatSync(srcPath).isFile()) {
            tar.pack(path.dirname(srcPath), {
                entries: [path.basename(srcPath)],
                map: (header) => {
                    header.name = tgtPath;
                    return header
                }
            }).pipe(stream);
        }
        stream.on("close", () => {
            const readStream = fs.createReadStream(tmpFile.name);
            const errStream = new WritableStreamBuffer();
            cp.execInstance.exec(
                namespace,
                podName,
                containerName,
                command,
                null,
                errStream,
                readStream,
                false,
                async () => {
                    if (errStream.size()) {
                        throw new Error(`Error from cpToPod - details: \n ${errStream.getContentsAsString()}`);
                    }
                }
            );
        });
        tmpFile.removeCallback();
    }
}