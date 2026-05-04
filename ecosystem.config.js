module.exports = {
  apps: [
    {
      name: 'sparrow-food-frontend',
      script: './dist/sparrow-food/server/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4200
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time_stamp: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '500M',
      restart_delay: 4000
    },
    {
      name: 'sparrow-food-backend',
      script: './backend/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './backend/logs/error.log',
      out_file: './backend/logs/out.log',
      log_file: './backend/logs/combined.log',
      time_stamp: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '300M',
      restart_delay: 4000
    }
  ],
  deploy: {
    production: {
      user: 'node',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'https://github.com/your-username/sparrow-food.git',
      path: '/var/www/sparrow-food',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build:ssr && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};