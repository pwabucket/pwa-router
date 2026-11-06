import { useLocationState } from "../../../src";

/** A step-by-step form whose steps are history entries */
const StepsScenario = () => {
  const [step, setStep] = useLocationState("step", 0);

  return (
    <>
      {/* Status */}
      <p>Step {step}</p>

      {/* Step actions */}
      <button type="button" onClick={() => setStep(step + 1)}>
        Next
      </button>
      <button type="button" onClick={() => setStep(undefined)}>
        Previous
      </button>
      <button
        type="button"
        onClick={() => setStep(undefined, { toStart: true })}
      >
        Reset
      </button>
    </>
  );
};

export { StepsScenario };
