export const TrafficMessages = {
  RequestFailed: 'Synthetic traffic request failed.',
  MissingStep: 'Synthetic traffic received an unknown step.',
  MissingCookie: 'Synthetic traffic session cookie was not returned.',
  InvalidArguments:
    'Use --sessions=1..100000 --concurrency=1..32 --seed=integer --output=directory.',
  TransitionLimit: 'Synthetic traffic exceeded its transition limit.',
  MissingVersion: 'Synthetic traffic configuration version is unavailable.',
} as const;
