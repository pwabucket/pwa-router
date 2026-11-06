import type { StepId, StepRecord } from "../../engine/core/record";
import {
  buildStepState,
  findTab,
  readStepPath,
  rootPageStep,
  saveTabSteps,
  type TabsConfig,
  type TabsEntry,
} from "./tabs";

/** The entries putting the default root (and the tab's root) under a first entry; null when none are needed */
export const planBackfill = (
  config: TabsConfig,
  entry: TabsEntry,
  newStepId: () => StepId,
) => {
  const { location, record, area } = entry;
  const isDefaultTab = area.active === config.defaultTab;
  const current = saveTabSteps(area, location, record).at(-1);
  const defaultTab = findTab(config, config.defaultTab);

  /* A default tab without a root starts where the area opened: nothing goes below */
  if (!current || defaultTab.root === undefined) return null;

  /* The pages from the bottom: default root, tab root, then the current page */
  const pages: StepRecord[] = [rootPageStep(defaultTab, area, newStepId())];
  if (!isDefaultTab) {
    pages.push(rootPageStep(findTab(config, area.active), area, newStepId()));
  }

  const lowest = pages[pages.length - 1];
  if (readStepPath(current).pathname !== readStepPath(lowest).pathname) {
    pages.push(current);
  } else {
    pages[pages.length - 1] = { ...current, id: lowest.id };
  }

  if (pages.length === 1) return null;

  /* One entry per page, positioned from the area's first entry */
  const positioned = pages.map((page, offset) => ({
    ...page,
    position: area.start + offset,
  }));

  return positioned.map((page, offset) => {
    const isTabPage = !isDefaultTab && offset > 0;
    const steps = positioned.slice(isTabPage ? 1 : 0, offset + 1);

    return {
      to: readStepPath(page),
      state: buildStepState(
        page,
        {
          ...area,
          active: isTabPage ? area.active : config.defaultTab,
          steps: [
            ...steps.slice(0, -1),
            { id: page.id, kind: "page" as const, position: page.position },
          ],
        },
        record,
        page.position,
      ),
    };
  });
};
