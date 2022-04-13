import React, { useState, useEffect } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import OwnNotMoreThanFiveCourses from "../../helpers/CourseRelatedVerificationScheme";

import { useForm, useFieldArray, useWatch } from "react-hook-form";

import * as yup from "yup";
import axios from "axios";
import { useKeycloak } from "@react-keycloak/web";

const schema = yup.object().shape({
  coursejsonfile: yup
    .mixed()
    .required("Please upload a lab template json file.")
    .test("type", "File needs to be in json format", (value) => {
      return value && value[0].type === "application/json";
    }),
});

export default function ImportCourseDialog() {
  const [open, setOpen] = React.useState(false);

  const { keycloak, initialized } = useKeycloak();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    control,
  } = useForm();

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const uploadJsonToServer = (file) => {
    var bodyFormData = new FormData();
    bodyFormData.append("CourseJsonFile", file);
    axios({
      method: "post",
      url: "http://localhost:4000/createcoursebyjson",
      headers: {
        "Content-Type": "multipart/form-data",
      },
      data: bodyFormData,
    })
  }

  const onSubmit = (data) => {
    console.log(data);
    const theFile = data.CourseJsonFile[0]
    const sid = keycloak.subject;
    const theUrl = "http://localhost:4000/ownnotmorethanfivecourses/" + sid;
    axios
      .get(theUrl)
      .then((res) => {
        if(res.data) {
          console.log(res.data);
          uploadJsonToServer(theFile);
        } else {
          console.log("Number of courses exceeds the limitation, please remove some course first")
        }
      })
      .catch((error) => {
        console.log(error.data);
      });

  };

  return (
    <div>
      <Button variant="outlined" onClick={handleClickOpen}>
        Import Course
      </Button>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Import Course</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Upload the course template here.
          </DialogContentText>
          <form onSubmit={handleSubmit(onSubmit)}>
            <input
              type="file"
              name="CourseJsonFile"
              {...register("CourseJsonFile", { required: true })}
            />
            <input type="submit" />
          </form>
        </DialogContent>
        <DialogActions>
          
          <Button onClick={handleClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
