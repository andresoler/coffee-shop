const { spawn } = require('child_process');

const processes = [
  {
    name: 'server',
    command: 'node server.js',
  },
  {
    name: 'client',
    command: 'npm --prefix client run dev',
  },
];

const children = processes.map(({ name, command }) => {
  const child = spawn(command, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: true,
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[${name}] stopped by ${signal}`);
      return;
    }

    if (code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      shutdown(code);
    }
  });

  return child;
});

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) child.kill();
  }

  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
