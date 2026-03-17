module.exports = {
  apps: [
    {
      name: 'aistats-web',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/root/apps/AiStats',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '512M',
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'aistats-workers',
      script: 'node_modules/.bin/tsx',
      args: 'src/workers/index.ts',
      cwd: '/root/apps/AiStats',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '256M',
      error_file: './logs/workers-error.log',
      out_file: './logs/workers-out.log',
      merge_logs: true,
      time: true,
    },
  ],
}
