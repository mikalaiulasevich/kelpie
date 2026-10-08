export interface WarmupOptions {
  request?: typeof fetch;
  timeoutMilliseconds?: number;
}

export const WarmupOperations: {
  origin(value: Optional<string>): string;
  health(response: Response): Promise<void>;
  run(value: Optional<string>, options?: WarmupOptions): Promise<void>;
};
