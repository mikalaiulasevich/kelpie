import { Ajv } from 'ajv';
import type { Static } from 'typebox';
import { ManagementTransport } from '../management/management-transport';
import {
  AnalyticsGoalSchemas,
  type AnalyticsExperimentPlanRequest,
  type AnalyticsOutcomeRequest,
} from './analytics-goal-schemas';

const compiler = new Ajv();
const validators = {
  plan: compiler.compile<Static<typeof AnalyticsGoalSchemas.PlanResponse>>(
    AnalyticsGoalSchemas.PlanResponse,
  ),
  savedPlan: compiler.compile<Static<typeof AnalyticsGoalSchemas.Plan>>(AnalyticsGoalSchemas.Plan),
  outcome: compiler.compile<Static<typeof AnalyticsGoalSchemas.Outcome>>(
    AnalyticsGoalSchemas.Outcome,
  ),
  overview: compiler.compile<Static<typeof AnalyticsGoalSchemas.Overview>>(
    AnalyticsGoalSchemas.Overview,
  ),
};
const endpoints = {
  Plans: '/api/administration/experiment-plans',
  Outcomes: '/api/administration/business-outcomes',
} as const;

export const AnalyticsGoalClient = {
  plan(versionIdentifier: string, signal: AbortSignal) {
    return ManagementTransport.request({
      path: `${endpoints.Plans}/${encodeURIComponent(versionIdentifier)}`,
      method: 'GET',
      signal,
      validate: validators.plan,
    });
  },

  savePlan(
    versionIdentifier: string,
    document: AnalyticsExperimentPlanRequest,
    signal: AbortSignal,
  ) {
    return ManagementTransport.request({
      path: `${endpoints.Plans}/${encodeURIComponent(versionIdentifier)}`,
      method: 'POST',
      document,
      signal,
      validate: validators.savedPlan,
    });
  },

  overview(funnelIdentifier: string, signal: AbortSignal) {
    return ManagementTransport.request({
      path: `${endpoints.Outcomes}/overview?${new URLSearchParams({ funnelIdentifier })}`,
      method: 'GET',
      signal,
      validate: validators.overview,
    });
  },

  recordOutcome(document: AnalyticsOutcomeRequest, signal: AbortSignal) {
    return ManagementTransport.request({
      path: endpoints.Outcomes,
      method: 'POST',
      document,
      signal,
      validate: validators.outcome,
    });
  },
} as const;
