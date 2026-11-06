import { useState } from "react";
import { useLeaveGuard, useLocationTab, useLocationToggle } from "../../../src";

/** The tabs of the page */
const TABS = ["overview", "details", "settings"] as const;

/** A page with a default tab, a dialog and unsaved-work protection */
const TabsScenario = () => {
  const [tab, selectTab] = useLocationTab<string>("tab", "overview");
  const [itemId, showItem] = useLocationTab<string | null>("item", null);
  const [isDialogOpen, setDialogOpen] = useLocationToggle("dialog");
  const [isDirty, setDirty] = useState(false);
  const { isBlocked } = useLeaveGuard({ when: isDirty });

  return (
    <>
      {/* Status */}
      <p>Tab {tab}</p>
      <p>{itemId ? `Item ${itemId}` : "Item list"}</p>
      <p>{isDialogOpen ? "Dialog open" : "Dialog closed"}</p>
      {isBlocked && <p role="dialog">Leave without saving?</p>}

      {/* Tabs */}
      {TABS.map((name) => (
        <button key={name} type="button" onClick={() => selectTab(name)}>
          Show {name}
        </button>
      ))}

      {/* Two panes: the item list, then an item */}
      <button type="button" onClick={() => showItem("a")}>
        Show item a
      </button>
      <button type="button" onClick={() => showItem("b")}>
        Show item b
      </button>

      {/* Dialog and work */}
      <button type="button" onClick={() => setDialogOpen(true)}>
        Open dialog
      </button>
      <button type="button" onClick={() => setDialogOpen(false)}>
        Close dialog
      </button>
      <button type="button" onClick={() => setDirty(true)}>
        Make changes
      </button>
    </>
  );
};

export { TabsScenario };
