import { isError, isUndefined } from 'es-toolkit/predicate';
import { spawn } from 'node:child_process';

import { DevelopmentMessages } from './script-messages.mjs';
import { DevelopmentPolicy } from './script-policy.mjs';

/** @type {Set<import('node:child_process').ChildProcess>} */
const childProcesses = new Set();
let shuttingDown = false;
/** @type {Optional<ReturnType<typeof setTimeout>>} */
let shutdownDeadline;
/** @type {Optional<ReturnType<typeof setInterval>>} */
let shutdownInspection;

const DevelopmentProcesses = {
  /** @param {number} exitCode */
  stop(exitCode) {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    process.exitCode = exitCode;

    DevelopmentProcesses.signal(DevelopmentPolicy.GracefulSignal);
    if (childProcesses.size === 0) {
      return;
    }

    // Keep the supervisor alive even when npm exits before its descendants.
    shutdownDeadline = setTimeout(() => {
      DevelopmentProcesses.signal(DevelopmentPolicy.ForcedSignal);
      DevelopmentProcesses.finish();
    }, DevelopmentPolicy.ShutdownTimeoutMilliseconds);
    shutdownInspection = setInterval(() => {
      DevelopmentProcesses.inspect();
    }, DevelopmentPolicy.ShutdownInspectionMilliseconds);
  },

  finish() {
    clearTimeout(shutdownDeadline);
    clearInterval(shutdownInspection);
    childProcesses.clear();
  },

  inspect() {
    if (process.platform !== DevelopmentPolicy.WindowsPlatform) {
      // Retire vanished groups promptly to avoid retaining stale group identifiers.
      DevelopmentProcesses.signal(0);
    }

    if (childProcesses.size === 0) {
      DevelopmentProcesses.finish();
    }
  },

  /** @param {unknown} error */
  isMissing(error) {
    return isError(error) && 'code' in error && error.code === DevelopmentPolicy.MissingProcessCode;
  },

  /** @param {NodeJS.Signals | 0} signal */
  signal(signal) {
    for (const childProcess of childProcesses) {
      try {
        if (process.platform === DevelopmentPolicy.WindowsPlatform) {
          childProcess.kill(signal);
        } else if (!isUndefined(childProcess.pid)) {
          process.kill(-childProcess.pid, signal);
        }
      } catch (error) {
        if (DevelopmentProcesses.isMissing(error)) {
          childProcesses.delete(childProcess);
        } else {
          console.error(DevelopmentMessages.SignalFailed, error);
        }
      }
    }
  },
};

for (const workspaceName of DevelopmentPolicy.Workspaces) {
  const childProcess = spawn(
    DevelopmentPolicy.PackageManager,
    [...DevelopmentPolicy.DevelopmentArguments, `--workspace=${workspaceName}`],
    {
      stdio: DevelopmentPolicy.StandardStreams,
      detached: process.platform !== DevelopmentPolicy.WindowsPlatform,
      shell: process.platform === DevelopmentPolicy.WindowsPlatform,
    },
  );
  childProcesses.add(childProcess);
  childProcess.on('error', (error) => {
    console.error(DevelopmentMessages.startFailed(workspaceName), error.message);
    if (isUndefined(childProcess.pid)) {
      childProcesses.delete(childProcess);
    }

    DevelopmentProcesses.stop(DevelopmentPolicy.FailureExitCode);
  });
  childProcess.on('exit', (exitCode) => {
    if (process.platform === DevelopmentPolicy.WindowsPlatform) {
      childProcesses.delete(childProcess);
    }

    if (!shuttingDown) {
      DevelopmentProcesses.stop(exitCode ?? DevelopmentPolicy.FailureExitCode);
    }
  });
}

process.once(DevelopmentPolicy.InterruptSignal, () =>
  DevelopmentProcesses.stop(DevelopmentPolicy.InterruptExitCode),
);
process.once(DevelopmentPolicy.GracefulSignal, () =>
  DevelopmentProcesses.stop(DevelopmentPolicy.TerminationExitCode),
);
