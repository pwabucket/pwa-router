import { memo, useLayoutEffect, useRef, useState } from "react";
import { useLocationToggle, useSetLocationToggle } from "../../../src";

/** A memoized list row that opens the dialog and counts its commits */
const Row = memo(({ id }: { id: number }) => {
  const setDialogOpen = useSetLocationToggle("dialog");
  const commitsRef = useRef(0);
  const [commits, setCommits] = useState(0);

  /* Count every commit of this row */
  useLayoutEffect(() => {
    commitsRef.current += 1;
  });

  return (
    <div>
      {/* Commit count, read on demand */}
      <span>
        Row {id} commits: {commits}
      </span>
      <button type="button" onClick={() => setCommits(commitsRef.current)}>
        Read row {id}
      </button>

      {/* Opener */}
      <button type="button" onClick={() => setDialogOpen(true)}>
        Open from row {id}
      </button>
    </div>
  );
});

/** Rows opening a shared dialog without re-rendering on navigation */
const RenderCountScenario = () => {
  const [isDialogOpen, setDialogOpen] = useLocationToggle("dialog");

  return (
    <>
      {/* Status */}
      <p>{isDialogOpen ? "Dialog open" : "Dialog closed"}</p>
      <button type="button" onClick={() => setDialogOpen(false)}>
        Close dialog
      </button>

      {/* Rows */}
      <Row id={1} />
      <Row id={2} />
    </>
  );
};

export { RenderCountScenario };
