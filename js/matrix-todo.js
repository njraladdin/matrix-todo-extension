import UpdateManager from './update-manager.js';

class MatrixTodo {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('matrix-tasks')) || [];
        
        // Clean up any existing empty tasks
        this.cleanupEmptyTasks();
        
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
        this.isGlobalEnabled = localStorage.getItem('globalTodosEnabled') !== 'false';
        this.globalToggle.checked = this.isGlobalEnabled;
        
        if (!this.isGlobalEnabled) {
            this.globalTodosContainer.style.display = 'none';
        }

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

        this.updateManager = new UpdateManager();
        this.updateManager.checkForUpdates();

        // Add keyboard shortcut for clearing completed tasks
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                this.clearCompleted();
            }
        });

        this.taskHistory = {};
        const savedHistory = localStorage.getItem('matrix-tasks-history');
        if (savedHistory) {
            try {
                this.taskHistory = JSON.parse(savedHistory);
            } catch (e) {
                console.error('Error parsing task history:', e);
                this.taskHistory = {};
            }
        }
        
        this.initializeSettings();

        // Add new property for suggestions dropdown
        this.suggestionsDropdown = document.createElement('div');
        this.suggestionsDropdown.className = 'group-suggestions';
        this.taskInput.parentNode.insertBefore(this.suggestionsDropdown, this.taskInput.nextSibling);
        
        // Add input event listener for suggestions
        this.taskInput.addEventListener('input', () => {
            this.updateGhostText();
            this.showGroupSuggestions();
        });

        // Add keyboard navigation for suggestions
        this.taskInput.addEventListener('keydown', this.handleSuggestionNavigation.bind(this));
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

        // Update regex to include hyphens in group names and normalize to uppercase
        const groupMatch = text.match(/#([\w-]+)/);
        const group = groupMatch ? groupMatch[1].toUpperCase() : null;
        
        // Remove the group tag from the text and trim
        text = text.replace(/#[\w-]+/, '').trim();

        // If text is empty after removing tags, use [BLANK]
        if (!text) {
            text = '[BLANK]';
        }

        const task = {
            id: Date.now().toString(),
            text: text.toUpperCase(),
            completed: false,
            category,
            group,
            timestamp: new Date().toISOString()
        };

        this.tasks.unshift(task);
        localStorage.setItem('matrix-tasks', JSON.stringify(this.tasks));

        this.addToHistory(task);

        if (this.isGlobalEnabled) {
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
        console.log('All tasks:', this.tasks.map(t => ({
            text: t.text,
            completed: t.completed,
            group: t.group
        })));
        
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(t => t.completed).length;
        
        console.log('Progress calculation:', {
            totalTasks,
            completedTasks,
            percentage: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0
        });

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
        // Group tasks and normalize group names
        const groupedTasks = this.tasks.reduce((acc, task) => {
            const group = task.group ? task.group.toUpperCase() : 'UNGROUPED';
            if (!acc[group]) acc[group] = [];
            acc[group].push(task);
            return acc;
        }, {});

        // Remove empty groups (except UNGROUPED)
        Object.keys(groupedTasks).forEach(group => {
            if (group !== 'UNGROUPED' && groupedTasks[group].length === 0) {
                delete groupedTasks[group];
            }
        });

        // Generate HTML for each group
        const html = Object.entries(groupedTasks)
            .map(([group, tasks]) => {
                const isGroupCompleted = tasks.length > 0 && tasks.every(task => task.completed);
                
                return `
                    ${group !== 'UNGROUPED' ? `
                        <div class="group-header ${isGroupCompleted ? 'completed' : ''}">
                            ${group}
                        </div>
                    ` : ''}
                    ${tasks.map(task => `
                        <div class="task-item ${task.completed ? 'completed' : ''} ${task.category} ${task.group ? 'grouped-task' : ''}" 
                            data-id="${task.id}"
                            draggable="true">
                            <button class="delete-btn">×</button>
                            <span>${task.text}</span>
                        </div>
                    `).join('')}
                `;
            }).join('');

        this.taskList.innerHTML = html;
        this.updateProgress();
    }

    updateGhostText() {
        const inputText = this.taskInput.value;
        
        if (inputText.includes('!urgent')) {
            this.taskInput.style.color = '#FFD700';
            this.taskInput.style.textShadow = '0 0 5px rgba(255, 215, 0, 0.5)';
        } else if (inputText) {
            this.taskInput.style.color = 'var(--matrix-green)';
            this.taskInput.style.textShadow = `
                0 0 2px rgba(var(--matrix-green-rgb), 0.6),
                0 0 4px rgba(var(--matrix-green-rgb), 0.4),
                0 0 6px rgba(var(--matrix-green-rgb), 0.2)
            `;
        }

        // Handle !urgent suggestions
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
        } else if (inputText && !inputText.includes('!urgent') && !inputText.includes('#')) {
            // Show both suggestions if neither exists
            const suggestion = inputText.endsWith(' ') ? '!urgent #group_name' : ' !urgent #group_name';
            this.ghostTextElement.textContent = inputText + suggestion;
        } else if (inputText && !inputText.includes('!urgent')) {
            // Show only !urgent if # exists but !urgent doesn't
            const suggestion = inputText.endsWith(' ') ? '!urgent' : ' !urgent';
            this.ghostTextElement.textContent = inputText + suggestion;
        } else if (inputText && !inputText.includes('#')) {
            // Show only #group_name if !urgent exists but # doesn't
            const suggestion = inputText.endsWith(' ') ? '#group_name' : ' #group_name';
            this.ghostTextElement.textContent = inputText + suggestion;
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
        const draggingItem = this.taskList.querySelector('.dragging');
        
        if (!draggingItem) return;
        
        // Get groups of both items
        const getDraggingGroup = (element) => {
            let current = element;
            while (current) {
                if (current.classList.contains('group-header')) {
                    return current.textContent.trim().toUpperCase();
                }
                current = current.previousElementSibling;
            }
            return null;
        };

        const draggingGroup = getDraggingGroup(draggingItem);
        const targetGroup = taskItem ? getDraggingGroup(taskItem) : null;

        console.log('Drag groups:', {
            draggingGroup,
            targetGroup,
            draggingText: draggingItem.textContent,
            targetText: taskItem?.textContent
        });

        // Only allow drag if:
        // 1. Both items are ungrouped (both groups null)
        // 2. Both items are in the same group
        if (taskItem && taskItem !== draggingItem) {
            const canDrop = (draggingGroup === null && targetGroup === null) || 
                           (draggingGroup === targetGroup);

            if (!canDrop) {
                console.log('Drag prevented - items in different groups');
                return;
            }

            const rect = taskItem.getBoundingClientRect();
            const threshold = rect.top + rect.height / 2;
            
            if (e.clientY < threshold) {
                taskItem.parentNode.insertBefore(draggingItem, taskItem);
            } else {
                taskItem.parentNode.insertBefore(draggingItem, taskItem.nextSibling);
            }
        }
    }

    handleDrop(e) {
        e.preventDefault();
        
        const droppedTask = this.taskList.querySelector('.dragging');
        if (!droppedTask) return;
        
        const taskId = droppedTask.dataset.id;
        
        // Get the new order of all tasks from the DOM
        const newTaskOrder = Array.from(this.taskList.querySelectorAll('.task-item'))
            .map(item => {
                const id = item.dataset.id;
                return this.tasks.find(t => t.id === id);
            });
        
        // Update tasks array with new order
        this.tasks = newTaskOrder;
        localStorage.setItem('matrix-tasks', JSON.stringify(this.tasks));
        
        // Force a re-render to ensure consistent grouping
        this.render();
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

    clearCompleted() {
        this.tasks = this.tasks.filter(task => !task.completed);
        localStorage.setItem('matrix-tasks', JSON.stringify(this.tasks));
        this.tasks.forEach(task => {
            this.sandbox.contentWindow.postMessage({ type: "deleteTask", taskId: task.id }, "*");
        });
        this.render();
    }

    initializeSettings() {
        this.settingsWheel = document.querySelector('.settings-wheel');
        this.settingsModal = document.querySelector('.settings-modal');
        this.closeSettings = document.querySelector('.close-settings');
        this.historyContainer = document.querySelector('.history-container');

        this.settingsWheel.addEventListener('click', () => {
            this.settingsModal.classList.add('active');
            this.renderHistory();
        });

        this.closeSettings.addEventListener('click', () => {
            this.settingsModal.classList.remove('active');
        });

        window.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.settingsModal.classList.remove('active');
            }
        });
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

    showGroupSuggestions() {
        const inputText = this.taskInput.value;
        const hashIndex = inputText.lastIndexOf('#');
        
        if (hashIndex === -1) {
            this.suggestionsDropdown.style.display = 'none';
            return;
        }

        const groupPrefix = inputText.slice(hashIndex + 1).toLowerCase();
        
        // Get existing groups from tasks and normalize them
        const existingGroups = [...new Set(this.tasks
            .map(task => task.group)
            .filter(group => group) // Remove null/undefined
            .map(group => group.toUpperCase()) // Normalize all groups to uppercase
        )];
        
        // Filter groups that match the current input (case-insensitive)
        const matchingGroups = existingGroups
            .filter(group => group.toLowerCase().startsWith(groupPrefix))
            .slice(0, 5); // Limit to 5 suggestions
        
        if (matchingGroups.length === 0) {
            this.suggestionsDropdown.style.display = 'none';
            return;
        }

        // Show matching groups
        this.suggestionsDropdown.innerHTML = matchingGroups
            .map((group, index) => `
                <div class="group-suggestion" data-index="${index}">${group}</div>
            `).join('');
        
        this.suggestionsDropdown.style.display = 'block';
        
        // Add click handlers for suggestions
        this.suggestionsDropdown.querySelectorAll('.group-suggestion').forEach(el => {
            el.addEventListener('click', () => {
                this.selectGroupSuggestion(el.textContent);
            });
        });
    }

    selectGroupSuggestion(groupName) {
        const inputText = this.taskInput.value;
        const hashIndex = inputText.lastIndexOf('#');
        
        // Replace the partial group name with the selected one and add a space
        this.taskInput.value = inputText.slice(0, hashIndex + 1) + groupName + ' ';
        
        // Hide dropdown
        this.suggestionsDropdown.style.display = 'none';
        
        // Focus back on input
        this.taskInput.focus();
        
        // Trigger ghost text update
        this.updateGhostText();
    }

    handleSuggestionNavigation(e) {
        if (this.suggestionsDropdown.style.display === 'none') return;
        
        const suggestions = this.suggestionsDropdown.querySelectorAll('.group-suggestion');
        const currentIndex = Array.from(suggestions).findIndex(el => el.classList.contains('selected'));
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (currentIndex === -1) {
                    // If nothing is selected, select the first item
                    suggestions[0]?.classList.add('selected');
                } else if (currentIndex < suggestions.length - 1) {
                    suggestions[currentIndex].classList.remove('selected');
                    suggestions[currentIndex + 1].classList.add('selected');
                }
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                if (currentIndex > 0) {
                    suggestions[currentIndex].classList.remove('selected');
                    suggestions[currentIndex - 1].classList.add('selected');
                }
                break;
                
            case 'Enter':
                if (suggestions.length > 0) {
                    e.preventDefault();
                    // If nothing is selected, select first suggestion
                    const selectedSuggestion = this.suggestionsDropdown.querySelector('.group-suggestion.selected') 
                        || suggestions[0];
                    this.selectGroupSuggestion(selectedSuggestion.textContent);
                }
                break;
                
            case 'Escape':
                this.suggestionsDropdown.style.display = 'none';
                break;
        }
    }

    cleanupEmptyTasks() {
        const originalLength = this.tasks.length;
        this.tasks = this.tasks.filter(task => task.text.trim());
        
        if (this.tasks.length !== originalLength) {
            console.log(`Cleaned up ${originalLength - this.tasks.length} empty tasks`);
            localStorage.setItem('matrix-tasks', JSON.stringify(this.tasks));
        }
    }
}

new MatrixTodo();