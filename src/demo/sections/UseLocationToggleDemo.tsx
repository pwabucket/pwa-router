import { useLocationToggle } from "../../hooks/useLocationToggle";

const UseLocationToggleDemo = () => {
  const [opened, setOpened] = useLocationToggle("modal");
  return (
    <>
      <h3>UseLocationToggle</h3>

      <button onClick={() => setOpened(!opened)}>
        Modal is: {opened ? "opened" : "closed"}
      </button>
    </>
  );
};

export { UseLocationToggleDemo };
