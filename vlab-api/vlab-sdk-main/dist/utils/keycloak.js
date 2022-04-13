"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeycloakUtils = exports.KeycloakUtilsError = void 0;
const keycloak_admin_client_1 = require("@keycloak/keycloak-admin-client");
const axios_1 = require("axios");
const timers_1 = require("timers");
const VLabError_1 = require("../model/VLabError");
class KeycloakUtilsError extends VLabError_1.VLabError {
    constructor(type, errMsg) {
        super(type, errMsg);
        this.name = KeycloakUtilsError.name;
    }
}
exports.KeycloakUtilsError = KeycloakUtilsError;
class KeycloakUtils {
    constructor(connectionConfig, credentials) {
        this.connect = async () => {
            await this.client.auth(this.credentials);
            this.task = setInterval(() => {
                this.client.auth(this.credentials);
            }, 58 * 1000); // 58 seconds
        };
        this.close = () => {
            if (this.task) {
                (0, timers_1.clearInterval)(this.task);
            }
        };
        this.listAllUsers = async () => {
            const userList = await this.client.users.find({
                max: 1e8
            });
            return userList;
        };
        this.findUsers = async (user, exact) => {
            var _a;
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
            }
            catch (err) {
                if (axios_1.default.isAxiosError(err) && err.response) {
                    throw new KeycloakUtilsError("Can't search user", (_a = err.response.data.errorMessage) !== null && _a !== void 0 ? _a : err.response.data.error);
                }
                throw new KeycloakUtilsError("Can't search user", (0, VLabError_1.getErrorMessage)(err));
            }
        };
        this.listUserGroups = async (user) => {
            var _a;
            try {
                const groups = await this.client.users.listGroups({
                    id: user.id,
                    briefRepresentation: false
                });
                return groups;
            }
            catch (err) {
                if (axios_1.default.isAxiosError(err) && err.response) {
                    throw new KeycloakUtilsError("Can't list user's groups", (_a = err.response.data.errorMessage) !== null && _a !== void 0 ? _a : err.response.data.error);
                }
                throw new KeycloakUtilsError("Can't list user's groups", (0, VLabError_1.getErrorMessage)(err));
            }
        };
        this.getUserByName = async (username) => {
            var _a;
            const currentUser = await this.client.users.find({
                username: username,
                exact: true,
                max: 1e8
            });
            if ((_a = currentUser[0]) === null || _a === void 0 ? void 0 : _a.id) {
                return currentUser[0];
            }
            throw new KeycloakUtilsError("Can't get user", "non-existent user");
        };
        this.createUser = async (user, defaultPassword) => {
            var _a;
            if (!user.username) {
                throw new KeycloakUtilsError("Can't create user", "missing field: username");
            }
            else if (!user.email) {
                throw new KeycloakUtilsError("Can't create user", "missing field: email");
            }
            const userPresent = {
                username: user.username,
                enabled: true,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                credentials: [{
                        type: "password",
                        value: defaultPassword !== null && defaultPassword !== void 0 ? defaultPassword : user.username.toLowerCase(),
                        temporary: true
                    }],
                attributes: user.attributes
            };
            try {
                let currentUser;
                currentUser = await this.client.users.create(userPresent);
                if (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id) {
                    return (await this.client.users.findOne({ id: currentUser.id }));
                }
            }
            catch (err) {
                if (axios_1.default.isAxiosError(err) && err.response) {
                    throw new KeycloakUtilsError("Can't create user", (_a = err.response.data.errorMessage) !== null && _a !== void 0 ? _a : err.response.data.error);
                }
                throw new KeycloakUtilsError("Can't create user", (0, VLabError_1.getErrorMessage)(err));
            }
            throw new KeycloakUtilsError("Can't create user", "unexpected error");
        };
        this.deleteUserByName = async (username) => {
            var _a;
            try {
                const currentUser = await this.getUserByName(username);
                await this.client.users.del({
                    id: currentUser.id
                });
            }
            catch (err) {
                if (axios_1.default.isAxiosError(err) && err.response) {
                    throw new KeycloakUtilsError("Can't delete user", (_a = err.response.data.errorMessage) !== null && _a !== void 0 ? _a : err.response.data.error);
                }
                throw new KeycloakUtilsError("Can't delete user", (0, VLabError_1.getErrorMessage)(err));
            }
        };
        this.getAllGroups = async () => {
            return await this.client.groups.find();
        };
        this.getGroupByName = async (groupName) => {
            var _a, _b;
            const group = await this.client.groups.find({
                search: groupName,
                max: 1,
                briefRepresentation: false
            });
            if (((_a = group[0]) === null || _a === void 0 ? void 0 : _a.name) == groupName && ((_b = group[0]) === null || _b === void 0 ? void 0 : _b.id)) {
                return group[0];
            }
            throw new KeycloakUtilsError("Can't get group", "non-existent group");
        };
        this.createGroup = async (groupName) => {
            var _a;
            try {
                let currentGroup;
                currentGroup = await this.client.groups.create({
                    name: groupName
                });
                if (currentGroup === null || currentGroup === void 0 ? void 0 : currentGroup.id) {
                    return (await this.client.groups.findOne({
                        id: currentGroup.id
                    }));
                }
            }
            catch (err) {
                if (axios_1.default.isAxiosError(err) && err.response) {
                    throw new KeycloakUtilsError("Can't create group", (_a = err.response.data.errorMessage) !== null && _a !== void 0 ? _a : err.response.data.error);
                }
                throw new KeycloakUtilsError("Can't create group", (0, VLabError_1.getErrorMessage)(err));
            }
            throw new KeycloakUtilsError("Can't create group", "unexpected error");
        };
        this.deleteGroupByName = async (groupName) => {
            var _a;
            try {
                let currentGroup = await this.getGroupByName(groupName);
                await this.client.groups.del({
                    id: currentGroup.id
                });
            }
            catch (err) {
                if (axios_1.default.isAxiosError(err) && err.response) {
                    throw new KeycloakUtilsError("Can't delete group", (_a = err.response.data.errorMessage) !== null && _a !== void 0 ? _a : err.response.data.error);
                }
                throw new KeycloakUtilsError("Can't delete group", (0, VLabError_1.getErrorMessage)(err));
            }
        };
        this.assignUserToGroup = async (username, groupName) => {
            var _a;
            try {
                let currentUser = await this.getUserByName(username);
                let currentGroup = await this.getGroupByName(groupName);
                await this.client.users.addToGroup({
                    id: currentUser.id,
                    groupId: currentGroup.id
                });
            }
            catch (err) {
                if (axios_1.default.isAxiosError(err) && err.response) {
                    throw new KeycloakUtilsError("Can't assign user to group", (_a = err.response.data.errorMessage) !== null && _a !== void 0 ? _a : err.response.data.error);
                }
                throw new KeycloakUtilsError("Can't assign user to group", (0, VLabError_1.getErrorMessage)(err));
            }
        };
        this.removeUserFromGroup = async (username, groupName) => {
            var _a;
            try {
                let currentUser = await this.getUserByName(username);
                let currentGroup = await this.getGroupByName(groupName);
                await this.client.users.delFromGroup({
                    id: currentUser.id,
                    groupId: currentGroup.id
                });
            }
            catch (err) {
                if (axios_1.default.isAxiosError(err) && err.response) {
                    throw new KeycloakUtilsError("Can't remove user from group", (_a = err.response.data.errorMessage) !== null && _a !== void 0 ? _a : err.response.data.error);
                }
                throw new KeycloakUtilsError("Can't remove user from group", (0, VLabError_1.getErrorMessage)(err));
            }
        };
        this.getClientByName = async (clientName) => {
            var _a;
            let currentClient = await this.client.clients.find({
                clientId: clientName,
                search: false
            });
            if ((_a = currentClient[0]) === null || _a === void 0 ? void 0 : _a.id) {
                return currentClient[0];
            }
            throw new KeycloakUtilsError("Can't get client", "non-exist client");
        };
        this.assignClientRoleToGroup = async (roleName, groupName, clientName) => {
            var _a;
            try {
                let currentGroup = await this.getGroupByName(groupName);
                let currentClient = await this.getClientByName(clientName);
                let currentClientRole = await this.getClientRoleByName(roleName, currentClient.id);
                await this.client.groups.addClientRoleMappings({
                    id: currentGroup.id,
                    clientUniqueId: currentClient.id,
                    roles: [
                        {
                            id: currentClientRole.id,
                            name: currentClientRole.name
                        }
                    ]
                });
            }
            catch (err) {
                if (axios_1.default.isAxiosError(err) && err.response) {
                    throw new KeycloakUtilsError("Can't assign client role to group", (_a = err.response.data.errorMessage) !== null && _a !== void 0 ? _a : err.response.data.error);
                }
                throw new KeycloakUtilsError("Can't assign client role to group", (0, VLabError_1.getErrorMessage)(err));
            }
        };
        this.removeClientRoleFromGroup = async (roleName, groupName, clientName) => {
            var _a;
            try {
                let currentGroup = await this.getGroupByName(groupName);
                let currentClient = await this.getClientByName(clientName);
                let currentClientRole = await this.getClientRoleByName(roleName, currentClient.id);
                await this.client.groups.delClientRoleMappings({
                    id: currentGroup.id,
                    clientUniqueId: currentClient.id,
                    roles: [
                        {
                            id: currentClientRole.id,
                            name: currentClientRole.name
                        }
                    ]
                });
            }
            catch (err) {
                if (axios_1.default.isAxiosError(err) && err.response) {
                    throw new KeycloakUtilsError("Can't remove client role from group", (_a = err.response.data.errorMessage) !== null && _a !== void 0 ? _a : err.response.data.error);
                }
                throw new KeycloakUtilsError("Can't remove client role from group", (0, VLabError_1.getErrorMessage)(err));
            }
        };
        this.getClientRoleByName = async (roleName, clientId) => {
            var _a;
            try {
                if (!await this.client.clients.findOne({ id: clientId })) {
                    throw new KeycloakUtilsError("Can't get client role", "non-exist client");
                }
                let currentClientRole = await this.client.clients.findRole({
                    id: clientId,
                    roleName: roleName
                });
                if (currentClientRole === null || currentClientRole === void 0 ? void 0 : currentClientRole.id) {
                    return currentClientRole;
                }
                throw new KeycloakUtilsError("Can't get client role", "non-exist client role");
            }
            catch (err) {
                if (axios_1.default.isAxiosError(err) && err.response) {
                    throw new KeycloakUtilsError("Can't get client role", (_a = err.response.data.errorMessage) !== null && _a !== void 0 ? _a : err.response.data.error);
                }
                throw new KeycloakUtilsError("Can't get client role", (0, VLabError_1.getErrorMessage)(err));
            }
        };
        this.createClientRole = async (roleName, clientName) => {
            var _a;
            try {
                let currentClient = await this.getClientByName(clientName);
                await this.client.clients.createRole({
                    id: currentClient.id,
                    name: roleName
                });
                return await this.getClientRoleByName(roleName, currentClient.id);
            }
            catch (err) {
                if (axios_1.default.isAxiosError(err) && err.response) {
                    throw new KeycloakUtilsError("Can't create client role", (_a = err.response.data.errorMessage) !== null && _a !== void 0 ? _a : err.response.data.error);
                }
                throw new KeycloakUtilsError("Can't create client role", (0, VLabError_1.getErrorMessage)(err));
            }
        };
        this.deleteClientRole = async (roleName, clientName) => {
            var _a;
            try {
                let currentClient = await this.getClientByName(clientName);
                await this.client.clients.delRole({
                    id: currentClient.id,
                    roleName: roleName
                });
            }
            catch (err) {
                if (axios_1.default.isAxiosError(err) && err.response) {
                    throw new KeycloakUtilsError("Can't delete client role", (_a = err.response.data.errorMessage) !== null && _a !== void 0 ? _a : err.response.data.error);
                }
                throw new KeycloakUtilsError("Can't delete client role", (0, VLabError_1.getErrorMessage)(err));
            }
        };
        this.findGroupMembers = async (groupName) => {
            var _a;
            try {
                let currentGroup = await this.getGroupByName(groupName);
                let members = await this.client.groups.listMembers({
                    id: currentGroup.id
                });
                return members;
            }
            catch (err) {
                if (axios_1.default.isAxiosError(err) && err.response) {
                    throw new KeycloakUtilsError("Can't find group members", (_a = err.response.data.errorMessage) !== null && _a !== void 0 ? _a : err.response.data.error);
                }
                throw new KeycloakUtilsError("Can't find group members", (0, VLabError_1.getErrorMessage)(err));
            }
        };
        this.prune = async () => {
            var _a;
            try {
                let userList = await this.listAllUsers();
                let pruneList = [];
                for (let user of userList) {
                    let count = (await this.client.users.countGroups({
                        id: user.id
                    })).count;
                    if (count < 1) {
                        this.client.users.del({
                            id: user.id
                        });
                        pruneList.push(user);
                    }
                }
                return pruneList;
            }
            catch (err) {
                if (axios_1.default.isAxiosError(err) && err.response) {
                    throw new KeycloakUtilsError("Can't prune users", (_a = err.response.data.errorMessage) !== null && _a !== void 0 ? _a : err.response.data.error);
                }
                throw new KeycloakUtilsError("Can't prune users", (0, VLabError_1.getErrorMessage)(err));
            }
        };
        this.client = new keycloak_admin_client_1.default(connectionConfig);
        this.credentials = credentials;
    }
}
exports.KeycloakUtils = KeycloakUtils;
