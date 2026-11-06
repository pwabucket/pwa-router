import { useLayoutEffect } from "react";
import { useLocationState, useLocationToggle } from "../../../src";

/** A layer the panel opens on top of itself as soon as it appears */
const AutoLayer = () => {
  const [, setAutoOpen] = useLocationToggle("auto");

  /* Open right away, like an unsaved-changes guard would */
  useLayoutEffect(() => {
    setAutoOpen(true);
  }, [setAutoOpen]);

  return null;
};

/** A panel with a question on top that can close both */
const DepthScenario = () => {
  const [isPanelOpen, setPanelOpen] = useLocationToggle("panel");
  const [isQuestionOpen, setQuestionOpen] = useLocationToggle("question");
  const [isAutoPanelOpen, setAutoPanelOpen] = useLocationToggle("auto-panel");
  const [isAutoOpen] = useLocationToggle("auto");
  const [selected, setSelected] = useLocationState("selected", "none", {
    replace: true,
  });

  return (
    <>
      {/* Status */}
      <p>{isPanelOpen ? "Panel open" : "Panel closed"}</p>
      <p>{isQuestionOpen ? "Question open" : "Question closed"}</p>
      <p>{isAutoOpen ? "Auto layer open" : "Auto layer closed"}</p>
      <p>Selected: {selected}</p>

      {/* Panel */}
      <button type="button" onClick={() => setPanelOpen(true)}>
        Open panel
      </button>
      <button type="button" onClick={() => setQuestionOpen(true)}>
        Ask
      </button>

      {/* Question actions */}
      <button type="button" onClick={() => setPanelOpen(false)}>
        Confirm
      </button>
      <button
        type="button"
        onClick={() => {
          setPanelOpen(false);
          setSelected("row-1");
        }}
      >
        Confirm and select
      </button>

      {/* A panel that opens a layer on top of itself right away */}
      <button type="button" onClick={() => setAutoPanelOpen(true)}>
        Open auto panel
      </button>
      <button type="button" onClick={() => setAutoPanelOpen(false)}>
        Close auto panel
      </button>
      {isAutoPanelOpen && <AutoLayer />}
    </>
  );
};

export { DepthScenario };
