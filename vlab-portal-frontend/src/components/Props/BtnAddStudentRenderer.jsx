import React, { Component } from "react";
import Button from "@mui/material/Button";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Switch,
} from "react-router-dom";
import CreateCourseForm from "../Forms/createCourseForm/CreateCourseForm";
import AddStudentForm from "../Forms/addStudentForm/AddStudentForm";

export default (props) => {
  const cellValue = props.valueFormatted ? props.valueFormatted : props.value;

  return (
    <span>
      <Link to={`${cellValue}`} element={(props) => (<AddStudentForm {...props} />)}>
        <Button variant="outlined">
          Add Student
        </Button>
      </Link>
    </span>
  );
};
