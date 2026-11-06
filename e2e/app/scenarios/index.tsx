import { DepthScenario } from "./DepthScenario";
import { FromPositionScenario } from "./FromPositionScenario";
import { GuardLayerScenario } from "./GuardLayerScenario";
import { GuardPageScenario } from "./GuardPageScenario";
import { EphemeralScenario } from "./EphemeralScenario";
import { IframeScenario } from "./IframeScenario";
import { InPlaceScenario } from "./InPlaceScenario";
import { LayoutScenario } from "./LayoutScenario";
import { NavigateBackScenario } from "./NavigateBackScenario";
import { NonInheritedScenario } from "./NonInheritedScenario";
import { NestedTabsScenario } from "./NestedTabsScenario";
import { NestedEphemeralScenario } from "./NestedEphemeralScenario";
import { PlainScenario } from "./PlainScenario";
import { PopupScenario } from "./PopupScenario";
import { RenderCountScenario } from "./RenderCountScenario";
import { SearchParamsScenario } from "./SearchParamsScenario";
import { StepsScenario } from "./StepsScenario";
import { SwapScenario } from "./SwapScenario";
import { TabbedScenario } from "./TabbedScenario";
import { TabsScenario } from "./TabsScenario";
import { ToggleScenario } from "./ToggleScenario";

/** Every fixture scenario and the path it is served at */
export const scenarios = [
  { path: "/toggle", element: <ToggleScenario /> },
  { path: "/iframe", element: <IframeScenario /> },
  { path: "/ephemeral", element: <EphemeralScenario /> },
  { path: "/non-inherited", element: <NonInheritedScenario /> },
  { path: "/navigate-back", element: <NavigateBackScenario /> },
  { path: "/swap", element: <SwapScenario /> },
  { path: "/depth", element: <DepthScenario /> },
  { path: "/steps", element: <StepsScenario /> },
  { path: "/in-place", element: <InPlaceScenario /> },
  { path: "/render-count", element: <RenderCountScenario /> },
  { path: "/popup", element: <PopupScenario /> },
  { path: "/guard-page", element: <GuardPageScenario /> },
  { path: "/guard-layer", element: <GuardLayerScenario /> },
  { path: "/tabs", element: <TabsScenario /> },
  { path: "/tabbed/*", element: <TabbedScenario /> },
  { path: "/nested/*", element: <NestedTabsScenario /> },
  { path: "/layout", element: <LayoutScenario /> },
  { path: "/from-position", element: <FromPositionScenario /> },
  { path: "/search-params", element: <SearchParamsScenario /> },
  { path: "/nested-ephemeral", element: <NestedEphemeralScenario /> },
  { path: "*", element: <PlainScenario /> },
];
