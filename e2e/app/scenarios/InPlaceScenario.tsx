import { useLocationState, useLocationToggle } from "../../../src";

/** A search box kept in history without adding entries */
const InPlaceScenario = () => {
  const [search, setSearch] = useLocationState("search", "", { replace: true });
  const [isDialogOpen, setDialogOpen] = useLocationToggle("dialog");
  const [, setLarge] = useLocationState("large", "", { replace: true });

  return (
    <>
      {/* Status */}
      <p>{isDialogOpen ? "Dialog open" : "Dialog closed"}</p>
      <p>Search: {search}</p>

      {/* Search */}
      <input
        aria-label="Search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {/* Set the search and open the dialog in one tick */}
      <button
        type="button"
        onClick={() => {
          setSearch("example");
          setDialogOpen(true);
        }}
      >
        Search and open
      </button>

      {/* A value too large for history state */}
      <button type="button" onClick={() => setLarge("x".repeat(5000))}>
        Store large value
      </button>
    </>
  );
};

export { InPlaceScenario };
