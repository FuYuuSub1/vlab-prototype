import React, { Component } from "react";
import Button from "@mui/material/Button";

export default (props) => {
  const cellValue = props.valueFormatted ? props.valueFormatted : props.value;

  const buttonClicked = () => {
    alert(`${cellValue}`);
  };

  return (
    <span>
      <Button variant="outlined" onClick={() => buttonClicked()}>
        Deploy
      </Button>
    </span>
  );
};
