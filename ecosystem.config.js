// PM2 process definition for the VPS. Lives at ~/websiteafiliate/ecosystem.config.js
// (outside the `app/` dir that gets replaced on every deploy), and points at the
// standalone bundle unpacked into `app/` by .github/workflows/deploy.yml.
module.exports = {
  apps: [
    {
      name: 'websiteafiliate',
      script: './app/server.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '600M',
    },
    {
      name: 'websiteafiliate-insider-cron',
      script: './app/scripts/run-insider-digest.mjs',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '100M',
    },
  ],
};
