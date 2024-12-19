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
                    'Add <span style="color: #FFD700">#group_name</span> to organize related tasks',
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
            }
        };
    }

    checkForUpdates() {
        // Get seen updates from localStorage
        const seenUpdates = JSON.parse(localStorage.getItem('matrix-todo-seen-updates') || '{}');
        
        // Find all unseen updates
        const unseenUpdates = Object.values(this.updates).filter(update => !seenUpdates[update.id]);
        
        if (unseenUpdates.length > 0) {
            let currentUpdateIndex = 0;
            
            const showNextUpdate = () => {
                const update = unseenUpdates[currentUpdateIndex];
                this.showUpdatePopup(update, () => {
                    // Mark this update as seen
                    seenUpdates[update.id] = true;
                    localStorage.setItem('matrix-todo-seen-updates', JSON.stringify(seenUpdates));
                    
                    // Show next update if available
                    currentUpdateIndex++;
                    if (currentUpdateIndex < unseenUpdates.length) {
                        showNextUpdate();
                    }
                });
            };
            
            showNextUpdate();
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

        // Initialize animation after popup is shown
        this.initializeGroupsAnimation();

        popup.style.display = 'block';

        const closeButton = document.getElementById('closeUpdates');
        closeButton.addEventListener('click', () => {
            popup.style.display = 'none';
            onClose();
        });
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
}

export default UpdateManager; 