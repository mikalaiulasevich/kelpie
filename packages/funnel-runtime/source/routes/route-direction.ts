export const RouteDirection = { Previous: -1, Next: 1 } as const;
export type RouteDirection = ValueOf<typeof RouteDirection>;
