import mongoose from "mongoose";

const studentSchema = mongoose.Schema({
  realm: String,
  keycloakId: String,
  username: String,
  email: String,
  firstName: String,
  lastName: String,
  enabled: Boolean,
  attributes: {
    role: String,
  },
});

let StudentModel = mongoose.model("Student", studentSchema);

export default StudentModel;
