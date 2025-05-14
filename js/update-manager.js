class UpdateManager {
    constructor() {
        this.updates = {
            'notes-update': {
                id: 'notes-update',
                title: 'NEW FEATURES AVAILABLE',
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
            },
            'groups-update': {
                id: 'groups-update',
                title: 'NEW FEATURES AVAILABLE',
                features: [
                    'Add <span style="color: #FFD700">#<group_name></span> to organize related tasks',
                ],
                preview: `
                    <style>
                        .groups-preview {
                            margin: 32px 0 24px;
                            font-family: monospace;
                            color: var(--matrix-green);
                            position: relative;
                        }

                        .demo-label {
                            position: absolute;
                            top: -20px;
                            left: 0;
                            font-size: 11px;
                            opacity: 0.4;
                            letter-spacing: 1px;
                        }
                        
                        .demo-input {
                            position: relative;
                            padding: 12px 0;
                            margin-bottom: 4px;
                            font-size: 14px;
                            border-bottom: 1px solid rgba(var(--matrix-green-rgb), 0.3);
                        }

                        .demo-input:after {
                            content: '';
                            position: absolute;
                            bottom: -1px;
                            left: 0;
                            width: 100%;
                            height: 1px;
                            background: var(--matrix-green);
                            opacity: 0.1;
                            box-shadow: 0 0 8px rgba(var(--matrix-green-rgb), 0.3);
                        }

                        .typing-effect {
                            display: inline-block;
                            white-space: pre;
                            overflow: hidden;
                            width: 0;
                        }

                        .typing-effect.first.active {
                            width: fit-content;
                            animation: typingFirst 2s steps(25) forwards;
                        }

                        .typing-effect.second.active {
                            width: fit-content;
                            animation: typingSecond 1.5s steps(19) forwards;
                        }

                        .typing-cursor {
                            display: inline-block;
                            width: 2px;
                            height: 1em;
                            background: var(--matrix-green);
                            margin-left: -2px;
                            animation: blink 0.7s step-end infinite;
                            transition: opacity 0.2s;
                        }

                        .demo-input.submitted .typing-cursor {
                            opacity: 0;
                            display: none;
                            margin-left: 0;
                        }

                        @keyframes blink {
                            50% { opacity: 0; }
                        }

                        .demo-input.submitted .typing-effect {
                            opacity: 0;
                            transition: opacity 0.2s;
                        }

                        .demo-input.submitted .typing-effect.second {
                            opacity: 1;
                        }

                        @keyframes typingFirst {
                            from { width: 0 }
                            to { width: 25ch }
                        }

                        @keyframes typingSecond {
                            from { width: 0 }
                            to { width: 19ch }
                        }

                        .submit-flash {
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            background: rgba(var(--matrix-green-rgb), 0.2);
                            opacity: 0;
                            pointer-events: none;
                        }

                        .demo-input.submitted .submit-flash {
                            animation: flash 0.3s ease-out;
                        }

                        @keyframes flash {
                            0% { opacity: 0; }
                            50% { opacity: 1; }
                            100% { opacity: 0; }
                        }

                        .demo-tasks {
                            margin-top: 24px;
                            opacity: 0;
                        }

                        .demo-tasks.visible {
                            opacity: 1;
                            transition: opacity 0.3s;
                        }

                        .demo-group {
                            font-size: 13px;
                            letter-spacing: 2px;
                            opacity: 0.4;
                            margin-bottom: 8px;
                        }

                        .demo-task {
                            margin-left: 12px;
                            border-left: 1px solid rgba(var(--matrix-green-rgb), 0.1);
                            padding: 8px 12px;
                            font-size: 14px;
                            opacity: 0;
                            transform: translateX(-10px);
                        }

                        .demo-task.visible {
                            opacity: 1;
                            transform: translateX(0);
                            transition: all 0.3s;
                        }

                        /* Make the #work tag stand out in the demo */
                        .typing-effect span {
                            color: #FFD700;
                        }
                    </style>
                    <div class="groups-preview" id="groupsPreview">
                        <div class="demo-label">DEMO</div>
                        <div class="demo-input">
                            <span class="typing-effect first active">REVIEW PULL REQUEST <span>#work</span></span>
                            <span class="typing-effect second" style="display: none">FIX LOGIN BUG <span>#work</span></span>
                            <span class="typing-cursor"></span>
                            <div class="submit-flash"></div>
                        </div>
                        <div class="demo-tasks">
                            <div class="demo-group">WORK</div>
                            <div id="tasksList"></div>
                        </div>
                    </div>
                `
            },
            'current-task-update': {
                id: 'current-task-update',
                title: 'NEW FEATURES AVAILABLE',
                features: [
                    'NEW: WHICH TASK ARE YOU WORKING ON?',
                    '• RIGHT-CLICK TASK TO SET/UNSET CURRENT'
                ],
                preview: `
                    <style>
                        .current-task-preview {
                            margin: 32px 0 24px;
                            font-family: monospace;
                            color: var(--matrix-green);
                            position: relative;
                        }

                        .demo-label {
                            position: absolute;
                            top: -20px;
                            left: 0;
                            font-size: 11px;
                            opacity: 0.4;
                            letter-spacing: 1px;
                        }

                        .demo-task-item {
                            background: rgba(var(--matrix-green-rgb), 0.04);
                            padding: 12px 12px 12px 28px;
                            position: relative;
                            margin: 8px 0;
                            transition: all 0.3s ease;
                            font-size: 18px;
                        }

                        .demo-task-item.current {
                            border-left: 2px solid var(--matrix-green);
                            overflow: hidden;
                        }

                        .demo-task-item.current::before {
                            content: "";
                            position: absolute;
                            left: 8px;
                            top: 50%;
                            width: 6px;
                            height: 6px;
                            border-radius: 50%;
                            background-color: var(--matrix-green);
                            transform: translateY(-50%);
                            animation: dotPulse 2s infinite;
                            box-shadow: 0 0 8px rgba(var(--matrix-green-rgb), 0.4);
                        }

                        .demo-task-item.current::after {
                            content: "";
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: repeating-linear-gradient(
                                90deg,
                                transparent,
                                transparent 15px,
                                rgba(var(--matrix-green-rgb), 0.02) 15px,
                                rgba(var(--matrix-green-rgb), 0.02) 30px
                            );
                            animation: matrixRain 8s linear infinite;
                            pointer-events: none;
                            opacity: 0.4;
                        }

                        .demo-menu {
                            position: absolute;
                            right: 20px;
                            top: 0;
                            background: rgba(0, 0, 0, 0.85);
                            border: 1px solid rgba(var(--matrix-green-rgb), 0.15);
                            padding: 2px;
                            opacity: 0;
                            transition: opacity 0.3s;
                        }

                        .demo-menu.visible {
                            opacity: 1;
                        }

                        .demo-menu-item {
                            padding: 8px 16px;
                            color: var(--matrix-green);
                            opacity: 0.7;
                            white-space: nowrap;
                            font-size: 14px;
                            letter-spacing: 1px;
                        }

                        @keyframes dotPulse {
                            0% { 
                                opacity: 0.4; 
                                transform: translateY(-50%) scale(0.8);
                                box-shadow: 0 0 4px rgba(var(--matrix-green-rgb), 0.2);
                            }
                            50% { 
                                opacity: 1; 
                                transform: translateY(-50%) scale(1);
                                box-shadow: 0 0 12px rgba(var(--matrix-green-rgb), 0.6);
                            }
                            100% { 
                                opacity: 0.4; 
                                transform: translateY(-50%) scale(0.8);
                                box-shadow: 0 0 4px rgba(var(--matrix-green-rgb), 0.2);
                            }
                        }

                        @keyframes matrixRain {
                            0% { background-position: 0 0; }
                            100% { background-position: 60px 0; }
                        }
                    </style>
                    <div class="current-task-preview">
                        <div class="demo-label">DEMO</div>
                        <div class="demo-task-item">
                            IMPLEMENT NEW FEATURE
                            <div class="demo-menu">
                                <div class="demo-menu-item">SET AS CURRENT TASK</div>
                            </div>
                        </div>
                    </div>
                `
            }
        };
        
        // Initialize the What's New button
        this.initializeWhatsNewButton();
    }

    initializeWhatsNewButton() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupWhatsNewButton());
        } else {
            this.setupWhatsNewButton();
        }
    }

    setupWhatsNewButton() {
        // Add click event to the existing button
        const whatsNewButton = document.querySelector('.whats-new-button');
        if (whatsNewButton) {
            whatsNewButton.addEventListener('click', () => this.showWhatsNewModal());
        }
    }

    checkForUpdates() {
        // Get seen updates from localStorage
        const seenUpdates = JSON.parse(localStorage.getItem('matrix-todo-seen-updates') || '{}');
        
        // Find all unseen updates
        const unseenUpdates = Object.values(this.updates).filter(update => !seenUpdates[update.id]);
        
        if (unseenUpdates.length > 0) {
            // Show the What's New modal automatically for unseen updates
            this.showWhatsNewModal(unseenUpdates);
            
            // Mark all updates as seen
            unseenUpdates.forEach(update => {
                seenUpdates[update.id] = true;
            });
            localStorage.setItem('matrix-todo-seen-updates', JSON.stringify(seenUpdates));
        }
    }

    showWhatsNewModal(specificUpdates = null) {
        // Either show specific updates or show all updates
        const updatesToShow = specificUpdates || Object.values(this.updates);
        
        // Make sure updates-popup div exists
        let popup = document.querySelector('.updates-popup');
        if (!popup) {
            popup = document.createElement('div');
            popup.className = 'updates-popup';
            document.body.appendChild(popup);
        }

        // Create the new modal content
        popup.innerHTML = `
            <h2>WHAT'S NEW</h2>
            <div class="updates-content">
                ${updatesToShow.map(update => `
                    <div class="update-item">
                        <h3>${update.title}</h3>
                        ${update.features.map(feature => `<p>${feature}</p>`).join('')}
                        ${update.preview}
                    </div>
                `).join('<hr style="opacity: 0.3; margin: 20px 0;">')}
            </div>
            <button id="closeUpdates">CLOSE</button>
        `;

        // Initialize animations for each update
        updatesToShow.forEach(update => {
            if (update.id === 'current-task-update') {
                this.initializeCurrentTaskAnimation();
            } else if (update.id === 'groups-update') {
                this.initializeGroupsAnimation();
            }
        });

        // Show the modal
        popup.style.display = 'block';

        // Add close handler
        const closeButton = document.getElementById('closeUpdates');
        closeButton.addEventListener('click', () => {
            popup.style.display = 'none';
        });
        
        // Close when clicking outside - removing old listeners first
        const handleOutsideClick = (e) => {
            if (e.target === popup) {
                popup.style.display = 'none';
                document.removeEventListener('click', handleOutsideClick);
            }
        };
        
        // Remove any previous instances of the click handler
        document.removeEventListener('click', handleOutsideClick);
        document.addEventListener('click', handleOutsideClick);
    }

    initializeGroupsAnimation() {
        const preview = document.getElementById('groupsPreview');
        if (!preview) return;

        preview.innerHTML = `
            <div class="demo-input">
                <span class="typing-effect first active">REVIEW PULL REQUEST <span>#work</span></span>
                <span class="typing-effect second" style="display: none">FIX LOGIN BUG <span>#work</span></span>
                <span class="typing-cursor"></span>
                <div class="submit-flash"></div>
            </div>
            <div class="demo-tasks">
                <div class="demo-group">WORK</div>
                <div id="tasksList"></div>
            </div>
        `;

        const input = preview.querySelector('.demo-input');
        const firstText = preview.querySelector('.typing-effect.first');
        const secondText = preview.querySelector('.typing-effect.second');
        const tasks = preview.querySelector('.demo-tasks');
        const tasksList = preview.querySelector('#tasksList');

        // First task typing animation (3s)
        setTimeout(() => {
            input.classList.add('submitted');
            firstText.style.opacity = '0';
            
            // Show first task immediately after input clears
            setTimeout(() => {
                tasks.classList.add('visible');
                tasksList.innerHTML = '<div class="demo-task visible">REVIEW PULL REQUEST</div>';
            }, 200);
        }, 3000);

        // Start second task (4s)
        setTimeout(() => {
            input.classList.remove('submitted');
            firstText.style.display = 'none';
            secondText.style.display = 'inline-block';
            secondText.classList.add('active');
        }, 4000);

        // Submit second task (7s)
        setTimeout(() => {
            input.classList.add('submitted');
            secondText.style.opacity = '0';
            
            // Show second task immediately after input clears
            setTimeout(() => {
                tasksList.innerHTML = `
                    <div class="demo-task visible">REVIEW PULL REQUEST</div>
                    <div class="demo-task visible">FIX LOGIN BUG</div>
                `;
            }, 200);
        }, 7000);

        // Reset animation (9s)
        setTimeout(() => {
            this.initializeGroupsAnimation();
        }, 9000);
    }

    initializeCurrentTaskAnimation() {
        const taskItem = document.querySelector('.demo-task-item');
        const menu = document.querySelector('.demo-menu');
        
        if (!taskItem || !menu) return;
        
        // Animation sequence
        const animate = () => {
            // Show menu
            setTimeout(() => menu.classList.add('visible'), 1000);
            
            // Add current task styling
            setTimeout(() => {
                menu.classList.remove('visible');
                taskItem.classList.add('current');
            }, 2000);
            
            // Reset after delay
            setTimeout(() => {
                taskItem.classList.remove('current');
                animate(); // Loop animation
            }, 4000);
        };
        
        animate();
    }
}

export default UpdateManager; 