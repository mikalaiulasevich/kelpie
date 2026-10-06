/** Missing or not found; existing return-value semantics stay unchanged. */
export type Optional<Value> = Value | undefined;

/** Explicitly absent, for example a nullable storage value. */
export type Nullable<Value> = Value | null;

/** Use only at boundaries that actually allow both forms of absence. */
export type Maybe<Value> = Optional<Nullable<Value>>;
