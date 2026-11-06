import { useState } from "react";
import {
  Link,
  useLeaveGuard,
  useLocationState,
  useLocation,
  useLocationToggle,
  useNavigateBack,
} from "../../../src";

/** A page with unsaved work that asks before it is left; ?draft skips the browser's warning */
const GuardPageScenario = () => {
  const [isDirty, setDirty] = useState(false);
  const [isDialogOpen, setDialogOpen] = useLocationToggle("dialog");
  const [tab, setTab] = useLocationState("tab", "overview", { replace: true });
  const { search } = useLocation();
  const { isBlocked, stay, leave } = useLeaveGuard({
    when: isDirty,
    warnOnUnload: !search.includes("draft"),
  });
  const navigateBack = useNavigateBack();

  return (
    <>
      {/* Status */}
      <p>Guard page</p>
      <p>{isDirty ? "Unsaved changes" : "All saved"}</p>
      <p>{isDialogOpen ? "Dialog open" : "Dialog closed"}</p>
      <p>Tab {tab}</p>

      {/* Work */}
      <button type="button" onClick={() => setDirty(true)}>
        Make changes
      </button>
      <button type="button" onClick={() => setDirty(false)}>
        Save
      </button>

      {/* Moves inside the page */}
      <button type="button" onClick={() => setDialogOpen(true)}>
        Open dialog
      </button>
      <button type="button" onClick={() => setDialogOpen(false)}>
        Close dialog
      </button>
      <button type="button" onClick={() => setTab("details")}>
        Details tab
      </button>

      {/* Ways to leave */}
      <Link to="/plain">Leave by link</Link>
      <button type="button" onClick={() => navigateBack()}>
        In-app back
      </button>

      {/* Question */}
      {isBlocked && (
        <div role="dialog" aria-label="Leave without saving?">
          <button type="button" onClick={stay}>
            Stay
          </button>
          <button type="button" onClick={leave}>
            Leave
          </button>
        </div>
      )}
    </>
  );
};

export { GuardPageScenario };
