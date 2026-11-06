import { Link } from "../../../src";

/** A plain page linking to the scenarios that need an earlier in-app page */
const PlainScenario = () => (
  <>
    {/* Status */}
    <p>Plain page</p>

    {/* Links */}
    <Link to="/guard-page">Go to guard page</Link>
    <Link to="/guard-layer">Go to guard layer</Link>
    <Link to="/tabbed">Go to tabbed app</Link>
    <Link to="/layout">Go to layout</Link>
  </>
);

export { PlainScenario };
