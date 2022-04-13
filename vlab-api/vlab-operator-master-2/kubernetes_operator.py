from kubernetes import client, config
from kubernetes.client.exceptions import ApiException
from kubernetes.stream import stream
from tempfile import TemporaryFile

import inflection
import tarfile
import time

config.load_kube_config()

def apply_deployment(body, namespace):
    api = client.AppsV1Api()
    name = body["metadata"]["name"]
    resp = None
    try:
        resp = api.read_namespaced_deployment(name, namespace)
    except ApiException as e:
        if e.status != 404:
            raise
    if not resp:
        resp = api.create_namespaced_deployment(namespace, body)
    else:
        resp = api.patch_namespaced_deployment(name, namespace, body)
    return resp

def delete_deployment(body, namespace):
    api = client.AppsV1Api()
    name = body["metadata"]["name"]
    delete_option = client.V1DeleteOptions(propagation_policy="Foreground", grace_period_seconds=5)
    resp = None
    try:
        resp = api.read_namespaced_deployment(name, namespace)
    except ApiException as e:
        if e.status != 404:
            raise
    if resp:
        resp = api.delete_namespaced_deployment(name, namespace, body=delete_option)
    return resp

def apply_service(body, namespace):
    api = client.CoreV1Api()
    name = body["metadata"]["name"]
    resp = None
    try:
        resp = api.read_namespaced_service(name, namespace)
    except ApiException as e:
        if e.status != 404:
            raise
    if not resp:
        resp = api.create_namespaced_service(namespace, body)
    else:
        resp = api.patch_namespaced_service(name, namespace, body)
    return resp

def delete_service(body, namespace):
    api = client.CoreV1Api()
    name = body["metadata"]["name"]
    delete_option = client.V1DeleteOptions(propagation_policy="Foreground", grace_period_seconds=5)
    resp = None
    try:
        resp = api.read_namespaced_service(name, namespace)
    except ApiException as e:
        if e.status != 404:
            raise
    if resp:
        resp = api.delete_namespaced_service(name, namespace, body=delete_option)
    return resp

def apply_ingress(body, namespace):
    api = client.NetworkingV1Api()
    name = body["metadata"]["name"]
    resp = None
    try:
        resp = api.read_namespaced_ingress(name, namespace)
    except ApiException as e:
        if e.status != 404:
            raise
    if not resp:
        resp = api.create_namespaced_ingress(namespace, body)
    else:
        resp = api.patch_namespaced_ingress(name, namespace, body)
    return resp

def delete_ingress(body, namespace):
    api = client.NetworkingV1Api()
    name = body["metadata"]["name"]
    delete_option = client.V1DeleteOptions(propagation_policy="Foreground", grace_period_seconds=5)
    resp = None
    try:
        resp = api.read_namespaced_ingress(name, namespace)
    except ApiException as e:
        if e.status != 404:
            raise
    if resp:
        resp = api.delete_namespaced_ingress(name, namespace, body=delete_option)
    return resp

def apply_persistent_volume_claim(body, namespace):
    api = client.CoreV1Api()
    name = body["metadata"]["name"]
    resp = None
    try:
        resp = api.read_namespaced_persistent_volume_claim(name, namespace)
    except ApiException as e:
        if e.status != 404:
            raise
    if not resp:
        resp = api.create_namespaced_persistent_volume_claim(namespace, body)
    else:
        resp = api.patch_namespaced_persistent_volume_claim(name, namespace, body)
    return resp

def delete_persistent_volume_claim(body, namespace):
    api = client.CoreV1Api()
    name = body["metadata"]["name"]
    delete_option = client.V1DeleteOptions(propagation_policy="Foreground", grace_period_seconds=5)
    resp = None
    try:
        resp = api.read_namespaced_persistent_volume_claim(name, namespace)
    except ApiException as e:
        if e.status != 404:
            raise
    if resp:
        resp = api.delete_namespaced_persistent_volume_claim(name, namespace, body=delete_option)
    return resp
    
def apply_pod(body, namespace):
    api = client.CoreV1Api()
    name = body["metadata"]["name"]
    resp = None
    try:
        resp = api.read_namespaced_pod(name, namespace)
    except ApiException as e:
        if e.status != 404:
            raise
    if not resp:
        resp = api.create_namespaced_pod(namespace, body)
    else:
        resp = api.patch_namespaced_pod(name, namespace, body)
    return resp

def delete_pod(body, namespace):
    api = client.CoreV1Api()
    name = body["metadata"]["name"]
    delete_option = client.V1DeleteOptions(propagation_policy="Foreground", grace_period_seconds=5)
    resp = None
    try:
        resp = api.read_namespaced_pod(name, namespace)
    except ApiException as e:
        if e.status != 404:
            raise
    if resp:
        resp = api.delete_namespaced_pod(name, namespace, body=delete_option)
    return resp

def apply_namespace(body):
    api = client.CoreV1Api()
    name = body["metadata"]["name"]
    resp = None
    try:
        resp = api.read_namespace(name)
    except ApiException as e:
        if e.status != 404:
            raise
    if not resp:
        resp = api.create_namespace(body)
    else:
        phase = resp.status.phase
        if phase == "Active":
            resp = api.patch_namespace(name, body)
        elif phase == "Terminating":
            success = False
            for i in range(5):
                try:
                    time.sleep(i * 5)
                    resp = api.create_namespace(body)
                    success = True
                    break
                except ApiException as e:
                    print("Namespace {} is terminating, retrying {}...".format(name, i))
            if not success:
                raise RuntimeError("Cannot create namespace {}: still waiting for namespace terminated".format(name))
        else:
            raise RuntimeError("Unknown namespace phase detected")
    return resp

def delete_namespace(body):
    api = client.CoreV1Api()
    name = body["metadata"]["name"]
    delete_option = client.V1DeleteOptions(propagation_policy="Background", grace_period_seconds=5)
    resp = None
    try:
        resp = api.read_namespace(name)
    except ApiException as e:
        if e.status != 404:
            raise
    if resp:
        api.delete_namespace(name, body=delete_option)
    return resp

def apply_network_policy(body, namespace):
    api = client.NetworkingV1Api()
    name = body["metadata"]["name"]
    resp = None
    try:
        resp = api.read_namespaced_network_policy(name, namespace)
    except ApiException as e:
        if e.status != 404:
            raise
    if not resp:
        resp = api.create_namespaced_network_policy(namespace, body)
    else:
        resp = api.patch_namespaced_network_policy(name, namespace, body)
    return resp

def delete_network_policy(body, namespace):
    api = client.NetworkingV1Api()
    name = body["metadata"]["name"]
    delete_option = client.V1DeleteOptions(propagation_policy="Foreground", grace_period_seconds=5)
    resp = None
    try:
        resp = api.read_namespaced_network_policy(name, namespace)
    except ApiException as e:
        if e.status != 404:
            raise
    if resp:
        resp = api.delete_namespaced_network_policy(name, namespace, body=delete_option)
    return resp

def apply_stateful_set(body, namespace):
    api = client.AppsV1Api()
    name = body["metadata"]["name"]
    resp = None
    try:
        resp = api.read_namespaced_stateful_set(name, namespace)
    except ApiException as e:
        if e.status != 404:
            raise
    if not resp:
        resp = api.create_namespaced_stateful_set(namespace, body)
    else:
        resp = api.patch_namespaced_stateful_set(name, namespace, body)
    return resp

def delete_stateful_set(body, namespace):
    api = client.AppsV1Api()
    name = body["metadata"]["name"]
    delete_option = client.V1DeleteOptions(propagation_policy="Foreground", grace_period_seconds=5)
    resp = None
    try:
        resp = api.read_namespaced_stateful_set(name, namespace)
    except ApiException as e:
        if e.status != 404:
            raise
    if resp:
        resp = api.delete_namespaced_stateful_set(name, namespace, body=delete_option)
    return resp

def apply(body, **kwargs):
    if not body["kind"]:
        raise RuntimeError("Resource kind cannot be found")
    kind = inflection.underscore(body["kind"])
    return eval("apply_" + kind)(body, **kwargs)

def delete(body, **kwargs):
    if not body["kind"]:
        raise RuntimeError("Resource kind cannot be found")
    kind = inflection.underscore(body["kind"])
    return eval("delete_" + kind)(body, **kwargs)

def copy_to_pod(src_path, dst_path, namespace, pod_name="vlab-controller-configs-0"):
    api = client.CoreV1Api()
    exec_command = ["tar", "xvf", "-", "-C", "/"]
    api_response = stream(
        api.connect_get_namespaced_pod_exec, pod_name, namespace,
        command=exec_command,
        stderr=True, stdin=True,
        stdout=True, tty=False,
        _preload_content=False
    )
    with TemporaryFile() as tar_buffer:
        with tarfile.open(fileobj=tar_buffer, mode="w") as tar:
            tar.add(src_path, dst_path)
        tar_buffer.seek(0)
        commands = []
        commands.append(tar_buffer.read())

        while api_response.is_open():
            api_response.update(timeout=1)
            if api_response.peek_stdout():
                print('STDOUT: {}'.format(api_response.read_stdout()))
            if api_response.peek_stderr():
                print('STDERR: {}'.format(api_response.read_stderr()))
            if commands:
                c = commands.pop(0)
                api_response.write_stdin(c.decode())
            else:
                break
        api_response.close()

def create_user_namespace(namespace):
    metadata = client.V1ObjectMeta(name=namespace, labels={"vl.comp.polyu.edu.hk/is-managed": "true"})
    body = client.V1Namespace(api_version="v1", kind="Namespace", metadata=metadata).to_dict()
    resp = apply(body=body)
    return resp

def delete_user_namespace(namespace):
    metadata = client.V1ObjectMeta(name=namespace)
    body = client.V1Namespace(api_version="v1", kind="Namespace", metadata=metadata).to_dict()
    resp = delete(body=body)
    return resp
