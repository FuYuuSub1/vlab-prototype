export interface VLabContext {
    secrets: Secrets;
    proxy: ProxyConfig;
    course?: CourseConfig;
    labs?: LabEnvironment[];
}
export interface Secrets {
    keycloak: KeycloakSecrets;
    nfs: NFSSecrets;
    redis: RedisSecrets;
    jdbc: JDBCSecrets;
    mongodb: MongoDBSecrets;
    worker: WorkerSecrets;
}
export interface ProxyConfig {
    image: string;
    namespace: string;
    userNamespacePrefix?: string;
    userStorageQuota?: string;
    sessionTimeoutMilliseconds?: number | string;
    idleDetection?: IdleDetectionSettings;
}
export interface LabEnvironment {
    template: string;
    invisible?: boolean;
    specId: string;
    displayName?: string;
    tutorialLink?: string;
    description?: string;
    applications?: string[];
}
export interface CourseConfig {
    id: string;
    name: string;
    pullPolicy?: string;
    studentLabQuota?: number | string;
}
interface KeycloakSecrets {
    url: string;
    token: string;
    adminSecret: string;
    realm: string;
    client: string;
}
interface NFSSecrets {
    host: string;
    rootdir: string;
}
interface RedisSecrets {
    host: string;
    port: number | string;
    password: string;
}
interface JDBCSecrets {
    url: string;
    username: string;
    password: string;
}
interface MongoDBSecrets {
    host: string;
    port: number | string;
    username: string;
    password: string;
    database: string;
}
interface WorkerSecrets {
    privateKey: string;
}
interface IdleDetectionSettings {
    maxAgeDuration?: string;
    pureHttp?: PureHttpSettings;
    websocket?: WebsocketSettings;
}
interface PureHttpSettings {
    idleTimeoutMilliseconds?: number | string;
}
interface WebsocketSettings {
    intervalMilliseconds?: number | string;
    threshold?: number | string;
    retryTimes?: number | string;
}
export interface LabTemplate {
    name: string;
    applications: string[];
}
export {};
