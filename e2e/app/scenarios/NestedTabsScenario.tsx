import { useParams } from "react-router";
import {
  Link,
  Route,
  Routes,
  TabView,
  TabsRoot,
  useTabs,
} from "../../../src";

/** The outer tabs */
const OUTER_TABS = [
  { id: "home", root: "/nested" },
  { id: "library", root: "/nested/library" },
];

/** The library's inner tabs */
const INNER_TABS = [
  { id: "books", root: "/nested/library" },
  { id: "music", root: "/nested/library/music" },
];

/** A tab bar for the nearest tabbed area */
const TabBar = ({ tabs }: { tabs: { id: string }[] }) => {
  const { active, select } = useTabs();

  return (
    <nav>
      {/* Status */}
      <p>Active {active}</p>

      {/* Tabs */}
      {tabs.map(({ id }) => (
        <button key={id} type="button" onClick={() => select(id)}>
          {id} tab
        </button>
      ))}
    </nav>
  );
};

/** A numbered page linking to the next one */
const NumberedPage = ({ label, base }: { label: string; base: string }) => {
  const number = Number(useParams().number);

  return (
    <>
      <p>
        {label} {number}
      </p>
      <Link to={`${base}/${number + 1}`}>Next {label.toLowerCase()}</Link>
    </>
  );
};

/** The library's pages, below its /nested/library route */
const LibraryRoutes = () => (
  <Routes>
    <Route
      index
      element={
        <>
          <p>Books</p>
          <Link to="/nested/library/book/1">Open book 1</Link>
        </>
      }
    />
    <Route
      path="book/:number"
      element={<NumberedPage label="Book" base="/nested/library/book" />}
    />
    <Route
      path="music"
      element={
        <>
          <p>Music</p>
          <Link to="/nested/library/music/album/1">Open album 1</Link>
        </>
      }
    />
    <Route
      path="music/album/:number"
      element={
        <NumberedPage label="Album" base="/nested/library/music/album" />
      }
    />
  </Routes>
);

/** The library: tabs inside the outer library tab */
const Library = () => (
  <TabsRoot id="inner" tabs={INNER_TABS} defaultTab="books">
    <TabBar tabs={INNER_TABS} />
    {INNER_TABS.map(({ id }) => (
      <TabView key={id} id={id} data-inner-tab={id}>
        <LibraryRoutes />
      </TabView>
    ))}
  </TabsRoot>
);

/** The outer pages, below the /nested route */
const OuterRoutes = () => (
  <Routes>
    <Route index element={<p>Outer home</p>} />
    <Route path="library/*" element={<Library />} />
  </Routes>
);

/** Tabs inside a tab: an outer home and library, the library with books and music */
const NestedTabsScenario = () => (
  <TabsRoot id="outer" tabs={OUTER_TABS} defaultTab="home">
    <TabBar tabs={OUTER_TABS} />
    {OUTER_TABS.map(({ id }) => (
      <TabView key={id} id={id} data-outer-tab={id}>
        <OuterRoutes />
      </TabView>
    ))}
  </TabsRoot>
);

export { NestedTabsScenario };
