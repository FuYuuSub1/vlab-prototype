import React, { useState, useEffect, useMemo } from "react";
import AuthorizedFunction from "../../helpers/AuthorizedFunction";
import { useKeycloak } from "@react-keycloak/web";
import axios from "axios";
import { AgGridReact } from "ag-grid-react";
import Button from "@mui/material/Button";
import ImportCourseDialog from "../Props/ImportCourseDialog";

import "ag-grid-community/dist/styles/ag-grid.css";
import "ag-grid-community/dist/styles/ag-theme-alpine.css";
import BtnAddStudentRenderer from "../Props/BtnAddStudentRenderer.jsx";
import BtnEditCourseRenderer from "../Props/BtnEditCourseRenderer.jsx";
import BtnDeployCourseRenderer from "../Props/BtnDeployCourseRenderer.jsx";
import BtnExportCourseRenderer from "../Props/BtnExportCourseRenderer"

const CourseView = () => {
  const { keycloak, initialized } = useKeycloak();
  const sid = keycloak.subject;
  console.log(sid);
  const url = "http://localhost:4000/availablecourses/" + sid;

  const [columnDefs, setColumnDefs] = useState([
    { field: "CourseId" },
    { field: "CourseName" },
    { field: "Status"  },
    { field: "OwnerUserName"},
    { headerName: 'Add Student', field: "_id", cellRenderer: BtnAddStudentRenderer, editable: false },
    { headerName: 'Edit Course', field: "_id", cellRenderer: BtnEditCourseRenderer, editable: false },
    { headerName: 'Deploy Course', field: "_id", cellRenderer: BtnDeployCourseRenderer, editable: false },
    { headerName: 'Export Course', field: "_id", cellRenderer: BtnExportCourseRenderer, editable: false },
  ]);

  const [rowData, setRowData] = useState();

  const defaultColDef = useMemo(() => {
    return {
      editable: true,
      sortable: true,
      flex: 1,
      minWidth: 100,
      filter: true,
      resizable: true,
    };
  }, []);

  useEffect(() => {
    axios.get(url).then((res) => {
      setRowData(res.data);
    });
  }, []);

  return (
    <div className="ag-theme-alpine" style={{ height: 500, width: 1300 }}>
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
      ></AgGridReact>
      {AuthorizedFunction(["SuperAdmin", "Teacher"]) && (
        <div>
          Add a course by JSON file
          <ImportCourseDialog />
        </div>
      )}
    </div>
  );
};

export default CourseView;
