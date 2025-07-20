const { faker } = require('@faker-js/faker');
const Employee = require('../models/Employee');

class DataGenerator {
  static generateRandomBirthDate() {
    return faker.date.between({ from: '1950-01-01', to: '2005-12-31' }).toISOString().split('T')[0];
  }

  static generateRandomName(gender, forceLastNameLetter = null) {
    const sex = gender.toLowerCase();
    const firstName = faker.person.firstName(sex);
    const middleName = faker.person.middleName(sex);
    let lastName;

    if (forceLastNameLetter) {
      // This is a simplified approach. A more robust solution might be needed
      // if the letter is uncommon.
      lastName = forceLastNameLetter + faker.person.lastName().substring(1);
    } else {
      lastName = faker.person.lastName();
    }

    return `${lastName} ${firstName} ${middleName}`;
  }

  static generateRandomEmployee(forceGender = null, forceLastNameLetter = null) {
    const gender = forceGender || (Math.random() < 0.5 ? 'Male' : 'Female');
    const fullName = this.generateRandomName(gender, forceLastNameLetter);
    const birthDate = this.generateRandomBirthDate();

    return new Employee(fullName, birthDate, gender);
  }

  // Memory-efficient streaming generator
  static async *generateEmployeesStream(baseCount = 1000000, specialCount = 100, batchSize = 1000) {
    console.log(`Starting memory-efficient generation of ${baseCount + specialCount} employees...`);
    
    const totalCount = baseCount + specialCount;
    let generated = 0;
    
    // Generate in batches to avoid memory issues
    while (generated < totalCount) {
      const currentBatchSize = Math.min(batchSize, totalCount - generated);
      const batch = [];
      
      for (let i = 0; i < currentBatchSize; i++) {
        if (generated + i < baseCount) {
          // Regular employees
          const gender = Math.random() < 0.5 ? 'Male' : 'Female';
          batch.push(this.generateRandomEmployee(gender));
        } else {
          // Special male employees with "F" surnames
          batch.push(this.generateRandomEmployee('Male', 'F'));
        }
      }
      
      generated += currentBatchSize;
      
      // Yield batch with progress info
      yield {
        batch,
        progress: {
          generated,
          total: totalCount,
          percentage: Math.round((generated / totalCount) * 100),
          isComplete: generated >= totalCount
        }
      };
    }
    
    console.log(`Completed memory-efficient generation of ${totalCount} employees.`);
  }

  // Legacy method - kept for backwards compatibility but now uses streaming
  static generateEmployees(baseCount = 1000000, specialCount = 100) {
    // Check if we're in a deployment environment and reduce the count
    if (process.env.NODE_ENV === 'production' && process.env.DEPLOYMENT_MODE === 'true') {
      console.log('Deployment mode detected - using reduced dataset for memory safety');
      baseCount = Math.min(baseCount, 1000); // Limit to 1000 in deployment
      specialCount = Math.min(specialCount, 10);
    }
    
    // For small datasets, use the original method
    if (baseCount + specialCount <= 10000) {
      return this.generateEmployeesOriginal(baseCount, specialCount);
    }
    
    // For large datasets, throw an error to prevent memory issues
    throw new Error(
      `Memory-safe mode: Cannot generate ${baseCount + specialCount} employees at once. ` +
      `Use DataGenerator.generateEmployeesStream() for large datasets or ` +
      `CommandHandler.mode4_generateBulkData() which handles memory efficiently.`
    );
  }

  // Original method for small datasets
  static generateEmployeesOriginal(baseCount = 1000, specialCount = 100) {
    console.log(`Generating ${baseCount} random employees...`);
    const employees = [];

    const maleCount = Math.floor(baseCount / 2);
    const femaleCount = baseCount - maleCount;

    for (let i = 0; i < maleCount; i++) {
      employees.push(this.generateRandomEmployee('Male'));
      
      if (i % 50000 === 0 && i > 0) {
        console.log(`Generated ${i} male employees...`);
      }
    }

    for (let i = 0; i < femaleCount; i++) {
      employees.push(this.generateRandomEmployee('Female'));
      
      if (i % 50000 === 0 && i > 0) {
        console.log(`Generated ${maleCount + i} total employees...`);
      }
    }

    console.log(`Generated ${baseCount} random employees.`);
    console.log(`Generating ${specialCount} special male employees with "F" surnames...`);

    for (let i = 0; i < specialCount; i++) {
      employees.push(this.generateRandomEmployee('Male', 'F'));
    }

    console.log(`Total employees generated: ${employees.length}`);

    this.shuffleArray(employees);

    return employees;
  }

  static shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  static generateTestEmployees(count = 1000) {
    const employees = [];
    const lettersCount = 26;
    const employeesPerLetter = Math.floor(count / lettersCount);
    
    for (let letterIndex = 0; letterIndex < 26; letterIndex++) {
      const letter = String.fromCharCode(65 + letterIndex); // A-Z
      
      for (let i = 0; i < employeesPerLetter; i++) {
        const gender = i % 2 === 0 ? 'Male' : 'Female';
        employees.push(this.generateRandomEmployee(gender, letter));
      }
    }

    const remaining = count - employees.length;
    for (let i = 0; i < remaining; i++) {
      employees.push(this.generateRandomEmployee());
    }

    return employees;
  }

  static generateSampleData() {
    return [
      new Employee('Adams John Michael', '1985-03-15', 'Male'),
      new Employee('Brown Sarah Elizabeth', '1990-07-22', 'Female'),
      new Employee('Foster David Alexander', '1988-11-03', 'Male'),
      new Employee('Garcia Maria Rosa', '1992-05-18', 'Female'),
      new Employee('Fisher Robert James', '1987-09-12', 'Male'),
      new Employee('Wilson Jennifer Anne', '1991-01-30', 'Female'),
      new Employee('Fleming Michael Thomas', '1989-06-08', 'Male'),
      new Employee('Taylor Emily Grace', '1993-12-14', 'Female'),
      new Employee('Freeman Christopher Lee', '1986-04-27', 'Male'),
      new Employee('Anderson Lisa Marie', '1994-08-09', 'Female')
    ];
  }

  static analyzeEmployees(employees) {
    const stats = {
      total: employees.length,
      maleCount: 0,
      femaleCount: 0,
      lastNameDistribution: {},
      ageDistribution: {},
      duplicateNames: 0
    };

    const nameSet = new Set();
    
    employees.forEach(emp => {
      if (emp.gender === 'Male') stats.maleCount++;
      else stats.femaleCount++;

      const lastName = emp.fullName.split(' ')[0];
      const firstLetter = lastName.charAt(0).toUpperCase();
      stats.lastNameDistribution[firstLetter] = (stats.lastNameDistribution[firstLetter] || 0) + 1;

      try {
        const age = emp.calculateAge();
        const ageGroup = `${Math.floor(age / 10) * 10}-${Math.floor(age / 10) * 10 + 9}`;
        stats.ageDistribution[ageGroup] = (stats.ageDistribution[ageGroup] || 0) + 1;
      } catch (e) {
      }

      const nameKey = `${emp.fullName}|${emp.birthDate}`;
      if (nameSet.has(nameKey)) {
        stats.duplicateNames++;
      } else {
        nameSet.add(nameKey);
      }
    });

    return stats;
  }
}

module.exports = DataGenerator; 
