import { useLocationIndexUpdater } from "../../hooks/useLocationIndexUpdater";
import { useLocationToggle } from "../../hooks/useLocationToggle";

const IFRAME_DOC = `
  <a href="#1">Frame page 1</a>
  <a href="#2">Frame page 2</a>
  <p>Hash: <span id="hash"></span></p>
  <script>
    const update = () => (hash.textContent = location.hash);
    addEventListener("hashchange", update);
    update();
  </script>
`;

/** Navigation inside the iframe adds history entries */
const Sheet = ({ onClose }: { onClose: () => void }) => {
  useLocationIndexUpdater("sheet");

  return (
    <div>
      <iframe srcDoc={IFRAME_DOC} title="Sheet frame" />
      <button onClick={onClose}>Close sheet</button>
    </div>
  );
};

const UseLocationToggleDemo = () => {
  const [opened, setOpened] = useLocationToggle("modal");
  const [ephemeralOpened, setEphemeralOpened] = useLocationToggle(
    "ephemeral-modal",
    undefined,
    { persist: false },
  );
  const [sheetOpened, setSheetOpened] = useLocationToggle("sheet", "sheet", {
    persist: false,
  });
  const [localOpened, setLocalOpened] = useLocationToggle(
    "local-panel",
    undefined,
    { inherit: false },
  );
  return (
    <>
      <h3>UseLocationToggle</h3>

      <button onClick={() => setOpened(!opened)}>
        Modal is: {opened ? "opened" : "closed"}
      </button>

      <button onClick={() => setEphemeralOpened(!ephemeralOpened)}>
        Non-persistent modal is: {ephemeralOpened ? "opened" : "closed"}
      </button>

      <button onClick={() => setSheetOpened(!sheetOpened)}>
        Indexed sheet is: {sheetOpened ? "opened" : "closed"}
      </button>

      <button onClick={() => setLocalOpened(!localOpened)}>
        Non-inherited panel is: {localOpened ? "opened" : "closed"}
      </button>

      {sheetOpened && <Sheet onClose={() => setSheetOpened(false)} />}
    </>
  );
};

export { UseLocationToggleDemo };
