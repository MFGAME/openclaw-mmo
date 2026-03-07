// OpenClaw MMO - PM2 进程管理配置
// 用于 Node.js 应用的进程管理和自动重启

module.exports = {
  // 应用名称
  name: 'openclaw-mmo',

  // 应用脚本
  script: './dist/main.js',

  // 实例数量（使用 CPU 核心数）
  instances: 'max',

  // 执行模式
  exec_mode: 'cluster',

  // 环境变量
  env: {
    NODE_ENV: 'production',
    PORT: 3000,
  },

  env_development: {
    NODE_ENV: 'development',
    PORT: 3000,
  },

  env_staging: {
    NODE_ENV: 'staging',
    PORT: 3000,
  },

  // 自动重启配置
  watch: false,
  ignore_watch: ['node_modules', 'logs', '.git'],

  // 重启延迟（毫秒）
  restart_delay: 4000,

  // 最大内存重启阈值（MB）
  max_memory_restart: '500M',

  // 最小运行时间（毫秒）
  min_uptime: '10s',

  // 异常重启次数
  max_restarts: 10,

  // 日志配置
  error_file: './logs/pm2/error.log',
  out_file: './logs/pm2/out.log',
  log_file: './logs/pm2/combined.log',
  log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

  // 日志轮转
  log_rotate: true,
  log_rotate_max_size: '10M',
  log_rotate_max_files: '5',

  // 合并日志
  merge_logs: true,

  // 时间戳格式
  time: true,

  // 监控端口
  metrics_interval: 5000,
  metrics: {
    network: true,
    v8: true,
    http: true,
  },

  // 应用列表配置（多应用）
  apps: [
    {
      name: 'web-game',
      script: './dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/pm2/web-game-error.log',
      out_file: './logs/pm2/web-game-out.log',
      log_file: './logs/pm2/web-game.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '500M',
      min_uptime: '10s',
      max_restarts: 10,
    },
    {
      name: 'websocket-server',
      script: './dist/server/WebSocketServer.js',
      instances: 2,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        WEBSOCKET_PORT: 8080,
      },
      error_file: './logs/pm2/websocket-error.log',
      out_file: './logs/pm2/websocket-out.log',
      log_file: './logs/pm2/websocket.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '300M',
      min_uptime: '10s',
      max_restarts: 10,
    },
  ],

  // 部署配置
  deploy: {
    production: {
      user: 'node',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/openclaw-mmo.git',
      path: '/var/www/openclaw-mmo',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get install git',
    },
    staging: {
      user: 'node',
      host: 'staging-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/openclaw-mmo.git',
      path: '/var/www/openclaw-mmo-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': 'apt-get install git',
    },
  },
};
