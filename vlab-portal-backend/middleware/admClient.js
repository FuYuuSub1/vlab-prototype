import { parse } from "csv-parse";
import fs from "fs";
import KcAdminClient from "@keycloak/keycloak-admin-client";
import dotenv from "dotenv";

const clientConfig = {
  baseUrl: "http://127.0.0.1:8080/auth",
  realmName: "test",
  requestConfig: {},
};

let authConfig = {
  username: "admin",
  password: "admin",
  grantType: "password",
  clientId: "admin-cli",
};

let userdata = {
  realm: "samplerealm",
  username: "test_user2",
  email: "test@user2.com",
};

export default class admClient {
  constructor(config) {
    this.adminClient = new KcAdminClient.default(authConfig);
    this.tokenClient = new KcAdminClient.default(authConfig);
    this.config = config;
    this.adminClient.setConfig({
      realmName: "test",
    });
    this.tokenClient.setConfig({
      realmName: "master",
    });
  }

  refreshToken = async () => {
    try {
      await this.tokenClient.auth(this.config);
      this.adminClient.accessToken = this.tokenClient.accessToken;
      this.adminClient.refreshToken = this.tokenClient.refreshToken;
    } catch (error) {
      console.log({ error });
    }
  };

  /* Function for User:
    createUser
    createUserWithCsv
    getAllUsers
    getUserByName
    getUserById
    deleteUserById
    deleteUserByName
    updateUser
    addUserToGroup
    deleteUserFromGroup
    */

  /*
    userInfo
    {
        realm: 'test',
        username: username,
        email: email,
        firstName: firstName,
        lastName: lastName,
        enabled: true
        attributes: {
            role: some roles,
        }
    }
    */
  createUser = async (userInfo) => {
    let newUser;
    try {
      newUser = await this.adminClient.users.create(userInfo);
    } catch {
      return "duplicateUser";
    }
    return newUser;
  };

  createUserWithCsv = async (csvFileDir) => {
    let records = [];
    const parser = fs.createReadStream(csvFileDir).pipe(
      parse({
        // CSV options if any
      })
    );
    for await (const [realm, username, email, ...rest] of parser) {
      // Work with each record
      const userdata = { realm, username, email };
      console.log(userdata);
      await this.createUser(userdata);
      records.push(userdata);
    }
    return records;
  };

  getAllUsers = async () => {
    const userList = await this.adminClient.users.find();
    return userList;
  };

  getUserByName = async (userName) => {
    const userlist = await this.adminClient.users.find();
    const user = userlist.filter((user) => user.username == userName);
    return user[0];
  };

  getUserIdByUserName = async (userName) => {
    const userlist = await this.adminClient.users.find();
    const user = userlist.filter((user) => user.username == userName);
    return user[0];
  };

  getUserById = async (userid) => {
    const user = await this.adminClient.users.findOne({ id: userid });
    return user;
  };

  validUserId = async (userid) => {
    try {
      await this.adminClient.users.findOne({ id: userid });
      return true;
    } catch {
      return false;
    }
  };

  deleteUserByName = async (userName) => {
    const userlist = await this.adminClient.users.find();
    const user = userlist.filter((user) => user.username == userName);
    await this.adminClient.users.del({ id: user[0].id });
  };

  deleteUserById = async (userId) => {
    await this.adminClient.users.del({ id: userId });
  };

  updateUser = async (userId, updateInfo) => {
    //if able to find the user
    await this.adminClient.users.update({ id: userId }, updateInfo);
  };

  addUserToGroup = async (groupUid, userUid) => {
    await this.adminClient.users.addToGroup({ groupId: groupUid, id: userUid });
  };

  deleteUserFromGroup = async (groupUid, userUid) => {
    await this.adminClient.users.delFromGroup({
      groupId: groupUid,
      id: userUid,
    });
  };

  getAllGropusOfUser = async (userId) => {
    const groups = await this.adminClient.users.listGroups({ id: userId });
    return groups;
  };

  /* Functions for Client
    createClient
    getAllClients
    getClientByName
    getClientSecret
    */

  createClient = async (clientId) => {
    const newClient = await this.adminClient.clients.create({
      clientId,
    });
  };

  getAllClients = async (clientId) => {
    const clients = await this.adminClient.clients.find();
    return clients;
  };

  getClientByName = async (clientName) => {
    const clients = await this.adminClient.clients.find();
    const client = clients.filter((client) => client.clientId == clientName);
    return client[0];
  };

  getClientIdByName = async (clientName) => {
    const clients = await this.adminClient.clients.find();
    const client = clients.filter((client) => client.clientId == clientName);
    return client[0];
  };

  getClientSecret = async (clientUid) => {
    const credential = await this.adminClient.clients.getClientSecret({
      id: clientUid,
    });
    return credential.value;
  };

  /* Client Role Functions 
    createRole
    getAllRoles
    getRoleByName
    getRoleById
    deleteRoleByName
    deleteRoleById
    addRoleMappings
    getAllRoleMappings
    deleteRoleMappings
    
    */

  createRole = async (clientUid, roleName) => {
    //const sampleClient = await this.adminClient.clients.findOne({
    //    id: 'sampleclient'
    //})
    const role = await this.adminClient.clients.createRole({
      id: clientUid,
      name: roleName,
    });
  };

  getAllRoles = async () => {
    const clientUid = "20ccdee2-08e3-4472-b931-401b7d7b8db1";
    const roles = await this.adminClient.clients.listRoles({
      id: clientUid,
    });
    return roles;
  };

  getRoleByName = async (clientId, roleName) => {
    const role = await this.adminClient.clients.findRole({
      id: clientId,
      roleName: roleName,
    });
    return role;
  };

  /*
    findRoleById = async(roleId) => {
        await this.adminClient.auth(this.config);
        this.adminClient.setConfig({
            realmName: 'samplerealm',
        })
        const role = await this.adminClient.roles.findOneById({
            name: roleName
        })
        return role;
    }
    */

  updateRole = async (clientId, roleName, delta) => {
    const updatedRole = await this.adminClient.clients.updateRole(
      {
        id: clientId,
        roleName: roleName,
      },
      delta
    );
    return updatedRole;
  };

  deleteRoleByName = async (clientId, roleName) => {
    await this.adminClient.clients.delRole({
      id: clientId,
      roleName: roleName,
    });
  };

  deleteRoleById = async (roleId) => {
    await this.adminClient.roles.delById({
      id: roleId,
    });
  };

  addRoleMappings = async (userId, clientUid, userRoles) => {
    await this.adminClient.users.addClientRoleMappings({
      id: userId,
      clientUniqueId: clientUid,
      roles: userRoles,
      /* roles should be in such format
            [{
                id: roleId
                name: roleName
            },{
                ..
            }]
            */
    });
  };

  getAllRoleMappings = async (userId, clientUid) => {
    const roles = await this.adminClient.users.listClientRoleMappings({
      id: userId,
      clientUniqueId: clientUid,
    });
    return roles;
  };

  deleteRoleMappings = async (userId, clientUid, userRoles) => {
    await this.adminClient.users.delClientRoleMappings({
      id: userId,
      clientUniqueId: clientUid,
      roles: userRoles,
      /* roles should be in such format
            [{
                id: roleId
                name: roleName
            },{
                ..
            }]
            */
    });
  };

  /* Group Functions */

  createGroup = async (groupName) => {
    const newGroup = await this.adminClient.groups.create({
      name: groupName,
    });
  };

  getGroupByName = async (groupName) => {
    const groups = await this.adminClient.groups.find();
    const group = groups.filter((group) => group.name == groupName);
    return group[0];
  };

  getGroupById = async (groupId) => {
    const group = await this.adminClient.groups.findOne({ id: groupId });
    return group;
  };

  getAllGroups = async () => {
    const groupList = await this.adminClient.groups.find();
    return groupList;
  };

  deleteGroup = async (groupId) => {
    const deletedGroup = await this.adminClient.groups.del({
      id: groupId,
    });
  };

  addClientRoleMappings = async (clientId, groupId, roles) => {
    try {
      await this.adminClient.groups.addClientRoleMappings({
        id: groupId,
        clientUniqueId: clientId,
        roles: roles,
      });
    } catch (err) {
      console.log("problem executing this function");
    }
  };

  getUserRoleMappings = async (userId) => {
    try {
      if (this.validUserId(userId)) {
        const res = await this.adminClient.users.listRoleMappings({
          id: userId,
        });
        return res;
      } else {
        return null;
      }
    } catch (err) {
      return null;
    }
  };

  getUserGroupMappings = async (userId) => {
    try {
      if (this.validUserId(userId)) {
        const groups = await this.adminClient.users.listGroups({
          id: userId,
        });
        return groups;
      } else {
        return null;
      }
    } catch (err) {
      return null;
    }
  };
}
