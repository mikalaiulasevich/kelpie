import { spawn } from 'node:child_process';

import { DevelopmentPolicy } from './script-policy.mjs';
/** @type {Set<import('node:child_process').ChildProcess>} */
const childProcesses = new Set();
let shuttingDown = false;

const DevelopmentProcesses = {
  /** @param {number} exitCode */
  stop(exitCode) {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    process.exitCode = exitCode;

    DevelopmentProcesses.signal('SIGTERM');
    const shutdownDeadline = setTimeout(
      () => DevelopmentProcesses.signal('SIGKILL'),
      DevelopmentPolicy.shutdownTimeoutMilliseconds,
    );
    shutdownDeadline.unref();
  },

  /** @param {unknown} error */
  isMissing(error) {
    return error instanceof Error && 'code' in error && error.code === 'ESRCH';
  },

  /** @param {NodeJS.Signals} signal */
  signal(signal) {
    for (const childProcess of childProcesses) {
      try {
        if (process.platform === 'win32') {
          childProcess.kill(signal);
        } else if (childProcess.pid !== undefined) {
          process.kill(-childProcess.pid, signal);
        }
      } catch (error) {
        if (!DevelopmentProcesses.isMissing(error)) {
          console.error('Unable to signal development process:', error);
        }
      }
    }
  },
};

for (const workspaceName of DevelopmentPolicy.workspaces) {
  const childProcess = spawn('npm', ['run', 'development', `--workspace=${workspaceName}`], {
    stdio: 'inherit',
    detached: process.platform !== 'win32',
    shell: process.platform === 'win32',
  });
  childProcesses.add(childProcess);
  childProcess.on('error', (error) => {
    console.error(`Unable to start ${workspaceName}:`, error.message);
    DevelopmentProcesses.stop(DevelopmentPolicy.failureExitCode);
  });
  childProcess.on('exit', (exitCode) => {
    childProcesses.delete(childProcess);
    if (!shuttingDown) {
      DevelopmentProcesses.stop(exitCode ?? DevelopmentPolicy.failureExitCode);
    }
  });
}

process.once('SIGINT', () => DevelopmentProcesses.stop(DevelopmentPolicy.interruptExitCode));
process.once('SIGTERM', () => DevelopmentProcesses.stop(DevelopmentPolicy.terminationExitCode));
