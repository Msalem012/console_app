const { Pool } = require('pg');
const config = require('../../config');
class DatabaseConnection {
  constructor() {
    this.pool = null;
  }
  async initialize() {
    try {
      this.pool = new Pool({
        host: config.database.host,
        port: config.database.port,
        database: config.database.database,
        user: config.database.user,
        password: config.database.password,
        ssl: config.database.ssl,
        ...config.database.pool
      });
      await this.checkConnection();
      console.log(' PostgreSQL connection pool initialized successfully');
      return this.pool;
    } catch (error) {
      console.warn(' Warning: Database connection failed during startup:', error.message);
      console.warn(' App will continue running. Database features will be unavailable until connection is restored.');
      this.pool = new Pool({
        host: config.database.host,
        port: config.database.port,
        database: config.database.database,
        user: config.database.user,
        password: config.database.password,
        ssl: config.database.ssl,
        ...config.database.pool
      });
      return this.pool;
    }
  }
  async checkConnection() {
    if (!this.pool) {
      throw new Error('Database connection not initialized');
    }
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      client.release();
      return {
        connected: true,
        timestamp: result.rows[0].current_time,
        version: result.rows[0].pg_version,
        database: config.database.database,
        host: config.database.host
      };
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }
  async createEmployeesTable() {
    if (!this.pool) {
      throw new Error('Database connection not initialized');
    }
    try {
      const checkTableQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'employees'
        );
      `;
      const existsResult = await this.pool.query(checkTableQuery);
      const tableExists = existsResult.rows[0].exists;
      const tableInfoQuery = `
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = 'employees'
        ORDER BY ordinal_position;
      `;
      if (tableExists) {
        const result = await this.pool.query(tableInfoQuery);
        return {
          created: false,
          alreadyExists: true,
          tableName: 'employees',
          columns: result.rows,
          message: 'Table "employees" already exists with the following structure:'
        };
      } else {
        const createTableQuery = `
          CREATE TABLE employees (
            id SERIAL PRIMARY KEY,
            full_name VARCHAR(255) NOT NULL,
            birth_date DATE NOT NULL,
            gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_employee UNIQUE (full_name, birth_date)
          );
        `;
        await this.pool.query(createTableQuery);
        const result = await this.pool.query(tableInfoQuery);
        return {
          created: true,
          alreadyExists: false,
          tableName: 'employees',
          columns: result.rows,
          message: 'Table "employees" created successfully with the following structure:'
        };
      }
    } catch (error) {
      throw new Error(`Failed to create employees table: ${error.message}`);
    }
  }
  async dropEmployeesTable() {
    if (!this.pool) {
      throw new Error('Database connection not initialized');
    }
    try {
      await this.pool.query('DROP TABLE IF EXISTS employees CASCADE;');
      return {
        dropped: true,
        message: 'Table "employees" dropped successfully'
      };
    } catch (error) {
      throw new Error(`Failed to drop employees table: ${error.message}`);
    }
  }
  async getTableStats() {
    if (!this.pool) {
      throw new Error('Database connection not initialized');
    }
    try {
      const statsQuery = `
        SELECT
          COUNT(*) as total_records,
          COUNT(DISTINCT full_name) as unique_names,
          COUNT(CASE WHEN gender = 'Male' THEN 1 END) as male_count,
          COUNT(CASE WHEN gender = 'Female' THEN 1 END) as female_count,
          MIN(birth_date) as oldest_birth_date,
          MAX(birth_date) as youngest_birth_date,
          pg_size_pretty(pg_total_relation_size('employees')) as table_size
        FROM employees;
      `;
      const result = await this.pool.query(statsQuery);
      return result.rows[0];
    } catch (error) {
      if (error.message.includes('does not exist')) {
        return {
          total_records: 0,
          unique_names: 0,
          male_count: 0,
          female_count: 0,
          oldest_birth_date: null,
          youngest_birth_date: null,
          table_size: '0 bytes'
        };
      }
      throw new Error(`Failed to get table statistics: ${error.message}`);
    }
  }
  async createOptimizationIndexes() {
    if (!this.pool) {
      throw new Error('Database connection not initialized');
    }
    const indexes = [
      {
        name: 'idx_employees_high_performance_pagination',
        query: `CREATE INDEX IF NOT EXISTS idx_employees_high_performance_pagination
                ON employees(full_name, id);`,
        description: 'High-performance index for fast file generation with cursor pagination'
      },
      {
        name: 'idx_employees_gender_name',
        query: `CREATE INDEX IF NOT EXISTS idx_employees_gender_name
                ON employees(gender, full_name)
                WHERE gender = 'Male' AND full_name LIKE 'F%';`,
        description: 'Optimized index for Mode 5 queries'
      },
      {
        name: 'idx_employees_full_name',
        query: `CREATE INDEX IF NOT EXISTS idx_employees_full_name
                ON employees(full_name);`,
        description: 'General full name index'
      },
      {
        name: 'idx_employees_gender',
        query: `CREATE INDEX IF NOT EXISTS idx_employees_gender
                ON employees(gender);`,
        description: 'Gender filtering index'
      },
      {
        name: 'idx_employees_birth_date',
        query: `CREATE INDEX IF NOT EXISTS idx_employees_birth_date
                ON employees(birth_date);`,
        description: 'Birth date index for age calculations'
      }
    ];
    const results = [];
    try {
      for (const index of indexes) {
        const startTime = performance.now();
        await this.pool.query(index.query);
        const endTime = performance.now();
        results.push({
          name: index.name,
          description: index.description || '',
          created: true,
          executionTime: `${(endTime - startTime).toFixed(2)}ms`
        });
      }
      return {
        success: true,
        message: 'Database optimization indexes created successfully',
        indexes: results
      };
    } catch (error) {
      throw new Error(`Failed to create optimization indexes: ${error.message}`);
    }
  }
  getPool() {
    return this.pool;
  }
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log(' Database connection pool closed');
    }
  }
}
module.exports = new DatabaseConnection();

