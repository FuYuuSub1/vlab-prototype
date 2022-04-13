import { ProxyConfig } from "./VLabContext";

export interface VLabConfigs {
    proxy: ProxyConfig,
    storageQuota: StorageQuota,
    courseQuota: number,
    workers: string[],
    emailDomain: string,
    tutorialDomain: string
}

interface StorageQuota {
    student: string,
    teacher: string,
    superadmin: string
}