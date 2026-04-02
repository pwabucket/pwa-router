import { Link, useLocation, useNavigate } from "react-router";

import { ROUTER_FROM_POSITION } from "../../constants";
import { useState } from "react";

const NavigatingFromPositionDemo = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [position, setPosition] = useState<number | undefined>(-1);

  return (
    <>
      <h3>Navigating from position</h3>

      <p>
        For this test, first navigate to <b>"/dashboard"</b>, then{" "}
        <b>"/sidebar"</b>, then
        <b>"/posts"</b>, then <b>"/sidebar"</b> again and finally{" "}
        <b>"/users"</b>. <br />
        Navigating back from <b>"/users"</b> should return to <b>"/" not </b>
        <b>"/dashboard"</b> (if enabled)
      </p>

      <h4>
        ROUTER_FROM_POSITION ({position ? "Enabled" : "Disabled"}){" "}
        <button onClick={() => setPosition((prev) => (prev ? undefined : -1))}>
          Toggle
        </button>
      </h4>
      <p>Path: {location.pathname}</p>

      {/* Go to /dashboard */}
      <Link to="/dashboard">Go to /dashboard</Link>
      <br />

      {/* Go to /sidebar */}
      <Link to="/sidebar">Go to /sidebar</Link>
      <br />

      {/* Go to /posts */}
      <Link
        replace
        to="/posts"
        state={{
          [ROUTER_FROM_POSITION]: position,
        }}
      >
        Go to /posts
      </Link>
      <br />

      {/* Go to /sidebar (again) */}
      <Link to="/sidebar">Go to /sidebar (again)</Link>
      <br />

      {/* Go to /users */}
      <Link
        replace
        to="/users"
        state={{
          [ROUTER_FROM_POSITION]: position,
        }}
      >
        Go to /users
      </Link>

      <br />
      <br />

      {/* Go to back */}
      <button onClick={() => navigate(-1)}>Go back</button>
    </>
  );
};
export { NavigatingFromPositionDemo };
