export interface StartupExit {
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
}
