import type { AreaRecord } from "../../engine/core/record";
import {
  saveTabSteps,
  updateSaved,
  type TabsEntry,
  type TabsMemory,
} from "./tabs";

/** The saved steps after an entry settles: newer history wins, a tab change saves the left tab */
export const settleMemory = (
  memory: TabsMemory,
  previous: TabsEntry | null,
  area: AreaRecord,
): TabsMemory => {
  if (area.savedVersion > memory.version) {
    return { version: area.savedVersion, saved: area.saved };
  }

  if (previous && previous.area.active !== area.active) {
    return {
      version: memory.version + 1,
      saved: updateSaved(
        memory.saved,
        previous.area.active,
        saveTabSteps(previous.area, previous.location, previous.record),
        area.active,
      ),
    };
  }

  return memory;
};
