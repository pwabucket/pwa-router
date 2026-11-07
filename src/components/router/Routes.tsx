import { Routes as RouterRoutes, type RoutesProps } from "react-router";
import { useLocation } from "../../hooks/router/useLocation";

/** Routes matched against the location resolved by the engine */
const Routes = ({ location, ...props }: RoutesProps) => {
  /* The location resolved by the engine */
  const resolvedLocation = useLocation();

  /* The routes, matched against the given location or the resolved one */
  return <RouterRoutes location={location ?? resolvedLocation} {...props} />;
};

export { Routes };
