import { useLocationToggle } from "../../../src";

/** A dialog that doesn't survive a reload */
const EphemeralScenario = () => {
  const [isOpen, setOpen] = useLocationToggle("dialog", { persist: false });

  return (
    <>
      {/* Status */}
      <p>{isOpen ? "Dialog open" : "Dialog closed"}</p>

      {/* Open */}
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
    </>
  );
};

export { EphemeralScenario };
