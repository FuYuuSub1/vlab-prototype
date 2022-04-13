import React from "react";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import styled from "styled-components";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, formatDistance, formatRelative, subDays } from "date-fns";
import * as yup from "yup";
import axios from "axios";
import { useKeycloak } from "@react-keycloak/web";

const schema = yup.object().shape({
  labtemplate: yup
    .mixed()
    .required("Please upload a lab template yaml file.")
    .test("type", "File needs to be in yaml format", (value) => {
      return value && value[0].type === "application/x-yaml";
    }),
});

const CreateCourseForm = () => {
  const { keycloak, initialized } = useKeycloak();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    control,
  } = useForm();
  // const { fields, append, remove } = useFieldArray({
  //   control,
  //   name: "items",
  // });
  const onSubmit = (data) => {
    var clientRoles = keycloak.resourceAccess["react-test"].roles;
    var bodyFormData = new FormData();

    bodyFormData.append("OwnerUserId", keycloak.subject);
    if (clientRoles.find((element) => element === "SuperAdmin")) {
      bodyFormData.append("OwnerRole", "SuperAdmin");
    } else {
      bodyFormData.append("OwnerRole", "Teacher");
    }
    console.log(keycloak.idTokenParsed);
    bodyFormData.append(
      "OwnerUserName",
      keycloak.idTokenParsed["preferred_username"]
    );
    bodyFormData.append("CourseId", data.CourseId);
    bodyFormData.append("CourseName", data.CourseName);
    bodyFormData.append("MaxSession", data.MaxSession);
    bodyFormData.append("StorageQuota", data.StorageQuota);
    bodyFormData.append("CourseEndDate", data.CourseEndDate);
    bodyFormData.append("LabTemplate", data.LabTemplate[0]);
    axios({
      method: "post",
      url: "http://localhost:4000/createcourse",
      headers: {
        "Content-Type": "multipart/form-data",
      },
      data: bodyFormData,
    })
      .then((response) => {
        console.log(response.data);
      })
      .catch((error) => {
        console.log(error.data);
      });
  };
  // console.log(errors);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "90vh",
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <input
          type="text"
          placeholder="Course ID"
          {...register("CourseId", { required: true })}
        />
        <input
          type="text"
          placeholder="Course Name"
          {...register("CourseName", { required: true })}
        />
        <h1>Course Config</h1>
        <input
          type="text"
          placeholder="Maximum Session"
          {...register("MaxSession", { required: true })}
        />
        <input
          type="text"
          placeholder="Storage Quota"
          {...register("StorageQuota", { required: true })}
        />

        <Controller
          control={control}
          name="CourseEndDate"
          render={({ field }) => (
            <DatePicker
              className="input"
              placeholderText="Select date"
              onChange={(e) => field.onChange(e)}
              selected={field.value}
              minDate={new Date()}
              maxDate={subDays(new Date(), -180)}
            />
          )}
        />

        <input
          type="file"
          name="LabTemplate"
          {...register("LabTemplate", { required: true })}
        />
        <input type="submit" />
      </form>
    </div>
  );
};
export default CreateCourseForm;
