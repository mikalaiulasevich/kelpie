import { spawn } from 'node:child_process';

import { DevelopmentPolicy } from './script-policy.mjs';
/** @type {Set<import('node:child_process').ChildProcess>} */
const childProcesses = new Set();
let shuttingDown = false;

/** @param {number} exitCode */
function stopChildren(exitCode) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  process.exitCode = exitCode;

  signalChildren('SIGTERM');
  const shutdownDeadline = setTimeout(
    () => signalChildren('SIGKILL'),
    DevelopmentPolicy.shutdownTimeoutMilliseconds,
  );
  shutdownDeadline.unref();
}

for (const workspaceName of DevelopmentPolicy.workspaces) {
  const childProcess = spawn('npm', ['run', 'development', `--workspace=${workspaceName}`], {
    stdio: 'inherit',
    detached: process.platform !== 'win32',
    shell: process.platform === 'win32',
  });
  childProcesses.add(childProcess);
  childProcess.on('error', (error) => {
    console.error(`Unable to start ${workspaceName}:`, error.message);
    stopChildren(DevelopmentPolicy.failureExitCode);
  });
  childProcess.on('exit', (exitCode) => {
    childProcesses.delete(childProcess);
    if (!shuttingDown) {
      stopChildren(exitCode ?? DevelopmentPolicy.failureExitCode);
    }
  });
}

process.once('SIGINT', () => stopChildren(DevelopmentPolicy.interruptExitCode));
process.once('SIGTERM', () => stopChildren(DevelopmentPolicy.terminationExitCode));

/** @param {unknown} error */
function isMissingProcess(error) {
  return error instanceof Error && 'code' in error && error.code === 'ESRCH';
}

/** @param {NodeJS.Signals} signal */
function signalChildren(signal) {
  for (const childProcess of childProcesses) {
    try {
      if (process.platform === 'win32') {
        childProcess.kill(signal);
      } else if (childProcess.pid !== undefined) {
        process.kill(-childProcess.pid, signal);
      }
    } catch (error) {
      if (!isMissingProcess(error)) {
        console.error('Unable to signal development process:', error);
      }
    }
  }
}
