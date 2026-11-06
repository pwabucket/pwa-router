import { useState } from "react";
import {
  TabsRoot,
  useLeaveGuard,
  useLocationPopup,
  useLocationState,
  useLocationToggle,
  useTabs,
} from "../../../src";
import { TabPane } from "../components/TabPane";

/** The tabs of the page, all at its address */
const TABS = [{ id: "canvas" }, { id: "items" }, { id: "settings" }];

/** The tab bar, outside every view */
const TabBar = () => {
  const { active, select } = useTabs();

  return (
    <nav>
      {/* Status */}
      <p>Active {active}</p>

      {/* Tabs */}
      {TABS.map(({ id }) => (
        <button key={id} type="button" onClick={() => select(id)}>
          {id} tab
        </button>
      ))}
    </nav>
  );
};

/** The canvas, with a popup menu and a panel */
const Canvas = () => {
  const tools = useLocationPopup("tools");
  const [isLayersOpen, setLayersOpen] = useLocationToggle("layers");

  return (
    <>
      {/* Status */}
      <p>Canvas</p>
      <p>{tools.open ? "Tools open" : "Tools closed"}</p>
      <p>{isLayersOpen ? "Layers open" : "Layers closed"}</p>

      {/* Panel and popup */}
      <button type="button" onClick={() => setLayersOpen(true)}>
        Open layers
      </button>
      <button type="button" onClick={() => tools.onOpenChange(true)}>
        Open tools
      </button>
    </>
  );
};

/** The items list, or an open item with its options panel */
const Items = () => {
  const [item, setItem] = useLocationState<number | undefined>(
    "item",
    undefined,
  );
  const [isOptionsOpen, setOptionsOpen] = useLocationToggle("options");

  /* The list */
  if (item === undefined) {
    return (
      <>
        <p>Items list</p>
        <button type="button" onClick={() => setItem(4)}>
          Open item 4
        </button>
      </>
    );
  }

  return (
    <>
      {/* Status */}
      <p>Item {item}</p>
      <p>{isOptionsOpen ? "Options open" : "Options closed"}</p>

      {/* Panel */}
      <button type="button" onClick={() => setOptionsOpen(true)}>
        Open options
      </button>
      <button type="button" onClick={() => setOptionsOpen(false)}>
        Close options
      </button>

      {/* Close */}
      <button type="button" onClick={() => setItem(undefined)}>
        Close item
      </button>
      <button
        type="button"
        onClick={() => {
          setOptionsOpen(false);
          setItem(undefined);
        }}
      >
        Close options and item
      </button>
    </>
  );
};

/** A settings editor with unsaved work, guarded */
const SettingsEditor = () => {
  const [isDirty, setDirty] = useState(false);
  const { isBlocked, stay, leave } = useLeaveGuard({
    when: isDirty,
    key: "editing",
  });

  return (
    <>
      {/* Status */}
      <p>Editing settings</p>
      <p>{isDirty ? "Unsaved settings" : "Settings saved"}</p>

      {/* Work */}
      <button type="button" onClick={() => setDirty(true)}>
        Change setting
      </button>

      {/* Question */}
      {isBlocked && (
        <div role="dialog" aria-label="Discard settings?">
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

/** The settings, with an editor layer */
const Settings = () => {
  const [isEditing, setEditing] = useLocationToggle("editing");

  return isEditing ? (
    <SettingsEditor />
  ) : (
    <>
      <p>Settings</p>
      <button type="button" onClick={() => setEditing(true)}>
        Edit settings
      </button>
    </>
  );
};

/** A layout page whose tabs share its address */
const LayoutScenario = () => (
  <TabsRoot id="layout" tabs={TABS} defaultTab="canvas">
    {/* Tab bar */}
    <TabBar />

    {/* Views */}
    <TabPane id="canvas" data-tab="canvas">
      <Canvas />
    </TabPane>
    <TabPane id="items" data-tab="items">
      <Items />
    </TabPane>
    <TabPane id="settings" data-tab="settings">
      <Settings />
    </TabPane>
  </TabsRoot>
);

export { LayoutScenario };
