import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { ServiceUnavailableException } from '@nestjs/common';
import { AdministrationValidation } from './administration-validation.js';
import type { DecodedPasswordMaterial } from './administration-types.js';
import { AdministrationMessages } from './administration-messages.js';
import { AdministrationPasswordPolicy, AdministrationPolicy } from './administration-policy.js';

const PasswordEncoding = {
  encode(salt: Buffer, key: Buffer): string {
    return [
      AdministrationPasswordPolicy.Version,
      salt.toString(AdministrationPolicy.BinaryEncoding),
      key.toString(AdministrationPolicy.BinaryEncoding),
    ].join(AdministrationPasswordPolicy.Separator);
  },

  decode(encoded: Optional<string>): DecodedPasswordMaterial {
    if (!AdministrationValidation.encodedPassword(encoded)) {
      return PasswordEncoding.dummy();
    }

    const [, saltText = '', keyText = ''] = encoded.split(AdministrationPasswordPolicy.Separator);

    return {
      valid: true,
      salt: Buffer.from(saltText, AdministrationPolicy.BinaryEncoding),
      key: Buffer.from(keyText, AdministrationPolicy.BinaryEncoding),
    };
  },

  dummy(): DecodedPasswordMaterial {
    return {
      valid: false,
      salt: Buffer.alloc(AdministrationPasswordPolicy.SaltBytes),
      key: Buffer.alloc(AdministrationPasswordPolicy.KeyBytes),
    };
  },
} as const;

export class AdministrationPasswords {
  private busy = false;

  async hash(password: string): Promise<string> {
    const salt = randomBytes(AdministrationPasswordPolicy.SaltBytes);
    const key = await this.derive(password, salt);

    return PasswordEncoding.encode(salt, key);
  }

  async verify(password: string, encoded: Optional<string>): Promise<boolean> {
    const material = PasswordEncoding.decode(encoded);
    // Missing or invalid stored hashes still incur one bounded derivation.
    const actual = await this.derive(password, material.salt);

    return timingSafeEqual(actual, material.key) && material.valid;
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
