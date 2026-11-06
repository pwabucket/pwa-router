import { DepthScenario } from "./DepthScenario";
import { GuardLayerScenario } from "./GuardLayerScenario";
import { GuardPageScenario } from "./GuardPageScenario";
import { EphemeralScenario } from "./EphemeralScenario";
import { IframeScenario } from "./IframeScenario";
import { InPlaceScenario } from "./InPlaceScenario";
import { NavigateBackScenario } from "./NavigateBackScenario";
import { NonInheritedScenario } from "./NonInheritedScenario";
import { PlainScenario } from "./PlainScenario";
import { PopupScenario } from "./PopupScenario";
import { RenderCountScenario } from "./RenderCountScenario";
import { StepsScenario } from "./StepsScenario";
import { SwapScenario } from "./SwapScenario";
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
  { path: "*", element: <PlainScenario /> },
];
