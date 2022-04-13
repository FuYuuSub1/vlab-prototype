/// <reference types="node" />
import KcAdminClient from '@keycloak/keycloak-admin-client';
import { ConnectionConfig } from '@keycloak/keycloak-admin-client/lib/client';
import GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation';
import UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation';
import { Credentials } from '@keycloak/keycloak-admin-client/lib/utils/auth';
import { VLabError } from '../model/VLabError';
import { VLabUser } from '../model/VLabUser';
export declare class KeycloakUtilsError extends VLabError {
    constructor(type: string, errMsg: string);
}
export declare class KeycloakUtils {
    client: KcAdminClient;
    credentials: Credentials;
    task: NodeJS.Timer | undefined;
    constructor(connectionConfig: ConnectionConfig, credentials: Credentials);
    connect: () => Promise<void>;
    close: () => void;
    listAllUsers: () => Promise<UserRepresentation[]>;
    findUsers: (user: VLabUser, exact?: boolean | undefined) => Promise<UserRepresentation[]>;
    listUserGroups: (user: UserRepresentation) => Promise<GroupRepresentation[]>;
    getUserByName: (username: string) => Promise<UserRepresentation>;
    createUser: (user: VLabUser, defaultPassword?: string | undefined) => Promise<UserRepresentation>;
    deleteUserByName: (username: string) => Promise<void>;
    getAllGroups: () => Promise<GroupRepresentation[]>;
    getGroupByName: (groupName: string) => Promise<GroupRepresentation>;
    createGroup: (groupName: string) => Promise<GroupRepresentation>;
    deleteGroupByName: (groupName: string) => Promise<void>;
    assignUserToGroup: (username: string, groupName: string) => Promise<void>;
    removeUserFromGroup: (username: string, groupName: string) => Promise<void>;
    getClientByName: (clientName: string) => Promise<import("@keycloak/keycloak-admin-client/lib/defs/clientRepresentation").default>;
    assignClientRoleToGroup: (roleName: string, groupName: string, clientName: string) => Promise<void>;
    removeClientRoleFromGroup: (roleName: string, groupName: string, clientName: string) => Promise<void>;
    getClientRoleByName: (roleName: string, clientId: string) => Promise<import("@keycloak/keycloak-admin-client/lib/defs/roleRepresentation").default>;
    createClientRole: (roleName: string, clientName: string) => Promise<import("@keycloak/keycloak-admin-client/lib/defs/roleRepresentation").default>;
    deleteClientRole: (roleName: string, clientName: string) => Promise<void>;
    findGroupMembers: (groupName: string) => Promise<UserRepresentation[]>;
    prune: () => Promise<UserRepresentation[]>;
}
