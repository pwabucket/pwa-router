import { Link } from "../../components/Link";
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
  /* A second reader of the same key, like another component would be */
  const [, setOpenedElsewhere] = useLocationToggle("modal");
  const [ephemeralOpened, setEphemeralOpened] = useLocationToggle(
    "ephemeral-modal",
    undefined,
    { persist: false },
  );
  const [sheetOpened, setSheetOpened] = useLocationToggle("sheet", "sheet", {
    persist: false,
  });
  const [nonInheritedOpened, setNonInheritedOpened] = useLocationToggle(
    "non-inherited-panel",
    undefined,
    { inherit: false },
  );
  return (
    <>
      <h3>UseLocationToggle</h3>

      <button onClick={() => setOpened(!opened)}>
        Modal is: {opened ? "opened" : "closed"}
      </button>

      {/* Setter calls batch like setState: one navigation for the net change */}
      <button
        onClick={() => {
          for (let i = 0; i < 4; i++) setOpened(false);
        }}
      >
        Close modal 4×
      </button>
      <button
        onClick={() => {
          setOpened(true);
          setOpened(true);
        }}
      >
        Open modal 2×
      </button>
      <button
        onClick={() => {
          setOpened(true);
          setOpened(false);
        }}
      >
        Open then close modal
      </button>
      <button
        onClick={() => {
          setOpened(false);
          setOpenedElsewhere(false);
        }}
      >
        Close modal from two hooks
      </button>

      <button onClick={() => setEphemeralOpened(!ephemeralOpened)}>
        Non-persistent modal is: {ephemeralOpened ? "opened" : "closed"}
      </button>

      <button onClick={() => setSheetOpened(!sheetOpened)}>
        Indexed sheet is: {sheetOpened ? "opened" : "closed"}
      </button>

      <button onClick={() => setNonInheritedOpened(!nonInheritedOpened)}>
        Non-inherited panel is: {nonInheritedOpened ? "opened" : "closed"}
      </button>

      {nonInheritedOpened && (
        <p>
          <Link to="/elsewhere">Go to /elsewhere</Link> (replaces the panel
          entry, so Back returns to the entry before it)
        </p>
      )}

      {sheetOpened && <Sheet onClose={() => setSheetOpened(false)} />}
    </>
  );
};

export { UseLocationToggleDemo };
