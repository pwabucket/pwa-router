import { memo, Profiler, useLayoutEffect, useRef, useState } from "react";
import {
  Link as RouterLink,
  useNavigate as useRouterNavigate,
} from "react-router";
import {
  Link,
  useLeaveGuard,
  useLocationToggle,
  useNavigate,
  useSetLocationToggle,
} from "../../../src";

/** A hook counting the commits of the component it runs in, with a readout read on demand */
const useCommitCount = (name: string) => {
  const commitsRef = useRef(0);
  const [commits, setCommits] = useState(0);

  /* Count every commit */
  useLayoutEffect(() => {
    commitsRef.current += 1;
  });

  /* The count, read on demand */
  return (
    <>
      <span>
        {name} commits: {commits}
      </span>
      <button type="button" onClick={() => setCommits(commitsRef.current)}>
        Read {name}
      </button>
    </>
  );
};

/** A memoized list row that opens the dialog and counts its commits */
const Row = memo(({ id }: { id: number }) => {
  const setDialogOpen = useSetLocationToggle("dialog");
  const count = useCommitCount(`Row ${id}`);

  return (
    <div>
      {/* Commit count */}
      {count}

      {/* Opener */}
      <button type="button" onClick={() => setDialogOpen(true)}>
        Open from row {id}
      </button>
    </div>
  );
});

/** A row owning a dialog of its own, which stays closed */
const OwnDialogRow = memo(() => {
  const [isOpen] = useLocationToggle("row-dialog");
  const count = useCommitCount("Own dialog row");

  return (
    <div>
      {count}
      <span>{isOpen ? "Row dialog open" : "Row dialog closed"}</span>
    </div>
  );
});

/** A row with a link, counting the link's own commits */
const LinkRow = memo(() => {
  const linkCommitsRef = useRef(0);
  const [linkCommits, setLinkCommits] = useState(0);

  return (
    <div>
      {/* The link's commit count, read on demand */}
      <span>Link commits: {linkCommits}</span>
      <button
        type="button"
        onClick={() => setLinkCommits(linkCommitsRef.current)}
      >
        Read Link
      </button>

      {/* The link, measured */}
      <Profiler
        id="link"
        onRender={() => {
          linkCommitsRef.current += 1;
        }}
      >
        <Link to="/plain">Plain page</Link>
      </Profiler>
    </div>
  );
});

/** React Router's own link and navigate, counted the same way, as the floor ours can reach */
const RouterRow = memo(() => {
  const navigate = useRouterNavigate();
  const count = useCommitCount("Router navigate row");
  const linkCommitsRef = useRef(0);
  const [linkCommits, setLinkCommits] = useState(0);

  return (
    <div>
      {/* The row's commit count */}
      {count}
      <button type="button" onClick={() => navigate("/plain")}>
        Go with React Router
      </button>

      {/* React Router's link, measured */}
      <span>Router link commits: {linkCommits}</span>
      <button
        type="button"
        onClick={() => setLinkCommits(linkCommitsRef.current)}
      >
        Read Router link
      </button>
      <Profiler
        id="router-link"
        onRender={() => {
          linkCommitsRef.current += 1;
        }}
      >
        <RouterLink to="/plain">Plain page with React Router</RouterLink>
      </Profiler>
    </div>
  );
});

/** A row with a navigate function it never calls */
const NavigateRow = memo(() => {
  const navigate = useNavigate();
  const count = useCommitCount("Navigate row");

  return (
    <div>
      {count}
      <button type="button" onClick={() => navigate("/plain")}>
        Go to the plain page
      </button>
    </div>
  );
});

/** A row with a leave guard that has nothing to protect */
const GuardRow = memo(() => {
  useLeaveGuard({ when: false });
  const count = useCommitCount("Guard row");

  return <div>{count}</div>;
});

/** Rows that must not re-render while a shared dialog opens and closes */
const RenderCountScenario = () => {
  const [isDialogOpen, setDialogOpen] = useLocationToggle("dialog");

  return (
    <>
      {/* Status */}
      <p>{isDialogOpen ? "Dialog open" : "Dialog closed"}</p>
      <button type="button" onClick={() => setDialogOpen(false)}>
        Close dialog
      </button>

      {/* Rows that only open the dialog */}
      <Row id={1} />
      <Row id={2} />

      {/* Rows reading the router for other things */}
      <OwnDialogRow />
      <LinkRow />
      <NavigateRow />
      <GuardRow />

      {/* React Router alone, for comparison */}
      <RouterRow />
    </>
  );
};

export { RenderCountScenario };
