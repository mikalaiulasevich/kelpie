import { ModulesContainer } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { AdministrationModule } from '../../source/administration/administration.module.js';
import { AdministrationService } from '../../source/administration/administration.service.js';
import { AnalyticsModule } from '../../source/analytics/analytics.module.js';
import { AnalyticsService } from '../../source/analytics/analytics.service.js';
import { ConfigurationsModule } from '../../source/configurations/configurations.module.js';
import { ConfigurationImportService } from '../../source/configurations/configuration-import.service.js';
import { DatabaseModule } from '../../source/database/database.module.js';
import { DatabaseService } from '../../source/database/database.service.js';
import { ApplicationEnvironmentService } from '../../source/environment/application-environment.js';
import { EnvironmentFields } from '../../source/environment/environment-policy.js';
import { EventsModule } from '../../source/events/events.module.js';
import { EventIngestionService } from '../../source/events/event-ingestion.service.js';
import { PublicationsModule } from '../../source/publications/publications.module.js';
import { PublicationService } from '../../source/publications/publication.service.js';
import { SessionsModule } from '../../source/sessions/sessions.module.js';
import { SessionService } from '../../source/sessions/session.service.js';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';

describe('application module composition', () => {
  it('resolves domain providers from their owners and releases one shared database', async () => {
    const application = await BackendApplicationFixture.create();

    try {
      const database = application.getModuleService(DatabaseModule, DatabaseService);
      const disconnect = vi.spyOn(database.client, '$disconnect');

      expect(application.getModuleService(AdministrationModule, AdministrationService)).toBe(
        application.getService(AdministrationService),
      );
      expect(application.getModuleService(AnalyticsModule, AnalyticsService)).toBe(
        application.getService(AnalyticsService),
      );
      expect(application.getModuleService(ConfigurationsModule, ConfigurationImportService)).toBe(
        application.configurationImports,
      );
      expect(application.getModuleService(EventsModule, EventIngestionService)).toBe(
        application.getService(EventIngestionService),
      );
      expect(application.getModuleService(PublicationsModule, PublicationService)).toBe(
        application.getService(PublicationService),
      );
      expect(application.getModuleService(SessionsModule, SessionService)).toBe(
        application.getService(SessionService),
      );
      expect(database.client).toBe(application.database);

      const modules = application.getService(ModulesContainer);
      const databaseOwners = [...modules.values()].filter((module) =>
        module.providers.has(DatabaseService),
      );

      expect(databaseOwners).toHaveLength(1);
      await expect(database.checkReadiness()).resolves.toBe(true);
      await application.close();

      expect(disconnect).toHaveBeenCalledTimes(1);
    } finally {
      await application.close();
    }
  });

  it('keeps environment and database instances isolated between running applications', async () => {
    const firstApplication = await BackendApplicationFixture.create({
      [EnvironmentFields.AdministrationOrigin]: 'http://127.0.0.1:5173',
    });

    try {
      const secondApplication = await BackendApplicationFixture.create({
        [EnvironmentFields.AdministrationOrigin]: 'http://127.0.0.1:5174',
      });

      try {
        const firstEnvironment = firstApplication.getService(ApplicationEnvironmentService);
        const secondEnvironment = secondApplication.getService(ApplicationEnvironmentService);

        expect(firstEnvironment).not.toBe(secondEnvironment);
        expect(firstEnvironment.values.administrationOrigin).toBe('http://127.0.0.1:5173');
        expect(secondEnvironment.values.administrationOrigin).toBe('http://127.0.0.1:5174');
        expect(firstEnvironment.values.databaseUrl).not.toBe(secondEnvironment.values.databaseUrl);
        expect(firstApplication.database).not.toBe(secondApplication.database);
      } finally {
        await secondApplication.close();
      }

      await expect(firstApplication.getService(DatabaseService).checkReadiness()).resolves.toBe(
        true,
      );
    } finally {
      await firstApplication.close();
    }
  });
});
