import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import "dotenv/config";
import bodyParser from "body-parser";
import yaml from "js-yaml";
import fs from "fs";
import multer from "multer";
import fileUpload from "express-fileupload";
import admClient from "./middleware/admClient.js";
import KcAdminClient from "@keycloak/keycloak-admin-client";
import CourseInfo from "./models/CourseInfo.js";
import Student from "./models/Student.js";
import c2j from "csvtojson";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
  })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(fileUpload());

mongoose.connect(process.env.DB_CONNECTION, () =>
  console.log("Connected to Database")
);

const clientConfig = {
  baseUrl: "http://127.0.0.1:8080/auth",
  realmName: "test",
  requestConfig: {},
};

let authConfig = {
  username: "admin",
  password: "password",
  grantType: "password",
  clientId: "admin-cli",
};

let userdata = {
  realm: "test",
  username: "test_user2",
  email: "test@user2.com",
};

let adminClient = new KcAdminClient.default(authConfig);
let tokenClient = new KcAdminClient.default(authConfig);

let adminAgent = new admClient(authConfig);
adminAgent.refreshToken();
setInterval(async () => adminAgent.refreshToken(), 58 * 1000);

adminClient.setConfig({
  realmName: "test",
});

tokenClient.setConfig({
  realmName: "master",
});

const users = async () => {
  const users = await adminClient.users.find();
  await console.log(users);
};

const refreshToken = async () => {
  try {
    await tokenClient.auth(authConfig);
    adminClient.accessToken = tokenClient.accessToken;
    adminClient.refreshToken = tokenClient.refreshToken;
  } catch (error) {
    console.log({ error });
  }
};

refreshToken();

app.get("/getusers", async (req, res) => {
  try {
    const users = await adminAgent.getAllUsers();
    res.send(users);
  } catch (e) {
    res.send(e);
  }
});

app.get("/getuser/:name", async (req, res) => {
  const { name } = req.params;
  try {
    const user = await adminAgent.getUserByName(name);
    res.send(user);
  } catch (e) {
    res.send(e);
  }
});

app.get("/", (req, res) => {
  res.send("Hello");
});

app.get("/posts", (req, res) => {
  res.send("Posts");
});

app.post("createusers", (req, res) => {
  const studentCsv = req.files.StudentCsv;
  uploadPath = "./Uploads/" + studentCsv.name;
  studentCsv.mv(uploadPath, function (error) {
    if (error) {
      console.log(error);
      return { error: "Error" };
    }
  });
});

let userInfo = {
  realm: "test",
  username: "Bob",
  email: "Bob@b.com",
  firstName: "Bob",
  lastName: "B",
  enabled: true,
  attributes: {
    role: "teacher",
  },
};

app.post("/createuserweb", async (req, res) => {});

app.get("/exportcoursejson/:sid", async (req, res) => {
  const { sid } = req.params;
  try {
    const course = await CourseInfo.find(
      { _id: sid },
      "-_id -__v -Students -OwnerUserId -OwnerUserName -OwnerRole -CourseEndDate"
    ).exec(function (err, course) {
      return res.send(course);
    });
  } catch (e) {
    console.log(e.message);
  }
});

app.post("/createuserraw", async (req, res) => {
  let newUser = await adminAgent.createUser(userInfo);
  let userInfoWithKcId = userInfo;
  userInfoWithKcId["keycloakId"] = newUser.id;
  var newStudent = new Student(userInfoWithKcId);
  newStudent.save();
  res.send(userInfoWithKcId);
});

let userdata2 = 
{
  realm: 'test',
  username: 'Cindy',
  email: 'cindy@c.com',
  firstName: 'Cindy',
  lastName: 'c'
}

app.post("/createcourse", (req, res) => {
  const theFile = req.files.LabTemplate;
  uploadPath = "./Uploads/" + theFile.name;
  theFile.mv(uploadPath, function (error) {
    if (error) {
      console.log(error);
      return { error: "Error" };
    }
  });
  var newCourseInfo = new CourseInfo({
    OwnerUserId: req.body.OwnerUserId,
    OwnerRole: req.body.OwnerRole,
    OwnerUserName: req.body.OwnerUserName,
    CourseId: req.body.CourseId,
    CourseName: req.body.CourseName,
    MaxSession: req.body.MaxSession,
    StorageQuota: req.body.StorageQuota,
    CourseEndDate: req.body.CourseEndDate,
    LabTemplate: req.files.LabTemplate,
    Status: "Inactive",
  });
  newCourseInfo.save();
  res.send("OK");
});

app.post("/createcoursebyjson", (req, res) => {
  const theFile = req.files.CourseJsonFile;
  const uploadPath = "./Uploads/" + theFile.name;
  theFile.mv(uploadPath, function (error) {
    if (error) {
      console.log(error);
      return { error: "Error" };
    }
  });

  //var newCourseInfo = newCourseInfo(theFile[0]);
  res.send("OK");
});

function csvJSON(csv) {
  var lines = csv.split("\n");

  var result = [];

  var headers = lines[0].split(",");

  for (var i = 1; i < lines.length; i++) {
    var obj = {};
    var currentline = lines[i].split(",");
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = currentline[j];
    }
    result.push(obj);
  }

  //return result; //JavaScript object
  return JSON.stringify(result); //JSON
}

app.post("/addstudentstocourse/:sid", async (req, res) => {
  const { sid } = req.params;
  const theFile = req.files.StudentCsvFile;
  const uploadPath = "./Uploads/" + sid + "_" + theFile.name;
  const client = await adminAgent.getClientByName('react-test');
  await theFile.mv(uploadPath, function (error) {
    if (error) {
      res.send(error);
    }
  });
  const jsonArray = await c2j().fromFile(uploadPath);
  try {
    await CourseInfo.where({ _id: sid }).update({});
  } catch (e) {
    res.send(e);
  }
  jsonArray.forEach(function(obj){
    obj['realm']='test';
    obj['attributes'] = {role: obj.role}
    delete obj['role'];
    obj['enabled']=true;
    adminAgent.createUser(obj);
    if(obj['attributes'].role === "student"){
      adminAgent.addClientRoleMappings(client.id, )
    }
  })

  console.log(client.id);

  res.send("OK");
});

app.get("/ownnotmorethanfivecourses/", async (req, res) => {
  const { sid } = req.params;
  const listOfCourses = await findAllCourses(sid);
  if (listOfCourses.length <= 5) {
    res.send(true);
  } else {
    res.send(false);
  }
});

app.post("/addStudentsToCourse/:courseid", async (req, res) => {
  const { courseid } = req.params;
  try {
    await CourseInfo.where({ _id: courseid }).update({});
  } catch (e) {
    res.send(e);
  }
});

async function findAllCourses(sid) {
  if 
  try {
    const listOfCourses = await CourseInfo.find(
      { OwnerUserId: sid },
      "_id CourseId CourseName OwnerUserName Status"
    ).exec();
    console.log(listOfCourses);
    return listOfCourses;
  } catch (e) {
    console.log(e.message);
  }
}

app.get("/availablecourses/:sid", async (req, res) => {
  const { sid } = req.params;
  const listOfCourses = await findAllCourses(sid);
  res.send(listOfCourses);
});

app.listen(4000);
