/* State markers and the status attribute */
export {
  ROUTER_DESTROY_INDEX,
  ROUTER_FROM_POSITION,
  ROUTER_NAVIGATE_INDEX,
  ROUTER_STATUS_ATTRIBUTE,
  destroyIndex,
  fromPosition,
  navigateIndex,
  routerState,
} from "./constants";

/* The router: provider, routes, location and navigation */
export { PWARouter } from "./router/PWARouter";
export type { PWARouterProps } from "./router/PWARouter";
export { PWARoutingProvider } from "./router/PWARoutingProvider";
export type { PWARoutingProviderProps } from "./router/PWARoutingProvider";
export type { PWARoutingContextValue } from "./router/PWARoutingContext";
export { usePWARouting } from "./router/usePWARouting";
export { Routes } from "./router/Routes";
export { RouterStatusProbe } from "./router/RouterStatusProbe";
export { useLocation } from "./router/useLocation";
export { useNavigate } from "./router/useNavigate";
export type {
  PWANavigateFunction,
  PWANavigateOptions,
} from "./router/useNavigate";
export { useNavigateBack } from "./router/useNavigateBack";
export { useSearchParams } from "./router/useSearchParams";

/* Links */
export { Link } from "./links/Link";
export type { PWALinkProps } from "./links/Link";
export { NavLink } from "./links/NavLink";
export type { PWANavLinkProps } from "./links/NavLink";
export { Navigate } from "./links/Navigate";
export type { PWANavigateProps } from "./links/Navigate";

/* Layers: location state values and the hooks built on them */
export { useLocationState } from "./layers/useLocationState";
export type { UseLocationStateReturn } from "./layers/useLocationState";
export { useSetLocationState } from "./layers/useSetLocationState";
export type {
  SetLocationState,
  SetLocationStateOptions,
  UseLocationStateOptions,
} from "./layers/useSetLocationState";
export {
  useLocationToggle,
  useSetLocationToggle,
} from "./layers/useLocationToggle";
export type {
  SetLocationToggle,
  UseLocationToggleReturn,
} from "./layers/useLocationToggle";
export { useLocationTab } from "./layers/useLocationTab";
export type {
  SelectLocationTab,
  UseLocationTabReturn,
} from "./layers/useLocationTab";
export { useLocationPopup } from "./layers/useLocationPopup";
export type { LocationPopupProps } from "./layers/useLocationPopup";
export { LocationStateDefaultsProvider } from "./layers/LocationStateDefaultsProvider";
export type { LocationStateDefaultsProviderProps } from "./layers/LocationStateDefaultsProvider";

/* Leave guards */
export { useLeaveGuard } from "./guards/useLeaveGuard";
export type {
  LeaveGuardControls,
  UseLeaveGuardOptions,
} from "./guards/useLeaveGuard";

/* Tabbed areas */
export { TabsRoot } from "./tabs/TabsRoot";
export type { TabsRootProps } from "./tabs/TabsRoot";
export { TabView } from "./tabs/TabView";
export type { TabViewProps } from "./tabs/TabView";
export { useTabs } from "./tabs/useTabs";
export type { TabsControls } from "./tabs/useTabs";
export type { TabDefinition } from "./tabs/core/tabs";

/* React Router pieces that need no engine awareness */
export * from "./reexports";
