import { BrowserRouter, type BrowserRouterProps } from "react-router";
import { PWARoutingProvider } from "../../contexts/router/PWARoutingProvider";

/** Props of PWARouter: BrowserRouter's */
type PWARouterProps = BrowserRouterProps;

/** React Router's BrowserRouter with the PWARoutingProvider inside */
const PWARouter = ({ children, ...props }: PWARouterProps) => (
  <BrowserRouter {...props}>
    <PWARoutingProvider>{children}</PWARoutingProvider>
  </BrowserRouter>
);

export { PWARouter };
export type { PWARouterProps };
