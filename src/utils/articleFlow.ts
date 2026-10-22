/**
 * Pure decision helpers for the article writing flow.
 *
 * Keeping these out of the React components makes the editor echo guard and the
 * autosave lock rules easy to test without mounting the editor.
 */

export interface AutosaveGuardState {
  isSubmitting: boolean;
  isPublishing: boolean;
  isSaving: boolean;
  isLocked: boolean;
}

/**
 * Returns true only when no manual save, publish, in-flight autosave, or
 * submit lock is active.
 */
export function canAutosave(state: AutosaveGuardState): boolean {
  return !state.isSubmitting && !state.isPublishing && !state.isSaving && !state.isLocked;
}

/**
 * Decides whether the editor should apply externally supplied content.
 *
 * The editor records the JSON/markdown it just emitted as `lastKnown`, so its
 * own echo from the parent state update is ignored and the cursor stays put.
 * Empty incoming content is never applied.
 */
export function shouldSyncEditorContent(incoming: string, lastKnown: string): boolean {
  if (!incoming) return false;
  return incoming !== lastKnown;
}
