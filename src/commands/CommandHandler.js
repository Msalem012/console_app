const Employee = require('../models/Employee');
const DatabaseConnection = require('../database/connection');
const DataGenerator = require('../utils/DataGenerator');
const MemoryMonitor = require('../utils/MemoryMonitor');
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
    
    if (command === 'myapp' && args.length > 1) {
      args = args.slice(1);
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

  async mode1_createTable(args, output) {
    output({
      type: 'info',
      message: '=== Mode 1: Creating employees table ===\n',
      timestamp: new Date().toISOString()
    });

    try {
      const result = await DatabaseConnection.createEmployeesTable();
      
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
      const employee = new Employee(fullName, birthDate, gender);
      
      output({
        type: 'info',
        message: `Creating employee: ${fullName}\n`,
        timestamp: new Date().toISOString()
      });

      const result = await employee.saveToDB();
      
      output({
        type: 'success',
        message: ` ${result.message}\n`,
        timestamp: new Date().toISOString()
      });

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

  async mode3_listAllEmployees(args, output) {
    output({
      type: 'info',
      message: '=== Mode 3: Generating employee list file ===\n',
      timestamp: new Date().toISOString()
    });

    try {
      // First, get the total count without loading all data
      const totalCount = await Employee.count();
      
      output({
        type: 'info',
        message: `Found ${totalCount.toLocaleString()} employees in database\n`,
        timestamp: new Date().toISOString()
      });

      if (totalCount === 0) {
        output({
          type: 'warning',
          message: 'No employees found in the database.\n',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Memory monitoring
      MemoryMonitor.logMemoryUsage('Before File Generation');
      
      // Ensure high-performance index exists for fast pagination
      await this.ensureHighPerformanceIndex(output);
      
      output({
        type: 'info',
        message: '🚀 Generating employee list file with high-performance streaming...\n',
        timestamp: new Date().toISOString()
      });

      // Setup file streaming
      const downloadsDir = path.join(__dirname, '../../public/downloads');
      try {
        await fs.access(downloadsDir);
      } catch {
        await fs.mkdir(downloadsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `employees_list_${timestamp}.txt`;
      const filepath = path.join(downloadsDir, filename);

      // Use streaming file generation
      const fileStats = await this.generateEmployeeListFileStreaming(filepath, totalCount, output);

      const downloadUrl = `/downloads/${filename}`;

      // Final memory check
      MemoryMonitor.logMemoryUsage('After File Generation');

      output({
        type: 'success',
        message: `✅ Employee list file generated successfully!\n`,
        timestamp: new Date().toISOString()
      });

      output({
        type: 'info',
        message: `File: ${filename}\n`,
        timestamp: new Date().toISOString()
      });

      output({
        type: 'info',
        message: `Records: ${totalCount.toLocaleString()} employees\n`,
        timestamp: new Date().toISOString()
      });

      output({
        type: 'info',
        message: `Size: ${(fileStats.fileSize / 1024).toFixed(2)} KB\n`,
        timestamp: new Date().toISOString()
      });

      output({
        type: 'info',
        message: `Generation time: ${fileStats.executionTime}\n`,
        timestamp: new Date().toISOString()
      });

      output({
        type: 'info',
        message: `Memory usage: Streaming (memory-efficient)\n`,
        timestamp: new Date().toISOString()
      });

      output({
        type: 'download',
        message: `Download ready: Click to download file\n`,
        downloadUrl: downloadUrl,
        filename: filename,
        fileSize: fileStats.fileSize,
        recordCount: totalCount,
        timestamp: new Date().toISOString()
      });

      output({
        type: 'success',
        message: '\n🚀 Mode 3 completed successfully!\n\n',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      throw new Error(`Failed to generate employee list: ${error.message}`);
    }
  }

  generateEmployeeListText(employees, result) {
    let content = '';
    
    content += '='.repeat(80) + '\n';
    content += '                         EMPLOYEE DIRECTORY REPORT\n';
    content += '='.repeat(80) + '\n';
    content += `Generated: ${new Date().toLocaleString()}\n`;
    content += `Total Employees: ${employees.length}\n`;
    content += `Query Execution Time: ${result.executionTime}\n`;
    content += `Sorted by: Full Name (Ascending)\n`;
    content += '='.repeat(80) + '\n\n';

    content += 'ID'.padEnd(8) + 'Full Name'.padEnd(35) + 'Birth Date'.padEnd(15) + 'Gender'.padEnd(10) + 'Age\n';
    content += '-'.repeat(80) + '\n';

    employees.forEach((employee, index) => {
      const id = String(employee.id || index + 1).padEnd(8);
      const name = String(employee.fullName || '').padEnd(35);
      const birthDate = String(employee.birthDate || '').padEnd(15);
      const gender = String(employee.gender || '').padEnd(10);
      const age = String(employee.calculateAge() || '');

      content += `${id}${name}${birthDate}${gender}${age}\n`;
    });

    content += '\n' + '-'.repeat(80) + '\n';
    content += `Total Records: ${employees.length}\n`;
    content += `Report generated by Employee Directory Terminal\n`;
    content += `End of Report\n`;
    content += '='.repeat(80) + '\n';

    return content;
  }

  async ensureHighPerformanceIndex(output) {
    try {
      const pool = DatabaseConnection.getPool();
      
      // Check if the high-performance index exists
      const checkQuery = `
        SELECT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE indexname = 'idx_employees_high_performance_pagination'
        );
      `;
      
      const result = await pool.query(checkQuery);
      const indexExists = result.rows[0].exists;
      
      if (!indexExists) {
        output({
          type: 'info',
          message: '⚡ Creating high-performance index for fast file generation...\n',
          timestamp: new Date().toISOString()
        });
        
        const startTime = performance.now();
        await pool.query(`
          CREATE INDEX idx_employees_high_performance_pagination 
          ON employees(full_name, id);
        `);
        const endTime = performance.now();
        
        output({
          type: 'success',
          message: `✅ High-performance index created in ${(endTime - startTime).toFixed(2)}ms\n`,
          timestamp: new Date().toISOString()
        });
      } else {
        output({
          type: 'info',
          message: '✅ High-performance index already exists\n',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      // If index creation fails, continue anyway (will be slower but still work)
      output({
        type: 'warning',
        message: `⚠️  Could not create high-performance index: ${error.message}\n`,
        timestamp: new Date().toISOString()
      });
    }
  }

  async generateEmployeeListFileStreaming(filepath, totalCount, output) {
    const fs = require('fs');
    const startTime = performance.now();
    const batchSize = 50000; // Much larger batches for speed
    let processedCount = 0;
    let lastId = 0; // For cursor-based pagination
    
    // Create write stream for memory-efficient file writing
    const writeStream = fs.createWriteStream(filepath, { encoding: 'utf8', highWaterMark: 1024 * 1024 }); // 1MB buffer
    
    try {
      // Write file header
      writeStream.write('='.repeat(80) + '\n');
      writeStream.write('                         EMPLOYEE DIRECTORY REPORT\n');
      writeStream.write('='.repeat(80) + '\n');
      writeStream.write(`Generated: ${new Date().toLocaleString()}\n`);
      writeStream.write(`Total Employees: ${totalCount.toLocaleString()}\n`);
      writeStream.write(`Processing Method: High-Performance Streaming\n`);
      writeStream.write(`Sorted by: Full Name (Ascending)\n`);
      writeStream.write('='.repeat(80) + '\n\n');
      
      // Write column headers
      writeStream.write('ID'.padEnd(8) + 'Full Name'.padEnd(35) + 'Birth Date'.padEnd(15) + 'Gender'.padEnd(10) + 'Age\n');
      writeStream.write('-'.repeat(80) + '\n');

      const pool = DatabaseConnection.getPool();
      
      // Use cursor-based pagination for much better performance
      while (processedCount < totalCount) {
        const currentBatchSize = Math.min(batchSize, totalCount - processedCount);
        
        // High-performance query with cursor pagination instead of OFFSET
        const query = `
          SELECT 
            id,
            full_name,
            birth_date,
            gender,
            EXTRACT(YEAR FROM AGE(birth_date)) as age
          FROM employees
          WHERE id > $1
          ORDER BY full_name ASC, id ASC
          LIMIT $2
        `;
        
        const batchStartTime = performance.now();
        const result = await pool.query(query, [lastId, currentBatchSize]);
        const batchQueryTime = performance.now() - batchStartTime;
        
        if (result.rows.length === 0) break;
        
        // Build bulk string for this batch (much faster than individual writes)
        let batchContent = '';
        for (const row of result.rows) {
          const id = String(row.id || '').padEnd(8);
          const name = String(row.full_name || '').padEnd(35);
          const birthDate = String(row.birth_date || '').padEnd(15);
          const gender = String(row.gender || '').padEnd(10);
          const age = String(row.age || '');
          
          batchContent += `${id}${name}${birthDate}${gender}${age}\n`;
          lastId = Math.max(lastId, row.id);
        }
        
        // Write entire batch at once
        writeStream.write(batchContent);
        
        processedCount += result.rows.length;
        
        // Show progress
        const progressPercentage = Math.round((processedCount / totalCount) * 100);
        output({
          type: 'progress',
          message: `🚀 Progress: ${progressPercentage}% (${processedCount.toLocaleString()}/${totalCount.toLocaleString()}) - Query: ${batchQueryTime.toFixed(0)}ms - Memory: ${MemoryMonitor.getMemoryUsage().heapUsed}\n`,
          timestamp: new Date().toISOString()
        });

        // Send keepalive less frequently since we're faster now
        if (processedCount % (batchSize * 2) === 0) {
          output({
            type: 'keepalive',
            message: `High-speed processing: ${processedCount.toLocaleString()} records...\n`,
            timestamp: new Date().toISOString()
          });
        }

        // Memory management: force GC every few large batches
        if (processedCount > 0 && processedCount % (batchSize * 3) === 0) {
          MemoryMonitor.forceGarbageCollection();
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Write file footer
      writeStream.write('\n' + '-'.repeat(80) + '\n');
      writeStream.write(`Total Records: ${processedCount.toLocaleString()}\n`);
      writeStream.write(`Processing Time: ${((performance.now() - startTime) / 1000).toFixed(2)}s\n`);
      writeStream.write(`Report generated by Employee Directory Terminal\n`);
      writeStream.write(`High-Performance Streaming Mode\n`);
      writeStream.write(`End of Report\n`);
      writeStream.write('='.repeat(80) + '\n');

      // Close the stream and wait for completion
      await new Promise((resolve, reject) => {
        writeStream.end();
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      const endTime = performance.now();
      const executionTime = `${(endTime - startTime).toFixed(2)}ms`;
      
      // Get file size
      const fileStats = await fs.promises.stat(filepath);
      
      return {
        executionTime,
        fileSize: fileStats.size,
        recordsProcessed: processedCount,
        batchesProcessed: Math.ceil(processedCount / batchSize)
      };

    } catch (error) {
      // Clean up on error
      writeStream.destroy();
      try {
        await fs.promises.unlink(filepath);
      } catch (unlinkError) {
        // Ignore cleanup errors
      }
      throw new Error(`High-performance streaming failed: ${error.message}`);
    }
  }

  async mode4_generateBulkData(args, output) {
    output({
      type: 'info',
      message: '=== Mode 4: Generating bulk data ===\n',
      timestamp: new Date().toISOString()
    });

    // Check for deployment mode (only limit during initial deployment)
    const isDeploymentMode = process.env.DEPLOYMENT_MODE === 'true';
    const baseCount = isDeploymentMode ? 10000 : 1000000;
    const specialCount = isDeploymentMode ? 100 : 100;

    output({
      type: 'info',
      message: `Generating ${baseCount.toLocaleString()} random employees + ${specialCount} males with "F" surnames...\n`,
      timestamp: new Date().toISOString()
    });

    if (isDeploymentMode) {
      output({
        type: 'warning',
        message: 'Deployment mode: Using reduced dataset (10K) for initial deployment safety\n',
        timestamp: new Date().toISOString()
      });
    } else {
      output({
        type: 'info',
        message: '\n',
        timestamp: new Date().toISOString()
      });
    }

    try {
      // Start memory monitoring
      MemoryMonitor.logMemoryUsage('Before Bulk Generation');
      
      let totalInserted = 0;
      let totalSkipped = 0;
      let batchCount = 0;
      const startTime = performance.now();

      // Use streaming generator for memory efficiency
      for await (const { batch, progress } of DataGenerator.generateEmployeesStream(baseCount, specialCount, 1000)) {
        // Insert current batch with memory monitoring
        const batchResult = await MemoryMonitor.monitorOperation(
          `Batch ${batchCount + 1} Insert`,
          () => Employee.batchInsert(batch, batch.length)
        );
        
        totalInserted += batchResult.insertedCount;
        totalSkipped += batchResult.skippedCount;
        batchCount++;

        // Show progress with memory info  
        const memoryCheck = MemoryMonitor.checkMemoryLimit(isDeploymentMode ? 256 : 1024);
        output({
          type: 'progress',
          message: `Progress: ${progress.percentage}% (${progress.generated.toLocaleString()}/${progress.total.toLocaleString()}) - Batch ${batchCount} [Mem: ${memoryCheck.current.toFixed(1)}MB]\n`,
          timestamp: new Date().toISOString()
        });

        // Memory safety: Force GC and add delay if memory is high
        if (batchCount % 10 === 0) {
          if (memoryCheck.exceeded || memoryCheck.current > 200) {
            MemoryMonitor.forceGarbageCollection();
            await new Promise(resolve => setTimeout(resolve, 50)); // Longer delay
          } else {
            await new Promise(resolve => setTimeout(resolve, 10)); // Normal delay
          }
        }
      }

      const endTime = performance.now();
      const totalExecutionTime = `${(endTime - startTime).toFixed(2)}ms`;

      // Final memory check
      MemoryMonitor.logMemoryUsage('After Bulk Generation');
      const finalMemoryCheck = MemoryMonitor.checkMemoryLimit();

      output({
        type: 'success',
        message: '\n✅ Bulk data generation completed!\n',
        timestamp: new Date().toISOString()
      });

      output({
        type: 'data',
        message: `Results summary:\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `  Total employees processed: ${(baseCount + specialCount).toLocaleString()}\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `  Successfully inserted: ${totalInserted.toLocaleString()}\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `  Skipped (duplicates): ${totalSkipped.toLocaleString()}\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `  Total execution time: ${totalExecutionTime}\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `  Number of batches: ${batchCount}\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `  Memory usage: Streaming (memory-efficient)\n`,
        timestamp: new Date().toISOString()
      });
      output({
        type: 'data',
        message: `  Final memory: ${finalMemoryCheck.current.toFixed(1)}MB / ${finalMemoryCheck.limit}MB\n`,
        timestamp: new Date().toISOString()
      });

      output({
        type: 'success',
        message: '\n🚀 Mode 4 completed successfully!\n\n',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      throw new Error(`Failed to generate bulk data: ${error.message}`);
    }
  }

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

      output({
        type: 'info',
        message: 'Generating query results file...\n',
        timestamp: new Date().toISOString()
      });

      const fileContent = this.generateQueryResultText(result.employees, result, criteria);
      
      const downloadsDir = path.join(__dirname, '../../public/downloads');
      try {
        await fs.access(downloadsDir);
      } catch {
        await fs.mkdir(downloadsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `query_males_F_${timestamp}.txt`;
      const filepath = path.join(downloadsDir, filename);

      await fs.writeFile(filepath, fileContent, 'utf8');

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

  generateQueryResultText(employees, result, criteria) {
    let content = '';
    
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

    content += 'PERFORMANCE METRICS:\n';
    content += '-'.repeat(40) + '\n';
    content += `Execution Time: ${result.performanceMetrics.executionTime}\n`;
    content += `Records Found: ${result.performanceMetrics.recordsFound}\n`;
    content += `Query Complexity: ${result.performanceMetrics.queryComplexity} criteria\n`;
    content += `Database Response: ${result.executionTime}\n`;
    content += '\n';

    content += 'QUERY RESULTS:\n';
    content += '-'.repeat(40) + '\n';
    content += 'ID'.padEnd(8) + 'Full Name'.padEnd(35) + 'Birth Date'.padEnd(15) + 'Gender'.padEnd(10) + 'Age\n';
    content += '-'.repeat(80) + '\n';

    employees.forEach((employee, index) => {
      const id = String(employee.id || index + 1).padEnd(8);
      const name = String(employee.fullName || '').padEnd(35);
      const birthDate = String(employee.birthDate || '').padEnd(15);
      const gender = String(employee.gender || '').padEnd(10);
      const age = String(employee.calculateAge() || '');

      content += `${id}${name}${birthDate}${gender}${age}\n`;
    });

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

  async mode6_optimizeDatabase(args, output) {
    output({
      type: 'info',
      message: '=== Mode 6: Database optimization ===\n',
      timestamp: new Date().toISOString()
    });

    try {
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

      indexResult.indexes.forEach(index => {
        output({
          type: 'data',
          message: `  ${index.name}: created in ${index.executionTime}\n`,
          timestamp: new Date().toISOString()
        });
        if (index.description) {
          output({
            type: 'data',
            message: `    └─ ${index.description}\n`,
            timestamp: new Date().toISOString()
          });
        }
      });

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

  async clearTable(args, output) {
    output({
      type: 'info',
      message: '=== Clear Employee Table ===\n',
      timestamp: new Date().toISOString()
    });

    try {
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

  async dropTable(args, output) {
    output({
      type: 'info',
      message: '=== Drop Employee Table ===\n',
      timestamp: new Date().toISOString()
    });

    try {
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

      const currentCount = await Employee.count();
      
      output({
        type: 'info',
        message: `Table "employees" currently contains ${currentCount} records.\n`,
        timestamp: new Date().toISOString()
      });

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
