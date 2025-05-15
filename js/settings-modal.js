class SettingsModal {
    constructor(matrixTodo) {
        this.matrixTodo = matrixTodo; // Reference to the main app
        this.taskHistory = matrixTodo.taskHistory;
        
        // Find DOM elements
        this.settingsWheel = document.querySelector('.settings-wheel');
        this.modal = document.querySelector('.settings-modal');
        this.closeButton = document.querySelector('.close-settings');
        this.historyContainer = document.querySelector('.history-container');
        
        this.bindEvents();
    }
    
    bindEvents() {
        // Open settings modal
        this.settingsWheel.addEventListener('click', () => {
            this.openModal();
        });
        
        // Close settings modal when clicking close button
        this.closeButton.addEventListener('click', () => {
            this.closeModal();
        });
        
        // Close settings modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
    }
    
    openModal() {
        this.modal.classList.add('active');
        this.renderHistory();
    }
    
    closeModal() {
        this.modal.classList.remove('active');
    }
    
    renderHistory() {
        if (!this.historyContainer) return;
        
        // Sort dates in descending order (most recent first)
        const dates = Object.keys(this.taskHistory).sort((a, b) => 
            new Date(b) - new Date(a)
        );

        const html = dates.map(date => {
            // Sort tasks within each day by timestamp in descending order
            const tasks = this.taskHistory[date].sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );
            
            return `
                <div class="history-day">
                    <div class="history-date">${date}</div>
                    <div class="history-tasks">
                        ${tasks.map(task => `
                            <div class="history-task ${task.completed ? 'completed' : ''} ${task.category}">
                                <span class="history-time">
                                    ${new Date(task.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                                <span class="history-text">${task.text}</span>
                                ${task.group ? `<span class="history-group">#${task.group}</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

        this.historyContainer.innerHTML = html;
    }
    
    addToHistory(task) {
        if (!task || !task.timestamp) {
            console.warn('Invalid task or missing timestamp:', task);
            return;
        }

        try {
            const date = new Date(task.timestamp).toLocaleDateString();
            if (!this.taskHistory[date]) {
                this.taskHistory[date] = [];
            }
            this.taskHistory[date].push(task);
            localStorage.setItem('matrix-tasks-history', JSON.stringify(this.taskHistory));
        } catch (e) {
            console.error('Error adding task to history:', e);
        }
    }
    
    clearHistory() {
        this.taskHistory = {};
        localStorage.setItem('matrix-tasks-history', JSON.stringify(this.taskHistory));
        this.renderHistory();
    }
}

export default SettingsModal; 