module.exports = {
  apps: [{
    name: 'dronacharya-backend',
    script: './src/index.js',
    cwd: '/home/ubuntu/dhronacharya-backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
