import React, { useState } from 'react'
import AuthorizedFunction from '../../helpers/AuthorizedFunction';
import CourseView from '../Views/CourseView';
import Frame from 'react-frame-component';
import { createPortal } from 'react-dom';



function OtherPage(){
    return (
        <div>
            <iframe src="http://localhost:9090/" width="100%" height="650px"></iframe>
        </div>
    )

}
  
export default OtherPage;
