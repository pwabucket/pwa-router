/** React Router's index of the current history entry (its `idx` in history.state) */
export const readHistoryIndex = () =>
  window.history.state?.idx as number | undefined;
