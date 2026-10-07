import { SessionTimestamps } from './session-timestamps.js';
import { SessionPolicy } from './session-policy.js';
import { HttpStatus } from '@nestjs/common';
import { Ajv } from 'ajv';
import { createHash } from 'node:crypto';
import { PublicRequestError } from '../transport/public-request-error.js';
import { SessionCommandMessages } from './session-command-messages.js';
import { SessionCommandErrorCode, SessionCommandKind } from './session-command-policy.js';
import {
  SessionCommandSchemas,
  type SessionCommand,
  type SubmitSessionAnswerRequest,
  type SessionNavigationRequest,
} from './session-command-types.js';

const compiler = new Ajv({
  strict: true,
  allErrors: false,
  coerceTypes: false,
  ownProperties: true,
});

const SessionCommandValidators = {
  answer: compiler.compile<SubmitSessionAnswerRequest>(SessionCommandSchemas.Answer),
  navigation: compiler.compile<SessionNavigationRequest>(SessionCommandSchemas.Navigation),
} as const;

export const SessionCommandInputs = {
  read(kind: SessionCommandKind, value: unknown): SessionCommand {
    if (
      kind === SessionCommandKind.Answer &&
      SessionCommandValidators.answer(value) &&
      SessionTimestamps.isCanonical(value.clientTimestamp)
    ) {
      return {
        ...value,
        answer: Array.isArray(value.answer) ? [...value.answer] : value.answer,
        kind,
      };
    }

    if (
      kind !== SessionCommandKind.Answer &&
      SessionCommandValidators.navigation(value) &&
      SessionTimestamps.isCanonical(value.clientTimestamp)
    ) {
      return { ...value, kind };
    }

    throw new PublicRequestError(
      HttpStatus.BAD_REQUEST,
      SessionCommandErrorCode.Invalid,
      SessionCommandMessages.Invalid,
    );
  },

  fingerprint(command: SessionCommand): string {
    return createHash(SessionPolicy.HashAlgorithm)
      .update(
        JSON.stringify([
          command.kind,
          command.expectedSessionRevision,
          command.stepIdentifier,
          command.clientTimestamp,
          command.kind === SessionCommandKind.Answer ? command.answer : null,
        ]),
      )
      .digest(SessionPolicy.HashEncoding);
  },
} as const;
