# vlab-operator

PolyU Virtual Lab operators and command line interface

## Instruction to startup

Make sure you have `python3.6` (or above) and `pip3` installed.

```
git clone https://gitlab.polyu.edu.hk/vlab/vlab-operator.git
cd vlab-operator
pip3 install -r requirement.txt
chmod +x operator.py
```

Both `python3 operator.py -h` and `./operator.py -h` can start. 

Add this folder (`vlab-operator`) to `PATH` if you like.

## Update specs
- Write your new specs template (if applicable)
- Update specs description YAML `config.yml` (use `specs.{spec_name}.enabled: false` if you don't want students to see it)
- `./operator.py course update -f {your_config}`


## Examples for creating courses and users
```
./operator.py course deploy -f sample-courses/MM5425.yml
./operator.py user import -f sample-courses/MM5425-users.csv -c mm5425 -p mm5425admin


./operator.py course deploy -f sample-courses/MM5425.yml -u sample-courses/MM5425-users.csv


./operator.py course deploy -f sample-courses/comp5112s2.yml -u sample-courses/comp5112s2-users.csv -p docker123
```