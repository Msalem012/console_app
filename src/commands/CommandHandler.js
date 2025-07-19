const Employee = require('../models/Employee');
const DatabaseConnection = require('../database/connection');
const DataGenerator = require('../utils/DataGenerator');
const fs = require('fs').promises;
const path = require('path');

class CommandHandler {
  constructor() {
    this.commands = {
      '1': this.mode1_createTable.bind(this),
      '2': this.mode2_createEmployee.bind(this),
      '3': this.mode3_listAllEmployees.bind(this),
      '4': this.mode4_generateBulkData.bind(this),
      '5': this.mode5_queryWithTiming.bind(this),
      '6': this.mode6_optimizeDatabase.bind(this),
      'clear-data': this.clearTable.bind(this),
      'clean': this.clearTable.bind(this),
      'drop': this.dropTable.bind(this),
      'delete-table': this.dropTable.bind(this),
      'help': this.showHelp.bind(this),
      'status': this.showStatus.bind(this)
    };
  }

  async execute(args, outputCallback) {
    if (!args || args.length === 0) {
      outputCallback({
        type: 'error',
        message: 'No command provided. Type "myApp help" for available commands.\n',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const command = args[0].toLowerCase();
    
    // Handle myApp prefix
    if (command === 'myapp' && args.length > 1) {
      args = args.slice(1); // Remove 'myApp' prefix
      return this.execute(args, outputCallback);
    }

    const mode = args[0];
    const commandFunction = this.commands[mode];

    if (!commandFunction) {
      outputCallback({
        type: 'error',
        message: `Unknown command: ${mode}\nType "myApp help" for available commands.\n`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      await commandFunction(args, outputCallback);
    } catch (error) {
      outputCallback({
        type: 'error',
        message: `Command execution failed: ${error.message}\n`,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Mode 1: Create employees table
  async mode1_createTable(args, output) {
    output({
      type: 'info',
      message: '=== Mode 1: Creating employees table ===\n',
      timestamp: new Date().toISOString()
    });

    try {
      const result = await DatabaseConnection.createEmployeesTable();
      
      // Show different messages based on whether table was created or already existed
      if (result.alreadyExists) {
        output({
          type: 'warning',
          message: ` ${result.message}\n`,
          timestamp: new Date().toISOString()
        });
      } else {
        output({
          type: 'success',
          message: ` ${result.message}\n`,
          timestamp: new Date().toISOString()
        });
      }

      // Display table structure
      output({
        type: 'info',
        message: '\nTable structure:\n',
        timestamp: new Date().toISOString()
      });

      result.columns.forEach(col => {
        output({
          type: 'data',
          message: `  ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}${col.column_default ? ` DEFAULT ${col.column_default}` : ''}\n`,
          timestamp: new Date().toISOString()
        });
      });

      // Show different completion messages
      if (result.alreadyExists) {
        output({
          type: 'info',
          message: '\n Mode 1 completed - table was already present!\n\n',
          timestamp: new Date().toISOString()
        });
      } else {
        output({
          type: 'success',
          message: '\n Mode 1 completed successfully!\n\n',
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      throw new Error(`Failed to create table: ${error.message}`);
    }
  }

  // Mode 2: Create single employee record
  async mode2_createEmployee(args, output) {
    output({
      type: 'info',
      message: '=== Mode 2: Creating employee record ===\n',
      timestamp: new Date().toISOString()
    });

    if (args.length < 4) {
      throw new Error('Usage: myApp 2 "Full Name" YYYY-MM-DD Gender\nExample: myApp 2 "Ivanov Petr Sergeevich" 2009-07-12 Male');
    }

    const fullName = args[1];
    const birthDate = args[2];
    const gender = args[3];

    try {
      // Create employee object
      const employee = new Employee(fullName, birthDate, gender);
      
      output({
        type: 'info',
        message: `Creating employee: ${fullName}\n`,
        timestamp: new Date().toISOString()
      });

      // Save to database
      const result = await employee.saveToDB();
      
      output({
        type: 'success',
        message: ` ${result.message}\n`,
        timestamp: new Date().toISOString()
      });

      // Display employee details
      output({
        type: 'data',
        message: `Employee details:\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `  ID: ${employee.id}\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `  Full Name: ${employee.fullName}\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `  Birth Date: ${employee.birthDate}\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `  Gender: ${employee.gender}\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `  Age: ${employee.calculateAge()} years\n`,
        timestamp: new Date().toISOString()
      });

      output({
        type: 'success',
        message: '\n Mode 2 completed successfully!\n\n',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      throw new Error(`Failed to create employee: ${error.message}`);
    }
  }

  // Mode 3: List all employees - Generate and download text file
  async mode3_listAllEmployees(args, output) {
    output({
      type: 'info',
      message: '=== Mode 3: Generating employee list file ===\n',
      timestamp: new Date().toISOString()
    });

    try {
      // Fetch all employees
      const result = await Employee.findAll({
        sortBy: 'full_name',
        sortOrder: 'ASC'
      });

      output({
        type: 'info',
        message: `Found ${result.count} employees (execution time: ${result.executionTime})\n`,
        timestamp: new Date().toISOString()
      });

      if (result.count === 0) {
        output({
          type: 'warning',
          message: 'No employees found in the database.\n',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Generate file content
      output({
        type: 'info',
        message: 'Generating employee list file...\n',
        timestamp: new Date().toISOString()
      });

      const fileContent = this.generateEmployeeListText(result.employees, result);
      
      // Create downloads directory if it doesn't exist
      const downloadsDir = path.join(__dirname, '../../public/downloads');
      try {
        await fs.access(downloadsDir);
      } catch {
        await fs.mkdir(downloadsDir, { recursive: true });
      }

      // Generate unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `employees_list_${timestamp}.txt`;
      const filepath = path.join(downloadsDir, filename);

      // Write file
      await fs.writeFile(filepath, fileContent, 'utf8');

      // Generate download URL
      const downloadUrl = `/downloads/${filename}`;

      output({
        type: 'success',
        message: `Employee list file generated successfully!\n`,
        timestamp: new Date().toISOString()
      });

      output({
        type: 'info',
        message: `File: ${filename}\n`,
        timestamp: new Date().toISOString()
      });

      output({
        type: 'info',
        message: `Records: ${result.count} employees\n`,
        timestamp: new Date().toISOString()
      });

      output({
        type: 'info',
        message: `Size: ${(fileContent.length / 1024).toFixed(2)} KB\n`,
        timestamp: new Date().toISOString()
      });

      // Send download information to client
      output({
        type: 'download',
        message: `Download ready: Click to download file\n`,
        downloadUrl: downloadUrl,
        filename: filename,
        fileSize: fileContent.length,
        recordCount: result.count,
        timestamp: new Date().toISOString()
      });

      output({
        type: 'success',
        message: '\n Mode 3 completed successfully!\n\n',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      throw new Error(`Failed to generate employee list: ${error.message}`);
    }
  }

  // Helper method to generate formatted employee list text
  generateEmployeeListText(employees, result) {
    let content = '';
    
    // Header information
    content += '='.repeat(80) + '\n';
    content += '                         EMPLOYEE DIRECTORY REPORT\n';
    content += '='.repeat(80) + '\n';
    content += `Generated: ${new Date().toLocaleString()}\n`;
    content += `Total Employees: ${employees.length}\n`;
    content += `Query Execution Time: ${result.executionTime}\n`;
    content += `Sorted by: Full Name (Ascending)\n`;
    content += '='.repeat(80) + '\n\n';

    // Column headers
    content += 'ID'.padEnd(8) + 'Full Name'.padEnd(35) + 'Birth Date'.padEnd(15) + 'Gender'.padEnd(10) + 'Age\n';
    content += '-'.repeat(80) + '\n';

    // Employee data
    employees.forEach((employee, index) => {
      const id = String(employee.id || index + 1).padEnd(8);
      const name = String(employee.fullName || '').padEnd(35);
      const birthDate = String(employee.birthDate || '').padEnd(15);
      const gender = String(employee.gender || '').padEnd(10);
      const age = String(employee.calculateAge() || '');

      content += `${id}${name}${birthDate}${gender}${age}\n`;
    });

    // Footer
    content += '\n' + '-'.repeat(80) + '\n';
    content += `Total Records: ${employees.length}\n`;
    content += `Report generated by Employee Directory Terminal\n`;
    content += `End of Report\n`;
    content += '='.repeat(80) + '\n';

    return content;
  }

  // Mode 4: Generate bulk data (1,000,000 + 100 special records)
  async mode4_generateBulkData(args, output) {
    output({
      type: 'info',
      message: '=== Mode 4: Generating bulk data ===\n',
      timestamp: new Date().toISOString()
    });

    output({
      type: 'info',
      message: 'Generating 1,000,000 random employees + 100 males with "F" surnames...\n',
      timestamp: new Date().toISOString()
    });

    try {
      // Set up progress callback
      global.progressCallback = (progressData) => {
        output({
          type: 'progress',
          message: `Progress: ${progressData.percentage}% (${progressData.current}/${progressData.total})\n`,
          timestamp: new Date().toISOString()
        });
      };

      // Generate employees
      const employees = DataGenerator.generateEmployees(1000000, 100);
      
      output({
        type: 'info',
        message: `Generated ${employees.length} employee objects. Starting batch insert...\n`,
        timestamp: new Date().toISOString()
      });

      // Batch insert
      const result = await Employee.batchInsert(employees, 1000);

      // Clean up progress callback
      global.progressCallback = null;

      output({
        type: 'success',
        message: '\ Bulk data generation completed!\n',
        timestamp: new Date().toISOString()
      });

      // Display results
      output({
        type: 'data',
        message: `Results summary:\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `  Total employees generated: ${result.totalEmployees}\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `  Successfully inserted: ${result.insertedCount}\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `  Skipped (duplicates): ${result.skippedCount}\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `  Total execution time: ${result.totalExecutionTime}\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `  Number of batches: ${result.batches.length}\n`,
        timestamp: new Date().toISOString()
      });

      output({
        type: 'success',
        message: '\n Mode 4 completed successfully!\n\n',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      global.progressCallback = null;
      throw new Error(`Failed to generate bulk data: ${error.message}`);
    }
  }

  // Mode 5: Query with performance timing - Generate and download results file
  async mode5_queryWithTiming(args, output) {
    output({
      type: 'info',
      message: '=== Mode 5: Query males with surname starting with "F" ===\n',
      timestamp: new Date().toISOString()
    });

    try {
      const criteria = {
        gender: 'Male',
        nameStartsWith: 'F'
      };

      output({
        type: 'info',
        message: 'Executing query with performance timing...\n',
        timestamp: new Date().toISOString()
      });

      const result = await Employee.findByQuery(criteria, true);

      output({
        type: 'success',
        message: 'Query completed successfully!\n',
        timestamp: new Date().toISOString()
      });

      // Display performance metrics
      output({
        type: 'data',
        message: `Performance metrics:\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `  Execution time: ${result.performanceMetrics.executionTime}\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `  Records found: ${result.performanceMetrics.recordsFound}\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `  Query timestamp: ${result.performanceMetrics.timestamp}\n`,
        timestamp: new Date().toISOString()
      });

      if (result.count === 0) {
        output({
          type: 'warning',
          message: 'No matching employees found in the database.\n',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Generate file content
      output({
        type: 'info',
        message: 'Generating query results file...\n',
        timestamp: new Date().toISOString()
      });

      const fileContent = this.generateQueryResultText(result.employees, result, criteria);
      
      // Create downloads directory if it doesn't exist
      const downloadsDir = path.join(__dirname, '../../public/downloads');
      try {
        await fs.access(downloadsDir);
      } catch {
        await fs.mkdir(downloadsDir, { recursive: true });
      }

      // Generate unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `query_males_F_${timestamp}.txt`;
      const filepath = path.join(downloadsDir, filename);

      // Write file
      await fs.writeFile(filepath, fileContent, 'utf8');

      // Generate download URL
      const downloadUrl = `/downloads/${filename}`;

      output({
        type: 'success',
        message: `Query results file generated successfully!\n`,
        timestamp: new Date().toISOString()
      });

      output({
        type: 'info',
        message: `File: ${filename}\n`,
        timestamp: new Date().toISOString()
      });

      output({
        type: 'info',
        message: `Records: ${result.count} matching employees\n`,
        timestamp: new Date().toISOString()
      });

      output({
        type: 'info',
        message: `Size: ${(fileContent.length / 1024).toFixed(2)} KB\n`,
        timestamp: new Date().toISOString()
      });

      output({
        type: 'info',
        message: `Execution time: ${result.performanceMetrics.executionTime}\n`,
        timestamp: new Date().toISOString()
      });

      // Send download information to client
      output({
        type: 'download',
        message: `Download ready: Click to download query results\n`,
        downloadUrl: downloadUrl,
        filename: filename,
        fileSize: fileContent.length,
        recordCount: result.count,
        timestamp: new Date().toISOString()
      });

      output({
        type: 'success',
        message: '\n Mode 5 completed successfully!\n\n',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      throw new Error(`Failed to execute query: ${error.message}`);
    }
  }

  // Helper method to generate formatted query result text
  generateQueryResultText(employees, result, criteria) {
    let content = '';
    
    // Header information
    content += '='.repeat(80) + '\n';
    content += '                         QUERY RESULTS REPORT\n';
    content += '='.repeat(80) + '\n';
    content += `Generated: ${new Date().toLocaleString()}\n`;
    content += `Query: Males with surname starting with "${criteria.nameStartsWith}"\n`;
    content += `Total Matching Records: ${employees.length}\n`;
    content += `Query Execution Time: ${result.performanceMetrics.executionTime}\n`;
    content += `Query Timestamp: ${result.performanceMetrics.timestamp}\n`;
    content += `Sorted by: Full Name (Ascending)\n`;
    content += '='.repeat(80) + '\n\n';

    // Performance section
    content += 'PERFORMANCE METRICS:\n';
    content += '-'.repeat(40) + '\n';
    content += `Execution Time: ${result.performanceMetrics.executionTime}\n`;
    content += `Records Found: ${result.performanceMetrics.recordsFound}\n`;
    content += `Query Complexity: ${result.performanceMetrics.queryComplexity} criteria\n`;
    content += `Database Response: ${result.executionTime}\n`;
    content += '\n';

    // Results section
    content += 'QUERY RESULTS:\n';
    content += '-'.repeat(40) + '\n';
    content += 'ID'.padEnd(8) + 'Full Name'.padEnd(35) + 'Birth Date'.padEnd(15) + 'Gender'.padEnd(10) + 'Age\n';
    content += '-'.repeat(80) + '\n';

    // Employee data
    employees.forEach((employee, index) => {
      const id = String(employee.id || index + 1).padEnd(8);
      const name = String(employee.fullName || '').padEnd(35);
      const birthDate = String(employee.birthDate || '').padEnd(15);
      const gender = String(employee.gender || '').padEnd(10);
      const age = String(employee.calculateAge() || '');

      content += `${id}${name}${birthDate}${gender}${age}\n`;
    });

    // Summary section
    content += '\n' + '='.repeat(80) + '\n';
    content += 'SUMMARY:\n';
    content += '-'.repeat(20) + '\n';
    content += `Total Males with surname starting with "${criteria.nameStartsWith}": ${employees.length}\n`;
    content += `Query executed successfully in: ${result.performanceMetrics.executionTime}\n`;
    content += `Average age: ${employees.length > 0 ? (employees.reduce((sum, emp) => sum + emp.calculateAge(), 0) / employees.length).toFixed(1) : 0} years\n`;
    
    if (employees.length > 0) {
      const ages = employees.map(emp => emp.calculateAge()).sort((a, b) => a - b);
      content += `Age range: ${ages[0]} - ${ages[ages.length - 1]} years\n`;
    }
    
    content += `Report generated by Employee Directory Terminal\n`;
    content += `Mode 5: Performance Query Results\n`;
    content += '='.repeat(80) + '\n';

    return content;
  }

  // Mode 6: Optimize database
  async mode6_optimizeDatabase(args, output) {
    output({
      type: 'info',
      message: '=== Mode 6: Database optimization ===\n',
      timestamp: new Date().toISOString()
    });

    try {
      // Run query before optimization
      output({
        type: 'info',
        message: 'Running query before optimization...\n',
        timestamp: new Date().toISOString()
      });

      const beforeResult = await Employee.findByQuery({
        gender: 'Male',
        nameStartsWith: 'F'
      }, true);

      output({
        type: 'data',
        message: `Before optimization: ${beforeResult.performanceMetrics.executionTime} (${beforeResult.count} records)\n`,
        timestamp: new Date().toISOString()
      });

      // Create optimization indexes
      output({
        type: 'info',
        message: 'Creating optimization indexes...\n',
        timestamp: new Date().toISOString()
      });

      const indexResult = await DatabaseConnection.createOptimizationIndexes();

      output({
        type: 'success',
        message: ` ${indexResult.message}\n`,
        timestamp: new Date().toISOString()
      });

      // Display created indexes
      indexResult.indexes.forEach(index => {
        output({
          type: 'data',
          message: `  ${index.name}: created in ${index.executionTime}\n`,
          timestamp: new Date().toISOString()
        });
      });

      // Run query after optimization
      output({
        type: 'info',
        message: '\nRunning query after optimization...\n',
        timestamp: new Date().toISOString()
      });

      const afterResult = await Employee.findByQuery({
        gender: 'Male',
        nameStartsWith: 'F'
      }, true);

      output({
        type: 'data',
        message: `After optimization: ${afterResult.performanceMetrics.executionTime} (${afterResult.count} records)\n`,
        timestamp: new Date().toISOString()
      });

      // Calculate improvement
      const beforeTime = parseFloat(beforeResult.performanceMetrics.executionTime);
      const afterTime = parseFloat(afterResult.performanceMetrics.executionTime);
      const improvement = ((beforeTime - afterTime) / beforeTime * 100).toFixed(2);

      output({
        type: 'success',
        message: `\n🚀 Performance improvement: ${improvement}% faster\n`,
        timestamp: new Date().toISOString()
      });

      output({
        type: 'success',
        message: '\n Mode 6 completed successfully!\n\n',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      throw new Error(`Failed to optimize database: ${error.message}`);
    }
  }

  // Clear/Clean table - Delete all employee records
  async clearTable(args, output) {
    output({
      type: 'info',
      message: '=== Clear Employee Table ===\n',
      timestamp: new Date().toISOString()
    });

    try {
      // Check current record count
      const currentCount = await Employee.count();
      
      output({
        type: 'info',
        message: `Current records in table: ${currentCount}\n`,
        timestamp: new Date().toISOString()
      });

      if (currentCount === 0) {
        output({
          type: 'warning',
          message: 'Table is already empty. Nothing to clear.\n',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check for confirmation
      const hasConfirmFlag = args.includes('confirm') || args.includes('--confirm') || args.includes('-y');
      
      if (!hasConfirmFlag) {
        output({
          type: 'warning',
          message: `⚠️  WARNING: This will permanently delete ALL ${currentCount} employee records!\n`,
          timestamp: new Date().toISOString()
        });
        
        output({
          type: 'info',
          message: 'To confirm deletion, use: myApp clear confirm\n',
          timestamp: new Date().toISOString()
        });
        
        output({
          type: 'info',
          message: 'This action cannot be undone!\n',
          timestamp: new Date().toISOString()
        });
        
        return;
      }

      // Perform deletion with confirmation
      output({
        type: 'info',
        message: `Deleting ${currentCount} employee records...\n`,
        timestamp: new Date().toISOString()
      });

      const startTime = performance.now();
      const result = await Employee.deleteAll();
      const endTime = performance.now();
      const executionTime = `${(endTime - startTime).toFixed(2)}ms`;

      output({
        type: 'success',
        message: `Successfully deleted ${result.deletedCount} employee records!\n`,
        timestamp: new Date().toISOString()
      });

      output({
        type: 'info',
        message: `Execution time: ${executionTime}\n`,
        timestamp: new Date().toISOString()
      });

      // Verify table is empty
      const remainingCount = await Employee.count();
      
      if (remainingCount === 0) {
        output({
          type: 'success',
          message: 'Table is now empty and ready for new data.\n',
          timestamp: new Date().toISOString()
        });
      } else {
        output({
          type: 'warning',
          message: `Warning: ${remainingCount} records still remain in table.\n`,
          timestamp: new Date().toISOString()
        });
      }

      output({
        type: 'success',
        message: '\n Clear operation completed successfully!\n\n',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      throw new Error(`Failed to clear table: ${error.message}`);
    }
  }

  // Drop table - Remove the entire employees table
  async dropTable(args, output) {
    output({
      type: 'info',
      message: '=== Drop Employee Table ===\n',
      timestamp: new Date().toISOString()
    });

    try {
      // Check if table exists
      const checkTableQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'employees'
        );
      `;
      
      const pool = DatabaseConnection.getPool();
      if (!pool) {
        throw new Error('Database connection not available');
      }

      const existsResult = await pool.query(checkTableQuery);
      const tableExists = existsResult.rows[0].exists;

      if (!tableExists) {
        output({
          type: 'warning',
          message: 'Table "employees" does not exist. Nothing to drop.\n',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get current record count before dropping
      const currentCount = await Employee.count();
      
      output({
        type: 'info',
        message: `Table "employees" currently contains ${currentCount} records.\n`,
        timestamp: new Date().toISOString()
      });

      // Check for confirmation
      const hasConfirmFlag = args.includes('confirm') || args.includes('--confirm') || args.includes('-y');
      
      if (!hasConfirmFlag) {
        output({
          type: 'warning',
          message: `⚠️  DANGER: This will permanently DROP the entire "employees" table!\n`,
          timestamp: new Date().toISOString()
        });
        
        output({
          type: 'warning',
          message: `⚠️  ALL ${currentCount} records AND the table structure will be deleted!\n`,
          timestamp: new Date().toISOString()
        });
        
        output({
          type: 'info',
          message: 'To confirm table drop, use: myApp drop confirm\n',
          timestamp: new Date().toISOString()
        });
        
        output({
          type: 'info',
          message: 'This action cannot be undone! You will need to run "myApp 1" to recreate the table.\n',
          timestamp: new Date().toISOString()
        });
        
        return;
      }

      // Perform table drop with confirmation
      output({
        type: 'info',
        message: `Dropping table "employees" with ${currentCount} records...\n`,
        timestamp: new Date().toISOString()
      });

      const startTime = performance.now();
      const result = await DatabaseConnection.dropEmployeesTable();
      const endTime = performance.now();
      const executionTime = `${(endTime - startTime).toFixed(2)}ms`;

      output({
        type: 'success',
        message: `Table "employees" dropped successfully!\n`,
        timestamp: new Date().toISOString()
      });

      output({
        type: 'info',
        message: `Records deleted: ${currentCount}\n`,
        timestamp: new Date().toISOString()
      });

      output({
        type: 'info',
        message: `Execution time: ${executionTime}\n`,
        timestamp: new Date().toISOString()
      });

      // Verify table is gone
      const verifyResult = await pool.query(checkTableQuery);
      const stillExists = verifyResult.rows[0].exists;
      
      if (!stillExists) {
        output({
          type: 'success',
          message: 'Table "employees" has been completely removed from the database.\n',
          timestamp: new Date().toISOString()
        });
        
        output({
          type: 'info',
          message: 'Use "myApp 1" to recreate the table when needed.\n',
          timestamp: new Date().toISOString()
        });
      } else {
        output({
          type: 'warning',
          message: 'Warning: Table still exists after drop operation.\n',
          timestamp: new Date().toISOString()
        });
      }

      output({
        type: 'success',
        message: '\n Drop operation completed successfully!\n\n',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      throw new Error(`Failed to drop table: ${error.message}`);
    }
  }

  async showHelp(args, output) {
    output({
      type: 'info',
      message: '=== Available Commands ===\n\n',
      timestamp: new Date().toISOString()
    });

    const commands = [
      { cmd: 'myApp 1', desc: 'Create employees table' },
      { cmd: 'myApp 2 "Full Name" YYYY-MM-DD Gender', desc: 'Create single employee record' },
      { cmd: 'myApp 3', desc: 'Generate and download all employees list file' },
      { cmd: 'myApp 4', desc: 'Generate 1,000,000 + 100 bulk employee records' },
      { cmd: 'myApp 5', desc: 'Query males with "F" surnames and download results' },
      { cmd: 'myApp 6', desc: 'Optimize database and show performance improvement' },
      { cmd: 'myApp clear-data confirm', desc: 'Delete ALL employee records ' },
      { cmd: 'myApp drop confirm', desc: 'DROP entire employees table and structure' },
      { cmd: 'myApp help', desc: 'Show this help message' },
      { cmd: 'myApp status', desc: 'Show database and application status' }
    ];

    commands.forEach(cmd => {
      output({
        type: 'data',
        message: `  ${cmd.cmd.padEnd(40)} - ${cmd.desc}\n`,
        timestamp: new Date().toISOString()
      });
    });

    output({
      type: 'info',
      message: '\nExamples:\n',
      timestamp: new Date().toISOString()
    });
    output({
      type: 'data',
      message: '  myApp 2 "Ivanov Petr Sergeevich" 2009-07-12 Male\n',
      timestamp: new Date().toISOString()
    });
    output({
      type: 'data',
      message: '  myApp 2 "Smith Jane Alice" 1995-03-15 Female\n\n',
      timestamp: new Date().toISOString()
    });
  }

  async showStatus(args, output) {
    output({
      type: 'info',
      message: '=== System Status ===\n\n',
      timestamp: new Date().toISOString()
    });

    try {
      // Database connection status
      const dbStatus = await DatabaseConnection.checkConnection();
      output({
        type: 'success',
        message: ` Database: Connected to ${dbStatus.database} on ${dbStatus.host}\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `   PostgreSQL version: ${dbStatus.version.split(' ')[0]} ${dbStatus.version.split(' ')[1]}\n`,
        timestamp: new Date().toISOString()
      });

      // Table statistics
      const stats = await DatabaseConnection.getTableStats();
      output({
        type: 'data',
        message: `\nEmployee table statistics:\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `   Total records: ${stats.total_records}\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `   Unique names: ${stats.unique_names}\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `   Male employees: ${stats.male_count}\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `   Female employees: ${stats.female_count}\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `   Table size: ${stats.table_size}\n`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      output({
        type: 'error',
        message: ` Status check failed: ${error.message}\n`,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = CommandHandler; 