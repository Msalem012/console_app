# Employee Directory Terminal

A sophisticated web-based terminal interface for employee directory management using Node.js, PostgreSQL, and real-time WebSocket communication.

## 🎯 **Overview**

This application provides a complete web-based terminal experience that mimics traditional command-line interfaces while offering modern features like real-time output streaming, progress indicators, and beautiful UI. It implements all 6 required modes of operation for employee directory management.

## 🏗️ **Architecture**

```
┌─────────────────┐    WebSocket    ┌─────────────────┐    SQL    ┌─────────────────┐
│   Web Browser   │ ←──────────────→ │   Node.js API   │ ←────────→ │   PostgreSQL    │
│  (Terminal UI)  │                 │  (Command Logic) │           │   (Employee DB) │
└─────────────────┘                 └─────────────────┘           └─────────────────┘
```

## 🚀 **Features**

### Core Functionality
- ✅ **Mode 1**: Create employees table with proper schema
- ✅ **Mode 2**: Create individual employee records with validation
- ✅ **Mode 3**: List all employees sorted by name with age calculation
- ✅ **Mode 4**: Generate 1,000,000 + 100 bulk employee records
- ✅ **Mode 5**: Query males with "F" surnames with performance timing
- ✅ **Mode 6**: Database optimization with before/after performance comparison

### Web Terminal Features
- 🖥️ **Professional terminal interface** with authentic look and feel
- 🔄 **Real-time command execution** via WebSocket
- 📊 **Live progress indicators** for bulk operations
- 📝 **Command history** with up/down arrow navigation
- 🔍 **Auto-completion** for available commands
- 💾 **Session persistence** with save/load functionality
- 🎨 **Syntax highlighting** and color-coded output
- 📱 **Responsive design** for mobile and desktop

### Database Features
- 🗄️ **PostgreSQL connection pooling** for optimal performance
- 🚀 **Batch processing** for efficient bulk operations
- 📈 **Performance monitoring** with precise timing
- 🎯 **Query optimization** with intelligent indexing
- 🔒 **Data validation** and duplicate prevention

## 📋 **Requirements**

### System Requirements
- **Node.js** 14.x or higher
- **PostgreSQL** 12.x or higher
- **npm** or **yarn** package manager
- Modern web browser with WebSocket support

### Dependencies
```json
{
  "express": "^4.18.2",
  "socket.io": "^4.7.5",
  "pg": "^8.11.3",
  "pg-pool": "^3.6.1",
  "dotenv": "^16.3.1",
  "cors": "^2.8.5",
  "faker": "^6.6.6",
  "moment": "^2.29.4"
}
```

## 🛠️ **Installation & Setup**

### 1. Clone and Install
```bash
git clone <repository-url>
cd app
npm install
```

### 2. Database Setup
```sql
-- Create database
CREATE DATABASE employee_directory;

-- Create user (optional)
CREATE USER emp_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE employee_directory TO emp_user;
```

### 3. Configuration
Edit `config.js` to match your database settings:
```javascript
database: {
  host: 'localhost',
  port: 5432,
  database: 'employee_directory',
  user: 'postgres',
  password: 'your_password_here'
}
```

### 4. Start the Application
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

### 5. Access the Web Terminal
Open your browser and navigate to:
```
http://localhost:3000
```

## 💻 **Usage**

### Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `myApp 1` | Create employees table | `myApp 1` |
| `myApp 2 "Name" YYYY-MM-DD Gender` | Create employee record | `myApp 2 "Ivanov Petr Sergeevich" 2009-07-12 Male` |
| `myApp 3` | Generate and download all employees list file | `myApp 3` |
| `myApp 4` | Generate 1M + 100 bulk records | `myApp 4` |
| `myApp 5` | Query males with "F" surnames and download results | `myApp 5` |
| `myApp 6` | Optimize database | `myApp 6` |
| `myApp clear-data confirm` | Delete ALL employee records (requires confirmation) | `myApp clear-data confirm` |
| `myApp drop confirm` | DROP entire employees table and structure (DANGER!) | `myApp drop confirm` |
| `myApp help` | Show help message | `myApp help` |
| `myApp status` | Show system status | `myApp status` |

### Special Terminal Commands

These commands are processed locally in the browser and don't require server communication:

| Command | Description |
|---------|-------------|
| `clear` or `cls` | Clear terminal screen (local command) |
| `history` | Show command history |
| `save` | Save current session |
| `load` | Load saved session |

**Note:** `clear` clears the terminal screen, while `myApp clear-data confirm` deletes database records.

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Execute command |
| `↑/↓` | Navigate command history |
| `Tab` | Auto-complete commands |
| `Esc` | Clear current input |

## 🏛️ **Database Schema**

```sql
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  birth_date DATE NOT NULL,
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_employee UNIQUE (full_name, birth_date)
);
```

### Optimization Indexes
```sql
-- Performance indexes for fast queries
CREATE INDEX idx_employees_gender_name ON employees(gender, full_name) 
WHERE gender = 'Male' AND full_name LIKE 'F%';

CREATE INDEX idx_employees_full_name ON employees(full_name);
CREATE INDEX idx_employees_gender ON employees(gender);
CREATE INDEX idx_employees_birth_date ON employees(birth_date);
```

## 🎭 **Object-Oriented Design**

### Employee Class
```javascript
class Employee {
  constructor(fullName, birthDate, gender)
  
  // Instance methods
  validate()                    // Validate employee data
  calculateAge()               // Calculate full years of age
  async saveToDB()            // Save to database
  toJSON()                    // Serialize for JSON
  
  // Static methods
  static async batchInsert()   // Bulk insert employees
  static async findAll()      // Find with filtering/sorting
  static async findByQuery()  // Query with performance timing
  static async count()        // Count matching records
  static async deleteAll()    // Delete all records
}
```

### Command Handler
```javascript
class CommandHandler {
  async mode1_createTable()      // Mode 1: Create table
  async mode2_createEmployee()   // Mode 2: Create employee
  async mode3_listAllEmployees() // Mode 3: List employees
  async mode4_generateBulkData() // Mode 4: Bulk generation
  async mode5_queryWithTiming()  // Mode 5: Timed query
  async mode6_optimizeDatabase() // Mode 6: Optimization
}
```

## 📊 **Performance Benchmarks**

### Mode 4: Bulk Data Generation
- **1,000,000 records**: ~30-45 seconds
- **Batch size**: 1,000 records per batch
- **Memory usage**: Optimized for large datasets
- **Progress tracking**: Real-time updates

### Mode 5: Query Performance
- **Before optimization**: ~200-500ms
- **After optimization**: ~10-50ms
- **Improvement**: 80-95% faster
- **Records processed**: 100+ matching records

## 🔧 **API Endpoints**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main terminal interface |
| `/health` | GET | Health check |
| `/api/db-status` | GET | Database connection status |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `command` | Client → Server | Execute command |
| `output` | Server → Client | Command output |
| `connect` | Bidirectional | Connection established |
| `disconnect` | Bidirectional | Connection lost |

## 🔍 **Testing**

### Basic Testing Commands
```bash
# Test database connection
myApp status

# Test table creation
myApp 1

# Test individual employee creation
myApp 2 "Test User" 1990-01-01 Male

# Test listing
myApp 3

# Test small bulk generation (for testing)
# Modify generateEmployees() count temporarily

# Test query performance
myApp 5

# Test optimization
myApp 6
```

## 🚨 **Troubleshooting**

### Common Issues

**Database Connection Failed**
```bash
# Check PostgreSQL is running
pg_ctl status

# Check connection settings in config.js
# Ensure database exists and user has permissions
```

**Port Already in Use**
```bash
# Change port in config.js or kill existing process
lsof -ti:3000 | xargs kill -9
```

**Memory Issues During Bulk Generation**
```bash
# Reduce batch size in Employee.batchInsert()
# Monitor memory usage: htop or Task Manager
```

### Browser Compatibility
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

## 📁 **Project Structure**

```
app/
├── server.js              # Main server entry point
├── config.js              # Configuration settings
├── package.json           # Dependencies and scripts
├── public/                # Static web files
│   ├── index.html        # Terminal interface
│   ├── terminal.css      # Styling
│   └── terminal.js       # Frontend logic
├── src/
│   ├── models/
│   │   └── Employee.js   # Employee class (OOP)
│   ├── database/
│   │   └── connection.js # PostgreSQL setup
│   ├── commands/
│   │   └── CommandHandler.js # Mode handlers
│   └── utils/
│       └── DataGenerator.js # Bulk data creation
└── README.md             # This file
```

## 🎨 **UI/UX Features**

- **Professional terminal appearance** with authentic green-on-black styling
- **macOS-style window controls** for visual appeal
- **Real-time connection status** indicator
- **Smooth animations** for output and progress
- **Responsive design** that works on mobile devices
- **Keyboard shortcuts** for power users
- **Session persistence** to save work between sessions

## 🔮 **Future Enhancements**

- 📁 **File upload/download** for CSV import/export
- 📊 **Data visualization** with charts and graphs
- 🔐 **User authentication** and role-based access
- 🌐 **Multi-language support** for international use
- 📱 **Mobile app** companion
- 🔄 **Real-time collaboration** with multiple users

## 📄 **License**

MIT License - feel free to use and modify for your projects.

## 👥 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 **Support**

For issues or questions:
- Check the troubleshooting section above
- Review the command help: `myApp help`
- Inspect browser console for client-side errors
- Check server logs for backend issues

---

**Enjoy your web-based terminal experience! 🚀**


