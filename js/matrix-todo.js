import WhatsNewModal from './whats-new-modal.js';
import SettingsModal from './settings-modal.js';
import TaskManager from './task-manager.js';
import NotesManager from './notes-manager.js';
import DiagramManager from './diagram-manager.js';
import DocumentManager from './document-manager.js';
import { saveData, loadData } from './storage.js';

class MatrixTodo {
    constructor() {
        // Initialize Managers
        this.taskManager = new TaskManager();
        this.notesManager = new NotesManager();
        this.diagramManager = new DiagramManager();
        this.documentManager = new DocumentManager();
        
        this.taskInput = document.querySelector('.task-input');
        this.taskList = document.querySelector('.task-list');
        this.progressBar = document.querySelector('.progress-bar');
        this.progressText = document.querySelector('.progress-text');
        this.diagramOverlay = document.querySelector('.diagram-overlay');

        // Make diagram overlay always active but in background
        this.diagramOverlay.classList.add('active');
        this.diagramOverlay.classList.add('always-active');

        this.initializeProgressBar();

        this.taskInput.focus();

        document.body.addEventListener('click', (e) => {
            const isNoteItem = e.target.closest('.note-item');
            const isDiagramItem = e.target.closest('.diagram-block');
            const isDocumentItem = e.target.closest('.document-item');
            const isDeleteBtn = e.target.classList.contains('delete-btn');
            const isContextMenu = e.target.closest('.matrix-context-menu');
            
            console.log('Click detected:', {
                isNoteItem,
                isDiagramItem,
                isDocumentItem,
                isDeleteBtn,
                target: e.target
            });

            // Only focus the task input if we're near the top of the page
            // or explicitly clicking on the task input area
            const scrollY = window.pageYOffset || document.documentElement.scrollTop;
            const isNearTop = scrollY < 100; // Only focus if we're near the top
            const isTaskInputArea = e.target.closest('.input-wrapper') || e.target.closest('.task-list');
            
            if (!isNoteItem && !isDeleteBtn && !isDiagramItem && !isDocumentItem && 
                !isContextMenu && (isNearTop || isTaskInputArea)) {
                // Only focus and scroll if user is near the top or clicking on task-related elements
                this.taskInput.focus();
            }
        });

        this.bindEvents();
        this.bindContextMenu();
        this.bindPageContextMenu();
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
        this.isGlobalEnabled = loadData('globalTodosEnabled', true) !== false;
        this.globalToggle.checked = this.isGlobalEnabled;
        
        if (!this.isGlobalEnabled) {
            this.globalTodosContainer.style.display = 'none';
        }

        this.globalToggle.addEventListener('change', (e) => {
            this.isGlobalEnabled = e.target.checked;
            saveData('globalTodosEnabled', this.isGlobalEnabled);
            
            if (this.isGlobalEnabled) {
                this.globalTodosContainer.style.display = 'block';
                this.loadGlobalTodos();
            } else {
                this.globalTodosContainer.style.display = 'none';
            }
        });

        // Render initial diagram
        this.diagramManager.renderDiagram();
        
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

        // Initialize the What's New system
        this.whatsNewModal = new WhatsNewModal();
        this.whatsNewModal.checkForUpdates();

        // Set up What's New button click handler
        const whatsNewButton = document.querySelector('.footer-action[data-action="whatsnew"]');
        if (whatsNewButton) {
            whatsNewButton.addEventListener('click', () => {
                console.log('What\'s New button clicked!');
                this.whatsNewModal.showWhatsNewModal();
            });
        } else {
            console.error('What\'s New button not found!');
        }

        // Initialize task history
        this.taskHistory = {};
        const savedHistory = loadData('matrix-tasks-history', null);
        if (savedHistory) {
            try {
                this.taskHistory = savedHistory;
            } catch (e) {
                console.error('Error parsing task history:', e);
                this.taskHistory = {};
            }
        }
        
        // Initialize Settings Modal
        this.settingsModal = new SettingsModal(this);

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
        
        // Render notes
        this.notesManager.renderNotes();

        // Initialize extension messaging
        this.initializeExtensionMessaging();

        // Render initial document state
        this.documentManager.renderDocuments();

        // --- AUTH MODAL LOGIC ---
        this.authButton = document.querySelector('.footer-action[data-action="auth"]');
        this.authModal = document.querySelector('.auth-modal');
        this.authContent = document.querySelector('.auth-content');
        this.closeAuthBtn = document.querySelector('.close-auth');
        this.authUserEmail = null;
        this.currentUser = null;

        // Show modal on button click
        this.authButton.addEventListener('click', () => {
            this.openAuthModal();
        });
        // Close modal on close button
        this.closeAuthBtn.addEventListener('click', () => {
            this.closeAuthModal();
        });
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.authModal) {
                this.closeAuthModal();
            }
        });

        // Listen for auth state from sandbox
        window.addEventListener('message', (event) => {
            if (!event.data) return;
            if (event.data.type === 'authState') {
                this.currentUser = event.data.user;
                this.updateAuthUI();
            } else if (event.data.type === 'authError') {
                this.showAuthError(event.data.error);
            }
        });
        // Request current auth state on load
        setTimeout(() => {
            this.sandbox.contentWindow.postMessage({ type: 'getAuthState' }, '*');
        }, 1000);

        // Update shortcut bar with user email if logged in
        this.updateAuthUI = () => {
            if (this.currentUser && this.currentUser.email) {
                this.authButton.textContent = `[${this.currentUser.email}]`;
                this.authButton.title = this.currentUser.email;
                // Also show email at the bottom (attribution area)
                if (!this.authUserEmail) {
                    this.authUserEmail = document.createElement('span');
                    this.authUserEmail.className = 'auth-user-email';
                    document.querySelector('.shortcut-hint').appendChild(this.authUserEmail);
                }
                this.authUserEmail.textContent = this.currentUser.email;
            } else {
                this.authButton.textContent = '[LOGIN/JOIN]';
                this.authButton.title = '';
                if (this.authUserEmail) {
                    this.authUserEmail.remove();
                    this.authUserEmail = null;
                }
            }
            // Update modal content if open
            if (this.authModal.classList.contains('active')) {
                this.renderAuthModal();
            }
        };

        this.showAuthError = (msg) => {
            if (!this.authContent) return;
            const err = document.createElement('div');
            err.style.color = '#ff5555';
            err.style.marginTop = '10px';
            err.textContent = msg;
            this.authContent.appendChild(err);
        };

        this.openAuthModal = () => {
            this.authModal.classList.add('active');
            this.renderAuthModal();
        };
        this.closeAuthModal = () => {
            this.authModal.classList.remove('active');
        };
        this.renderAuthModal = () => {
            if (!this.authContent) return;
            this.authContent.innerHTML = '';
            if (this.currentUser) {
                // Show user info and logout
                const info = document.createElement('div');
                info.style.textAlign = 'center';
                info.innerHTML = `<div style="margin-bottom:10px;">Signed in as <b>${this.currentUser.email}</b></div>`;
                if (this.currentUser.displayName) {
                    info.innerHTML += `<div style="margin-bottom:10px;">${this.currentUser.displayName}</div>`;
                }
                this.authContent.appendChild(info);
                const logoutBtn = document.createElement('button');
                logoutBtn.textContent = 'Sign Out';
                logoutBtn.style.marginTop = '16px';
                logoutBtn.style.background = 'none';
                logoutBtn.style.border = '1px solid var(--matrix-green)';
                logoutBtn.style.color = 'var(--matrix-green)';
                logoutBtn.style.padding = '8px 24px';
                logoutBtn.style.cursor = 'pointer';
                logoutBtn.style.fontFamily = 'inherit';
                logoutBtn.style.fontSize = '14px';
                logoutBtn.style.borderRadius = '4px';
                logoutBtn.addEventListener('click', () => {
                    this.sandbox.contentWindow.postMessage({ type: 'logout' }, '*');
                });
                this.authContent.appendChild(logoutBtn);
            } else {
                // Show Google login button
                const loginBtn = document.createElement('button');
                loginBtn.textContent = 'Sign in with Google';
                loginBtn.style.background = 'none';
                loginBtn.style.border = '1px solid var(--matrix-green)';
                loginBtn.style.color = 'var(--matrix-green)';
                loginBtn.style.padding = '8px 24px';
                loginBtn.style.cursor = 'pointer';
                loginBtn.style.fontFamily = 'inherit';
                loginBtn.style.fontSize = '14px';
                loginBtn.style.borderRadius = '4px';
                loginBtn.addEventListener('click', () => {
                    this.authContent.innerHTML = '<div style="color:var(--matrix-green);margin-top:10px;">Opening Google sign-in...</div>';
                    this.sandbox.contentWindow.postMessage({ type: 'loginWithGoogle' }, '*');
                });
                this.authContent.appendChild(loginBtn);
            }
        };
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

            // Stop event propagation to prevent document.body click handler
            e.stopPropagation();

            if (e.target.classList.contains('delete-btn')) {
                this.deleteTask(taskItem.dataset.id);
            } else {
                this.toggleTask(taskItem.dataset.id);
            }
        });

        this.bindContextMenu();
    }

    bindContextMenu() {
        this.taskList.addEventListener('contextmenu', (e) => {
            const taskItem = e.target.closest('.task-item');
            if (!taskItem) return;
            
            e.preventDefault();
            
            // Remove any existing context menus first
            const existingMenus = document.querySelectorAll('.matrix-context-menu');
            existingMenus.forEach(menu => menu.remove());
            
            const taskId = taskItem.dataset.id;
            const isCurrentTask = taskId === this.taskManager.currentTaskId;
            
            const menu = document.createElement('div');
            menu.className = 'matrix-context-menu';
            menu.innerHTML = `
                <div class="menu-item ${isCurrentTask ? 'active' : ''}">
                    ${isCurrentTask ? 'UNSET CURRENT TASK' : 'SET AS CURRENT TASK'}
                </div>
            `;
            
            // Get scroll position
            const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
            const scrollY = window.pageYOffset || document.documentElement.scrollTop;
            
            // Add scroll position to client coordinates
            menu.style.left = `${e.clientX + scrollX}px`;
            menu.style.top = `${e.clientY + scrollY}px`;
            
            document.body.appendChild(menu);
            
            const menuItem = menu.querySelector('.menu-item');
            menuItem.addEventListener('click', (e) => {
                // Stop event propagation to prevent document.body click handler
                e.stopPropagation();
                this.setCurrentTask(isCurrentTask ? null : taskId);
                document.body.removeChild(menu);
            });
            
            // Close menu when clicking outside
            const closeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    document.body.removeChild(menu);
                    document.removeEventListener('click', closeMenu);
                }
            };
            document.addEventListener('click', closeMenu);
        });
    }

    setCurrentTask(taskId) {
        this.taskManager.setCurrentTask(taskId);
        
        // Keep the smooth animation by toggling classes
        const currentTask = this.taskList.querySelector('.current-task');
        if (currentTask) {
            currentTask.classList.remove('current-task');
        }
        
        if (taskId) {
            const clickedTask = this.taskList.querySelector(`[data-id="${taskId}"]`);
            if (clickedTask) {
                clickedTask.classList.add('current-task');
            }
        }
    }

    addTask(text) {
        const task = this.taskManager.addTask(text);
        
        this.settingsModal.addToHistory(task);

        if (this.isGlobalEnabled) {
            this.sandbox.contentWindow.postMessage({ type: "addTask", task }, "*");
        }
        
        this.render();
    }

    toggleTask(id) {
        const updatedTask = this.taskManager.toggleTask(id);
        
        if (updatedTask) {
            this.sandbox.contentWindow.postMessage({ 
                type: "updateTask", 
                task: updatedTask 
            }, "*");
        }
        
        // Update just the completed state without full re-render
        const taskElement = this.taskList.querySelector(`[data-id="${id}"]`);
        if (taskElement) {
            taskElement.classList.toggle('completed', updatedTask.completed);
        }
        
        this.updateProgress();
    }

    deleteTask(id) {
        this.taskManager.deleteTask(id);
        this.sandbox.contentWindow.postMessage({ type: "deleteTask", taskId: id }, "*");
        this.render();
    }

    render() {
        // Get grouped tasks from taskManager
        const groupedTasks = this.taskManager.getGroupedTasks();

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
                    ${tasks.map(task => {
                        const timeDisplay = `<span class="task-time">${this.taskManager.formatTime(task.timestamp)}</span>`;
                        
                        return `
                            <div class="task-item ${task.completed ? 'completed' : ''} 
                                ${task.category} ${task.group ? 'grouped-task' : ''}
                                ${task.id === this.taskManager.currentTaskId ? 'current-task' : ''}" 
                                data-id="${task.id}"
                                draggable="true">
                                <button class="delete-btn">×</button>
                                <span>${task.text}</span>
                                ${timeDisplay}
                            </div>
                        `;
                    }).join('')}
                `;
            }).join('');

        this.taskList.innerHTML = html;
        this.updateProgress();
    }

    updateProgress() {
        const { percentage, hasBacklogTasks } = this.taskManager.getProgressStats();
        
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
            const suggestion = inputText.endsWith(' ') ? '!urgent #<group_name>' : ' !urgent #<group_name>';
            this.ghostTextElement.textContent = inputText + suggestion;
        } else if (inputText && !inputText.includes('!urgent')) {
            // Show only !urgent if # exists but !urgent doesn't
            const suggestion = inputText.endsWith(' ') ? '!urgent' : ' !urgent';
            this.ghostTextElement.textContent = inputText + suggestion;
        } else if (inputText && !inputText.includes('#')) {
            // Show only #<group_name> if !urgent exists but # doesn't
            const suggestion = inputText.endsWith(' ') ? '#<group_name>' : ' #<group_name>';
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
        
        taskItem.classList.remove('dragging', 'lift', 'dragging-between-groups');
        this.taskList.classList.remove('dragging-active');
        document.body.classList.remove('matrix-rain-active');
    }

    handleDragOver(e) {
        e.preventDefault();
        const taskItem = e.target.closest('.task-item');
        const draggingItem = this.taskList.querySelector('.dragging');
        
        if (!draggingItem) return;
        
        // Get groups of both items (for debugging/logging purposes only)
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

        // Check if dragging between groups and add special visual effect
        const isDraggingBetweenGroups = draggingGroup !== targetGroup;
        if (isDraggingBetweenGroups) {
            draggingItem.classList.add('dragging-between-groups');
        } else {
            draggingItem.classList.remove('dragging-between-groups');
        }

        console.log('Drag groups:', {
            draggingGroup,
            targetGroup,
            draggingText: draggingItem.textContent,
            targetText: taskItem?.textContent,
            isDraggingBetweenGroups
        });

        // Allow dragging between any groups
        if (taskItem && taskItem !== draggingItem) {
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
        
        // Determine the new group for the task based on its position in the DOM
        const findGroupHeader = (element) => {
            let current = element;
            while (current && current.previousElementSibling) {
                current = current.previousElementSibling;
                if (current.classList.contains('group-header')) {
                    return current.textContent.trim().toUpperCase();
                }
            }
            return null; // Default to no group (UNGROUPED)
        };

        // Get the new group for the task
        const newGroup = findGroupHeader(droppedTask);
        
        // Get the new order of all tasks from the DOM
        const newTaskOrder = Array.from(this.taskList.querySelectorAll('.task-item'))
            .map(item => {
                const id = item.dataset.id;
                return this.taskManager.tasks.find(t => t.id === id);
            });
        
        // Update task's group and order using the TaskManager
        const updatedTask = this.taskManager.updateTaskGroupAndOrder(taskId, newGroup, newTaskOrder);
        
        // Force a re-render to ensure consistent grouping
        this.render();

        // Update task in Firebase if enabled
        if (this.isGlobalEnabled && updatedTask) {
            this.sandbox.contentWindow.postMessage({ 
                type: "updateTask", 
                task: updatedTask 
            }, "*");
        }
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

    clearCompleted() {
        const completedTaskIds = this.taskManager.clearCompleted();
        
        // Send delete messages for all completed tasks
        completedTaskIds.forEach(taskId => {
            this.sandbox.contentWindow.postMessage({ type: "deleteTask", taskId }, "*");
        });
        
        this.render();
    }

    showGroupSuggestions() {
        const inputText = this.taskInput.value;
        const hashIndex = inputText.lastIndexOf('#');
        
        if (hashIndex === -1) {
            this.suggestionsDropdown.style.display = 'none';
            return;
        }

        const groupPrefix = inputText.slice(hashIndex + 1).toLowerCase();
        
        // Get existing groups from taskManager
        const existingGroups = this.taskManager.getExistingGroups();
        
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

    bindPageContextMenu() {
        // Listen for right-click on the page to show custom context menu
        document.body.addEventListener('contextmenu', (e) => {
            // Skip if right-clicking on a task item or diagram node
            const taskItem = e.target.closest('.task-item');
            const diagramNode = e.target.closest('.diagram-block');
            
            if (taskItem || diagramNode) return;
            
            e.preventDefault();
            
            // Remove any existing context menus first
            const existingMenus = document.querySelectorAll('.matrix-context-menu');
            existingMenus.forEach(menu => menu.remove());
            
            // Create our custom menu with categorized items
            const menu = document.createElement('div');
            menu.className = 'matrix-context-menu';
            menu.innerHTML = `
                <div class="menu-category">NOTES</div>
                <div class="menu-item" data-action="add-note">ADD NOTE</div>
                
                <div class="menu-category">DOCUMENTS</div>
                <div class="menu-item" data-action="add-document">ADD DOCUMENT</div>
                
                <div class="menu-category">DIAGRAMS</div>
                <div class="menu-item" data-action="add-diagram-block">ADD BLOCK</div>
                <div class="menu-item" data-action="add-dashed-block">ADD DASHED BLOCK</div>
            `;
            
            // First append menu to get its dimensions
            document.body.appendChild(menu);
            
            // Calculate position to avoid going off screen
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;
            const { offsetWidth, offsetHeight } = menu;
            const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
            const scrollY = window.pageYOffset || document.documentElement.scrollTop;
            
            // Position the menu (ensure it doesn't go off screen)
            // Add scroll position to convert client coordinates to page coordinates
            const menuX = clientX + offsetWidth > innerWidth 
                ? innerWidth - offsetWidth - 10 + scrollX // 10px margin from right edge
                : clientX + scrollX;
                
            const menuY = clientY + offsetHeight > innerHeight 
                ? innerHeight - offsetHeight - 10 + scrollY // 10px margin from bottom edge
                : clientY + scrollY;
            
            menu.style.left = `${menuX}px`;
            menu.style.top = `${menuY}px`;
            
            // Capture the position for creating elements later
            // Use page coordinates (including scroll) for creating elements
            const position = { 
                x: clientX + scrollX, 
                y: clientY + scrollY 
            };
            
            // Add event listeners for menu items
            menu.querySelectorAll('.menu-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    const action = item.getAttribute('data-action');
                    
                    if (action === 'add-note') {
                        this.notesManager.addNote(position.x, position.y);
                    } else if (action === 'add-document') {
                        this.documentManager.addDocument(position.x, position.y);
                    } else if (action === 'add-diagram-block') {
                        this.diagramManager.createEntity(position.x, position.y);
                    } else if (action === 'add-dashed-block') {
                        this.diagramManager.createEntity(position.x, position.y, true);
                    }
                    
                    document.body.removeChild(menu);
                });
            });
            
            // Close menu when clicking outside
            const closeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    if (document.body.contains(menu)) {
                        document.body.removeChild(menu);
                    }
                    document.removeEventListener('click', closeMenu);
                }
            };
            document.addEventListener('click', closeMenu);
        });
    }

    // Handle messages from Chrome extension
    initializeExtensionMessaging() {
        // Set up Chrome extension message listener
        try {
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                console.log("Received message from extension:", message);
                
                if (message.action === "addNote") {
                    // Create note in the center of the screen when triggered from extension
                    this.notesManager.addNote();
                } else if (message.action === "addDocument") {
                    // Create document in the center of the screen when triggered from extension
                    this.documentManager.addDocument();
                } else if (message.action === "addDiagramBlock") {
                    // Create a regular block in the center of the screen
                    const centerX = window.innerWidth / 2;
                    const centerY = window.innerHeight / 2;
                    this.diagramManager.createEntity(centerX, centerY);
                } else if (message.action === "addDashedBlock") {
                    // Create a dashed block in the center of the screen
                    const centerX = window.innerWidth / 2;
                    const centerY = window.innerHeight / 2;
                    this.diagramManager.createEntity(centerX, centerY, true);
                }
                
                // Make sure to free up the event listener by returning false if not using sendResponse
                return true; // Required for async response
            });
        } catch (e) {
            console.error("Failed to set up Chrome extension messaging:", e);
        }
    }
}

new MatrixTodo();