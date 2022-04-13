import React from "react";
import {
  Nav,
  NavLink,
  Bars,
  NavMenu,
  NavBtn,
  NavBtnLink,
} from "./NavbarElement";
import { useKeycloak } from "@react-keycloak/web";
import AuthorizedFunction from "../../helpers/AuthorizedFunction";
import Button from '@mui/material/Button';

const Navbar = () => {
  const { keycloak, initialized } = useKeycloak();

  return (
    <>
      <Nav>
        <NavLink to="/">
          <h2>PolyU Vlab</h2>
        </NavLink>
        <Bars />
        <NavMenu>
          <NavLink to="/subject" activestyle="true">
            Subject
          </NavLink>
          <NavLink to="/other" activestyle="true">
            Other
          </NavLink>
          {AuthorizedFunction(["SuperAdmin"]) && (
            <NavLink to="/admin" activestyle="true">
              Admin
            </NavLink>
          )}
        </NavMenu>
        <NavBtn>
          <NavBtnLink to="/profile">Profile</NavBtnLink>
        </NavBtn>
        {!keycloak.authenticated && (
          <Button variant="contained" onClick={() => keycloak.login()}>Login</Button>
        )}
        {!!keycloak.authenticated && (
          <Button variant="contained" onClick={() => keycloak.logout()}>
            Logout ({keycloak.tokenParsed.preferred_username})
          </Button>
        )}
      </Nav>
    </>
  );
};

export default Navbar;
