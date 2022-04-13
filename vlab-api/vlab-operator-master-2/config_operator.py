from io import IOBase
from jinja2.environment import Environment
from jinja2.loaders import FileSystemLoader
from jinja2.runtime import F
from ruamel.yaml import YAML
from pathlib import Path

yaml = YAML()

def load_template(template_name, template_path):
    JINJA_ENVIRONMENT = Environment(
        loader=FileSystemLoader(template_path)
    )
    template = JINJA_ENVIRONMENT.get_template(template_name)
    return template

def load_yaml(yaml_path):
    with open(yaml_path, "r") as f:
        f.seek(0)
        vars = yaml.load(f)
    return vars

def load_yaml_all(yaml_path):
    with open(yaml_path, "r") as f:
        f.seek(0)
        var_list = list(yaml.load_all(f))
    return var_list

def load_specs(context_dict, specs_template_dir):
    teachers_only = str(context_dict["global"].get("teachers_only", "false")).lower() == "true"
    specs_vars = context_dict["specs"]
    specs_id = set()
    specs = []
    for k,v in specs_vars.items():
        spec = load_template(k + ".yml", specs_template_dir).render(context_dict)
        spec = yaml.load(spec)
        if spec["id"] in specs_id:
            continue
        disabled = str(v.get("enabled", "true")).lower() == "false"
        if teachers_only or disabled:
            spec["access-groups"] = ["admins"]
        specs.append(spec)
    return specs

def dump(base_template, context_dict, specs_list, output):
    base_dict = yaml.load(base_template.render(context_dict))
    base_dict["proxy"]["specs"] = specs_list
    if isinstance(output, str):
        yaml.dump(base_dict, Path(output))
    elif isinstance(output, IOBase):
        yaml.dump(base_dict, output)
    else:
        raise IOError("output must be path or file pointer")
