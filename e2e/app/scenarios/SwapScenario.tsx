import { useLocationToggle } from "../../../src";

/** A popup menu and a sheet whose items open a dialog in their place */
const SwapScenario = () => {
  const [isMenuOpen, setMenuOpen] = useLocationToggle("menu", {
    persist: false,
    inherit: false,
  });
  const [isSheetOpen, setSheetOpen] = useLocationToggle("sheet");
  const [isDialogOpen, setDialogOpen] = useLocationToggle("dialog");

  return (
    <>
      {/* Status */}
      <p>{isMenuOpen ? "Menu open" : "Menu closed"}</p>
      <p>{isSheetOpen ? "Sheet open" : "Sheet closed"}</p>
      <p>{isDialogOpen ? "Dialog open" : "Dialog closed"}</p>

      {/* Openers */}
      <button type="button" onClick={() => setMenuOpen(true)}>
        Open menu
      </button>
      <button type="button" onClick={() => setSheetOpen(true)}>
        Open sheet
      </button>
      <button type="button" onClick={() => setDialogOpen(false)}>
        Close dialog
      </button>

      {/* Menu items, in both orders, in one tick and across ticks */}
      <button
        type="button"
        onClick={() => {
          setMenuOpen(false);
          setDialogOpen(true);
        }}
      >
        Menu item, close first
      </button>
      <button
        type="button"
        onClick={() => {
          setDialogOpen(true);
          setMenuOpen(false);
        }}
      >
        Menu item, open first
      </button>
      <button
        type="button"
        onClick={() => {
          setMenuOpen(false);
          setTimeout(() => setDialogOpen(true));
        }}
      >
        Menu item, close then open later
      </button>
      <button
        type="button"
        onClick={() => {
          setDialogOpen(true);
          setTimeout(() => setMenuOpen(false));
        }}
      >
        Menu item, open then close later
      </button>

      {/* Sheet item */}
      <button
        type="button"
        onClick={() => {
          setSheetOpen(false);
          setDialogOpen(true);
        }}
      >
        Sheet item
      </button>
    </>
  );
};

export { SwapScenario };
