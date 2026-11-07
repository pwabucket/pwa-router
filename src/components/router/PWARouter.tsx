import { BrowserRouter, type BrowserRouterProps } from "react-router";
import {
  PWARoutingProvider,
  type PWARoutingProviderProps,
} from "../../contexts/router/PWARoutingProvider";

/** Props of PWARouter: BrowserRouter's, plus the engine's */
type PWARouterProps = BrowserRouterProps &
  Pick<PWARoutingProviderProps, "deepLinkHome">;

/** A BrowserRouter with the PWARoutingProvider already inside */
const PWARouter = ({ children, deepLinkHome, ...props }: PWARouterProps) => (
  <BrowserRouter {...props}>
    <PWARoutingProvider deepLinkHome={deepLinkHome}>
      {children}
    </PWARoutingProvider>
  </BrowserRouter>
);

export { PWARouter };
export type { PWARouterProps };
