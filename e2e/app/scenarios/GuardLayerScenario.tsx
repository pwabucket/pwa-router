import { useState } from "react";
import { useLeaveGuard, useLocationToggle } from "../../../src";

/** An editor layer with unsaved work and a pane of its own */
const EditorScreen = () => {
  const [isDirty, setDirty] = useState(false);
  const [, setScreenOpen] = useLocationToggle("editor");
  const [isPaneOpen, setPaneOpen] = useLocationToggle("editor-pane");
  const { isBlocked, stay, leave } = useLeaveGuard({
    when: isDirty,
    key: "editor",
  });

  return (
    <div>
      {/* Status */}
      <p>Editor open</p>
      <p>{isDirty ? "Unsaved edits" : "Edits saved"}</p>
      <p>{isPaneOpen ? "Pane open" : "Pane closed"}</p>

      {/* Work and moves inside the screen */}
      <button type="button" onClick={() => setDirty(true)}>
        Edit
      </button>
      <button type="button" onClick={() => setPaneOpen(true)}>
        Open pane
      </button>
      <button type="button" onClick={() => setPaneOpen(false)}>
        Close pane
      </button>

      {/* Close */}
      <button type="button" onClick={() => setScreenOpen(false)}>
        Close editor
      </button>

      {/* Question */}
      {isBlocked && (
        <div role="dialog" aria-label="Discard edits?">
          <button type="button" onClick={stay}>
            Stay
          </button>
          <button type="button" onClick={leave}>
            Leave
          </button>
        </div>
      )}
    </div>
  );
};

/** A page whose editor asks before closing with unsaved work */
const GuardLayerScenario = () => {
  const [isScreenOpen, setScreenOpen] = useLocationToggle("editor");

  return (
    <>
      {/* Status */}
      <p>{isScreenOpen ? "Editor shown" : "Editor closed"}</p>

      {/* Open */}
      <button type="button" onClick={() => setScreenOpen(true)}>
        Open editor
      </button>

      {/* Screen */}
      {isScreenOpen && <EditorScreen />}
    </>
  );
};

export { GuardLayerScenario };
