class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('matrix-tasks')) || [];
        this.currentTaskId = localStorage.getItem('matrix-current-task') || null;
        
        // Clean up any existing empty tasks
        this.cleanupEmptyTasks();
    }

    /**
     * Adds a new task
     * @param {string} text - The task text with possible modifiers (e.g., !urgent, #group)
     */
    addTask(text) {
        let category = 'normal';
        if (text.includes('!urgent')) {
            category = 'urgent';
            text = text.replace('!urgent', '').trim();
        }

        // Use # for group names instead of @
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
        this.saveTasks();
        
        return task;
    }

    /**
     * Toggles the completion state of a task
     * @param {string} id - Task ID
     * @returns {object} - The updated task
     */
    toggleTask(id) {
        let updatedTask = null;
        
        this.tasks = this.tasks.map(task => {
            if (task.id === id) {
                updatedTask = { ...task, completed: !task.completed };
                
                // If this task is being marked as completed and it's the current task,
                // automatically unset it as current
                if (updatedTask.completed && id === this.currentTaskId) {
                    this.setCurrentTask(null);
                }

                return updatedTask;
            }
            return task;
        });
        
        this.saveTasks();
        return updatedTask;
    }

    /**
     * Deletes a task by ID
     * @param {string} id - Task ID
     */
    deleteTask(id) {
        this.tasks = this.tasks.filter(task => task.id !== id);
        this.saveTasks();
    }

    /**
     * Sets or unsets the current task
     * @param {string|null} taskId - Task ID or null to unset
     */
    setCurrentTask(taskId) {
        if (taskId !== null && !this.tasks.find(task => task.id === taskId)) {
            taskId = null;
        }
        
        this.currentTaskId = taskId;
        localStorage.setItem('matrix-current-task', taskId);
    }

    /**
     * Clears all completed tasks
     * @returns {string[]} - IDs of the cleared tasks
     */
    clearCompleted() {
        // Store the IDs of completed tasks before removing them
        const completedTaskIds = this.tasks
            .filter(task => task.completed)
            .map(task => task.id);
        
        // Remove completed tasks from the tasks array
        this.tasks = this.tasks.filter(task => !task.completed);
        this.saveTasks();
        
        return completedTaskIds;
    }

    /**
     * Updates a task's group and reorders tasks
     * @param {string} taskId - Task ID
     * @param {string|null} newGroup - New group name or null
     * @param {Array} newTaskOrder - New order of tasks
     * @returns {object|null} - The updated task or null if not found
     */
    updateTaskGroupAndOrder(taskId, newGroup, newTaskOrder) {
        const task = this.tasks.find(t => t.id === taskId);
        
        if (task) {
            task.group = newGroup;
        }
        
        if (newTaskOrder && newTaskOrder.length > 0) {
            this.tasks = newTaskOrder;
        }
        
        this.saveTasks();
        return task;
    }

    /**
     * Save tasks to localStorage
     */
    saveTasks() {
        localStorage.setItem('matrix-tasks', JSON.stringify(this.tasks));
    }

    /**
     * Calculate progress statistics
     * @returns {object} - Progress statistics
     */
    getProgressStats() {
        // Filter out tasks in the 'BACKLOG' group (case-insensitive)
        const nonBacklogTasks = this.tasks.filter(t => 
            !t.group || t.group.toUpperCase() !== 'BACKLOG'
        );
        
        const totalTasks = nonBacklogTasks.length;
        const completedTasks = nonBacklogTasks.filter(t => t.completed).length;
        
        const percentage = totalTasks 
            ? Math.round((completedTasks / totalTasks) * 100)
            : 0;
        
        // Check if backlog tasks exist
        const hasBacklogTasks = this.tasks.some(t => t.group && t.group.toUpperCase() === 'BACKLOG');
        
        return {
            percentage,
            completedTasks,
            totalTasks,
            hasBacklogTasks
        };
    }

    /**
     * Gets all existing groups from tasks
     * @returns {string[]} - Array of unique group names
     */
    getExistingGroups() {
        return [...new Set(this.tasks
            .map(task => task.group)
            .filter(group => group) // Remove null/undefined
            .map(group => group.toUpperCase()) // Normalize all groups to uppercase
        )];
    }

    /**
     * Format timestamp as relative time
     * @param {string} timestamp - ISO timestamp
     * @returns {string} - Formatted time (e.g., "3d", "5h", "10m")
     */
    formatTime(timestamp) {
        const ms = Date.now() - new Date(timestamp).getTime();
        
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}d`;
        } else if (hours > 0) {
            return `${hours}h`;
        } else {
            return `${minutes}m`;
        }
    }

    /**
     * Group tasks by their group property
     * @returns {object} - Tasks grouped by group name
     */
    getGroupedTasks() {
        return this.tasks.reduce((acc, task) => {
            const group = task.group ? task.group.toUpperCase() : 'UNGROUPED';
            if (!acc[group]) acc[group] = [];
            acc[group].push(task);
            return acc;
        }, {});
    }

    /**
     * Removes empty tasks
     */
    cleanupEmptyTasks() {
        const originalLength = this.tasks.length;
        this.tasks = this.tasks.filter(task => task.text.trim());
        
        if (this.tasks.length !== originalLength) {
            console.log(`Cleaned up ${originalLength - this.tasks.length} empty tasks`);
            localStorage.setItem('matrix-tasks', JSON.stringify(this.tasks));
        }
    }
}

export default TaskManager; 