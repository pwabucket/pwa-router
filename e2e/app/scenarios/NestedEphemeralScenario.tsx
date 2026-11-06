import { useLocationToggle } from "../../../src";

/** Two non-persistent layers, one opened from the other */
const NestedEphemeralScenario = () => {
  const [isOuterOpen, setOuterOpen] = useLocationToggle("outer", {
    persist: false,
  });
  const [isInnerOpen, setInnerOpen] = useLocationToggle("inner", {
    persist: false,
  });

  return (
    <>
      {/* Status */}
      <p>{isOuterOpen ? "Outer open" : "Outer closed"}</p>
      <p>{isInnerOpen ? "Inner open" : "Inner closed"}</p>

      {/* Openers */}
      <button type="button" onClick={() => setOuterOpen(true)}>
        Open outer
      </button>
      <button type="button" onClick={() => setInnerOpen(true)}>
        Open inner
      </button>
    </>
  );
};

export { NestedEphemeralScenario };
