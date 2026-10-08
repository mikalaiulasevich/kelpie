import assert from 'node:assert/strict';
import { Ajv } from 'ajv';
import {
  EventBatchResponseSchema,
  type EventBatchResponse,
} from '../../../source/events/event-ingestion-types.js';
import { randomUUID } from 'node:crypto';
import { FunnelEvaluation } from '@kelpie/funnel-runtime';
import type { FunnelStep } from '@kelpie/contracts';
import { SessionSnapshots } from '../../../source/sessions/session-snapshots.js';
import { SessionProjection } from '../../../source/sessions/session-projection.js';
import type { SessionState } from '../../../source/sessions/session-types.js';
import type { TrafficSessionManifest } from '../../benchmarks/traffic-oracle/traffic-oracle-types.js';
import { TrafficPolicy } from '../../benchmarks/traffic/traffic-policy.js';
import { TrafficMessages } from '../../benchmarks/traffic/traffic-messages.js';
import type { TrafficHttp } from './traffic-http.js';
import { TrafficScenario } from './traffic-scenario.js';

const receiptValidator = new Ajv({ strict: true }).compile<EventBatchResponse>(
  EventBatchResponseSchema,
);

export const TrafficSession = {
  async receipts(response: Response, expected: string[]): Promise<void> {
    const payload: unknown = await response.json();
    assert.ok(receiptValidator(payload), TrafficMessages.RequestFailed);
    assert.deepEqual(
      payload.receipts.map((receipt) => receipt.status),
      expected,
      TrafficMessages.RequestFailed,
    );
  },

  random(seed: number) {
    let value = seed >>> 0;

    return () => {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;

      return value / 4294967296;
    };
  },

  command(state: SessionState) {
    return {
      operationIdentifier: randomUUID(),
      expectedSessionRevision: state.revision,
      stepIdentifier: state.currentStepIdentifier,
      clientTimestamp: new Date().toISOString(),
    };
  },

  answer(step: FunnelStep, random: () => number): unknown {
    return TrafficScenario.answer(step, random);
  },

  event(state: SessionState, name: string, properties: Record<string, TextOrNumber>) {
    return {
      event_id: randomUUID(),
      session_id: state.sessionIdentifier,
      name,
      client_timestamp: new Date().toISOString(),
      step_id: state.currentStepIdentifier,
      observationRevision: state.revision,
      properties,
    };
  },

  async run(
    http: TrafficHttp,
    administratorCookie: string,
    versionIdentifier: string,
    index: number,
    seed: number,
  ): Promise<TrafficSessionManifest> {
    const random = this.random(seed + index * 7919);
    const forced = index % 10 === 0;
    const campaign = TrafficScenario.campaign(index);
    const acquisition = {
      source: campaign.source,
      medium: campaign.medium,
      campaign: campaign.campaign,
    };
    const created = await http.request(
      `/api/administration/configurations/${versionIdentifier}/preview`,
      {
        operationIdentifier: randomUUID(),
        clientTimestamp: new Date().toISOString(),
        ...(forced ? { variant: index % 20 === 0 ? 'A' : 'B' } : {}),
        acquisition: {
          utm_source: acquisition.source,
          utm_medium: acquisition.medium,
          utm_campaign: acquisition.campaign,
        },
      },
      administratorCookie,
      index + 1,
    );
    const previewCookie = created.headers
      .getSetCookie()
      .find((value) => value.startsWith('kelpie_preview='))
      ?.split(';')[0];
    assert.ok(previewCookie, TrafficMessages.MissingCookie);
    const cookie = `${administratorCookie}; ${previewCookie}`;
    let state = SessionSnapshots.read(await created.json());
    const manifest: TrafficSessionManifest = {
      index,
      sessionIdentifier: state.sessionIdentifier,
      versionIdentifier,
      version: state.funnelVersion,
      variant: state.variant,
      forced,
      acquisition,
      submittedSteps: [],
      viewedSteps: [],
      resultIdentifier: null,
      resultViewed: false,
      recommendationClicked: false,
      recommendationExpanded: false,
      completed: false,
      expired: false,
      replayedEvents: 0,
      rejectedEvents: 0,
      backChanges: 0,
      transitions: [],
    };
    const initialRoute = FunnelEvaluation.evaluate(state.configuration, state.variant, {}).route;
    const dropout = TrafficScenario.dropout(
      index,
      state.variant,
      initialRoute.steps.length,
      random,
    );

    for (let transition = 0; transition < TrafficPolicy.MaximumTransitions; transition += 1) {
      const evaluation = FunnelEvaluation.evaluate(
        state.configuration,
        state.variant,
        SessionProjection.confirmedAnswers(state, state.configuration),
      );
      const step = evaluation.route.steps.find(
        (candidate) => candidate.id === state.currentStepIdentifier,
      );
      assert.ok(step, TrafficMessages.MissingStep);
      const view = this.event(state, 'step_viewed', {
        step_type: step.type,
        visible_step_index: evaluation.route.steps.indexOf(step),
        visible_step_count: evaluation.route.steps.length,
      });

      if (index % 17 !== 0 || transition === 0) {
        const events = index % 7 === 0 ? [null, view, view] : [view];
        const receiptResponse = await http.request(
          '/api/events/batches',
          { events },
          cookie,
          index + 1,
        );
        await this.receipts(
          receiptResponse,
          index % 7 === 0 ? ['rejected', 'accepted', 'duplicate'] : ['accepted'],
        );
        manifest.viewedSteps.push(step.id);

        if (index % 7 === 0) {
          manifest.replayedEvents += 1;
          manifest.rejectedEvents += 1;
        }

        if (index % 11 === 0 && transition === 0) {
          await this.receipts(
            await http.request('/api/events/batches', { events: [view] }, cookie, index + 1),
            ['duplicate'],
          );
          await this.receipts(
            await http.request(
              '/api/events/batches',
              { events: [{ ...view, event_id: randomUUID() }] },
              cookie,
              index + 1,
            ),
            ['accepted'],
          );
          manifest.replayedEvents += 1;
        }
      }

      if (state.result) {
        manifest.resultIdentifier = state.result.id;
        manifest.completed = true;
        const resultEvents = [this.event(state, 'result_viewed', { result_id: state.result.id })];
        manifest.resultViewed = true;

        if (TrafficScenario.clicks(index, state.variant, random)) {
          resultEvents.push(
            this.event(state, 'cta_clicked', {
              result_id: state.result.id,
              action: state.result.cta.action,
            }),
          );
          manifest.recommendationClicked = true;

          if (
            state.configuration.events.allowed.some(
              (event) => event.name === 'recommendation_expanded',
            )
          ) {
            resultEvents.push(
              this.event(state, 'recommendation_expanded', {
                result_id: state.result.id,
                action: state.result.cta.action,
                source: 'primary_cta',
              }),
            );
            manifest.recommendationExpanded = true;
          }
        }

        const response = await http.request(
          '/api/events/batches',
          { events: resultEvents.reverse() },
          cookie,
          index + 1,
        );
        await this.receipts(
          response,
          resultEvents.map(() => 'accepted'),
        );

        return manifest;
      }

      if (transition >= dropout) {
        return manifest;
      }

      if (index % 13 === 0 && transition === 3) {
        state = SessionSnapshots.read(
          await (
            await http.request('/api/sessions/current/back', this.command(state), cookie, index + 1)
          ).json(),
        );
        manifest.backChanges += 1;
        continue;
      }

      const previous = state.currentStepIdentifier;
      const body = {
        ...this.command(state),
        ...(step.type === 'info' ? {} : { answer: this.answer(step, random) }),
      };
      state = SessionSnapshots.read(
        await (
          await http.request(
            `/api/sessions/current/${step.type === 'info' ? 'continue' : 'answers'}`,
            body,
            cookie,
            index + 1,
          )
        ).json(),
      );
      manifest.submittedSteps.push(previous);
      manifest.transitions.push({
        fromStepIdentifier: previous,
        toStepIdentifier: state.currentStepIdentifier,
      });
    }

    throw new Error(TrafficMessages.TransitionLimit);
  },
} as const;
