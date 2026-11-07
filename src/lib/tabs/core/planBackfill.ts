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
  /* The entry's area, its current step and the default tab */
  const { location, record, area } = entry;
  const isDefaultTab = area.active === config.defaultTab;
  const current = saveTabSteps(area, location, record).at(-1);
  const defaultTab = findTab(config, config.defaultTab);

  /* Turned off, or a default tab without a root (it starts where the area opened): nothing goes below */
  if (!current || !config.deepLinkRoots || defaultTab.root === undefined) {
    return null;
  }

  /* The pages from the bottom: default root, tab root, then the current page */
  const pages: StepRecord[] = [rootPageStep(defaultTab, area, newStepId())];
  if (!isDefaultTab) {
    pages.push(rootPageStep(findTab(config, area.active), area, newStepId()));
  }

  /* The current page goes on top, or takes the place of a root on the same path */
  const lowest = pages[pages.length - 1];
  if (readStepPath(current).pathname !== readStepPath(lowest).pathname) {
    pages.push(current);
  } else {
    pages[pages.length - 1] = { ...current, id: lowest.id };
  }

  /* Only the current page: nothing goes below */
  if (pages.length === 1) return null;

  /* One entry per page, positioned from the area's first entry */
  const positioned = pages.map((page, offset) => ({
    ...page,
    position: area.start + offset,
  }));

  /* Each entry's address and state, with the area's steps up to its page */
  return positioned.map((page, offset) => {
    /* A tab page's steps start above the default root */
    const isTabPage = !isDefaultTab && offset > 0;
    const steps = positioned.slice(isTabPage ? 1 : 0, offset + 1);

    /* The page's address and state */
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
