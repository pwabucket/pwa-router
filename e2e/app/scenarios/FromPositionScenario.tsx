import { NavLink, fromPosition, useLocationToggle } from "../../../src";

/** A sidebar whose links replace the page and close the sidebar's entry */
const FromPositionScenario = () => {
  const [isSidebarOpen, setSidebarOpen] = useLocationToggle("sidebar");

  return (
    <>
      {/* Status */}
      <p>{isSidebarOpen ? "Sidebar open" : "Sidebar closed"}</p>

      {/* Open */}
      <button type="button" onClick={() => setSidebarOpen(true)}>
        Open sidebar
      </button>

      {/* A sidebar link: go back one entry first, then replace */}
      {isSidebarOpen && (
        <NavLink to="/plain" replace state={fromPosition(-1)}>
          Sidebar link to plain
        </NavLink>
      )}
    </>
  );
};

export { FromPositionScenario };
