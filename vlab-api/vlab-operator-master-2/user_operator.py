import keycloak
import urllib3
import csv
import traceback

from concurrent.futures import ThreadPoolExecutor
from keycloak.exceptions import KeycloakGetError, KeycloakOperationError
from kubernetes_operator import apply, create_user_namespace, delete_user_namespace

class VLabUserOperatorException(RuntimeError):
    def __init__(self, message):
        super().__init__(message)
        self.message = message
class VLabUserOperator:

    def __init__(self, k8s_user_resources_descriptions, k8s_user_namespace_prefix, kc_auth_url, kc_admin_secret_key, kc_realm_name, kc_client_name, kc_default_password=None):
        urllib3.disable_warnings()

        self.keycloak_admin = keycloak.KeycloakAdmin(server_url=kc_auth_url, 
                    client_id="master-realm",
                    client_secret_key=kc_admin_secret_key,
                    user_realm_name="master", 
                    verify=False,
                    auto_refresh_token=['get', 'put', 'post', 'delete'])
        if not self._kc_is_realm_exist(kc_realm_name):
            self._kc_create_realm(realm_name=kc_realm_name)
        self.keycloak_admin.realm_name = kc_realm_name

        self.k8s_user_resources_descriptions = k8s_user_resources_descriptions
        self.k8s_user_namespace_prefix = k8s_user_namespace_prefix
        self.kc_auth_url = kc_auth_url
        self.kc_admin_secret_key = kc_admin_secret_key
        self.kc_realm_name = kc_realm_name
        self.kc_default_password = kc_default_password
        self.kc_client_id = self._kc_create_client(kc_client_name)
        self.kc_super_admin_group_id = self._kc_create_group("super_admin")
        self._kc_create_role("superadmin")
        self._kc_create_role("admins")

    def _apply_csv(self, csv_path):
        with open(csv_path, newline='') as csv_file:
            data = csv.DictReader(csv_file)
            data = list(data)
        return data
    
    def _create_users(self, course_code, csv_path):
        new_students = []
        new_teachers = []

        def create_and_assign(self, row, course_code):
            username = str.lower(row["username"])
            course_code = str.lower(course_code)
            role = row.pop("role")
            try:
                user_id = self._kc_create_user(row)
                if role != "teacher":
                    self._kc_assign_user_to_group(username, course_code, "student")
                else:
                    self._kc_assign_user_to_group(username, course_code, "teacher")
                if user_id:
                    self._k8s_create_user_resources(username)
                    return role, username
            except Exception as e:
                traceback.print_exc()
        
        def result_process(task):
            result = task.result()
            if result:
                if result[0] != 'teacher':
                    new_students.append(result[1])
                else:
                    new_teachers.append(result[1])

        csv_dict = self._apply_csv(csv_path)
        if not csv_dict:
            return new_students, new_teachers
        with ThreadPoolExecutor(max_workers=16) as executor:
            for row in csv_dict:
                future = executor.submit(create_and_assign, self, row, course_code).add_done_callback(result_process)
        return csv_dict, new_students, new_teachers
    
    def _delete_users(self, user_list, delete_anyway=False):
        if not user_list:
            return [], []
        deleted_user = []
        remained_user = []
        for user in user_list:
            if not user:
                continue
            user_id = user["id"]
            username = user["username"]
            if delete_anyway:
                self._kc_remove_user(user_id)
                self._k8s_delete_user_resources(username)
                deleted_user.append(username)
            else:
                user_group = self._kc_get_user_groups(user_id)
                if len(user_group) <= 0:
                    self._kc_remove_user(user_id)
                    self._k8s_delete_user_resources(username)
                    deleted_user.append(username)
                else:
                    remained_user.append(username)

        return deleted_user, remained_user

    def _kc_get_group_id(self, group_name):
        group = self.keycloak_admin.get_group_by_path('/' + group_name)
        if (group is not None):
            return group["id"]
        else:
            return ""
    
    def _kc_get_client_id(self, client_name):
        return self.keycloak_admin.get_client_id(client_name)
    
    def _kc_get_user_id(self, username):
        return self.keycloak_admin.get_user_id(username)

    def _kc_get_user_groups(self, user_id):
        return self.keycloak_admin.get_user_groups(user_id)
    
    def _kc_get_user_by_username(self, username):
        result = self.keycloak_admin.get_users(query={"username": username})
        if result:
            return result[0]
    
    def _kc_get_group_members(self, group_id):
        if group_id:
            return self.keycloak_admin.get_group_members(group_id)
    
    def _kc_is_realm_exist(self, realm_name):
        for realm in self.keycloak_admin.get_realms():
           if realm["id"] == realm_name:
               return True
        return False

    def _kc_create_realm(self, realm_name):
        self.keycloak_admin.create_realm(payload={"id": realm_name, "realm": realm_name, "enabled": True, "displayName": "PolyU Virtual Labs"}, skip_exists=True)

    def _kc_create_user(self, config_dict):
        password = self.kc_default_password if self.kc_default_password else str.lower(config_dict["username"])
        config_dict["enabled"] = True
        config_dict["credentials"] = [{"value": password, "type": "password", "temporary": True}]
        try:
            return self.keycloak_admin.create_user(config_dict, exist_ok=False)
        except KeycloakGetError as e:
            if e.response_code == 409:
                print("User {} exists".format(config_dict["username"]))
                return ""
            else:
                raise
    
    def _kc_create_client(self, client_name):
        self.keycloak_admin.create_client({
            "clientId": client_name, 
            "enabled": True, 
            "clientAuthenticatorType": "client-secret",
            "redirectUris": ["*"],
            "directAccessGrantsEnabled": True,
            "attributes":{"backchannel.logout.session.required": True}
            }, skip_exists=True)
        return self._kc_get_client_id(client_name)
    
    def _kc_create_group(self, group_name):
        self.keycloak_admin.create_group(payload={"name": group_name}, skip_exists=True)
        return self._kc_get_group_id(group_name)

    def _kc_create_role(self, role_name):
        self.keycloak_admin.create_client_role(
            client_role_id=self.kc_client_id,
            payload={"name": role_name, "clientRole": True},
            skip_exists=True)
        role_id, _= self._kc_assign_group_to_client_roles(role_names=role_name, group_name="super_admin")
        return role_id
    
    def _kc_remove_role(self, role_name):
        try:
            self.keycloak_admin.delete_client_role(client_role_id=self.kc_client_id,role_name=role_name)
        except KeycloakGetError as e:
            if e.response_code != 404:
                raise KeycloakOperationError from e
    
    def _kc_remove_group(self, group_id):
        if group_id:
            self.keycloak_admin.delete_group(group_id)

    def _kc_remove_user(self, user_id):
        self.keycloak_admin.delete_user(user_id)
    
    def _kc_remove_user_from_group(self, user_id, group_id):
        self.keycloak_admin.group_user_remove(user_id, group_id)
    
    def _kc_assign_group_to_client_roles(self, role_names, group_name):
        group_id = self._kc_get_group_id(group_name)
        role_names = role_names if isinstance(role_names, list) else [role_names]
        role_payload = []
        for role_name in role_names:
            role_id = self.keycloak_admin.get_client_role_id(client_id=self.kc_client_id, role_name=role_name)
            role_payload.append({"id": role_id, "name": role_name, "clientRole": True})
        self.keycloak_admin.assign_group_client_roles(
            group_id=group_id, 
            client_id=self.kc_client_id,
            roles=role_payload)
        return role_id, group_id
    
    def _kc_assign_user_to_group(self, username, course_code, role):
        user_id = self._kc_get_user_id(username)
        group_id = self._kc_get_group_id(course_code + "_" + role)
        self.keycloak_admin.group_user_add(user_id, group_id)
    
    def _k8s_create_user_resources(self, username):
        if self.k8s_user_namespace_prefix:
            namespace = self.k8s_user_namespace_prefix + "-" + username
        else:
            namespace = username
        create_user_namespace(namespace)
        for y in self.k8s_user_resources_descriptions:
            apply(body=y, namespace=namespace)
    
    def _k8s_delete_user_resources(self, username):
        if self.k8s_user_namespace_prefix:
            namespace = self.k8s_user_namespace_prefix + "-" + username
        else:
            namespace = username
        delete_user_namespace(namespace)

    def create_course(self, course_code):
        student_group = course_code + "_student"
        teacher_group = course_code + "_teacher"
        self._kc_create_role(course_code)
        self._kc_create_group(student_group)
        self._kc_create_group(teacher_group)
        self._kc_assign_group_to_client_roles(role_names=course_code, group_name=student_group)
        self._kc_assign_group_to_client_roles(role_names=[course_code, "admins"], group_name=teacher_group)
    
    def import_user(self, course_code, csv_path=''):
        if not (self._kc_get_group_id(course_code + "_student") and self._kc_get_group_id(course_code + "_teacher")):
            raise VLabUserOperatorException("Course {} is not existed".format(course_code))
        if csv_path:
            records, created_students, created_teachers = self._create_users(course_code, csv_path)
            return records, created_students, created_teachers
        else:
            return [], [], []

    def remove_course(self, course_code, delete_users=True):
        student_group = course_code + "_student"
        student_group_id = self._kc_get_group_id(student_group)
        teacher_group = course_code + "_teacher"
        teacher_group_id = self._kc_get_group_id(teacher_group)
        students = self._kc_get_group_members(student_group_id)
        teachers = self._kc_get_group_members(teacher_group_id)
        self._kc_remove_group(student_group_id)
        self._kc_remove_group(teacher_group_id)
        self._kc_remove_role(course_code)
        if delete_users:
            deleted_students, remained_students = self._delete_users(students)
            deleted_teachers, remained_teachers = self._delete_users(teachers)
            return deleted_students, remained_students, deleted_teachers, remained_teachers
        else:
            return [], students, [], teachers
    
    def remove_user_from_course(self, course_code, csv_path, delete_users=True):
        records = self._apply_csv(csv_path)
        users = []
        for record in records:
            username = record["username"]
            user = self._kc_get_user_by_username(username)
            if not user:
                continue
            users.append(user)
            user_id = user["id"]
            user_groups_id = list(map(lambda x: x["id"] if x["name"].split("_")[0] == course_code else None, self._kc_get_user_groups(user_id)))
            for id in user_groups_id:
                if id:
                    self._kc_remove_user_from_group(user_id, id)
        if delete_users:
            deleted_users, remained_users = self._delete_users(users)
            return records, users, deleted_users, remained_users
        else:
            return records, users, [], users

    def remove_users(self, csv_path):
        records = self._apply_csv(csv_path)
        users = [self._kc_get_user_by_username(x["username"]) for x in records]
        deleted_users, _ = self._delete_users(users, delete_anyway=True)
        return records, users, deleted_users

    def prune(self):
        users = self.keycloak_admin.get_users()
        deleted_users, remained_users = self._delete_users(users)
        return deleted_users, remained_users
