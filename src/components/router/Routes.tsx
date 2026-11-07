import { Routes as RouterRoutes, type RoutesProps } from "react-router";
import { useLocation } from "../../hooks/router/useLocation";

/** React Router's Routes, matched against the resolved location */
const Routes = ({ location, ...props }: RoutesProps) => {
  const resolvedLocation = useLocation();

  return <RouterRoutes location={location ?? resolvedLocation} {...props} />;
};

export { Routes };
