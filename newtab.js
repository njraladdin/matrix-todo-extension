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

        this.taskList.addEventListener('dragstart', this.handleDragStart.bind(this));
        this.taskList.addEventListener('dragend', this.handleDragEnd.bind(this));
        this.taskList.addEventListener('dragover', this.handleDragOver.bind(this));
        this.taskList.addEventListener('drop', this.handleDrop.bind(this));

        this.dragStartY = 0;
        this.lastAnimationFrame = null;
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
            <div class="task-item ${task.completed ? 'completed' : ''} ${task.category}" 
                data-id="${task.id}"
                draggable="true">
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

    handleDragStart(e) {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;
        
        taskItem.classList.add('dragging', 'lift');
        this.dragStartY = e.clientY;
        
        const dragImage = taskItem.cloneNode(true);
        dragImage.style.opacity = '0';
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, 0, 0);
        setTimeout(() => document.body.removeChild(dragImage), 0);

        e.dataTransfer.setData('text/plain', taskItem.dataset.id);
        
        this.taskList.classList.add('dragging-active');
        document.body.classList.add('matrix-rain-active');
    }

    handleDragEnd(e) {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;
        
        taskItem.classList.remove('dragging', 'lift');
        this.taskList.classList.remove('dragging-active');
        document.body.classList.remove('matrix-rain-active');
    }

    handleDragOver(e) {
        e.preventDefault();
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;
        
        const draggingItem = this.taskList.querySelector('.dragging');
        if (draggingItem === taskItem) return;
        
        if (this.lastAnimationFrame) {
            cancelAnimationFrame(this.lastAnimationFrame);
        }
        
        this.lastAnimationFrame = requestAnimationFrame(() => {
            const rect = taskItem.getBoundingClientRect();
            const threshold = rect.top + rect.height / 2;
            
            const items = this.taskList.querySelectorAll('.task-item');
            items.forEach(item => item.classList.remove('drop-before', 'drop-after'));
            
            if (e.clientY < threshold) {
                taskItem.classList.add('drop-before');
                taskItem.parentNode.insertBefore(draggingItem, taskItem);
            } else {
                taskItem.classList.add('drop-after');
                taskItem.parentNode.insertBefore(draggingItem, taskItem.nextSibling);
            }
            
            const containerRect = this.taskList.getBoundingClientRect();
            const scrollThreshold = 50;
            
            if (e.clientY - containerRect.top < scrollThreshold) {
                this.taskList.scrollBy({ top: -10, behavior: 'smooth' });
            } else if (containerRect.bottom - e.clientY < scrollThreshold) {
                this.taskList.scrollBy({ top: 10, behavior: 'smooth' });
            }
        });
    }

    handleDrop(e) {
        e.preventDefault();
        
        const items = this.taskList.querySelectorAll('.task-item');
        items.forEach(item => {
            item.classList.remove('drop-before', 'drop-after');
        });
        
        const newTasks = Array.from(items)
            .map(item => this.tasks.find(task => task.id === item.dataset.id));
        
        this.tasks = newTasks;
        this.saveTasks();
        
        const dropSound = new Audio('data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==');
        dropSound.play().catch(() => {});
    }
}

new MatrixTodo();