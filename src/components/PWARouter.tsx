import { BrowserRouter, type BrowserRouterProps } from "react-router";
import { PWARoutingProvider } from "../providers/PWARoutingProvider";

type PWARouterProps = BrowserRouterProps;

/** BrowserRouter with the PWARoutingProvider already inside */
const PWARouter = ({ children, ...props }: PWARouterProps) => (
  <BrowserRouter {...props}>
    <PWARoutingProvider>{children}</PWARoutingProvider>
  </BrowserRouter>
);

export { PWARouter };
export type { PWARouterProps };
