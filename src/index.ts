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
export { PWARouter } from "./components/router/PWARouter";
export type { PWARouterProps } from "./components/router/PWARouter";
export { PWARoutingProvider } from "./contexts/router/PWARoutingProvider";
export type { PWARoutingProviderProps } from "./contexts/router/PWARoutingProvider";
export type { PWARoutingContextValue } from "./contexts/router/PWARoutingContext";
export { usePWARouting } from "./hooks/router/usePWARouting";
export { Routes } from "./components/router/Routes";
export { RouterStatusProbe } from "./components/router/RouterStatusProbe";
export { useLocation } from "./hooks/router/useLocation";
export { useNavigate } from "./hooks/router/useNavigate";
export type {
  PWANavigateFunction,
  PWANavigateOptions,
} from "./hooks/router/useNavigate";
export { useNavigateBack } from "./hooks/router/useNavigateBack";
export { useSearchParams } from "./hooks/router/useSearchParams";

/* Links */
export { Link } from "./components/links/Link";
export type { PWALinkProps } from "./components/links/Link";
export { NavLink } from "./components/links/NavLink";
export type { PWANavLinkProps } from "./components/links/NavLink";
export { Navigate } from "./components/links/Navigate";
export type { PWANavigateProps } from "./components/links/Navigate";

/* Layers: location state values and the hooks built on them */
export { useLocationState } from "./hooks/layers/useLocationState";
export type { UseLocationStateReturn } from "./hooks/layers/useLocationState";
export { useSetLocationState } from "./hooks/layers/useSetLocationState";
export type {
  SetLocationState,
  SetLocationStateOptions,
  UseLocationStateOptions,
} from "./hooks/layers/useSetLocationState";
export {
  useLocationToggle,
  useSetLocationToggle,
} from "./hooks/layers/useLocationToggle";
export type {
  SetLocationToggle,
  UseLocationToggleReturn,
} from "./hooks/layers/useLocationToggle";
export { useLocationTab } from "./hooks/layers/useLocationTab";
export type {
  SelectLocationTab,
  UseLocationTabReturn,
} from "./hooks/layers/useLocationTab";
export { useLocationPopup } from "./hooks/layers/useLocationPopup";
export type { LocationPopupProps } from "./hooks/layers/useLocationPopup";
export { LocationStateDefaultsProvider } from "./contexts/layers/LocationStateDefaultsProvider";
export type { LocationStateDefaultsProviderProps } from "./contexts/layers/LocationStateDefaultsProvider";

/* Leave guards */
export { useLeaveGuard } from "./hooks/guards/useLeaveGuard";
export type {
  LeaveGuardControls,
  UseLeaveGuardOptions,
} from "./hooks/guards/useLeaveGuard";

/* Tabbed areas */
export { TabsRoot } from "./components/tabs/TabsRoot";
export type { TabsRootProps } from "./components/tabs/TabsRoot";
export { TabView } from "./components/tabs/TabView";
export type { TabViewProps } from "./components/tabs/TabView";
export { useTabs } from "./hooks/tabs/useTabs";
export type { TabsControls } from "./hooks/tabs/useTabs";
export { useTabView } from "./hooks/tabs/useTabView";
export type { TabViewStatus } from "./contexts/tabs/TabViewStatusContext";
export type { TabDefinition } from "./lib/tabs/core/tabs";

/* React Router pieces that need no engine awareness */
export * from "./reexports";
