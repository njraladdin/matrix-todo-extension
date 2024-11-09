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

        this.sandbox = document.getElementById('firebase-sandbox');
        console.log("Found sandbox iframe:", this.sandbox);
        
        // Ensure sandbox is loaded before trying to use it
        if (this.sandbox.contentDocument.readyState === 'complete') {
            this.loadTasksFromFirebase();
        } else {
            this.sandbox.onload = () => this.loadTasksFromFirebase();
        }

        this.globalTodosContainer = document.querySelector('.global-todos');
        console.log("Setting up global todos container:", this.globalTodosContainer);
        this.loadGlobalTodos();
        
        // Refresh global todos every 5 minutes
        setInterval(() => this.loadGlobalTodos(), 5 * 60 * 1000);

        console.log("🎯 Setting up message listener in main window");
        window.addEventListener("message", (event) => {
            console.log("📨 Main window received message:", event.data);
            console.log("📨 Message origin:", event.origin);
            
            if (event.data.type === "globalTodosLoaded") {
                console.log("📥 Received global todos:", event.data.tasks);
                this.renderGlobalTodos(event.data.tasks);
            } else if (event.data.type === "test") {
                console.log("📥 Received test message:", event.data.message);
            }
        });

        this.globalToggle = document.getElementById('globalTodosToggle');
        this.isGlobalEnabled = localStorage.getItem('globalTodosEnabled') === 'true';
        this.globalToggle.checked = this.isGlobalEnabled;
        
        // Initialize global todos visibility
        if (!this.isGlobalEnabled) {
            this.globalTodosContainer.style.display = 'none';
        }

        // Add toggle event listener
        this.globalToggle.addEventListener('change', (e) => {
            this.isGlobalEnabled = e.target.checked;
            localStorage.setItem('globalTodosEnabled', this.isGlobalEnabled);
            
            if (this.isGlobalEnabled) {
                this.globalTodosContainer.style.display = 'block';
                this.loadGlobalTodos();
            } else {
                this.globalTodosContainer.style.display = 'none';
            }
        });

        // Update the initial placeholder styling with reduced glow
        this.taskInput.style.color = 'var(--matrix-green)';
        this.taskInput.style.textShadow = `
            0 0 2px rgba(var(--matrix-green-rgb), 0.6),
            0 0 4px rgba(var(--matrix-green-rgb), 0.4),
            0 0 6px rgba(var(--matrix-green-rgb), 0.2)
        `;

        // Add input event to maintain consistent styling
        this.taskInput.addEventListener('input', () => {
            this.updateGhostText();
            if (!this.taskInput.value) {
                this.taskInput.style.color = 'var(--matrix-green)';
                this.taskInput.style.textShadow = `
                    0 0 2px rgba(var(--matrix-green-rgb), 0.6),
                    0 0 4px rgba(var(--matrix-green-rgb), 0.4),
                    0 0 6px rgba(var(--matrix-green-rgb), 0.2)
                `;
            }
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

        const task = {
            id: Date.now().toString(),
            text: text.toUpperCase(),
            completed: false,
            category
        };

        this.tasks.unshift(task);
        localStorage.setItem('matrix-tasks', JSON.stringify(this.tasks));

        if (this.isGlobalEnabled) {
            console.log("Adding task to Firebase:", task);
            this.sandbox.contentWindow.postMessage({ type: "addTask", task }, "*");
        }
        
        this.render();
    }

    toggleTask(id) {
        this.tasks = this.tasks.map(task => {
            if (task.id === id) {
                const updatedTask = { ...task, completed: !task.completed };
                this.sandbox.contentWindow.postMessage({ 
                    type: "updateTask", 
                    task: updatedTask 
                }, "*");
                return updatedTask;
            }
            return task;
        });
        localStorage.setItem('matrix-tasks', JSON.stringify(this.tasks));
        this.render();
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(task => task.id !== id);
        localStorage.setItem('matrix-tasks', JSON.stringify(this.tasks));
        this.sandbox.contentWindow.postMessage({ type: "deleteTask", taskId: id }, "*");
        this.render();
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
        localStorage.setItem('matrix-tasks', JSON.stringify(this.tasks));
        this.tasks.forEach(task => {
            this.sandbox.contentWindow.postMessage({ type: "deleteTask", taskId: task.id }, "*");
        });
        this.render();
    }

    updateGhostText() {
        const inputText = this.taskInput.value;
        
        if (inputText.includes('!urgent')) {
            this.taskInput.style.color = '#FFD700';
            this.taskInput.style.textShadow = '0 0 5px rgba(255, 215, 0, 0.5)';
        } else if (inputText) {  // Only change style if there's input
            this.taskInput.style.color = 'var(--matrix-green)';
            this.taskInput.style.textShadow = `
                0 0 2px rgba(var(--matrix-green-rgb), 0.6),
                0 0 4px rgba(var(--matrix-green-rgb), 0.4),
                0 0 6px rgba(var(--matrix-green-rgb), 0.2)
            `;
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
        localStorage.setItem('matrix-tasks', JSON.stringify(this.tasks));
        
        this.render();
        
        const dropSound = new Audio('data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==');
        dropSound.play().catch(() => {});
    }

    loadTasksFromFirebase() {
        console.log("Loading tasks from Firebase...");
        this.sandbox.contentWindow.postMessage({ type: "getTasks" }, "*");
    }

    loadGlobalTodos() {
        if (!this.isGlobalEnabled) return;
        
        console.log("🚀 Requesting global todos...");
        if (!this.sandbox) {
            console.error("❌ Sandbox iframe not found!");
            return;
        }
        
        setTimeout(() => {
            try {
                console.log("📤 Sending getGlobalTodos request to sandbox");
                this.sandbox.contentWindow.postMessage({
                    type: "getGlobalTodos"
                }, "*");
                console.log("✅ Request sent to sandbox");
            } catch (error) {
                console.error("❌ Error sending request to sandbox:", error);
                setTimeout(() => this.loadGlobalTodos(), 1000);
            }
        }, 1000);
    }

    renderGlobalTodos(tasks) {
        if (!this.todoPositions) {
            this.todoPositions = new Map();
        }

        const container = document.querySelector('.global-todos');
        const tasksList = document.createElement('div');
        tasksList.className = 'global-tasks-list';
        
        tasks.forEach((task, index) => {
            if (!this.todoPositions.has(task.id)) {
                const minX = window.innerWidth * 0.3;
                const maxX = window.innerWidth - 250;
                this.todoPositions.set(task.id, {
                    x: minX + Math.random() * (maxX - minX),
                    y: Math.random() * (window.innerHeight - 60),
                    pulseSpeed: 5 + Math.random() * 5,
                    animationDelay: Math.random() * -10
                });
            }
            
            const params = this.todoPositions.get(task.id);
            
            const todoItem = document.createElement('div');
            todoItem.className = `global-todo-item ${task.completed ? 'completed' : ''}`;
            todoItem.style.cssText = `
                left: ${params.x}px;
                top: ${params.y}px;
                animation: pulse ${params.pulseSpeed}s infinite;
                animation-delay: ${params.animationDelay}s;
            `;
            
            const todoNumber = document.createElement('div');
            todoNumber.className = 'todo-number';
            todoNumber.textContent = `${(index + 1).toString().padStart(2, '0')}`;
            
            const todoText = document.createElement('div');
            todoText.className = 'todo-text';
            todoText.textContent = task.text;
            
            todoItem.appendChild(todoNumber);
            todoItem.appendChild(todoText);
            tasksList.appendChild(todoItem);
        });
        
        container.innerHTML = '';
        container.appendChild(tasksList);
        
        for (const [id] of this.todoPositions) {
            if (!tasks.find(task => task.id === id)) {
                this.todoPositions.delete(id);
            }
        }
    }
}

new MatrixTodo();