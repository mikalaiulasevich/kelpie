/** Shared compile-time vocabulary, included by typescript.base.json in every workspace. */
type Nullable<Value> = Value | null | undefined;
type Optional<Value> = Value | undefined;
type Maybe<Value> = Nullable<Value>;
type ValueOf<Value> = Value[keyof Value];

declare const NominalIdentity: unique symbol;
type Nominal<Value, Identity extends PropertyKey> = Value & {
  readonly [NominalIdentity]: Identity;
};

type ReadonlyPropertiesWithOptionals<
  Properties extends object,
  OptionalProperties extends object,
> = Readonly<Properties & Partial<OptionalProperties>>;
type ReadonlyMergedProperties<Primary extends object, Secondary extends object> = Readonly<
  Primary & Secondary
>;
type ReadonlyMergedPropertiesWithOptionals<
  Primary extends object,
  Secondary extends object,
  OptionalProperties extends object,
> = Readonly<Primary & Secondary & Partial<OptionalProperties>>;

type PropertyOf<Value, Key extends keyof Value> = Value[Key];
type DefinedPropertyOf<Value, Key extends keyof Value> = NonNullable<PropertyOf<Value, Key>>;
type ItemOf<Value extends ReadonlyList<unknown>> = Value[number];
type Dictionary<Key extends PropertyKey, Value> = Record<Key, Value>;
type ReadonlyDictionary<Key extends PropertyKey, Value> = Readonly<Dictionary<Key, Value>>;
type PartialDictionary<Key extends PropertyKey, Value> = Partial<Dictionary<Key, Value>>;
type ReadonlyEntry<Key, Value> = readonly [Key, Value];
type ReadonlyList<Value> = readonly Value[];
type ReadonlyPair<Value> = readonly [Value, Value];
type ReadonlyPairOrMore<Value> = readonly [Value, Value, ...Value[]];
type ReadonlyDimensions<Value = number> = Readonly<{ Height: Value; Width: Value }>;
type ReadonlyEndpoints<Value> = Readonly<{ Start: Value; End: Value }>;

type DeepReadonly<Value> = Value extends object
  ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
  : Value;

type Listable<Value> = Value | ReadonlyList<Value>;
type Awaitable<Value> = Value | Promise<Value>;
type FunctionWithOptionalSecondArgument<First, Second, Result> = {
  (first: First): Result;
  (first: First, second: Second): Result;
};

type TextValue = string;
type TextOrNumber = TextValue | number;
type TextIdentifier = TextValue;
type TextDictionary<Value = unknown> = ReadonlyDictionary<TextValue, Value>;
type ColorValue = string;
type PercentValue = `${number}%`;
type PercentPairValue = `${PercentValue} ${PercentValue}`;
type Noop = () => void;
type ValueEffect<Value> = (value: Value) => void;
type ValueMapper<Value, Result> = (value: Value) => Result;
type ValuePredicate<Value> = (value: Value) => boolean;
