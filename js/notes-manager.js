import { saveData, loadData } from './storage.js';

class NotesManager {
    constructor() {
        this.notes = loadData('matrix-notes', []);
        this.notesOverlay = document.querySelector('.notes-overlay');
    }

    /**
     * Adds a new note
     * @param {number} x - Optional X coordinate for the note
     * @param {number} y - Optional Y coordinate for the note
     * @returns {object} The newly created note
     */
    addNote(x, y) {
        // Calculate position for new note
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const noteWidth = 400; // Width defined in CSS
        const noteHeight = 200; // Approximate default height
        
        // Use provided coordinates if available, otherwise center the note
        // Note: x and y are already page coordinates (including scroll position)
        // from the context menu handler, so we don't need to adjust them further
        const posX = x !== undefined ? x - (noteWidth / 2) : (viewportWidth - noteWidth) / 2;
        
        // For Y position, if coordinates are provided, use them directly
        // Otherwise, center in the current viewport (accounting for scroll)
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        const posY = y !== undefined ? y - (noteHeight / 2) : scrollY + (viewportHeight - noteHeight) / 2;
        
        const note = {
            id: Date.now().toString(),
            content: '',
            timestamp: new Date().toISOString(),
            position: {
                x: posX,
                y: posY
            }
        };
        
        this.notes.unshift(note);
        this.saveNotes();
        this.renderNotes();
        
        // Return the note so the caller can focus it if needed
        return note;
    }

    /**
     * Deletes a note by ID
     * @param {string} id - Note ID
     */
    deleteNote(id) {
        this.notes = this.notes.filter(note => note.id !== id);
        this.saveNotes();
        this.renderNotes();
    }

    /**
     * Updates a note's content
     * @param {string} id - Note ID
     * @param {string} content - New content
     */
    updateNoteContent(id, content) {
        const note = this.notes.find(n => n.id === id);
        if (note) {
            note.content = content;
            this.saveNotes();
        }
    }

    /**
     * Updates a note's position
     * @param {string} id - Note ID
     * @param {object} position - {x, y} coordinates
     */
    updateNotePosition(id, position) {
        const note = this.notes.find(n => n.id === id);
        if (note) {
            note.position = position;
            this.saveNotes();
        }
    }

    /**
     * Save notes to localStorage
     */
    saveNotes() {
        saveData('matrix-notes', this.notes);
    }

    /**
     * Renders all notes
     */
    renderNotes() {
        console.log('🎨 Starting renderNotes');
        console.log('Current notes:', this.notes);
        
        if (!this.notesOverlay) {
            console.error('❌ Notes overlay element not found!');
            return;
        }
        
        // Save current scroll position to restore it after rendering
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        // Generate HTML for all notes
        const html = this.notes.map(note => {
            const position = note.position || { x: 0, y: 0 };
            console.log('📝 Rendering note:', { id: note.id, position });
            return `
                <div class="note-item" 
                    data-id="${note.id}" 
                    style="visibility: visible; transform: translate(${position.x}px, ${position.y}px);">
                    <div class="note-header">
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
                const noteRect = noteEl.getBoundingClientRect();
                
                // Only constrain horizontally, allow vertical freedom
                note.position.x = Math.max(0, Math.min(note.position.x, viewportWidth - noteRect.width));
                
                // No vertical constraints - allow notes to be placed anywhere in the scrollable area
                
                noteEl.style.transform = `translate(${note.position.x}px, ${note.position.y}px)`;
            }
            
            noteEl.style.visibility = 'visible';
        });

        this.setupEventListeners();
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
    }

    /**
     * Setup event listeners for notes
     */
    setupEventListeners() {
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
                this.updateNoteContent(noteId, e.target.value);
                // Adjust height on input
                adjustHeight(e.target);
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
                const note = this.notes.find(n => n.id === noteId);
                // Only confirm deletion if the note has content
                if (!note.content || note.content.trim() === '' || confirm('Delete this note?')) {
                    this.deleteNote(noteId);
                }
            });
        });
    }

    /**
     * Initialize dragging for a note element
     * @param {HTMLElement} noteElement - The note DOM element
     */
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
            this.updateNotePosition(noteId, { x: xOffset, y: yOffset });
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
            
            // Get note dimensions
            const noteRect = el.getBoundingClientRect();
            const noteWidth = noteRect.width;
            
            // Constrain position horizontally only, allow vertical scrolling
            xPos = Math.max(0, Math.min(xPos, viewportWidth - noteWidth));
            
            // No vertical constraints - allow notes to be placed anywhere in the scrollable area
            
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
}

export default NotesManager; 