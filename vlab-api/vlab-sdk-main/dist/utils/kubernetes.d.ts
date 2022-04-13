import { KubeConfig, KubernetesObject } from '@kubernetes/client-node';
import { VLabError } from '../model/VLabError';
export declare class KubernetesUtilsError extends VLabError {
    constructor(type: string, errMsg: string);
}
export declare class KubernetesUtils {
    kubeConfig: KubeConfig;
    constructor(kubeConfigFilePath?: string);
    apply: (kubeObject: KubernetesObject, namespace?: string | undefined) => Promise<{
        body: KubernetesObject;
        response: import("http").IncomingMessage;
    }>;
    delete: (kubeObject: KubernetesObject, namespace?: string | undefined) => Promise<{
        body: import("@kubernetes/client-node").V1Status;
        response: import("http").IncomingMessage;
    } | undefined>;
    listPods: (namespace: string) => Promise<import("@kubernetes/client-node").V1Pod[]>;
    listDeployments: (namespace: string) => Promise<import("@kubernetes/client-node").V1Deployment[]>;
    getPodFromName: (namespace: string, podName: string) => Promise<import("@kubernetes/client-node").V1Pod>;
    createNamespace: (namespace: string) => Promise<{
        response: http.IncomingMessage;
        body: import("@kubernetes/client-node").V1Namespace;
    }>;
    deleteNamespace: (namespace: string) => Promise<void>;
    copyToPod: (namespace: string, podName: string, sourcePath: string, targetPath: string, containerName?: string | undefined) => Promise<void>;
    /**
      * Official cp.cpToPod is quite hard to use and buggy (it will copy full path stucture to {tgtPath}, so you will get {tgtPath}/{srcPath})
      * this cpToPod function is aim to support "kubectl cp {srcPath} {tgtPath}" by rewriting packing .tar file part
    */
    cpToPod: (namespace: string, podName: string, containerName: string, srcPath: string, tgtPath: string) => Promise<void>;
}
