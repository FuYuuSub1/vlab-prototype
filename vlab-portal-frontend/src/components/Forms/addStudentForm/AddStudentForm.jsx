import React, { useState, useEffect } from "react";
import Button from "@mui/material/Button";

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

export default function AddStudentPage(props) {
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
    });
  };

  const onSubmit = (data) => {
    console.log(data);
    const theFile = data.StudentCsvFile[0];
    const sid = keycloak.subject;
    const theUrl = "http://localhost:4000/addstudentstocourse/" + sid;
    var bodyFormData = new FormData();
    bodyFormData.append("StudentCsvFile", theFile);
    axios({
      method: "post",
      url: theUrl,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      data: bodyFormData,
    });
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <input
          type="file"
          name="StudentCsvFile"
          {...register("StudentCsvFile", { required: true })}
        />
        <input type="submit" />
      </form>
    </div>
  );
}
