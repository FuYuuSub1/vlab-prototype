import { ConnectionConfig } from '@keycloak/keycloak-admin-client/lib/client';
import { Credentials } from '@keycloak/keycloak-admin-client/lib/utils/auth';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as chaiSubset from 'chai-subset';
import { KeycloakUtils, KeycloakUtilsError } from '../src/utils/keycloak';
import faker from '@faker-js/faker';
import * as secrets from './configs/secrets.test.json'

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(chaiSubset);

let keycloakUtils: KeycloakUtils;

describe("Keycloak", function () {
    let firstName = faker.name.firstName();
    let lastName = faker.name.lastName();
    let username = faker.internet.userName(firstName, lastName);
    let email = faker.internet.email(firstName, lastName);

    const testGroupName = "testGroupName";
    const testClientRole = "testClientRole";
    const clientName = "vlab-controller";
    const nonExistGroup = "nonExistGroup";
    const nonExistRole = "nonExistRole";
    const nonExistUsername = "nonExistUsername";
    const nonExistClient = "nonExistClient";

    before(async () => {
        const connectionConfig: ConnectionConfig = {
            baseUrl: secrets.keycloak.url,
            realmName: secrets.keycloak.realm
        }

        const credential: Credentials = {
            grantType: "client_credentials",
            clientId: "admin-cli",
            clientSecret: secrets.keycloak.adminSecret
        }
        keycloakUtils = new KeycloakUtils(connectionConfig, credential);
        await keycloakUtils.connect();
    })

    after(() => {
        keycloakUtils.close();
    });

    it("Create sample user", async () => {
        let user = await keycloakUtils.createUser({
            username,
            email,
            firstName,
            lastName,
            attributes: {quota: 2}
        });
        expect(user).to.have.property("id");
    });

    it("Try to create conflict email sample user", async () => {
        let newUsername = faker.internet.userName();
        let newFirstName = faker.name.firstName();
        let newLastName = faker.name.lastName();
        await expect(keycloakUtils.createUser({
            username: newUsername,
            email: email,
            firstName: newFirstName,
            lastName: newLastName,
            attributes: {quota: 2}
        })).to.be.eventually.rejectedWith(KeycloakUtilsError, "User exists with same email");
    });

    it("Get sample user detail by username", async () => {
        expect(await keycloakUtils.getUserByName(username)).to.be.exist;
    });

    it("Try to get non-exist user by username", async () => {
        await expect(keycloakUtils.getUserByName(nonExistUsername)).to.be.eventually.rejectedWith(KeycloakUtilsError, "non-existent user")
    });

    it("find sample user", async () => {
        expect(await keycloakUtils.findUsers({
            username
        }, true)).to.be.ok;
        expect(await keycloakUtils.findUsers({
            email
        }, true)).to.be.ok;
        expect(await keycloakUtils.findUsers({
            firstName
        }, true)).to.be.ok;
        expect(await keycloakUtils.findUsers({
            lastName
        }, true)).to.be.ok;
        expect(await keycloakUtils.findUsers({
            username: username.substring(2)
        })).to.be.ok;
        expect(await keycloakUtils.findUsers({
            email: email.split("@")[0]
        })).to.be.ok;
        expect(await keycloakUtils.findUsers({
            firstName: firstName.substring(2)
        })).to.be.ok;
        expect(await keycloakUtils.findUsers({
            lastName: lastName.substring(2)
        })).to.be.ok;
        expect(await keycloakUtils.findUsers({
            email: "non-exist@test.com"
        })[0]).to.not.be.ok;
        expect(await keycloakUtils.findUsers({
            email: "non-exist@test.com"
        }, true)[0]).to.not.be.ok;
    });

    it("List all users", async () => {
        let userList = await keycloakUtils.listAllUsers();
        expect(userList).to.not.be.empty;
    });

    it("Create sample group", async () => {
        let group = await keycloakUtils.createGroup(testGroupName);
        expect(group).has.property("id");
    });

    it("Try to create same sample group again", async () => {
        await expect(keycloakUtils.createGroup(testGroupName)).to.be.eventually.rejectedWith(KeycloakUtilsError, "already exists");
    });

    it("Create sample client role", async () => {
        let role = await keycloakUtils.createClientRole(testClientRole, clientName);
        expect(role).has.property("id")
    });

    it("Try to create sample client role again", async () => {
        await expect(keycloakUtils.createClientRole(testClientRole, clientName)).to.be.eventually.rejectedWith(KeycloakUtilsError, "already exists");
    });

    it("Try to create client role in non-existent client", async () => {
        await expect(keycloakUtils.createClientRole(testClientRole, nonExistClient)).to.be.eventually.rejectedWith(KeycloakUtilsError, "non-exist client");
    });

    it("Assign client role to sample group", async () => {
        await expect(keycloakUtils.assignClientRoleToGroup(testClientRole, testGroupName, clientName)).not.to.be.eventually.rejected;
        let group = await keycloakUtils.getGroupByName(testGroupName);
        expect(group).has.nested.property(`clientRoles.${clientName}`).that.deep.equals([testClientRole]);
    });

    it("Try to assign client role to non-exist group", async () => {
        await expect(keycloakUtils.assignClientRoleToGroup(testClientRole, nonExistGroup, clientName)).to.be.eventually.rejectedWith(KeycloakUtilsError, "non-existent group");
    });

    it("Try to assign non-exist client role to sample group", async () => {
        await expect(keycloakUtils.assignClientRoleToGroup(nonExistRole, testGroupName, clientName)).to.be.eventually.rejectedWith(KeycloakUtilsError, "non-exist client role");
    });

    it("Try to assign client role from non-exist client", async () => {
        await expect(keycloakUtils.assignClientRoleToGroup(nonExistRole, testGroupName, clientName)).to.be.eventually.rejectedWith(KeycloakUtilsError, "non-exist client");
    });

    it("Assign user to sample group", async () => {
        await expect(keycloakUtils.assignUserToGroup(username, testGroupName)).not.to.be.eventually.rejected;
        let user = await keycloakUtils.getUserByName(username);
        let groups = await keycloakUtils.listUserGroups(user);
        expect(groups).containSubset([{
            name: testGroupName,
            clientRoles: {
                [clientName]: [testClientRole]
            }
        }]);
    });

    it("Try to assign user to non-exist group", async () => {
        await expect(keycloakUtils.assignUserToGroup(username, nonExistGroup)).to.be.eventually.rejectedWith(KeycloakUtilsError, "non-existent group");
    });

    it("List group members", async () => {
        expect(await keycloakUtils.findGroupMembers(testGroupName)).length.to.be.greaterThanOrEqual(1);
    })

    it("Prune users", async () => {
        let newFirstName = faker.name.firstName();
        let newLastName = faker.name.lastName();
        let newUsername = faker.internet.userName(newFirstName, newLastName);
        let newEmail = faker.internet.email(newFirstName, newLastName);
        let user = await keycloakUtils.createUser({
            username: newUsername,
            email: newEmail,
            firstName: newFirstName,
            lastName: newLastName,
            attributes: {quota: 2}
        });
        expect(user).to.have.property("id");
        let pruneList = await keycloakUtils.prune();
        expect(pruneList).to.containSubset([{id: user.id}]);
    })

    it("Remove user from group", async () => {
        await expect(keycloakUtils.removeUserFromGroup(username, testGroupName)).not.to.be.eventually.rejected;
        let user = await keycloakUtils.getUserByName(username);
        let groups = await keycloakUtils.listUserGroups(user);
        expect(groups).to.be.empty;
    });

    it("Try to remove user from non-exist group",async () => {
        await expect(keycloakUtils.removeUserFromGroup(username, nonExistGroup)).to.be.eventually.rejectedWith(KeycloakUtilsError, "non-existent group");
    })

    it("Remove client role from group", async () => {
        await expect(keycloakUtils.removeClientRoleFromGroup(testClientRole, testGroupName, clientName)).not.to.be.eventually.rejected;
        let group = await keycloakUtils.getGroupByName(testGroupName);
        expect(group).does.not.have.nested.property(`clientRoles.${clientName}`)
    });

    it("Try to remove client role from non-exist group", async () => {
        await expect(keycloakUtils.removeClientRoleFromGroup(testClientRole, nonExistGroup, clientName)).to.be.eventually.rejectedWith(KeycloakUtilsError, "non-existent group");
    });

    it("Try to remove non-exist client role from sample group", async () => {
        await expect(keycloakUtils.removeClientRoleFromGroup(nonExistRole, testGroupName, clientName)).to.be.eventually.rejectedWith(KeycloakUtilsError, "non-exist client role");
    });

    it("Try to remove client role from sample group but client is non-existent", async () => {
        await expect(keycloakUtils.removeClientRoleFromGroup(nonExistRole, testGroupName, clientName)).to.be.eventually.rejectedWith(KeycloakUtilsError, "non-exist client");
    });

    it("Delete sample client role", async () => {
        await expect(keycloakUtils.deleteClientRole(testClientRole, clientName)).not.to.be.eventually.rejected;
    });

    it("Try to delete sample client role again", async () => {
        await expect(keycloakUtils.deleteClientRole(testClientRole, clientName)).to.be.eventually.rejectedWith(KeycloakUtilsError, "Could not find role");
    });

    it("Delete user by username", async () => {
        await expect(keycloakUtils.deleteUserByName(username)).not.to.be.eventually.rejected;
    });

    it("Try to delete user by username again", async () => {
        await expect(keycloakUtils.deleteUserByName(username)).to.be.eventually.rejectedWith(KeycloakUtilsError, "non-existent user");
    });

    it("Delete sample group", async () => {
        await expect(keycloakUtils.deleteGroupByName(testGroupName)).not.to.be.eventually.rejected;
    });

    it("Try to delete sample group again", async () => {
        await expect(keycloakUtils.deleteGroupByName(testGroupName)).to.be.eventually.rejectedWith(KeycloakUtilsError, "non-existent group");
    });
})