# syntax=docker/dockerfile:1
FROM oven/bun:1.3.14@sha256:e10577f0db68676a7024391c6e5cb4b879ebd17188ab750cf10024a6d700e5c4 AS bun-runtime
FROM caddy:2.11.4-alpine@sha256:6aeddd44c3078b0f9a35206472a11420648a79c184603ef95957d0a20044cb2b AS gateway-runtime
# Render drops Linux capabilities; this gateway only binds unprivileged port 10000.
RUN setcap -r /usr/bin/caddy && test -z "$(getcap /usr/bin/caddy)"
FROM node:24.16.0-bookworm-slim@sha256:2c87ef9bd3c6a3bd4b472b4bec2ce9d16354b0c574f736c476489d09f560a203 AS build

WORKDIR /opt/kelpie
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY applications/backend/package.json ./applications/backend/package.json
COPY applications/frontend/package.json ./applications/frontend/package.json
COPY applications/quiz/package.json ./applications/quiz/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/funnel-runtime/package.json ./packages/funnel-runtime/package.json
RUN npm ci
COPY . .
# Origins are resolved at runtime. No credentials or hosted database are needed to build.
RUN VITE_BASE_PATH=/administration/ npm run build
RUN npm prune --omit=dev

FROM node:24.16.0-bookworm-slim@sha256:2c87ef9bd3c6a3bd4b472b4bec2ce9d16354b0c574f736c476489d09f560a203 AS production
WORKDIR /opt/kelpie
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=10000 \
    GOMEMLIMIT=32MiB

COPY --from=bun-runtime /usr/local/bin/bun /usr/local/bin/bun
COPY --from=gateway-runtime /usr/bin/caddy /usr/local/bin/caddy
COPY --from=build --chown=node:node /opt/kelpie/node_modules ./node_modules
COPY --from=build --chown=node:node /opt/kelpie/package.json ./package.json
COPY --from=build --chown=node:node /opt/kelpie/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=build --chown=node:node /opt/kelpie/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build --chown=node:node /opt/kelpie/packages/contracts/distribution ./packages/contracts/distribution
COPY --from=build --chown=node:node /opt/kelpie/packages/funnel-runtime/package.json ./packages/funnel-runtime/package.json
COPY --from=build --chown=node:node /opt/kelpie/packages/funnel-runtime/distribution ./packages/funnel-runtime/distribution
COPY --from=build --chown=node:node /opt/kelpie/applications/backend/node_modules ./applications/backend/node_modules
COPY --from=build --chown=node:node /opt/kelpie/applications/backend/package.json ./applications/backend/package.json
COPY --from=build --chown=node:node /opt/kelpie/applications/backend/distribution ./applications/backend/distribution
COPY --from=build --chown=node:node /opt/kelpie/applications/backend/prisma ./applications/backend/prisma
COPY --from=build --chown=node:node /opt/kelpie/applications/frontend/distribution ./applications/frontend/distribution
COPY --from=build --chown=node:node /opt/kelpie/applications/quiz/.next/standalone ./quiz-server
COPY --from=build --chown=node:node /opt/kelpie/applications/quiz/.next/static ./quiz-server/applications/quiz/.next/static
COPY --from=build --chown=node:node /opt/kelpie/applications/quiz/public ./quiz-server/applications/quiz/public
COPY --chown=node:node deployment ./deployment

USER node
EXPOSE 10000
STOPSIGNAL SIGTERM
ENTRYPOINT ["/bin/bash", "/opt/kelpie/deployment/start.sh"]
