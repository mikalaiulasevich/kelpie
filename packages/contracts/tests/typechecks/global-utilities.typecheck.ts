import { ConditionOperator } from '../../source/index.js';

export const optionalValue: Optional<string> = undefined;
export const nullableValue: Nullable<string> = null;
export const maybeValues: readonly Maybe<string>[] = ['present', null, undefined];

// @ts-expect-error Optional does not add null to the allowed values.
export const invalidOptionalValue: Optional<string> = null;

export const undefinedNullableValue: Nullable<string> = undefined;

// Global utility declarations must be available without a utility-type import.
declare const sessionIdentifier: Nominal<string, 'SessionIdentifier'>;
export const sessionIdentifierText: string = sessionIdentifier;

// @ts-expect-error Distinct nominal identities must not be interchangeable.
export const configurationIdentifier: Nominal<string, 'ConfigurationIdentifier'> =
  sessionIdentifier;

export const conditionVocabulary: Readonly<{ operator: ValueOf<typeof ConditionOperator> }> = {
  operator: ConditionOperator.Equal,
};
export const textDictionary: ReadonlyDictionary<string, string> = { key: 'value' };

// @ts-expect-error Global readonly dictionaries cannot be mutated.
textDictionary['key'] = 'changed';
