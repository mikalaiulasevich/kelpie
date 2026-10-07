import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { ServiceUnavailableException } from '@nestjs/common';
import { isUndefined } from 'es-toolkit/predicate';
import { AdministrationMessages } from './administration-messages.js';
import { AdministrationPasswordPolicy, AdministrationPolicy } from './administration-policy.js';

export class AdministrationPasswords {
  private busy = false;

  async hash(password: string): Promise<string> {
    const salt = randomBytes(AdministrationPasswordPolicy.SaltBytes);
    const key = await this.derive(password, salt);

    return [
      AdministrationPasswordPolicy.Version,
      salt.toString(AdministrationPolicy.BinaryEncoding),
      key.toString(AdministrationPolicy.BinaryEncoding),
    ].join(AdministrationPasswordPolicy.Separator);
  }

  async verify(password: string, encoded: Optional<string>): Promise<boolean> {
    const [version, saltText, keyText, extra] =
      encoded?.split(AdministrationPasswordPolicy.Separator) ?? [];
    const valid =
      version === AdministrationPasswordPolicy.Version &&
      !isUndefined(saltText) &&
      AdministrationPasswordPolicy.SaltPattern.test(saltText) &&
      !isUndefined(keyText) &&
      AdministrationPasswordPolicy.KeyPattern.test(keyText) &&
      isUndefined(extra);
    const salt = valid
      ? Buffer.from(saltText, AdministrationPolicy.BinaryEncoding)
      : Buffer.alloc(AdministrationPasswordPolicy.SaltBytes);
    const expected = valid
      ? Buffer.from(keyText, AdministrationPolicy.BinaryEncoding)
      : Buffer.alloc(AdministrationPasswordPolicy.KeyBytes);
    const actual = await this.derive(password, salt);

    return timingSafeEqual(actual, expected) && valid;
  }

  private async derive(password: string, salt: Buffer): Promise<Buffer> {
    // Reject excess work instead of queuing attacker-controlled passwords in memory.
    if (this.busy) {
      throw new ServiceUnavailableException(AdministrationMessages.PasswordCapacity);
    }

    this.busy = true;
    try {
      return await new Promise<Buffer>((resolve, reject) => {
        scrypt(
          password,
          salt,
          AdministrationPasswordPolicy.KeyBytes,
          AdministrationPasswordPolicy.Parameters,
          (error, key) => {
            if (error) {
              reject(error);
            } else {
              resolve(key);
            }
          },
        );
      });
    } finally {
      this.busy = false;
    }
  }
}
