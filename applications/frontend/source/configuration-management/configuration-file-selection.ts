import { ConfigurationContent } from './configuration-content';
import { ConfigurationManagementPolicy } from './configuration-policy';

interface ConfigurationFileSelectionCallbacks {
  reset: () => void;
  setReading: (reading: boolean) => void;
  setMessage: (message: string) => void;
  accept: (document: unknown, file: File) => void;
}

/** Owns the latest selection; an older file read must never overwrite its replacement. */
export class ConfigurationFileSelection {
  private sequence = 0;

  constructor(private readonly callbacks: ConfigurationFileSelectionCallbacks) {}

  cancel(): void {
    this.sequence += 1;
  }

  async select(file: Optional<File>): Promise<void> {
    const sequence = ++this.sequence;
    this.callbacks.reset();
    this.callbacks.setReading(false);

    if (!file) {
      return;
    }

    if (file.size > ConfigurationManagementPolicy.MaximumJsonBytes) {
      this.callbacks.setMessage(ConfigurationContent.FileTooLarge);

      return;
    }

    this.callbacks.setReading(true);

    try {
      const text = await file.text();

      if (sequence !== this.sequence) {
        return;
      }

      const document: unknown = JSON.parse(text);
      this.callbacks.accept(document, file);
    } catch {
      if (sequence === this.sequence) {
        this.callbacks.setMessage(ConfigurationContent.InvalidJson);
      }
    } finally {
      if (sequence === this.sequence) {
        this.callbacks.setReading(false);
      }
    }
  }
}
