import React from 'react';
import AuthorizedFunction from '../../helpers/AuthorizedFunction';


const AdminPage = () => {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '90vh'
        }}
      >
        <h1>Admin</h1>
        <p></p>
        {AuthorizedFunction(['SuperAdmin']) && <h2>Private Message</h2>}
      </div>
    );
  };
  
  export default AdminPage;
