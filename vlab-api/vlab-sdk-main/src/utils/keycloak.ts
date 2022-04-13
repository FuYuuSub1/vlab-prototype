import KcAdminClient from '@keycloak/keycloak-admin-client'
import { ConnectionConfig } from '@keycloak/keycloak-admin-client/lib/client';
import GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation';
import UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation';
import { Credentials } from '@keycloak/keycloak-admin-client/lib/utils/auth';
import request from 'axios';
import { clearInterval } from 'timers';
import { getErrorMessage, VLabError } from '../model/VLabError';
import { VLabUser } from '../model/VLabUser';

export class KeycloakUtilsError extends VLabError {
    constructor(type: string, errMsg: string) {
        super(type, errMsg);
        this.name = KeycloakUtilsError.name;
    }
}

export class KeycloakUtils {
    client: KcAdminClient;
    credentials: Credentials;
    task: NodeJS.Timer | undefined;

    constructor(connectionConfig: ConnectionConfig, credentials: Credentials) {
        this.client = new KcAdminClient(connectionConfig);
        this.credentials = credentials;
    }

    connect = async () => {
        await this.client.auth(this.credentials);
        this.task = setInterval(() => {
            this.client.auth(this.credentials);
        }, 58 * 1000); // 58 seconds
    }

    close = () => {
        if (this.task) {
            clearInterval(this.task!);
        }
    }

    listAllUsers = async () => {
        const userList = await this.client.users.find({
            max: 1e8
        });
        return userList;
    }

    findUsers = async (user: VLabUser, exact?: boolean) => {
        try {
            const currentUserList = await this.client.users.find({
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                max: 1e8,
                exact: exact
            });
            return currentUserList;
        } catch (err) {
            if (request.isAxiosError(err) && err.response) {
                throw new KeycloakUtilsError("Can't search user", err.response.data.errorMessage ?? err.response.data.error);
            }
            throw new KeycloakUtilsError("Can't search user", getErrorMessage(err));
        }
    }

    listUserGroups = async (user: UserRepresentation) => {
        try {
            const groups = await this.client.users.listGroups({
                id: user.id!,
                briefRepresentation: false
            });
            return groups;
        } catch (err) {
            if (request.isAxiosError(err) && err.response) {
                throw new KeycloakUtilsError("Can't list user's groups", err.response.data.errorMessage ?? err.response.data.error);
            }
            throw new KeycloakUtilsError("Can't list user's groups", getErrorMessage(err));
        }
    }

    getUserByName = async (username: string) => {
        const currentUser = await this.client.users.find({
            username: username,
            exact: true,
            max: 1e8
        });
        if (currentUser[0]?.id) {
            return currentUser[0];
        }
        throw new KeycloakUtilsError("Can't get user", "non-existent user");
    }
    createUser = async (user: VLabUser, defaultPassword?: string) => {
        if (!user.username) {
            throw new KeycloakUtilsError("Can't create user", "missing field: username");
        } else if (!user.email) {
            throw new KeycloakUtilsError("Can't create user", "missing field: email");
        }
        const userPresent: UserRepresentation = {
            username: user.username,
            enabled: true,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            credentials: [{
                type: "password",
                value: defaultPassword ?? user.username.toLowerCase(),
                temporary: true
            }],
            attributes: user.attributes
        }
        try {
            let currentUser: UserRepresentation | undefined;
            currentUser = await this.client.users.create(userPresent);
            if (currentUser?.id) {
                return (await this.client.users.findOne({ id: currentUser.id }))!;
            }
        } catch (err) {
            if (request.isAxiosError(err) && err.response) {
                throw new KeycloakUtilsError("Can't create user", err.response.data.errorMessage ?? err.response.data.error);
            }
            throw new KeycloakUtilsError("Can't create user", getErrorMessage(err));
        }
        throw new KeycloakUtilsError("Can't create user", "unexpected error");
    }
    deleteUserByName = async (username: string) => {
        try {
            const currentUser = await this.getUserByName(username);
            await this.client.users.del({
                id: currentUser.id!
            });
        } catch (err) {
            if (request.isAxiosError(err) && err.response) {
                throw new KeycloakUtilsError("Can't delete user", err.response.data.errorMessage ?? err.response.data.error);
            }
            throw new KeycloakUtilsError("Can't delete user", getErrorMessage(err));
        }
    }
    getAllGroups = async () => {
        return await this.client.groups.find();
    }
    getGroupByName = async (groupName: string) => {
        const group = await this.client.groups.find({
            search: groupName,
            max: 1,
            briefRepresentation: false
        });
        if (group[0]?.name == groupName && group[0]?.id) {
            return group[0];
        }
        throw new KeycloakUtilsError("Can't get group", "non-existent group");
    }
    createGroup = async (groupName: string) => {
        try {
            let currentGroup: GroupRepresentation;
            currentGroup = await this.client.groups.create({
                name: groupName
            });
            if (currentGroup?.id) {
                return (await this.client.groups.findOne({
                    id: currentGroup.id!
                }))!;
            }
        } catch (err) {
            if (request.isAxiosError(err) && err.response) {
                throw new KeycloakUtilsError("Can't create group", err.response.data.errorMessage ?? err.response.data.error);
            }
            throw new KeycloakUtilsError("Can't create group", getErrorMessage(err));
        }
        throw new KeycloakUtilsError("Can't create group", "unexpected error");
    }
    deleteGroupByName = async (groupName: string) => {
        try {
            let currentGroup = await this.getGroupByName(groupName);
            await this.client.groups.del({
                id: currentGroup!.id!
            });
        } catch (err) {
            if (request.isAxiosError(err) && err.response) {
                throw new KeycloakUtilsError("Can't delete group", err.response.data.errorMessage ?? err.response.data.error);
            }
            throw new KeycloakUtilsError("Can't delete group", getErrorMessage(err));
        }
    }
    assignUserToGroup = async (username: string, groupName: string) => {
        try {
            let currentUser = await this.getUserByName(username);
            let currentGroup = await this.getGroupByName(groupName);
            await this.client.users.addToGroup({
                id: currentUser.id!,
                groupId: currentGroup.id!
            });
        } catch (err) {
            if (request.isAxiosError(err) && err.response) {
                throw new KeycloakUtilsError("Can't assign user to group", err.response.data.errorMessage ?? err.response.data.error);
            }
            throw new KeycloakUtilsError("Can't assign user to group", getErrorMessage(err));
        }
    }
    removeUserFromGroup = async (username: string, groupName: string) => {
        try {
            let currentUser = await this.getUserByName(username);
            let currentGroup = await this.getGroupByName(groupName);
            await this.client.users.delFromGroup({
                id: currentUser.id!,
                groupId: currentGroup.id!
            });
        } catch (err) {
            if (request.isAxiosError(err) && err.response) {
                throw new KeycloakUtilsError("Can't remove user from group", err.response.data.errorMessage ?? err.response.data.error);
            }
            throw new KeycloakUtilsError("Can't remove user from group", getErrorMessage(err));
        }
    }
    getClientByName = async (clientName: string) => {
        let currentClient = await this.client.clients.find({
            clientId: clientName,
            search: false
        });
        if (currentClient[0]?.id) {
            return currentClient[0];
        }
        throw new KeycloakUtilsError("Can't get client", "non-exist client");
    }
    assignClientRoleToGroup = async (roleName: string, groupName: string, clientName: string) => {
        try {
            let currentGroup = await this.getGroupByName(groupName);
            let currentClient = await this.getClientByName(clientName);
            let currentClientRole = await this.getClientRoleByName(roleName, currentClient.id!);
            await this.client.groups.addClientRoleMappings({
                id: currentGroup.id!,
                clientUniqueId: currentClient.id!,
                roles: [
                    {
                        id: currentClientRole.id!,
                        name: currentClientRole.name!
                    }
                ]
            });
        } catch (err) {
            if (request.isAxiosError(err) && err.response) {
                throw new KeycloakUtilsError("Can't assign client role to group", err.response.data.errorMessage ?? err.response.data.error);
            }
            throw new KeycloakUtilsError("Can't assign client role to group", getErrorMessage(err));
        }
    }

    removeClientRoleFromGroup = async (roleName: string, groupName: string, clientName: string) => {
        try {
            let currentGroup = await this.getGroupByName(groupName);
            let currentClient = await this.getClientByName(clientName);
            let currentClientRole = await this.getClientRoleByName(roleName, currentClient.id!);
            await this.client.groups.delClientRoleMappings({
                id: currentGroup.id!,
                clientUniqueId: currentClient.id!,
                roles: [
                    {
                        id: currentClientRole.id!,
                        name: currentClientRole.name!
                    }
                ]
            });
        } catch (err) {
            if (request.isAxiosError(err) && err.response) {
                throw new KeycloakUtilsError("Can't remove client role from group", err.response.data.errorMessage ?? err.response.data.error);
            }
            throw new KeycloakUtilsError("Can't remove client role from group", getErrorMessage(err));
        }
    }

    getClientRoleByName = async (roleName: string, clientId: string) => {
        try {
            if (!await this.client.clients.findOne({ id: clientId })) {
                throw new KeycloakUtilsError("Can't get client role", "non-exist client");
            }
            let currentClientRole = await this.client.clients.findRole({
                id: clientId,
                roleName: roleName
            });
            if (currentClientRole?.id) {
                return currentClientRole;
            }
            throw new KeycloakUtilsError("Can't get client role", "non-exist client role");
        } catch (err) {
            if (request.isAxiosError(err) && err.response) {
                throw new KeycloakUtilsError("Can't get client role", err.response.data.errorMessage ?? err.response.data.error);
            }
            throw new KeycloakUtilsError("Can't get client role", getErrorMessage(err));
        }
    }
    createClientRole = async (roleName: string, clientName: string) => {
        try {
            let currentClient = await this.getClientByName(clientName);
            await this.client.clients.createRole({
                id: currentClient!.id,
                name: roleName
            });
            return await this.getClientRoleByName(roleName, currentClient!.id!)
        } catch (err) {
            if (request.isAxiosError(err) && err.response) {
                throw new KeycloakUtilsError("Can't create client role", err.response.data.errorMessage ?? err.response.data.error);
            }
            throw new KeycloakUtilsError("Can't create client role", getErrorMessage(err));
        }
    }
    deleteClientRole = async (roleName: string, clientName: string) => {
        try {
            let currentClient = await this.getClientByName(clientName);
            await this.client.clients.delRole({
                id: currentClient!.id!,
                roleName: roleName
            });
        } catch (err) {
            if (request.isAxiosError(err) && err.response) {
                throw new KeycloakUtilsError("Can't delete client role", err.response.data.errorMessage ?? err.response.data.error);
            }
            throw new KeycloakUtilsError("Can't delete client role", getErrorMessage(err));
        }
    }

    findGroupMembers = async (groupName: string) => {
        try {
            let currentGroup = await this.getGroupByName(groupName);
            let members = await this.client.groups.listMembers({
                id: currentGroup!.id!
            });
            return members;
        } catch (err) {
            if (request.isAxiosError(err) && err.response) {
                throw new KeycloakUtilsError("Can't find group members", err.response.data.errorMessage ?? err.response.data.error);
            }
            throw new KeycloakUtilsError("Can't find group members", getErrorMessage(err));
        }
    }

    prune = async () => {
        try {
            let userList = await this.listAllUsers();
            let pruneList: UserRepresentation[] = []
            for (let user of userList) {
                let count = (await this.client.users.countGroups({
                    id: user.id!
                })).count;
                if (count < 1) {
                    this.client.users.del({
                        id: user.id!
                    });
                    pruneList.push(user);
                }
            }
            return pruneList
        } catch (err) {
            if (request.isAxiosError(err) && err.response) {
                throw new KeycloakUtilsError("Can't prune users", err.response.data.errorMessage ?? err.response.data.error);
            }
            throw new KeycloakUtilsError("Can't prune users", getErrorMessage(err));
        }
    }
}