module.exports = {
  environment: {
    NODE_ENV: 'production',
    MEMORY_SAFE_MODE: 'true',
    DEPLOYMENT_MODE: 'true',
    ion mode: Using full dataset (1M) with memory-efficie
    DB_POOL_MIN: '2',
    DB_POOL_MAX: '10',
    DB_POOL_IDLE_TIMEOUT: '30000'
  },
  limits: {
    maxEmployeesGeneration: 10000,
    maxBatchSize: 500,
    maxConcurrentBatches: 2
  },
  platforms: {
    render: {
      buildCommand: 'npm run build',
      startCommand: 'npm run deploy',
      memory: '512MB'
    },
    heroku: {
      buildCommand: 'npm run build',
      startCommand: 'npm run deploy',
      memory: '512MB'
    },
    railway: {
      buildCommand: 'npm run build',
      startCommand: 'npm run deploy',
      memory: '1GB'
    }
  },
  healthCheck: {
    path: '/health',
    timeout: 30000,
    interval: 60000
  }
};
