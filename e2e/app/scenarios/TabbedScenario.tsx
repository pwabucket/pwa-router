import { useState } from "react";
import { Link as RouterLink, useParams } from "react-router";
import {
  Link,
  Route,
  Routes,
  TabsRoot,
  TabView,
  useLeaveGuard,
  useLocationPopup,
  useLocationState,
  useLocationToggle,
  useTabs,
} from "../../../src";

/** The tabs of the area */
const TABS = [
  { id: "home", root: "/tabbed" },
  { id: "search", root: "/tabbed/search" },
  { id: "profile", root: "/tabbed/profile" },
];

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

      {/* Leave the area */}
      <Link to="/plain" exitTabs>
        Log out
      </Link>
    </nav>
  );
};

/** The home tab's first page */
const Feed = () => (
  <>
    <p>Feed</p>
    <Link to="/tabbed/post/1">Open post 1</Link>
  </>
);

/** A post with a dialog, a popup menu and a raw React Router link */
const Post = () => {
  const { id } = useParams();
  const [isShareOpen, setShareOpen] = useLocationToggle("share");
  const more = useLocationPopup("more");

  return (
    <>
      {/* Status */}
      <p>Post {id}</p>
      <p>{isShareOpen ? "Share open" : "Share closed"}</p>
      <p>{more.open ? "More open" : "More closed"}</p>

      {/* Dialog, popup and links */}
      <button type="button" onClick={() => setShareOpen(true)}>
        Open share
      </button>
      <button type="button" onClick={() => more.onOpenChange(true)}>
        Open more
      </button>
      <Link to={`/tabbed/post/${id}/comments`}>Open comments</Link>
      <RouterLink to="/tabbed/post/2">Raw link to post 2</RouterLink>
    </>
  );
};

/** A post's comments */
const Comments = () => <p>Comments {useParams().id}</p>;

/** The search tab's first page, with a query kept in place */
const Search = () => {
  const [query, setQuery] = useLocationState("query", "", { replace: true });

  return (
    <>
      <p>Search</p>
      <input
        aria-label="Query"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <Link to="/tabbed/search/results">Open results</Link>
    </>
  );
};

/** Search results, with a filters panel and a frame whose links add history entries */
const Results = () => {
  const [isFiltersOpen, setFiltersOpen] = useLocationToggle("filters");

  return (
    <>
      {/* Status */}
      <p>Results</p>
      <p>{isFiltersOpen ? "Filters open" : "Filters closed"}</p>

      {/* Panel */}
      <button type="button" onClick={() => setFiltersOpen(true)}>
        Open filters
      </button>
      <button type="button" onClick={() => setFiltersOpen(false)}>
        Close filters
      </button>

      {/* Links and frame */}
      <Link to="/tabbed/search/photo/1">Open photo 1</Link>
      <iframe src="/frame.html" title="Results frame" />
    </>
  );
};

/** A photo that links to the next one */
const Photo = () => {
  const number = Number(useParams().number);
  const [likes, setLikes] = useState(0);

  return (
    <>
      {/* Status */}
      <p>Photo {number}</p>
      <p>Likes {likes}</p>

      {/* Actions */}
      <button type="button" onClick={() => setLikes(likes + 1)}>
        Like
      </button>
      <Link to={`/tabbed/search/photo/${number + 1}`}>Next photo</Link>
    </>
  );
};

/** The profile tab's first page */
const Profile = () => (
  <>
    <p>Profile</p>
    <Link to="/tabbed/profile/edit">Edit profile</Link>
    <Link to="/plain">Plain link out</Link>
  </>
);

/** A form with unsaved work, guarded */
const EditProfile = () => {
  const [isDirty, setDirty] = useState(false);
  const { isBlocked, stay, leave } = useLeaveGuard({ when: isDirty });

  return (
    <>
      {/* Status */}
      <p>Edit profile</p>
      <p>{isDirty ? "Unsaved profile" : "Profile saved"}</p>

      {/* Work */}
      <button type="button" onClick={() => setDirty(true)}>
        Change name
      </button>

      {/* Question */}
      {isBlocked && (
        <div role="dialog" aria-label="Discard profile changes?">
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

/** The pages every tab can show, below the area's /tabbed route */
const TabbedRoutes = () => (
  <Routes>
    <Route index element={<Feed />} />
    <Route path="post/:id" element={<Post />} />
    <Route path="post/:id/comments" element={<Comments />} />
    <Route path="search" element={<Search />} />
    <Route path="search/results" element={<Results />} />
    <Route path="search/photo/:number" element={<Photo />} />
    <Route path="profile" element={<Profile />} />
    <Route path="profile/edit" element={<EditProfile />} />
  </Routes>
);

/** A tabbed app: home, search and profile */
const TabbedScenario = () => (
  <TabsRoot id="main" tabs={TABS} defaultTab="home">
    {/* Tab bar */}
    <TabBar />

    {/* Views */}
    {TABS.map(({ id }) => (
      <TabView key={id} id={id} data-tab={id}>
        <TabbedRoutes />
      </TabView>
    ))}
  </TabsRoot>
);

export { TabbedScenario };
