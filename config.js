module.exports = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  database: {
    host: process.env.DB_HOST || 'dpg-d1tspt49c44c73cdeqkg-a.frankfurt-postgres.render.com',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'console_app',
    user: process.env.DB_USER || 'console_app_user',
    password: process.env.DB_PASSWORD || 'CdWx8Ugf44ZNxXrYWL6XeizcFf9kgb2x',
    ssl: process.env.DB_SSL !== 'false' ? {
      rejectUnauthorized: false,
      require: true
    } : false,
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT) || 30000,
      connectionTimeoutMillis: 2000,
    }
  },
  app: {
    name: 'Employee Directory Terminal',
    version: '1.0.0',
    description: 'Web-based terminal interface for employee directory management'
  }
};

