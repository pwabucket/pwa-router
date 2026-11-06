import { useEffect, useRef } from "react";
import { useNavigate, type Location } from "react-router";
import { readHistoryIndex } from "../../utils/history";
import { getLocationPath } from "../../utils/location";

/** Events that give the page a user activation */
const ACTIVATION_EVENTS = ["click", "keydown"] as const;

/** Puts the home page under an inner page the app was first opened on */
const useDeepLinkHomeHandler = (
  homePath: string | undefined,
  location: Location,
  isCorrecting: boolean,
) => {
  const navigate = useNavigate();

  /* The latest location, engine status and navigate, read on activation */
  const latestRef = useRef({ location, isCorrecting, navigate });

  // oxlint-disable-next-line react/refs
  latestRef.current = { location, isCorrecting, navigate };

  useEffect(() => {
    /* Only a fresh first entry on an inner page */
    const isFreshInnerEntry = () => {
      const { location } = latestRef.current;
      return (
        readHistoryIndex() === 0 &&
        location.key === "default" &&
        location.pathname !== homePath
      );
    };

    if (!homePath || !isFreshInnerEntry()) return;

    /** Inserts home below the page, during the user's first activation */
    const insertHome = () => {
      removeListeners();

      const { location, isCorrecting, navigate } = latestRef.current;
      if (isCorrecting || !isFreshInnerEntry()) return;

      navigate(homePath, { replace: true });
      navigate(getLocationPath(location), { state: location.state });
    };

    /** Stops waiting for an activation */
    const removeListeners = () => {
      for (const type of ACTIVATION_EVENTS) {
        window.removeEventListener(type, insertHome, true);
      }
    };

    /* Wait for an activation, so the browser never skips the home entry */
    for (const type of ACTIVATION_EVENTS) {
      window.addEventListener(type, insertHome, true);
    }

    return removeListeners;
  }, [homePath]);
};

export { useDeepLinkHomeHandler };
