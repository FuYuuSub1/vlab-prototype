#!/usr/bin/env python3
from kubernetes_operator import apply, delete, copy_to_pod
from user_operator import VLabUserOperator
from config_operator import load_yaml, load_yaml_all, load_template, load_specs, dump
from tempfile import NamedTemporaryFile

import argparse
import os

script_dir = os.path.split(os.path.realpath(__file__))[0]

def load_context(user_config_path=None, context_path=None):
    if not context_path:
        context_path = os.path.join(script_dir, "configs/context.yml")
    context = load_yaml(context_path)
    if user_config_path:
        context.update(load_yaml(user_config_path))
        context["global"]["course_id"] = str.lower(context["global"]["course_id"])
    return context

def load_user_operator(context, resources_template_path=None, default_password=None):
    if not resources_template_path:
        resources_template_path = os.path.join(script_dir, "templates/user_resources_template.yml")
    resources_template_name, resources_template_dir = os.path.basename(resources_template_path), os.path.dirname(resources_template_path)
    resources_template = load_template(resources_template_name, resources_template_dir).render(context)
    resources_descriptions = None
    with NamedTemporaryFile() as ntf:
        ntf.write(resources_template.encode("utf-8"))
        ntf.seek(0)
        resources_descriptions = load_yaml_all(ntf.name)
    op = VLabUserOperator(
        k8s_user_resources_descriptions=resources_descriptions,
        k8s_user_namespace_prefix=context["settings"]["proxy"]["user_namespace_prefix"],
        kc_auth_url=context["secrets"]["keycloak"]["url"], 
        kc_admin_secret_key=context["secrets"]["keycloak"]["auth_key"],
        kc_realm_name=context["secrets"]["keycloak"]["realm"], 
        kc_client_name=context["secrets"]["keycloak"]["client"],
        kc_default_password=default_password
    )
    return op

def init_course_resources(operator, course_id):
    operator.create_course(course_id)
    print("{} created successfully".format(course_id))

def user_import(operator, course_id, csv_path):
    records, created_students, created_teachers = operator.import_user(course_id, csv_path)
    if records:
        print("{} records read, {} new students and {} new teachers created successfully".format(len(records), len(created_students), len(created_teachers)))

def user_remove(operator, course_id, csv_path, delete_users):
    records, users, deleted_users, remained_users = operator.remove_user_from_course(course_id, csv_path, delete_users)
    if users:
        if delete_users:
            print("{} records read, {} valid, {} users deleted and {} users remain".format(len(records), len(users), len(deleted_users), len(remained_users)))
        else:
            print("{} records read, removed {} valid users".format(len(records), len(users)))
    else:
        print("No valid records")

def user_delete(operator, csv_path):
    records, users, deleted_users = operator.remove_users(csv_path)
    if users:
        print("{} records read, {} valid, {} users deleted".format(len(records), len(users), len(deleted_users)))
    else:
        print("No valid records")

def user_prune(operator):
    deleted_users, _ = operator.prune()
    print("{} users deleted".format(len(deleted_users)))

def proxy_deploy(context, sp_template_path=None):
    if not sp_template_path:
        sp_template_path=os.path.join(script_dir, "templates/application_deployment.yml")
    sp_template_name, sp_template_dir = os.path.basename(sp_template_path), os.path.dirname(sp_template_path)
    sp_deployment = load_template(sp_template_name, sp_template_dir).render(context)
    namespace = context["settings"]["proxy"]["namespace"]
    with NamedTemporaryFile() as ntf:
        ntf.write(sp_deployment.encode("utf-8"))
        ntf.seek(0)
        for y in load_yaml_all(ntf.name):
            apply(body=y, namespace=namespace)
    course_id = context["global"]["course_id"]
    print("All resources of {} deployed successfully".format(course_id))

def proxy_delete(context, sp_template_path=None):
    if not sp_template_path:
        sp_template_path=os.path.join(script_dir, "templates/application_deployment.yml")
    sp_template_name, sp_template_dir = os.path.basename(sp_template_path), os.path.dirname(sp_template_path)
    sp_deployment = load_template(sp_template_name, sp_template_dir).render(context)
    namespace = context["settings"]["proxy"]["namespace"]
    with NamedTemporaryFile() as ntf:
        ntf.write(sp_deployment.encode("utf-8"))
        ntf.seek(0)
        for y in load_yaml_all(ntf.name):
            delete(body=y, namespace=namespace)
    course_id = context["global"]["course_id"]
    print("All resources of {} deleted successfully".format(course_id))

def proxy_init(context, init_yaml=None):
    if not init_yaml:
        init_yaml=os.path.join(script_dir, "templates/application_config_deployment.yml")
    template_name, template_dir = os.path.basename(init_yaml), os.path.dirname(init_yaml)
    init_yaml = load_template(template_name, template_dir).render(context)
    namespace = context["settings"]["proxy"]["namespace"]
    with NamedTemporaryFile() as ntf:
        ntf.write(init_yaml.encode("utf-8"))
        ntf.seek(0)
        for y in load_yaml_all(ntf.name):
            apply(body=y, namespace=namespace)
    print("Environment initialized")

def course_update(context, base_template_path=None, specs_template_dir=None):
    if not base_template_path:
        base_template_path = os.path.join(script_dir, "templates/application_template.yml")
    if not specs_template_dir:
        specs_template_dir = os.path.join(script_dir, "templates/specs")
    base_template_name, base_template_dir = os.path.basename(base_template_path), os.path.dirname(base_template_path)
    base_template = load_template(base_template_name, base_template_dir)
    specs = load_specs(context, specs_template_dir)
    course_id = context["global"]["course_id"]
    namespace = context["settings"]["proxy"]["namespace"]
    with NamedTemporaryFile() as ntf:
        dump(base_template, context, specs, ntf.name)
        copy_to_pod(ntf.name, "/etc/vlab-controller/config/{}/application.yml".format(course_id), namespace)
    print("{} config pushed".format(course_id))
    
def course_create(context, base_template_path=None, specs_template_dir=None, sp_template_path=None, user_csv=None, default_password=None):
    if not base_template_path:
        base_template_path = os.path.join(script_dir, "templates/application_template.yml")
    if not specs_template_dir:
        specs_template_dir = os.path.join(script_dir, "templates/specs")
    if not sp_template_path:
        sp_template_path = os.path.join(script_dir, "templates/application_deployment.yml")
    if not user_csv:
        user_csv = ""
    course_id = context["global"]["course_id"]
    op = load_user_operator(context, default_password=default_password)
    course_update(context, base_template_path, specs_template_dir)
    proxy_deploy(context, sp_template_path)
    init_course_resources(op, course_id)
    user_import(op, course_id, user_csv)

def course_delete(context, delete_users, sp_template_path=None):
    if not sp_template_path:
        sp_template_path = os.path.join(script_dir, "templates/application_deployment.yml")
    op = load_user_operator(context)
    course_id = context["global"]["course_id"]
    proxy_delete(context, sp_template_path)
    deleted_students, remained_students, deleted_teachers, remained_teachers = op.remove_course(course_id, delete_users)
    print("All users in {} removed successfully".format(course_id))
    if delete_users:
        print("{} students, {} teachers deleted".format(len(deleted_students), len(deleted_teachers)))
        print("{} students, {} teachers remain".format(len(remained_students), len(remained_teachers)))
    
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="PolyU Virtual Lab Command Line Interface")
    parser.add_argument("-t", "--context", help="Customized secret and constant variables YAML")
    parser.add_argument("-b", "--base", help="Customized application.yml template")
    parser.add_argument("-s", "--specs", help="Customized specs template directory")
    parser.add_argument("-y", "--yaml", help="Customized Kubernetes resources YAML for VLabController instance")

    subparsers = parser.add_subparsers(dest="resource", metavar="<resource>", help="The type of resource you want to work on", required=True)

    parser_proxy = subparsers.add_parser("proxy", help="Initial, deploy and delete VLabController instances")
    parser_course = subparsers.add_parser("course", help="Create, update, delete courses")
    parser_user = subparsers.add_parser("user", help="Import, remove, delete users")

    # proxy <command>
    proxy_subparsers = parser_proxy.add_subparsers(dest="command", metavar="<command>", required=True)

    init_proxy = proxy_subparsers.add_parser("init", help="Initialize VLabController configuration environment")    
    init_proxy.add_argument("-f", "--file", help="Kubernetes deployment YAML for initialzation")

    deploy_proxy = proxy_subparsers.add_parser("deploy", help="Deploy VLabController instances")
    deploy_proxy.add_argument("-c", "--course", help="Course name or id", required=True)

    delete_proxy = proxy_subparsers.add_parser("delete", help="Delete VLabController instances")
    delete_proxy.add_argument("-c", "--course", help="Course name or id", required=True)

    # user <command>
    user_subparsers = parser_user.add_subparsers(dest="command", metavar="<command>", required=True)

    import_user = user_subparsers.add_parser("import", help="Import users to your course via .csv file")
    import_user.add_argument("-c", "--course", help="Course name or id", required=True)
    import_user.add_argument("-f", "--csv", help="User csv to import, please follow sample's format", required=True)
    import_user.add_argument("-p", "--password", help="Users' default password, same as username if not specified", default=None)

    remove_user = user_subparsers.add_parser("remove", help="Remove users from specified course via .csv file")
    remove_user.add_argument("-c", "--course", help="Course name or id", required=True)
    remove_user.add_argument("-f", "--csv", help="User csv to remove, please follow sample's format", required=True)
    remove_user.add_argument("-d", "--delete", help="Try to delete users if this flag specified", action="store_true")

    delete_user = user_subparsers.add_parser("delete", help="Delete users anyway via .csv file")
    delete_user.add_argument("-f", "--csv", help="User csv to delete, please follow sample's format", required=True)

    prune_user = user_subparsers.add_parser("prune", help="Delete users not belonging to any course")

    # course <command>
    course_subparsers = parser_course.add_subparsers(dest="command", metavar="<command>", required=True)

    update_course = course_subparsers.add_parser("update", help="Update specs in your courses")
    update_course.add_argument("-f", "--file", help="Description YAML", required=True)

    deploy_course = course_subparsers.add_parser("deploy", help="Deploy your courses")
    deploy_course.add_argument("-f", "--file", help="Specs description YAML", required=True)
    deploy_course.add_argument("-u", "--csv", help="User csv to import, please follow sample's format")
    deploy_course.add_argument("-p", "--password", help="Users' default password, same as username if not specified", default=None)

    delete_course = course_subparsers.add_parser("delete", help="Delete your courses")
    delete_course.add_argument("-c", "--course", help="Course name or id", required=True)
    delete_course.add_argument("-d", "--delete", help="Try to delete users if this flag specified", action="store_true")

    # start parse
    args = parser.parse_args()
    # print(args)

    if args.resource == "proxy":
        context = load_context(context_path=args.context)
        if args.command == "init":
            proxy_init(context, args.file)
        if args.command == "deploy":
            context.update({"global": {"course_id": args.course}})
            proxy_deploy(context, args.yaml)
        if args.command == "delete":
            context.update({"global": {"course_id": args.course}})
            proxy_delete(context, args.yaml)
    if args.resource == "user":
        context = load_context(context_path=args.context)
        operator = load_user_operator(context)
        if args.command == "import":
            operator = load_user_operator(context, default_password=args.password)
            user_import(operator, args.course, args.csv)
        if args.command == "remove":
            user_remove(operator, args.course, args.csv, args.delete)
        if args.command == "delete":
            user_delete(operator, args.csv)
        if args.command == "prune":
            user_prune(operator)
    if args.resource == "course":
        if args.command == "update":
            context = load_context(user_config_path=args.file, context_path=args.context)
            course_update(context, base_template_path=args.base, specs_template_dir=args.specs)
        if args.command == "deploy":
            context = load_context(user_config_path=args.file, context_path=args.context)
            course_create(context, base_template_path=args.base, specs_template_dir=args.specs, sp_template_path=args.yaml, user_csv=args.csv, default_password=args.password)
        if args.command == "delete":
            context = load_context(context_path=args.context)
            context.update({"global": {"course_id": args.course}})
            course_delete(context, args.delete, args.yaml)
