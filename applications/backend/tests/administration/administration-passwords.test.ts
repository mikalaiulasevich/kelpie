import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AdministrationPasswords } from '../../source/administration/administration-passwords.js';
import { AdministrationFixture } from '../fixtures/administration.js';

describe('administrator password hashing', () => {
  it('limits concurrent derivation and resumes after completion', async () => {
    const passwords = new AdministrationPasswords();
    const hashing = passwords.hash(AdministrationFixture.Credentials.password);
    await expect(passwords.hash('second-password')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    const encoded = await hashing;
    expect(encoded).toMatch(/^scrypt-v1\$[\w-]{22}\$[\w-]{86}$/);
    expect(await passwords.verify(AdministrationFixture.Credentials.password, encoded)).toBe(true);
    expect(await passwords.verify('different-password', encoded)).toBe(false);
    expect(await passwords.verify('different-password', 'malformed-stored-hash')).toBe(false);
    expect(await passwords.verify(AdministrationFixture.Credentials.password, undefined)).toBe(
      false,
    );
  });
});
