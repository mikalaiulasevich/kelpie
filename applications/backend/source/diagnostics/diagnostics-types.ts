import type {
  DiagnosticEvents,
  DiagnosticPhase,
  DiagnosticReason,
  ErrorClassification,
} from './diagnostic-policy.js';

export interface ErrorFrame {
  readonly location: string;
  readonly line: number;
  readonly column: number;
}

export interface ErrorDescription {
  readonly safeMessage: Optional<string>;
  readonly classification: ValueOf<typeof ErrorClassification>;
  readonly code: Optional<string>;
  /** Identifies the server reporting site, not the original thrown stack. */
  readonly fingerprint: string;
  /** Bounded frames captured when diagnostics are reported. */
  readonly frames: ReadonlyList<ErrorFrame>;
}

export interface DiagnosticRecord {
  readonly event: ValueOf<typeof DiagnosticEvents>;
  readonly requestIdentifier?: string;
  readonly method?: string;
  readonly route?: string;
  readonly status?: number;
  readonly durationMilliseconds?: number;
  readonly reason?: ValueOf<typeof DiagnosticReason>;
  readonly phase?: ValueOf<typeof DiagnosticPhase>;
  readonly error?: ErrorDescription;
  readonly droppedRecords?: number;
}

export interface RequestDiagnosticContext {
  readonly requestIdentifier: string;
}
