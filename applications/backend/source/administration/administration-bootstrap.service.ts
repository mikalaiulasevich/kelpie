import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { isNull } from 'es-toolkit/predicate';

import { DatabaseService } from '../database/database.service.js';
import { AdministrationPasswords } from './administration-passwords.js';
import { AdministrationValidation } from './administration-validation.js';
import { AdministrationBootstrapMessages } from './administration-bootstrap-messages.js';
import {
  AdministrationBootstrapStatus,
  type AdministrationBootstrapResult,
} from './administration-bootstrap-types.js';

@Injectable()
export class AdministrationBootstrapService {
  private readonly passwords = new AdministrationPasswords();

  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async initialize(username?: string, password?: string): Promise<AdministrationBootstrapResult> {
    const existing = await this.database.client.administrator.findFirst({
      select: { identifier: true },
    });

    if (!isNull(existing)) {
      return { status: AdministrationBootstrapStatus.Existing };
    }

    const credentials = { username, password };

    if (!AdministrationValidation.provisioning(credentials)) {
      throw new Error(AdministrationBootstrapMessages.CredentialsRequired);
    }

    const passwordHash = await this.passwords.hash(credentials.password);
    // SQLite evaluates the existence guard and insertion in one write statement. Parallel
    // first deployments cannot both create an administrator, even with different usernames.
    const inserted = await this.database.client.$executeRaw`
      INSERT INTO "Administrator" ("identifier", "username", "passwordHash", "createdAt")
      SELECT ${randomUUID()}, ${credentials.username}, ${passwordHash}, ${Date.now()}
      WHERE NOT EXISTS (SELECT 1 FROM "Administrator")
    `;

    return {
      status:
        inserted === 1
          ? AdministrationBootstrapStatus.Created
          : AdministrationBootstrapStatus.Existing,
    };
  }
}
