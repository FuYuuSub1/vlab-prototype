import mongoose from "mongoose";

const courseInfoSchema = mongoose.Schema({
  OwnerUserId: String,
  OwnerRole: String,
  OwnerUserName: String,
  CourseId: String,
  CourseName: String,
  MaxSession: Number,
  StorageQuota: Number,
  CourseEndDate: Date,
  LabTemplate: {
    type: Object,
  },
  Status: String,
  Students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],

});

let CourseInfoModel = mongoose.model("CourseInfo", courseInfoSchema);

export default CourseInfoModel;
