import { Ajv } from 'ajv';
import type { Static } from 'typebox';
import {
  ManagementSchemas,
  type ConfigurationList,
  type ConfigurationImportResult,
  type PublicationHistory,
  type PublicationResponse,
  type AnalyticsResponse,
  type ManagementIssue,
  type ManagementErrorBody,
} from './management-types';

const compiler = new Ajv();

export const ManagementValidators = {
  configurationDocument: compiler.compile<Static<typeof ManagementSchemas.ConfigurationDocument>>(
    ManagementSchemas.ConfigurationDocument,
  ),
  configurations: compiler.compile<ConfigurationList>(ManagementSchemas.ConfigurationList),
  importResult: compiler.compile<ConfigurationImportResult>(
    ManagementSchemas.ConfigurationImportResult,
  ),
  history: compiler.compile<PublicationHistory>(ManagementSchemas.PublicationHistory),
  publication: compiler.compile<PublicationResponse>(ManagementSchemas.Publication),
  analytics: compiler.compile<AnalyticsResponse>(ManagementSchemas.AnalyticsResponse),
  issue: compiler.compile<ManagementIssue>(ManagementSchemas.Issue),
  errorBody: compiler.compile<ManagementErrorBody>(ManagementSchemas.ErrorBody),
} as const;
