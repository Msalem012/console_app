class TerminalInterface {
    constructor() {
        this.socket = null;
        this.commandHistory = [];
        this.historyIndex = -1;
        this.isConnected = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.connectToServer();
    }

    initializeElements() {
        this.terminalContent = document.getElementById('terminalContent');
        this.terminalInput = document.getElementById('terminalInput');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        
        this.progressContainer = document.getElementById('progressContainer');
        this.progressLabel = document.getElementById('progressLabel');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        this.configModal = document.getElementById('configModal');
        this.modalClose = document.getElementById('modalClose');
        this.modalOk = document.getElementById('modalOk');
        
        this.loadingOverlay = document.getElementById('loadingOverlay');
    }

    setupEventListeners() {
        this.terminalInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.terminalInput.addEventListener('input', () => this.handleInput());
        
        this.modalClose.addEventListener('click', () => this.hideModal());
        this.modalOk.addEventListener('click', () => this.hideModal());
        
        document.addEventListener('click', () => {
            if (!this.isModalOpen()) {
                this.terminalInput.focus();
            }
        });
        
        window.addEventListener('resize', () => this.scrollToBottom());
    }

    connectToServer() {
        this.updateConnectionStatus('connecting', 'Connecting...');
        
        try {
            this.socket = io();
            
            this.socket.on('connect', () => {
                this.isConnected = true;
                this.updateConnectionStatus('connected', 'Connected');
                this.hideLoadingOverlay();
                this.terminalInput.focus();
            });

            this.socket.on('disconnect', () => {
                this.isConnected = false;
                this.updateConnectionStatus('disconnected', 'Disconnected');
                this.addOutput({
                    type: 'error',
                    message: 'Connection lost. Attempting to reconnect...\n',
                    timestamp: new Date().toISOString()
                });
            });

            this.socket.on('output', (data) => {
                this.handleServerOutput(data);
            });

            this.socket.on('connect_error', (error) => {
                this.updateConnectionStatus('error', 'Connection failed');
                this.addOutput({
                    type: 'error',
                    message: `Connection error: ${error.message}\n`,
                    timestamp: new Date().toISOString()
                });
                this.showConfigModal();
            });

            // Handle heartbeat to keep connection alive during long operations
            this.socket.on('heartbeat', (data) => {
                console.log('Heartbeat received:', data.timestamp);
                // Update connection status to show active processing
                if (data.status === 'processing') {
                    this.updateConnectionStatus('connected', 'Processing...');
                    
                    // Auto-restore status after heartbeat activity
                    setTimeout(() => {
                        if (this.isConnected) {
                            this.updateConnectionStatus('connected', 'Connected');
                        }
                    }, 35000); // Restore after 35 seconds (longer than heartbeat interval)
                }
            });

            // Handle keepalive messages during batch processing
            this.socket.on('keepalive', (data) => {
                // Just log the keepalive - no need to display to user
                console.log('Keepalive:', data.message);
            });

        } catch (error) {
            console.error('Failed to initialize socket connection:', error);
            this.updateConnectionStatus('error', 'Failed to connect');
            this.hideLoadingOverlay();
            this.showConfigModal();
        }
    }

    handleKeyDown(e) {
        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                this.executeCommand();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.navigateHistory(-1);
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                this.navigateHistory(1);
                break;
                
            case 'Tab':
                e.preventDefault();
                this.handleAutoComplete();
                break;
                
            case 'Escape':
                e.preventDefault();
                this.clearInput();
                break;
        }
    }

    handleInput() {
    }

    executeCommand() {
        const command = this.terminalInput.value.trim();
        
        if (!command) return;
        
        this.commandHistory.push(command);
        this.historyIndex = this.commandHistory.length;
        
        this.addOutput({
            type: 'command',
            message: `user@employee-terminal:~$ ${command}\n`,
            timestamp: new Date().toISOString()
        });
        
        this.clearInput();
        
        if (this.handleSpecialCommands(command)) {
            return; // Command was handled locally, don't send to server
        }
        
        if (this.isConnected && this.socket) {
            this.socket.emit('command', { command: command });
        } else {
            this.addOutput({
                type: 'error',
                message: 'Not connected to server. Please check your connection.\n',
                timestamp: new Date().toISOString()
            });
        }
    }

    handleServerOutput(data) {
        const { type, message } = data;
        
        switch (type) {
            case 'progress':
                this.handleProgressOutput(data);
                break;
                
            case 'download':
                this.handleDownloadOutput(data);
                break;
                
            case 'keepalive':
                // Don't display keepalive messages in terminal
                // They're just for connection maintenance
                console.log('Keepalive received:', message);
                break;
                
            default:
                this.addOutput(data);
                break;
        }
    }

    handleProgressOutput(data) {
        const progressMatch = data.message.match(/(\d+)%/);
        if (progressMatch) {
            const percentage = parseInt(progressMatch[1]);
            this.updateProgress(percentage, data.message.trim());
            
            if (percentage >= 100) {
                setTimeout(() => this.hideProgress(), 1000);
            }
        } else {
            this.addOutput(data);
        }
    }

    handleDownloadOutput(data) {
        const { message, downloadUrl, filename, fileSize, recordCount } = data;
        
        const outputLine = document.createElement('div');
        outputLine.className = 'output-line download';
        
        const downloadLink = document.createElement('a');
        downloadLink.href = downloadUrl;
        downloadLink.download = filename;
        downloadLink.className = 'download-link';
        downloadLink.textContent = `📄 ${filename}`;
        downloadLink.title = `Download ${filename} (${recordCount} records, ${(fileSize / 1024).toFixed(2)} KB)`;
        
        downloadLink.style.color = '#00ff00';
        downloadLink.style.textDecoration = 'underline';
        downloadLink.style.cursor = 'pointer';
        downloadLink.style.fontWeight = 'bold';
        
        downloadLink.addEventListener('mouseenter', () => {
            downloadLink.style.color = '#66ff66';
            downloadLink.style.textShadow = '0 0 5px #00ff00';
        });
        
        downloadLink.addEventListener('mouseleave', () => {
            downloadLink.style.color = '#00ff00';
            downloadLink.style.textShadow = 'none';
        });
        
        downloadLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.downloadFile(downloadUrl, filename);
        });
        
        const content = document.createElement('span');
        content.appendChild(document.createTextNode(message.replace('Click to download file', '')));
        content.appendChild(downloadLink);
        
        outputLine.appendChild(content);
        this.terminalContent.appendChild(outputLine);
        this.scrollToBottom();
    }

    downloadFile(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.addOutput({
            type: 'success',
            message: ` Download started: ${filename}\n`,
            timestamp: new Date().toISOString()
        });
    }

    addOutput(data) {
        const { type, message, timestamp } = data;
        
        const outputLine = document.createElement('div');
        outputLine.className = `output-line ${type || 'info'}`;
        
        if (['error', 'success'].includes(type)) {
            const time = new Date(timestamp).toLocaleTimeString();
            outputLine.innerHTML = `<span class="timestamp">[${time}]</span>${this.escapeHtml(message)}`;
        } else {
            outputLine.textContent = message;
        }
        
        this.terminalContent.appendChild(outputLine);
        this.scrollToBottom();
        
        if (type === 'success' && message.includes('completed successfully')) {
            this.hideProgress();
        }
    }

    navigateHistory(direction) {
        if (this.commandHistory.length === 0) return;
        
        this.historyIndex += direction;
        
        if (this.historyIndex < 0) {
            this.historyIndex = 0;
        } else if (this.historyIndex >= this.commandHistory.length) {
            this.historyIndex = this.commandHistory.length;
            this.clearInput();
            return;
        }
        
        this.terminalInput.value = this.commandHistory[this.historyIndex] || '';
    }

    handleAutoComplete() {
        const input = this.terminalInput.value.trim();
        const commands = ['myApp 1', 'myApp 2', 'myApp 3', 'myApp 4', 'myApp 5', 'myApp 6', 'myApp clear-data', 'myApp drop', 'myApp help', 'myApp status'];
        
        const matches = commands.filter(cmd => cmd.startsWith(input));
        
        if (matches.length === 1) {
            this.terminalInput.value = matches[0];
        } else if (matches.length > 1) {
            this.addOutput({
                type: 'info',
                message: `Available commands: ${matches.join(', ')}\n`,
                timestamp: new Date().toISOString()
            });
        }
    }

    clearInput() {
        this.terminalInput.value = '';
    }

    scrollToBottom() {
        this.terminalContent.scrollTop = this.terminalContent.scrollHeight;
    }

    updateConnectionStatus(status, text) {
        this.statusText.textContent = text;
        this.statusIndicator.className = `status-indicator ${status}`;
    }

    showProgress() {
        this.progressContainer.style.display = 'block';
    }

    hideProgress() {
        this.progressContainer.style.display = 'none';
        this.updateProgress(0, '');
    }

    updateProgress(percentage, label) {
        this.showProgress();
        this.progressFill.style.width = `${percentage}%`;
        this.progressText.textContent = `${percentage}%`;
        this.progressLabel.textContent = label || 'Processing...';
    }

    showConfigModal() {
        this.configModal.style.display = 'block';
    }

    hideModal() {
        this.configModal.style.display = 'none';
    }

    isModalOpen() {
        return this.configModal.style.display === 'block';
    }

    showLoadingOverlay() {
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoadingOverlay() {
        this.loadingOverlay.style.display = 'none';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    clearTerminal() {
        this.terminalContent.innerHTML = '';
    }

    saveSession() {
        const session = {
            history: this.commandHistory,
            output: this.terminalContent.innerHTML,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('terminal_session', JSON.stringify(session));
        
        this.addOutput({
            type: 'success',
            message: 'Session saved successfully.\n',
            timestamp: new Date().toISOString()
        });
    }

    loadSession() {
        try {
            const saved = localStorage.getItem('terminal_session');
            if (saved) {
                const session = JSON.parse(saved);
                this.commandHistory = session.history || [];
                this.historyIndex = this.commandHistory.length;
                
                this.addOutput({
                    type: 'info',
                    message: `Session loaded from ${new Date(session.timestamp).toLocaleString()}\n`,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Failed to load session:', error);
        }
    }

    showWelcomeMessage() {
        this.addOutput({
            type: 'info',
            message: '=== Employee Directory Terminal ===\n',
            timestamp: new Date().toISOString()
        });
        
        this.addOutput({
            type: 'info',
            message: 'Web-based interface for employee directory management\n',
            timestamp: new Date().toISOString()
        });
        
        this.addOutput({
            type: 'info',
            message: 'Type "myApp help" for available commands\n\n',
            timestamp: new Date().toISOString()
        });
    }

    handleSpecialCommands(command) {
        const cmd = command.toLowerCase().trim();
        
        switch (cmd) {
            case 'clear':
            case 'cls':
                this.clearTerminal();
                return true;
                
            case 'save':
                this.saveSession();
                return true;
                
            case 'load':
                this.loadSession();
                return true;
                
            case 'history':
                this.showHistory();
                return true;
                
            default:
                return false;
        }
    }

    showHistory() {
        this.addOutput({
            type: 'info',
            message: 'Command History:\n',
            timestamp: new Date().toISOString()
        });
        
        this.commandHistory.forEach((cmd, index) => {
            this.addOutput({
                type: 'data',
                message: `  ${index + 1}: ${cmd}\n`,
                timestamp: new Date().toISOString()
            });
        });
    }

    executeCommandEnhanced() {
        const command = this.terminalInput.value.trim();
        
        if (!command) return;
        
        if (this.handleSpecialCommands(command)) {
            this.clearInput();
            return;
        }
        
        this.executeCommand();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex';
    
    window.terminal = new TerminalInterface();
    
    setTimeout(() => {
        if (window.terminal.isConnected) {
            window.terminal.showWelcomeMessage();
        }
    }, 1000);
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TerminalInterface;
} 
