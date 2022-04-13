import { V1ClusterRoleBinding, V1RoleBinding } from '@kubernetes/client-node';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as chaiSubset from 'chai-subset';
import * as _ from 'lodash';
import * as path from 'path';
import * as config from './configs/config.test.json'
import { KubernetesUtils } from '../src/utils/kubernetes'

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(chaiSubset);

let kubernetesUtils: KubernetesUtils;

describe("Kubernetes", function() {
    before(() => {
        kubernetesUtils = new KubernetesUtils();
    })

    it("copy to pod", async () => {
        await kubernetesUtils.cpToPod(config.proxy.namespace, "vlab-controller-configs-0", "vlab-controller-configs", path.join(__dirname, "./templates/application.json.test.art"), "/etc/test.json");
        await kubernetesUtils.cpToPod(config.proxy.namespace, "vlab-controller-configs-0", "vlab-controller-configs", path.join(__dirname, "./templates/"), "/etc/test");
    })
});