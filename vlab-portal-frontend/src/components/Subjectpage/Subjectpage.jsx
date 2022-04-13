import React from 'react';
import AuthorizedFunction from '../../helpers/AuthorizedFunction';
import CourseView from '../Views/CourseView';



const SubjectPage = () => {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '90vh'
        }}
      >
        <CourseView />
      </div>
    );
  };
  
  export default SubjectPage;
