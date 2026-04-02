import { useLocationState } from "../../hooks/useLocationState";
import { useState } from "react";

const UseLocationStateDemo = () => {
  const [replace, setReplace] = useState(false);
  const [count, setCount] = useLocationState("counter", 0);
  return (
    <>
      <h3>useLocationState</h3>
      <button onClick={() => setReplace((prev) => !prev)}>
        {replace ? "Replaced" : "Pushed"} navigation
      </button>
      <button onClick={() => setCount(count + 1, { replace })}>
        Count is {count}
      </button>
    </>
  );
};

export { UseLocationStateDemo };
