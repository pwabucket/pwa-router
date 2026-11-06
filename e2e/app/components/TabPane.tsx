import { TabView, useTabs } from "../../../src";

/** Props of a tab pane: its tab, plus attributes for its element */
interface TabPaneProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
}

/** A tab's pane, laid out by the app: hidden while its tab isn't active */
const TabPane = ({ id, children, ...props }: TabPaneProps) => {
  const { active } = useTabs();

  return (
    <TabView id={id}>
      <div {...props} hidden={active !== id}>
        {children}
      </div>
    </TabView>
  );
};

export { TabPane };
