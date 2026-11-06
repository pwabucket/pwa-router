import type { StepId } from "./record";

/** Tells this page load's ids apart from those of earlier loads */
const SESSION = Math.random().toString(36).slice(2, 6);

/** Steps created so far in this page load */
let createdSteps = 0;

/** A new step id, unique across reloads of the same history */
export const createStepId = (): StepId =>
  `${SESSION}${(createdSteps++).toString(36)}`;
