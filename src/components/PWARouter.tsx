import { BrowserRouter, type BrowserRouterProps } from "react-router";
import {
  PWARoutingProvider,
  type PWARoutingProviderProps,
} from "../providers/PWARoutingProvider";

type PWARouterProps = BrowserRouterProps &
  Pick<PWARoutingProviderProps, "deepLinkHome">;

/** BrowserRouter with the PWARoutingProvider already inside */
const PWARouter = ({ children, deepLinkHome, ...props }: PWARouterProps) => (
  <BrowserRouter {...props}>
    <PWARoutingProvider deepLinkHome={deepLinkHome}>
      {children}
    </PWARoutingProvider>
  </BrowserRouter>
);

export { PWARouter };
export type { PWARouterProps };
