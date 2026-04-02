import { NavigatingFromPositionDemo } from "../sections/NavigatingFromPositionDemo";
import { UseLocationStateDemo } from "../sections/UseLocationStateDemo";
import { UseLocationToggleDemo } from "../sections/UseLocationToggleDemo";

const Home = () => {
  return (
    <>
      <p>Navigate back/forth or refresh to see result</p>
      <hr />
      <UseLocationStateDemo />
      <hr />
      <UseLocationToggleDemo />
      <hr />
      <NavigatingFromPositionDemo />
    </>
  );
};

export { Home };
