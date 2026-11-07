import { useLocationToggle } from "../../../src";

/** A sheet holding a frame that navigates on its own */
const Sheet = ({ onClose }: { onClose: () => void }) => (
  <div>
    {/* A frame whose links add history entries */}
    <iframe src="/frame.html" title="Sheet frame" />

    {/* Close */}
    <button type="button" onClick={onClose}>
      Close sheet
    </button>
  </div>
);

/** A sheet with a frame inside, closed back to where it opened */
const IframeScenario = () => {
  const [isOpen, setOpen] = useLocationToggle("sheet");

  return (
    <>
      {/* Status */}
      <p>{isOpen ? "Sheet open" : "Sheet closed"}</p>

      {/* Open */}
      <button type="button" onClick={() => setOpen(true)}>
        Open sheet
      </button>

      {/* Sheet */}
      {isOpen && <Sheet onClose={() => setOpen(false)} />}
    </>
  );
};

export { IframeScenario };
