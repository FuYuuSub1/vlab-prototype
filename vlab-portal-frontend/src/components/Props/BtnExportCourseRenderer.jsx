import React, { useState, useEffect } from "react";
import Button from "@mui/material/Button";
import axios from "axios";

export default (props) => {
  const cellValue = props.valueFormatted ? props.valueFormatted : props.value;

  const exportJson = (course) => {
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
      JSON.stringify(course)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = cellValue + ".json";
    link.click();
  };

  const buttonClicked = async () => {
    const url = "http://localhost:4000/exportcoursejson/" + cellValue;
    await axios.get(url).then((res) => {
      exportJson(res.data[0]);
    });
  };

  return (
    <span>
      <Button variant="outlined" onClick={() => buttonClicked()}>
        Export
      </Button>
    </span>
  );
};
