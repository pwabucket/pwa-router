import { useEffect } from "react";
import type { NavigateProps } from "react-router";
import { useNavigate } from "../hooks/useNavigate";
import { usePWARouting } from "../hooks/usePWARouting";

/** Engine-aware Navigate; waits for corrections to finish before navigating */
const Navigate = ({ to, replace, state, relative }: NavigateProps) => {
  const navigate = useNavigate();
  const { isCorrecting } = usePWARouting();

  useEffect(() => {
    /* Retried once the correction is done */
    if (!isCorrecting) navigate(to, { replace, state, relative });
  }, [isCorrecting, navigate, to, replace, state, relative]);

  return null;
};

export { Navigate };
