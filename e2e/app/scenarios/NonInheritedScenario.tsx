import { Link, useLocationToggle } from "../../../src";

/** A panel kept off the entries pushed on top of it */
const NonInheritedScenario = () => {
  const [isOpen, setOpen] = useLocationToggle("panel", { inherit: false });

  return (
    <>
      {/* Status */}
      <p>{isOpen ? "Panel open" : "Panel closed"}</p>

      {/* Open */}
      <button type="button" onClick={() => setOpen(true)}>
        Open panel
      </button>

      {/* A link pushed from the panel */}
      {isOpen && <Link to="/plain">Go to plain page</Link>}
    </>
  );
};

export { NonInheritedScenario };
