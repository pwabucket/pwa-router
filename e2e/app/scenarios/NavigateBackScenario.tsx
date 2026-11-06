import { useNavigateBack } from "../../../src";

/** An in-app back button */
const NavigateBackScenario = () => {
  const navigateBack = useNavigateBack();

  return (
    <button type="button" onClick={() => navigateBack()}>
      Back
    </button>
  );
};

export { NavigateBackScenario };
