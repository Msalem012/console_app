const DatabaseConnection = require('../database/connection');
const moment = require('moment');
class Employee {
  constructor(fullName, birthDate, gender) {
    this.fullName = fullName;
    this.birthDate = birthDate;
    this.gender = gender;
    this.id = null;
    this.createdAt = null;
  }
  validate() {
    const errors = [];
    if (!this.fullName || typeof this.fullName !== 'string' || this.fullName.trim().length === 0) {
      errors.push('Full name is required and must be a non-empty string');
    }
    if (!this.birthDate) {
      errors.push('Birth date is required');
    } else {
      const date = moment(this.birthDate, 'YYYY-MM-DD', true);
      if (!date.isValid()) {
        errors.push('Birth date must be in YYYY-MM-DD format');
      } else if (date.isAfter(moment())) {
        errors.push('Birth date cannot be in the future');
      }
    }
    if (!this.gender || !['Male', 'Female'].includes(this.gender)) {
      errors.push('Gender must be either "Male" or "Female"');
    }
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
  calculateAge() {
    if (!this.birthDate) {
      throw new Error('Birth date is required to calculate age');
    }
    const birthMoment = moment(this.birthDate, 'YYYY-MM-DD');
    const now = moment();
    if (!birthMoment.isValid()) {
      throw new Error('Invalid birth date format. Use YYYY-MM-DD');
    }
    return now.diff(birthMoment, 'years');
  }
  async saveToDB() {
    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    const pool = DatabaseConnection.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }
    const insertQuery = `
      INSERT INTO employees (full_name, birth_date, gender)
      VALUES ($1, $2, $3)
      RETURNING id, created_at;
    `;
    try {
      const result = await pool.query(insertQuery, [
        this.fullName.trim(),
        this.birthDate,
        this.gender
      ]);
      this.id = result.rows[0].id;
      this.createdAt = result.rows[0].created_at;
      return {
        success: true,
        employee: this,
        message: `Employee "${this.fullName}" saved successfully with ID: ${this.id}`
      };
    } catch (error) {
      if (error.code === '23505') {
        throw new Error(`Employee with name "${this.fullName}" and birth date "${this.birthDate}" already exists`);
      }
      throw new Error(`Failed to save employee: ${error.message}`);
    }
  }
  toJSON() {
    return {
      id: this.id,
      fullName: this.fullName,
      birthDate: this.birthDate,
      gender: this.gender,
      age: this.calculateAge(),
      createdAt: this.createdAt
    };
  }
  static async batchInsert(employees, batchSize = 1000) {
    if (!Array.isArray(employees) || employees.length === 0) {
      throw new Error('Employees array is required and must not be empty');
    }
    const maxBatchSize = process.env.NODE_ENV === 'production' ? 500 : 1000;
    batchSize = Math.min(batchSize, maxBatchSize);
    const pool = DatabaseConnection.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }
    const validationErrors = [];
    employees.forEach((emp, index) => {
      const validation = emp.validate();
      if (!validation.isValid) {
        validationErrors.push(`Employee ${index + 1}: ${validation.errors.join(', ')}`);
      }
    });
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed for ${validationErrors.length} employees:\n${validationErrors.join('\n')}`);
    }
    const results = {
      totalEmployees: employees.length,
      insertedCount: 0,
      skippedCount: 0,
      batches: [],
      startTime: performance.now()
    };
    try {
      for (let i = 0; i < employees.length; i += batchSize) {
        const batch = employees.slice(i, i + batchSize);
        const batchStartTime = performance.now();
        const values = [];
        const placeholders = [];
        batch.forEach((emp, index) => {
          const paramIndex = index * 3;
          placeholders.push(`($${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`);
          values.push(emp.fullName.trim(), emp.birthDate, emp.gender);
        });
        const insertQuery = `
          INSERT INTO employees (full_name, birth_date, gender)
          VALUES ${placeholders.join(', ')}
          ON CONFLICT (full_name, birth_date) DO NOTHING
          RETURNING id;
        `;
        const result = await pool.query(insertQuery, values);
        const batchEndTime = performance.now();
        const batchResult = {
          batchNumber: Math.floor(i / batchSize) + 1,
          recordsInBatch: batch.length,
          insertedInBatch: result.rowCount,
          skippedInBatch: batch.length - result.rowCount,
          executionTime: `${(batchEndTime - batchStartTime).toFixed(2)}ms`
        };
        results.batches.push(batchResult);
        results.insertedCount += result.rowCount;
        results.skippedCount += (batch.length - result.rowCount);
        if (typeof global.progressCallback === 'function') {
          global.progressCallback({
            type: 'progress',
            current: Math.min(i + batchSize, employees.length),
            total: employees.length,
            percentage: Math.round((Math.min(i + batchSize, employees.length) / employees.length) * 100),
            batch: batchResult
          });
        }
      }
      results.endTime = performance.now();
      results.totalExecutionTime = `${(results.endTime - results.startTime).toFixed(2)}ms`;
      return results;
    } catch (error) {
      throw new Error(`Batch insert failed: ${error.message}`);
    }
  }
  static async findAll(options = {}) {
    const pool = DatabaseConnection.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }
    let query = `
      SELECT
        id,
        full_name,
        birth_date,
        gender,
        created_at,
        EXTRACT(YEAR FROM AGE(birth_date)) as age
      FROM employees
    `;
    const conditions = [];
    const values = [];
    if (options.gender) {
      conditions.push(`gender = $${values.length + 1}`);
      values.push(options.gender);
    }
    if (options.nameStartsWith) {
      conditions.push(`full_name ILIKE $${values.length + 1}`);
      values.push(`${options.nameStartsWith}%`);
    }
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    const sortBy = options.sortBy || 'full_name';
    const sortOrder = options.sortOrder || 'ASC';
    query += ` ORDER BY ${sortBy} ${sortOrder}`;
    if (options.limit) {
      query += ` LIMIT $${values.length + 1}`;
      values.push(options.limit);
    }
    if (options.offset) {
      query += ` OFFSET $${values.length + 1}`;
      values.push(options.offset);
    }
    try {
      const startTime = performance.now();
      const result = await pool.query(query, values);
      const endTime = performance.now();
      const employees = result.rows.map(row => {
        const emp = new Employee(row.full_name, row.birth_date, row.gender);
        emp.id = row.id;
        emp.createdAt = row.created_at;
        return emp;
      });
      return {
        employees: employees,
        count: result.rowCount,
        executionTime: `${(endTime - startTime).toFixed(2)}ms`,
        query: options
      };
    } catch (error) {
      throw new Error(`Failed to retrieve employees: ${error.message}`);
    }
  }
  static async findByQuery(criteria, measurePerformance = false) {
    const pool = DatabaseConnection.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }
    const startTime = performance.now();
    try {
      const result = await Employee.findAll(criteria);
      const endTime = performance.now();
      if (measurePerformance) {
        result.performanceMetrics = {
          executionTime: `${(endTime - startTime).toFixed(2)}ms`,
          recordsFound: result.count,
          queryComplexity: Object.keys(criteria).length,
          timestamp: new Date().toISOString()
        };
      }
      return result;
    } catch (error) {
      throw new Error(`Query failed: ${error.message}`);
    }
  }
  static async count(criteria = {}) {
    const pool = DatabaseConnection.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }
    let query = 'SELECT COUNT(*) as count FROM employees';
    const conditions = [];
    const values = [];
    if (criteria.gender) {
      conditions.push(`gender = $${values.length + 1}`);
      values.push(criteria.gender);
    }
    if (criteria.nameStartsWith) {
      conditions.push(`full_name ILIKE $${values.length + 1}`);
      values.push(`${criteria.nameStartsWith}%`);
    }
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    try {
      const result = await pool.query(query, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Failed to count employees: ${error.message}`);
    }
  }
  static async deleteAll() {
    const pool = DatabaseConnection.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }
    try {
      const result = await pool.query('DELETE FROM employees');
      return {
        success: true,
        deletedCount: result.rowCount,
        message: `All ${result.rowCount} employees deleted successfully`
      };
    } catch (error) {
      throw new Error(`Failed to delete employees: ${error.message}`);
    }
  }
}
module.exports = Employee;
