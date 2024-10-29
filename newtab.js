class MatrixTodo {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('matrix-tasks')) || [];
        this.taskInput = document.querySelector('.task-input');
        this.taskList = document.querySelector('.task-list');
        this.progressBar = document.querySelector('.progress-bar');
        this.progressText = document.querySelector('.progress-text');

        this.initializeProgressBar();

        this.taskInput.focus();

        document.body.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-btn')) {
                this.taskInput.focus();
            }
        });

        this.bindEvents();
        this.render();

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                this.clearCompleted();
            }
        });

        this.currentCategory = 'normal';

        this.taskInput.setAttribute('placeholder', 'ADD TASK');
        
        this.ghostTextElement = document.createElement('div');
        this.ghostTextElement.className = 'ghost-text';
        this.taskInput.parentNode.insertBefore(this.ghostTextElement, this.taskInput.nextSibling);
        
        this.taskInput.addEventListener('input', () => {
            this.updateGhostText();
        });
    }

    initializeProgressBar() {
        for (let i = 0; i < 10; i++) {
            const block = document.createElement('div');
            block.className = 'progress-block';
            this.progressBar.appendChild(block);
        }
    }

    bindEvents() {
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                this.addTask(e.target.value.trim());
                e.target.value = '';
                this.ghostTextElement.textContent = '';
                this.taskInput.style.color = '#15FF00';
                this.taskInput.style.textShadow = 'none';
            }
        });

        this.taskList.addEventListener('click', (e) => {
            const taskItem = e.target.closest('.task-item');
            if (!taskItem) return;

            if (e.target.classList.contains('delete-btn')) {
                this.deleteTask(taskItem.dataset.id);
            } else {
                this.toggleTask(taskItem.dataset.id);
            }
        });
    }

    addTask(text) {
        let category = 'normal';
        if (text.includes('!urgent')) {
            category = 'urgent';
            text = text.replace('!urgent', '').trim();
        }

        this.tasks.unshift({
            id: Date.now().toString(),
            text: text.toUpperCase(),
            completed: false,
            category
        });
        this.saveTasks();
        this.render();
    }

    toggleTask(id) {
        this.tasks = this.tasks.map(task =>
            task.id === id ? { ...task, completed: !task.completed } : task
        );
        this.saveTasks();
        this.render();
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(task => task.id !== id);
        this.saveTasks();
        this.render();
    }

    saveTasks() {
        localStorage.setItem('matrix-tasks', JSON.stringify(this.tasks));
    }

    updateProgress() {
        const percentage = this.tasks.length 
            ? Math.round((this.tasks.filter(t => t.completed).length / this.tasks.length) * 100)
            : 0;
        
        this.progressText.textContent = `${percentage}% COMPLETE`;
        
        const blocks = this.progressBar.children;
        const filledBlocks = Math.floor(percentage / 10);
        
        Array.from(blocks).forEach((block, index) => {
            if (index < filledBlocks) {
                block.classList.add('filled');
            } else {
                block.classList.remove('filled');
            }
        });
    }

    render() {
        this.taskList.innerHTML = this.tasks.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''} ${task.category}" data-id="${task.id}">
                <button class="delete-btn">×</button>
                <span>${task.text}</span>
            </div>
        `).join('');
        
        this.updateProgress();
    }

    clearCompleted() {
        this.tasks = this.tasks.filter(task => !task.completed);
        this.saveTasks();
        this.render();
    }

    updateGhostText() {
        const inputText = this.taskInput.value;
        
        if (inputText.includes('!urgent')) {
            this.taskInput.style.color = '#FFD700';
            this.taskInput.style.textShadow = '0 0 5px rgba(255, 215, 0, 0.5)';
        } else {
            this.taskInput.style.color = '#15FF00';
            this.taskInput.style.textShadow = 'none';
        }
        
        if (inputText && !inputText.includes('!urgent')) {
            if (inputText.endsWith('!')) {
                this.ghostTextElement.textContent = inputText + 'urgent';
            } else if (inputText.endsWith('!u')) {
                this.ghostTextElement.textContent = inputText + 'rgent';
            } else if (inputText.endsWith('!ur')) {
                this.ghostTextElement.textContent = inputText + 'gent';
            } else if (inputText.endsWith('!urg')) {
                this.ghostTextElement.textContent = inputText + 'ent';
            } else if (inputText.endsWith('!urge')) {
                this.ghostTextElement.textContent = inputText + 'nt';
            } else if (inputText.endsWith('!urgen')) {
                this.ghostTextElement.textContent = inputText + 't';
            } else {
                const suggestion = inputText.endsWith(' ') ? '!urgent' : ' !urgent';
                this.ghostTextElement.textContent = inputText + suggestion;
            }
        } else {
            this.ghostTextElement.textContent = '';
        }
    }
}

new MatrixTodo();