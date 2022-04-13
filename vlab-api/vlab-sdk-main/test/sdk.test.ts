import { expect } from 'chai';
import * as path from 'path';
import { VLabSDK } from  '../src/index'
import { CourseConfig } from '../src/model/VLabContext';
import * as _courseConfig from './configs/courseConfig.test.json'
import * as labEnvironments from './configs/labEnvironments.test.json'

let vlabSDK: VLabSDK
describe("SDK", function() {
    before(async () => {
        vlabSDK = new VLabSDK(path.join(__dirname, './configs/secrets.test.json'), path.join(__dirname, './configs/config.test.json'));
        await vlabSDK.init();
    })

    after(async() => {
        await vlabSDK.close();
    })

    it("init kubernetes environment", async () => {
        await vlabSDK.initKubernetesEnvironment();
    })

    it("deploy course", async () => {
        let courseConfig = _courseConfig as CourseConfig;
        await vlabSDK.deployCourse(courseConfig, labEnvironments)
    })

    it("list courses", async () => {
        const courses = await vlabSDK.listCourses();
        expect(courses).length.to.be.greaterThan(0);
    });
})