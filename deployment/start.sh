#!/bin/bash
set -Eeuo pipefail

export ADMINISTRATION_ORIGIN="${ADMINISTRATION_ORIGIN:-${RENDER_EXTERNAL_URL:-}}"
export QUIZ_ORIGIN="${QUIZ_ORIGIN:-${RENDER_EXTERNAL_URL:-}}"
export TRUST_PROXY_LOOPBACK=true
: "${ADMINISTRATION_ORIGIN:?Set ADMINISTRATION_ORIGIN or RENDER_EXTERNAL_URL}"
: "${QUIZ_ORIGIN:?Set QUIZ_ORIGIN or RENDER_EXTERNAL_URL}"
: "${DATABASE_URL:?Set DATABASE_URL}"

child_processes=()

shutdown() {
  local exit_status="$1"
  trap - EXIT TERM INT

  if (( ${#child_processes[@]} > 0 )); then
    kill -TERM "${child_processes[@]}" 2>/dev/null || true

    # Bound draining below Render's termination window, even for a stuck child.
    (
      sleep 20
      kill -KILL "${child_processes[@]}" 2>/dev/null || true
    ) &
    local shutdown_deadline=$!

    for child_process in "${child_processes[@]}"; do
      wait "$child_process" 2>/dev/null || true
    done

    kill "$shutdown_deadline" 2>/dev/null || true
    wait "$shutdown_deadline" 2>/dev/null || true
  fi

  exit "$exit_status"
}

trap 'shutdown $?' EXIT
trap 'shutdown 0' TERM INT

# Migrations and first-administrator bootstrap must finish before accepting requests.
(
  cd /opt/kelpie/applications/backend
  exec bun distribution/source/database/migrate-remote-database.js
) &
child_processes+=("$!")
wait "${child_processes[0]}"
child_processes=()

(
  cd /opt/kelpie/applications/backend
  exec bun distribution/source/administration/bootstrap-administrator.js
) &
child_processes+=("$!")
wait "${child_processes[0]}"
child_processes=()
# Bootstrap credentials are not needed by any long-running process.
unset ADMINISTRATION_USERNAME ADMINISTRATION_PASSWORD

(
  cd /opt/kelpie/applications/backend
  export HOST=127.0.0.1 PORT=3000
  exec bun --smol distribution/source/main.js
) &
child_processes+=("$!")

(
  unset DATABASE_URL DATABASE_AUTH_TOKEN
  export HOSTNAME=127.0.0.1 PORT=3001
  exec node --max-old-space-size=192 /opt/kelpie/quiz-server/applications/quiz/server.js
) &
child_processes+=("$!")

(
  unset DATABASE_URL DATABASE_AUTH_TOKEN
  exec caddy run --config /opt/kelpie/deployment/Caddyfile --adapter caddyfile
) &
child_processes+=("$!")

# A successful exit is still unexpected for any long-running service.
wait -n "${child_processes[@]}"
exit 1
