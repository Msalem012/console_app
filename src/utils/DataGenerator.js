const Employee = require('../models/Employee');

class DataGenerator {
  static firstNames = {
    male: [
      'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Thomas',
      'Christopher', 'Daniel', 'Paul', 'Mark', 'Donald', 'Steven', 'Kenneth',
      'Andrew', 'Frank', 'Gregory', 'Raymond', 'Alexander', 'Patrick', 'Jack',
      'Dennis', 'Jerry', 'Tyler', 'Aaron', 'Jose', 'Henry', 'Adam', 'Douglas'
    ],
    female: [
      'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan',
      'Jessica', 'Sarah', 'Karen', 'Nancy', 'Lisa', 'Betty', 'Helen', 'Sandra',
      'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle', 'Laura', 'Sarah', 'Kimberly',
      'Deborah', 'Dorothy', 'Lisa', 'Nancy', 'Karen', 'Betty', 'Helen'
    ]
  };

  static lastNames = [
    // A surnames
    'Anderson', 'Adams', 'Allen', 'Alexander', 'Armstrong', 'Arnold', 'Austin',
    // B surnames  
    'Brown', 'Baker', 'Bell', 'Bennett', 'Brooks', 'Butler', 'Barnes',
    // C surnames
    'Clark', 'Collins', 'Cook', 'Cooper', 'Carter', 'Campbell', 'Cox',
    // D surnames
    'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas',
    // E surnames
    'Evans', 'Edwards', 'Ellis', 'Elliott', 'Erickson', 'Estrada', 'Ewing',
    // F surnames (for special records)
    'Foster', 'Fisher', 'Flores', 'Freeman', 'Ferguson', 'Ford', 'Fox',
    'Franklin', 'French', 'Fuller', 'Flynn', 'Farmer', 'Fleming', 'Fields',
    // G surnames
    'Garcia', 'Gonzalez', 'Green', 'Griffin', 'Gray', 'Graham', 'Grant',
    // H surnames
    'Harris', 'Hall', 'Hill', 'Howard', 'Hughes', 'Henderson', 'Hayes',
    // I surnames
    'Ingram', 'Irwin', 'Isaac', 'Ivanov', 'Ibrahim', 'Iglesias', 'Imai',
    // J surnames
    'Johnson', 'Jones', 'Jackson', 'James', 'Jenkins', 'Jordan', 'Joyce',
    // K surnames
    'King', 'Kelly', 'Kim', 'Knight', 'Kumar', 'Kennedy', 'Klein',
    // L surnames
    'Lee', 'Lewis', 'Lopez', 'Long', 'Lynch', 'Lawrence', 'Lucas',
    // M surnames
    'Martin', 'Martinez', 'Mitchell', 'Murphy', 'Morris', 'Morgan', 'Moore',
    // N surnames
    'Nelson', 'Newman', 'Nguyen', 'Nixon', 'Norman', 'Nash', 'Newton',
    // O surnames
    'O\'Brien', 'O\'Connor', 'Oliver', 'Olson', 'Owen', 'Ortiz', 'Osborne',
    // P surnames
    'Parker', 'Patterson', 'Perez', 'Peterson', 'Phillips', 'Powell', 'Price',
    // Q surnames
    'Quinn', 'Qualls', 'Quick', 'Quintero', 'Quentin', 'Quarles', 'Queen',
    // R surnames
    'Robinson', 'Rodriguez', 'Roberts', 'Reed', 'Ross', 'Russell', 'Rogers',
    // S surnames
    'Smith', 'Scott', 'Stewart', 'Sullivan', 'Sanders', 'Simmons', 'Stone',
    // T surnames
    'Thompson', 'Taylor', 'Thomas', 'Turner', 'Torres', 'Tucker', 'Tyler',
    // U surnames
    'Underwood', 'Upton', 'Urquhart', 'Ulrich', 'Urban', 'Usher', 'Unger',
    // V surnames
    'Vargas', 'Vaughn', 'Vega', 'Vincent', 'Vogt', 'Valdez', 'Valencia',
    // W surnames
    'White', 'Williams', 'Wilson', 'Wright', 'Walker', 'Washington', 'Watson',
    // X surnames
    'Xavier', 'Xiong', 'Xu', 'Xander', 'Xerxes', 'Xiao', 'Ximenes',
    // Y surnames
    'Young', 'York', 'Yang', 'Yates', 'Yeager', 'Yoder', 'Yuen',
    // Z surnames
    'Zhang', 'Zimmerman', 'Zuniga', 'Ziegler', 'Zamora', 'Zhao', 'Zulu'
  ];

  static middleNames = [
    'Alexander', 'Michael', 'James', 'William', 'David', 'John', 'Robert',
    'Marie', 'Anne', 'Elizabeth', 'Grace', 'Rose', 'Joy', 'Hope',
    'Lee', 'Ray', 'Lynn', 'Jean', 'Ann', 'May', 'Sue', 'Jane'
  ];

  // Generate random date between 1950 and 2005
  static generateRandomBirthDate() {
    const start = new Date('1950-01-01');
    const end = new Date('2005-12-31');
    const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
    return new Date(randomTime).toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  // Generate random full name with first, middle, last
  static generateRandomName(gender, forceLastNameLetter = null) {
    const firstNames = this.firstNames[gender.toLowerCase()];
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const middleName = this.middleNames[Math.floor(Math.random() * this.middleNames.length)];
    
    let lastName;
    if (forceLastNameLetter) {
      const lastNamesWithLetter = this.lastNames.filter(name => 
        name.charAt(0).toLowerCase() === forceLastNameLetter.toLowerCase()
      );
      lastName = lastNamesWithLetter[Math.floor(Math.random() * lastNamesWithLetter.length)];
    } else {
      lastName = this.lastNames[Math.floor(Math.random() * this.lastNames.length)];
    }

    return `${lastName} ${firstName} ${middleName}`;
  }

  // Generate a single random employee
  static generateRandomEmployee(forceGender = null, forceLastNameLetter = null) {
    const gender = forceGender || (Math.random() < 0.5 ? 'Male' : 'Female');
    const fullName = this.generateRandomName(gender, forceLastNameLetter);
    const birthDate = this.generateRandomBirthDate();

    return new Employee(fullName, birthDate, gender);
  }

  // Generate bulk employees: 1,000,000 random + 100 males with "F" surnames
  static generateEmployees(baseCount = 1000000, specialCount = 100) {
    console.log(`Generating ${baseCount} random employees...`);
    const employees = [];

    // Generate base random employees (ensuring even distribution)
    const maleCount = Math.floor(baseCount / 2);
    const femaleCount = baseCount - maleCount;

    // Generate males
    for (let i = 0; i < maleCount; i++) {
      employees.push(this.generateRandomEmployee('Male'));
      
      // Progress feedback for large datasets
      if (i % 50000 === 0) {
        console.log(`Generated ${i + employees.length - i} random employees...`);
      }
    }

    // Generate females
    for (let i = 0; i < femaleCount; i++) {
      employees.push(this.generateRandomEmployee('Female'));
      
      // Progress feedback for large datasets
      if (i % 50000 === 0) {
        console.log(`Generated ${maleCount + i + 1} random employees...`);
      }
    }

    console.log(`Generated ${baseCount} random employees.`);
    console.log(`Generating ${specialCount} special male employees with "F" surnames...`);

    // Generate special males with "F" surnames
    for (let i = 0; i < specialCount; i++) {
      employees.push(this.generateRandomEmployee('Male', 'F'));
    }

    console.log(`Total employees generated: ${employees.length}`);

    // Shuffle the array to mix special records with regular ones
    this.shuffleArray(employees);

    return employees;
  }

  // Fisher-Yates shuffle algorithm
  static shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Generate employees with specific distribution for testing
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

    // Fill remaining slots
    const remaining = count - employees.length;
    for (let i = 0; i < remaining; i++) {
      employees.push(this.generateRandomEmployee());
    }

    return employees;
  }

  // Generate sample data for development/testing
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

  // Get statistics about generated data
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
      // Gender distribution
      if (emp.gender === 'Male') stats.maleCount++;
      else stats.femaleCount++;

      // Last name distribution
      const lastName = emp.fullName.split(' ')[0];
      const firstLetter = lastName.charAt(0).toUpperCase();
      stats.lastNameDistribution[firstLetter] = (stats.lastNameDistribution[firstLetter] || 0) + 1;

      // Age distribution
      try {
        const age = emp.calculateAge();
        const ageGroup = `${Math.floor(age / 10) * 10}-${Math.floor(age / 10) * 10 + 9}`;
        stats.ageDistribution[ageGroup] = (stats.ageDistribution[ageGroup] || 0) + 1;
      } catch (e) {
        // Skip invalid dates
      }

      // Duplicate detection
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