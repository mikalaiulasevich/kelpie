import { spawn } from 'node:child_process';

const workspaceNames = ['@kelpie/backend', '@kelpie/frontend'];
const childProcesses = new Set();
let shuttingDown = false;

function stopChildren(exitCode) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  process.exitCode = exitCode;

  for (const childProcess of childProcesses) {
    if (process.platform === 'win32') {
      childProcess.kill('SIGTERM');
    } else if (childProcess.pid !== undefined) {
      try {
        process.kill(-childProcess.pid, 'SIGTERM');
      } catch (error) {
        if (error.code !== 'ESRCH') {
          console.error('Unable to stop development process:', error);
        }
      }
    }
  }

  const shutdownDeadline = setTimeout(() => {
    for (const childProcess of childProcesses) {
      if (process.platform !== 'win32' && childProcess.pid !== undefined) {
        try {
          process.kill(-childProcess.pid, 'SIGKILL');
        } catch (error) {
          if (error.code !== 'ESRCH') {
            console.error('Unable to terminate process:', error);
          }
        }
      } else {
        childProcess.kill('SIGKILL');
      }
    }
  }, 5000);
  shutdownDeadline.unref();
}

for (const workspaceName of workspaceNames) {
  const childProcess = spawn('npm', ['run', 'development', `--workspace=${workspaceName}`], {
    stdio: 'inherit',
    detached: process.platform !== 'win32',
    shell: process.platform === 'win32',
  });
  childProcesses.add(childProcess);
  childProcess.on('error', (error) => {
    console.error(`Unable to start ${workspaceName}:`, error.message);
    stopChildren(1);
  });
  childProcess.on('exit', (exitCode) => {
    childProcesses.delete(childProcess);
    if (!shuttingDown) {
      stopChildren(exitCode ?? 1);
    }
  });
}

process.once('SIGINT', () => stopChildren(130));
process.once('SIGTERM', () => stopChildren(143));
