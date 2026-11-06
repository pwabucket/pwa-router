import type { Location } from "react-router";
import type { AreaRecord, EntryRecord, StepId } from "../../engine/core/record";
import { collapseSteps } from "../../engine/core/steps";
import { buildStepState, saveTabSteps, updateSaved } from "./tabs";

/** The area was restored into one entry, so its default tab has no entries below the active one */
export const isDefaultCollapsed = (area: AreaRecord, position: number) =>
  area.active !== area.defaultTab &&
  area.start === position &&
  (area.saved[area.defaultTab]?.length ?? 0) > 0;

/** The state showing the default tab's saved steps in the entry at the position, saving the active tab's */
export const showDefaultTab = (
  area: AreaRecord,
  record: EntryRecord,
  location: Location,
  position: number,
) => {
  const steps = area.saved[area.defaultTab];
  const top = steps[steps.length - 1];

  return buildStepState(
    top,
    {
      ...area,
      active: area.defaultTab,
      steps: collapseSteps(steps, position),
      saved: updateSaved(
        area.saved,
        area.active,
        saveTabSteps(area, location, record),
        area.defaultTab,
      ),
      savedVersion: area.savedVersion + 1,
    },
    record,
    position,
  );
};

/** The state showing an area's step in the entry at the position: lower steps stay as they are */
export const popToStep = (
  area: AreaRecord,
  record: EntryRecord,
  stepId: StepId,
  position: number,
) => {
  const index = area.steps.findIndex((step) => step.id === stepId);
  const step = area.steps[index];

  return buildStepState(
    step,
    {
      ...area,
      steps: [
        ...area.steps.slice(0, index),
        { id: step.id, kind: step.kind, position },
      ],
    },
    record,
    position,
  );
};
