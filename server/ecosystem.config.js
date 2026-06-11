/**
 * PM2 ecosystem config — Group Lunch API
 *
 * Start:   pm2 start ecosystem.config.js --env production
 * Dev:     pm2 start ecosystem.config.js
 * Reload:  pm2 reload group-lunch-api
 * Logs:    pm2 logs group-lunch-api
 * Status:  pm2 status
 *
 * NOTE: Socket.IO requires sticky sessions for cluster mode.
 * Until a Redis adapter is wired up, run in fork mode (instances: 1).
 * This gives crash recovery + memory restart without the cluster complexity.
 */

module.exports = {
  apps: [
    {
      name:    'group-lunch-api',
      script:  'server.js',

      // Fork mode — single process with automatic crash recovery.
      // Switch to cluster mode + @socket.io/cluster-adapter when Redis is available.
      instances:  1,
      exec_mode:  'fork',

      // Restart policy
      max_restarts:              10,       // give up after 10 rapid crashes
      min_uptime:                '10s',    // must stay up 10s to count as stable
      exp_backoff_restart_delay: 100,      // back off exponentially between restarts
      max_memory_restart:        '400M',   // restart if heap > 400 MB (memory leak guard)

      // Don't watch files — use `pm2 reload` for zero-downtime deploys
      watch: false,

      // Log management
      error_file:      'logs/error.log',
      out_file:        'logs/app.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs:      true,

      // Development defaults
      env: {
        NODE_ENV: 'development',
        PORT:     8000,
      },

      // Production overrides — activated with --env production
      env_production: {
        NODE_ENV: 'production',
        PORT:     8000,
      },
    },
  ],
};
