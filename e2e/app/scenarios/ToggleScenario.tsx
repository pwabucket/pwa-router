import { useLocationToggle } from "../../../src";

/** A dialog toggle with buttons for every batching case */
const ToggleScenario = () => {
  const [isOpen, setOpen] = useLocationToggle("dialog");

  return (
    <>
      {/* Status */}
      <p>{isOpen ? "Dialog open" : "Dialog closed"}</p>

      {/* Single calls */}
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <button type="button" onClick={() => setOpen(false)}>
        Close
      </button>

      {/* Repeated calls in one tick */}
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setOpen(true);
        }}
      >
        Open twice
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setOpen(false);
        }}
      >
        Open then close
      </button>
      <button
        type="button"
        onClick={() => {
          for (let i = 0; i < 4; i++) setOpen(false);
        }}
      >
        Close four times
      </button>
    </>
  );
};

export { ToggleScenario };
