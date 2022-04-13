// Helper styles for demo
import "./App.css";
import { MoreResources, DisplayFormikState } from "./App";

import React from "react";
import { render } from "react-dom";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
} from "react-router-dom";

import MainPage from "./components/Mainpage/Mainpage";
import SubjectPage from "./components/Subjectpage/Subjectpage";
import Navbar from "./components/Navbar/Navbar";
import PrivateRoute from "./helpers/PrivateRoute";
import AdminPage from "./components/AdminPage/Adminpage";
import AddSubjectForm from "./components/Forms/addSubjectForm/AddSubjectForm";
import AddLabForm from "./components/Forms/addLabForm/AddLabForm";
import CreateCourseForm from "./components/Forms/createCourseForm/CreateCourseForm";
import CourseView from "./components/Views/CourseView";
import OtherPage from "./components/OtherPage/OtherPage";
import AddStudentForm from "./components/Forms/addStudentForm/AddStudentForm"



const App = () => {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/subject" element={<PrivateRoute roles={['ClientAdmin', 'SuperAdmin', 'Teacher']}/>}>
          <Route path="/subject" element={<SubjectPage />}>       
          </Route>
          <Route path="/subject/:sid" element={<AddStudentForm />}/>
        </Route>
        <Route path="/other" element={<PrivateRoute roles={['SuperAdmin','ClientAdmin']}/>}>
          <Route path="/other" element={<OtherPage />} />
        </Route>
        <Route path="/admin" element={<PrivateRoute roles={['SuperAdmin']}/>}>
          {/* <Route path="/admin" element={<div><AddSubjectForm/><br/><br/> <br/> <AddLabForm /> </div>} /> */}
          <Route path="/admin" element={<div><CreateCourseForm/> </div>} />
        </Route>
      </Routes>
    </Router>
  );
};




export default App;
