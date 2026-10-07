import { describe, expect, it } from 'vitest';
import { AdministrationValidation } from '../../source/administration/administration-validation.js';
import { AdministrationValidationCases } from '../cases/administration-validation-cases.js';
import { AdministrationFixture } from '../fixtures/administration.js';

describe('administrator credential boundaries', () => {
  it.each(AdministrationValidationCases.InvalidCredentials)('rejects $name', ({ value }) => {
    expect(AdministrationValidation.credentials(value)).toBe(false);
    expect(AdministrationValidation.provisioning(value)).toBe(false);
  });

  it('requires own credentials instead of inherited properties', () => {
    const inherited = AdministrationFixture.inheritedCredentials();

    expect(AdministrationValidation.credentials(inherited)).toBe(false);
    expect(AdministrationValidation.provisioning(inherited)).toBe(false);
    expect(AdministrationValidation.credentials({ ...AdministrationFixture.Credentials })).toBe(
      true,
    );
  });

  it('allows short existing passwords for sign-in but enforces provisioning strength', () => {
    const credentials = { username: 'reviewer', password: 'short' };

    expect(AdministrationValidation.credentials(credentials)).toBe(true);
    expect(AdministrationValidation.provisioning(credentials)).toBe(false);
    expect(AdministrationValidation.provisioning({ ...AdministrationFixture.Credentials })).toBe(
      true,
    );
  });
});
