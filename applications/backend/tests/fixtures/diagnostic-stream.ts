import { Writable } from 'node:stream';

export class DiagnosticStream extends Writable {
  readonly chunks: string[] = [];

  private pending: Optional<(error?: Nullable<Error>) => void>;

  constructor() {
    super({ highWaterMark: 1 });
  }

  override _write(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Nullable<Error>) => void,
  ): void {
    this.chunks.push(chunk.toString());
    this.pending = callback;
  }

  flush(error?: Error): void {
    const callback = this.pending;
    this.pending = undefined;
    callback?.(error);
  }
}
