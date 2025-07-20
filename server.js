const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const config = require('./config');

const CommandHandler = require('./src/commands/CommandHandler');
const DatabaseConnection = require('./src/database/connection');

class TerminalServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    this.commandHandler = new CommandHandler();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));
    
    if (config.server.environment === 'development') {
      this.app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
        next();
      });
    }
  }

  setupRoutes() {
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        app: config.app.name,
        version: config.app.version,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    this.app.get('/api/db-status', async (req, res) => {
      try {
        const dbStatus = await DatabaseConnection.checkConnection();
        res.json({ status: 'connected', details: dbStatus });
      } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
      }
    });

    this.app.get('/downloads/:filename', (req, res) => {
      const filename = req.params.filename;
      const filepath = path.join(__dirname, 'public', 'downloads', filename);
      
      if (!filename.endsWith('.txt') || filename.includes('..')) {
        return res.status(400).json({ error: 'Invalid file request' });
      }

      const fs = require('fs');
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      
      res.sendFile(filepath, (err) => {
        if (err) {
          console.error('Error sending file:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error downloading file' });
          }
        }
      });
    });
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Terminal client connected: ${socket.id}`);
      
      socket.emit('output', {
        type: 'info',
        message: `Welcome to ${config.app.name} v${config.app.version}\n`,
        timestamp: new Date().toISOString()
      });
      
      socket.emit('output', {
        type: 'info',
        message: 'Type "myApp help" for available commands\n',
        timestamp: new Date().toISOString()
      });

      socket.on('command', async (data) => {
        const { command } = data;
        console.log(`Executing command: ${command}`);
        
        try {
          const args = this.parseCommand(command);
          
          if (args.length === 0) {
            socket.emit('output', {
              type: 'error',
              message: 'Please enter a command. Type "myApp help" for available commands.\n',
              timestamp: new Date().toISOString()
            });
            return;
          }

          await this.commandHandler.execute(args, (output) => {
            socket.emit('output', output);
          });
          
        } catch (error) {
          console.error('Command execution error:', error);
          socket.emit('output', {
            type: 'error',
            message: `Error: ${error.message}\n`,
            timestamp: new Date().toISOString()
          });
        }
      });

      socket.on('disconnect', () => {
        console.log(`Terminal client disconnected: ${socket.id}`);
      });
    });
  }

  parseCommand(commandString) {
    const args = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < commandString.length; i++) {
      const char = commandString[i];
      
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
      } else if (char === ' ' && !inQuotes) {
        if (current.trim()) {
          args.push(current.trim());
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      args.push(current.trim());
    }

    return args;
  }

  async start() {
    // Memory safety check
    if (process.env.DEPLOYMENT_MODE === 'true') {
      console.log('🚀 Deployment mode detected - Memory-safe startup enabled');
      console.log('📝 Large dataset operations will be limited to prevent memory issues');
    }

    try {
      await DatabaseConnection.initialize();
      console.log('✅ Database connection initialized');
    } catch (error) {
      console.warn('⚠️  Database connection failed during startup, but server will continue:', error.message);
    }

    try {
      this.server.listen(config.server.port, config.server.host, () => {
        console.log(`\n🎯 ${config.app.name} started successfully!`);
        console.log(`🌐 Server running on http://${config.server.host}:${config.server.port}`);
        console.log(`📂 Open your browser and navigate to the URL above`);
        console.log(`🔧 Environment: ${config.server.environment}`);
        console.log(`💾 Database: ${config.database.database} on ${config.database.host}:${config.database.port}`);
        
        if (process.env.MEMORY_SAFE_MODE === 'true') {
          console.log(`🛡️  Memory-safe mode: Large operations limited for deployment safety`);
        }
        
        console.log(`\n✨ Ready to accept terminal commands via web interface!\n`);
      });

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }
}

const server = new TerminalServer();
server.start();
