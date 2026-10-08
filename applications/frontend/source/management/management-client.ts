import { ManagementError } from './management-error';
import { ManagementMessages } from './management-messages';
import { ManagementPolicy } from './management-policy';
import { ManagementTransport } from './management-transport';
import { ManagementValidators } from './management-validators';
import type {
  ManagementQuery,
  AnalyticsQuery,
  ConfigurationList,
  ConfigurationVersionDocument,
  ConfigurationImportResult,
  PublicationHistory,
  PublicationResponse,
  PublishRequest,
  RollbackRequest,
  AnalyticsResponse,
} from './management-types';

export const ManagementClient = {
  async configurationDocument(
    versionIdentifier: string,
    signal: AbortSignal,
  ): Promise<ConfigurationVersionDocument> {
    const body = await ManagementTransport.request({
      path: `${ManagementPolicy.ConfigurationsEndpoint}/${encodeURIComponent(versionIdentifier)}`,
      method: 'GET',
      signal,
      validate: ManagementValidators.configurationDocument,
    });
    const { FunnelConfigurations } = await import('@kelpie/contracts');
    signal.throwIfAborted();
    const validated = FunnelConfigurations.validate(body.document);

    if (
      !validated.valid ||
      body.version.identifier !== versionIdentifier ||
      validated.configuration.funnelId !== body.version.funnelIdentifier ||
      validated.configuration.version !== body.version.version ||
      validated.configuration.schemaVersion !== body.version.schemaVersion
    ) {
      throw new ManagementError(ManagementMessages.InvalidResponse, 200, 'invalid_response');
    }

    return { version: body.version, document: validated.configuration };
  },

  configurations(
    query: ManagementQuery & { search?: string; status?: string; sort?: string },
    signal: AbortSignal,
  ): Promise<ConfigurationList> {
    return ManagementTransport.request({
      path: ManagementPolicy.ConfigurationsEndpoint,
      method: 'GET',
      signal,
      validate: ManagementValidators.configurations,
      query,
    });
  },

  history(query: ManagementQuery, signal: AbortSignal): Promise<PublicationHistory> {
    return ManagementTransport.request({
      path: ManagementPolicy.PublicationsEndpoint,
      method: 'GET',
      signal,
      validate: ManagementValidators.history,
      query,
    });
  },

  analytics(query: AnalyticsQuery, signal: AbortSignal): Promise<AnalyticsResponse> {
    return ManagementTransport.request({
      path: ManagementPolicy.AnalyticsEndpoint,
      method: 'GET',
      signal,
      validate: ManagementValidators.analytics,
      query,
    });
  },

  importConfiguration(document: unknown, signal: AbortSignal): Promise<ConfigurationImportResult> {
    return ManagementTransport.request({
      path: ManagementPolicy.ConfigurationsEndpoint,
      method: 'POST',
      signal,
      validate: ManagementValidators.importResult,
      document: document,
    });
  },

  publish(command: PublishRequest, signal: AbortSignal): Promise<PublicationResponse> {
    return ManagementTransport.request({
      path: ManagementPolicy.PublicationsEndpoint,
      method: 'POST',
      signal,
      validate: ManagementValidators.publication,
      document: command,
    });
  },

  rollback(command: RollbackRequest, signal: AbortSignal): Promise<PublicationResponse> {
    return ManagementTransport.request({
      path: ManagementPolicy.RollbacksEndpoint,
      method: 'POST',
      signal,
      validate: ManagementValidators.publication,
      document: command,
    });
  },
} as const;
