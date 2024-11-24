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
            const isNoteItem = e.target.closest('.note-item');
            const isDeleteBtn = e.target.classList.contains('delete-btn');
            
            console.log('Click detected:', {
                isNoteItem,
                isDeleteBtn,
                target: e.target
            });

            if (!isNoteItem && !isDeleteBtn) {
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

        // Update notes initialization
        this.notes = JSON.parse(localStorage.getItem('matrix-notes')) || [];
        this.notesOverlay = document.querySelector('.notes-overlay');
        this.renderNotes();

        // Add message listener for context menu
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === "addNote") {
                this.addNote();
            }
        });

        this.checkForUpdates();
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
        
        const minSpacing = 80; // Minimum pixels between todos
        const todoWidth = 250; // Maximum width of a todo item
        const todoHeight = 60; // Approximate height of a todo item
        
        const findValidPosition = () => {
            const maxAttempts = 50;
            let attempts = 0;
            
            while (attempts < maxAttempts) {
                const minX = window.innerWidth * 0.3;
                const maxX = window.innerWidth - todoWidth;
                const x = minX + Math.random() * (maxX - minX);
                const y = Math.random() * (window.innerHeight - todoHeight);
                
                // Check if this position conflicts with any existing todos
                let hasConflict = false;
                for (const pos of this.todoPositions.values()) {
                    const distance = Math.sqrt(
                        Math.pow(x - pos.x, 2) + 
                        Math.pow(y - pos.y, 2)
                    );
                    if (distance < minSpacing) {
                        hasConflict = true;
                        break;
                    }
                }
                
                if (!hasConflict) {
                    return { x, y };
                }
                attempts++;
            }
            
            // If we couldn't find a non-conflicting position, use a grid-based fallback
            const index = this.todoPositions.size;
            const itemsPerRow = Math.floor((window.innerWidth - window.innerWidth * 0.3) / (todoWidth + minSpacing));
            const row = Math.floor(index / itemsPerRow);
            const col = index % itemsPerRow;
            return {
                x: (window.innerWidth * 0.3) + col * (todoWidth + minSpacing),
                y: row * (todoHeight + minSpacing)
            };
        };
        
        tasks.forEach((task, index) => {
            if (!this.todoPositions.has(task.id)) {
                const position = findValidPosition();
                this.todoPositions.set(task.id, {
                    ...position,
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
        
        // Clean up positions for removed todos
        for (const [id] of this.todoPositions) {
            if (!tasks.find(task => task.id === id)) {
                this.todoPositions.delete(id);
            }
        }
    }

    addNote() {
        // Calculate center position for new note
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const noteWidth = 400; // Width defined in CSS
        const noteHeight = 200; // Approximate default height
        
        const note = {
            id: Date.now().toString(),
            content: '',
            timestamp: new Date().toISOString(),
            position: {
                x: (viewportWidth - noteWidth) / 2,
                y: (viewportHeight - noteHeight) / 2
            }
        };
        
        this.notes.unshift(note);
        this.saveNotes();
        this.renderNotes();
        
        // Focus the newly added note
        const firstTextarea = this.notesOverlay.querySelector('textarea');
        if (firstTextarea) {
            firstTextarea.focus();
        }
    }

    initializeDragging(noteElement) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        const dragStart = (e) => {
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
            
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === noteElement || e.target.parentNode === noteElement) {
                isDragging = true;
            }
        };

        const dragEnd = () => {
            if (!isDragging) return;
            
            initialX = currentX;
            initialY = currentY;
            isDragging = false;

            // Save the final position
            const noteId = noteElement.dataset.id;
            const note = this.notes.find(n => n.id === noteId);
            if (note) {
                note.position = { x: xOffset, y: yOffset };
                this.saveNotes();
            }
        };

        const drag = (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;

            setTranslate(currentX, currentY, noteElement);
        };

        const setTranslate = (xPos, yPos, el) => {
            // Get viewport dimensions
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // Get note dimensions
            const noteRect = el.getBoundingClientRect();
            const noteWidth = noteRect.width;
            const noteHeight = noteRect.height;
            
            // Constrain position within viewport bounds
            xPos = Math.max(0, Math.min(xPos, viewportWidth - noteWidth));
            yPos = Math.max(0, Math.min(yPos, viewportHeight - noteHeight));
            
            el.style.transform = `translate(${xPos}px, ${yPos}px)`;
        };

        // Set initial position
        const noteId = noteElement.dataset.id;
        const note = this.notes.find(n => n.id === noteId);
        if (note && note.position) {
            xOffset = note.position.x;
            yOffset = note.position.y;
            setTranslate(xOffset, yOffset, noteElement);
        }

        noteElement.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
    }

    renderNotes() {
        console.log('🎨 Starting renderNotes');
        console.log('Current notes:', this.notes);
        
        if (!this.notesOverlay) {
            console.error('❌ Notes overlay element not found!');
            return;
        }
        
        // Modify the note HTML structure slightly
        const html = this.notes.map(note => {
            const position = note.position || { x: 0, y: 0 };
            console.log('📝 Rendering note:', { id: note.id, position });
            return `
                <div class="note-item" 
                    data-id="${note.id}" 
                    style="visibility: visible; transform: translate(${position.x}px, ${position.y}px);">
                    <div class="note-header">
                        <span class="note-timestamp">${new Date(note.timestamp).toLocaleString()}</span>
                        <button class="delete-note">×</button>
                    </div>
                    <textarea placeholder="ENTER NOTE">${note.content || ''}</textarea>
                    <div class="note-drag-handle"></div>
                </div>
            `;
        }).join('');
        
        console.log('Generated HTML:', html);
        this.notesOverlay.innerHTML = html;

        // Initialize dragging for each note
        const noteElements = this.notesOverlay.querySelectorAll('.note-item');
        console.log('Found note elements:', noteElements.length);

        noteElements.forEach(noteEl => {
            this.initializeDragging(noteEl);
            
            // Make sure note is visible and within bounds
            const noteId = noteEl.dataset.id;
            const note = this.notes.find(n => n.id === noteId);
            if (note && note.position) {
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const noteRect = noteEl.getBoundingClientRect();
                
                note.position.x = Math.max(0, Math.min(note.position.x, viewportWidth - noteRect.width));
                note.position.y = Math.max(0, Math.min(note.position.y, viewportHeight - noteRect.height));
                
                noteEl.style.transform = `translate(${note.position.x}px, ${note.position.y}px)`;
            }
            
            noteEl.style.visibility = 'visible';
        });

        // Add event listeners for textareas
        this.notesOverlay.querySelectorAll('textarea').forEach(textarea => {
            // Add this function to automatically adjust height
            const adjustHeight = (el) => {
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
            };

            // Initial height adjustment
            adjustHeight(textarea);

            textarea.addEventListener('input', (e) => {
                const noteId = e.target.closest('.note-item').dataset.id;
                const note = this.notes.find(n => n.id === noteId);
                if (note) {
                    note.content = e.target.value;
                    this.saveNotes();
                    // Adjust height on input
                    adjustHeight(e.target);
                }
            });

            // Prevent task input focus when clicking textarea
            textarea.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });

        // Add event listeners for delete buttons
        this.notesOverlay.querySelectorAll('.delete-note').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const noteId = e.target.closest('.note-item').dataset.id;
                this.deleteNote(noteId);
            });
        });
    }

    deleteNote(id) {
        this.notes = this.notes.filter(note => note.id !== id);
        this.saveNotes();
        this.renderNotes();
    }

    saveNotes() {
        localStorage.setItem('matrix-notes', JSON.stringify(this.notes));
    }

    checkForUpdates() {
        const updates = {
            '1.1.1': {
                id: 'notes-update',
                title: 'NEW FEATURES AVAILABLE (v1.1.1)',
                features: [
                    'Introducing Notes:',
                    '• Right-click anywhere to create floating notes',
                    '• Drag notes to reposition them'
                ],
                preview: `
                    <style>
                        .feature-preview {
                            margin: 24px 0;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                        }

                        .context-menu-preview {
                            background: rgb(255, 255, 255);
                            border: 1px solid rgb(185, 185, 185);
                            padding: 4px 0;
                            width: 200px;
                            position: relative;
                            animation: fadeIn 0.3s ease;
                            border-radius: 4px;
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                        }

                        .menu-item {
                            padding: 6px 24px;
                            position: relative;
                            color: rgb(33, 33, 33);
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                            font-size: 13px;
                            cursor: default;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                                                        text-shadow: none;

                        }

                        .menu-item img {
                            width: 16px;
                            height: 16px;
                        }

                        .menu-item.separator {
                            height: 1px;
                            background: rgb(225, 225, 225);
                            margin: 4px 0;
                            padding: 0;
                        }

                        .menu-item.highlight {
                            background: rgb(47, 129, 247);
                            color: white;
                        }

                        .cursor {
                            width: 12px;
                            height: 12px;
                            border: 2px solid rgba(0, 0, 0, 0.5);
                            border-radius: 50%;
                            position: absolute;
                            right: 8px;
                            top: 50%;
                            transform: translateY(-50%);
                            opacity: 0;
                            animation: cursorMove 2s infinite;
                        }

                        @keyframes cursorMove {
                            0% { opacity: 0; transform: translate(-20px, -50%); }
                            20% { opacity: 1; transform: translate(-20px, -50%); }
                            40% { opacity: 1; transform: translateY(-50%); }
                            60% { opacity: 1; transform: translateY(-50%); }
                            80% { opacity: 0; transform: translateY(-50%); }
                            100% { opacity: 0; transform: translateY(-50%); }
                        }

                        @keyframes fadeIn {
                            from { opacity: 0; transform: translateY(10px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    </style>
                    <div class="feature-preview">
                        <div class="context-menu-preview">
                            <div class="menu-item">Back</div>
                            <div class="menu-item">Forward</div>
                            <div class="menu-item">Reload</div>
                            <div class="menu-item">Save page as...</div>
                            <div class="menu-item">Print...</div>
                            <div class="menu-item separator"></div>
                            <div class="menu-item">View page source</div>
                            <div class="menu-item">Inspect</div>
                            <div class="menu-item separator"></div>
                            <div class="menu-item highlight">
                                <img src="icons/icon16.png" alt="Matrix Todo">
                                <span>Add Matrix Note</span>
                                <div class="cursor"></div>
                            </div>
                        </div>
                    </div>
                `
            }
        };

        // Get seen updates from localStorage
        const seenUpdates = JSON.parse(localStorage.getItem('matrix-todo-seen-updates') || '{}');
        
        // Find the first unseen update
        const currentVersion = '1.1.1'; // Match with manifest.json
        const unseenUpdate = Object.entries(updates).find(([version, update]) => {
            return version <= currentVersion && !seenUpdates[update.id];
        });

        if (unseenUpdate) {
            const [version, update] = unseenUpdate;
            this.showUpdatePopup(update, () => {
                // Mark this update as seen
                seenUpdates[update.id] = true;
                localStorage.setItem('matrix-todo-seen-updates', JSON.stringify(seenUpdates));
            });
        }
    }

    showUpdatePopup(update, onClose) {
        const popup = document.querySelector('.updates-popup');
        if (!popup) return;

        // Update popup content
        popup.innerHTML = `
            <h2>${update.title}</h2>
            ${update.features.map(feature => `<p>${feature}</p>`).join('')}
            ${update.preview}
            <button id="closeUpdates">GOT IT</button>
        `;

        popup.style.display = 'block';

        const closeButton = document.getElementById('closeUpdates');
        closeButton.addEventListener('click', () => {
            popup.style.display = 'none';
            onClose();
        });
    }
}

new MatrixTodo();