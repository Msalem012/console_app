// Deployment Configuration for Memory-Safe Production
module.exports = {
  // Environment settings for safe deployment
  environment: {
    NODE_ENV: 'production',
    MEMORY_SAFE_MODE: 'true',
    DEPLOYMENT_MODE: 'true',
    ion mode: 
    // Database pool settings for production
    DB_POOL_MIN: '2',
    DB_POOL_MAX: '10',
    DB_POOL_IDLE_TIMEOUT: '30000'
  },

  // Memory safety limits
  limits: {
    maxEmployeesGeneration: 10000,
    maxBatchSize: 500,
    maxConcurrentBatches: 2
  },

  // Deployment platform specific settings
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

  // Health check configuration
  healthCheck: {
    path: '/health',
    timeout: 30000,
    interval: 60000
  }
}; 