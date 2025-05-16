class DocumentManager {
    constructor() {
        this.documents = JSON.parse(localStorage.getItem('matrix-documents')) || [];
        this.documentsOverlay = document.querySelector('.documents-overlay');
    }

    /**
     * Adds a new document
     * @returns {object} The newly created document
     */
    addDocument() {
        // Calculate center position for new document
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const docWidth = 500; // Width defined in CSS
        const docHeight = 250; // Approximate default height
        
        const document = {
            id: Date.now().toString(),
            title: 'UNTITLED DOCUMENT',
            content: '',
            timestamp: new Date().toISOString(),
            position: {
                x: (viewportWidth - docWidth) / 2,
                y: (viewportHeight - docHeight) / 2
            },
            isExpanded: true // Start expanded by default
        };
        
        this.documents.unshift(document);
        this.saveDocuments();
        this.renderDocuments();
        
        // Return the document so the caller can focus it if needed
        return document;
    }

    /**
     * Deletes a document by ID
     * @param {string} id - Document ID
     */
    deleteDocument(id) {
        this.documents = this.documents.filter(doc => doc.id !== id);
        this.saveDocuments();
        this.renderDocuments();
    }

    /**
     * Updates a document's title
     * @param {string} id - Document ID
     * @param {string} title - New title
     */
    updateDocumentTitle(id, title) {
        const doc = this.documents.find(d => d.id === id);
        if (doc) {
            doc.title = title;
            this.saveDocuments();
        }
    }

    /**
     * Updates a document's content
     * @param {string} id - Document ID
     * @param {string} content - New content
     */
    updateDocumentContent(id, content) {
        const doc = this.documents.find(d => d.id === id);
        if (doc) {
            doc.content = content;
            this.saveDocuments();
        }
    }

    /**
     * Updates a document's position
     * @param {string} id - Document ID
     * @param {object} position - {x, y} coordinates
     */
    updateDocumentPosition(id, position) {
        const doc = this.documents.find(d => d.id === id);
        if (doc) {
            doc.position = position;
            this.saveDocuments();
        }
    }

    /**
     * Toggle a document's expanded state
     * @param {string} id - Document ID
     */
    toggleDocumentExpansion(id) {
        const doc = this.documents.find(d => d.id === id);
        if (doc) {
            doc.isExpanded = !doc.isExpanded;
            this.saveDocuments();
            
            // Update just this document's UI instead of re-rendering all
            const docElement = document.getElementById(`document-${id}`);
            if (docElement) {
                if (doc.isExpanded) {
                    // First add class to start animation
                    docElement.classList.remove('collapsed');
                    docElement.classList.add('expanded');
                    
                    // The content element will transition smoothly due to CSS
                    const contentEl = docElement.querySelector('.document-content');
                    if (contentEl) {
                        // Focus the textarea after expansion with a slight delay to allow animation
                        setTimeout(() => {
                            const textarea = contentEl.querySelector('textarea');
                            if (textarea) {
                                this.adjustTextareaHeight(textarea);
                                // Only focus if this was a deliberate user action (not initial load)
                                if (document.activeElement !== document.body) {
                                    textarea.focus();
                                }
                            }
                        }, 250); // Delay matches animation duration
                    }
                    
                    // Fix z-index issue by bringing this document to front
                    docElement.style.zIndex = 52; // Higher than other documents
                } else {
                    // First update classes to start animation
                    docElement.classList.remove('expanded');
                    docElement.classList.add('collapsed');
                    
                    // The content will collapse smoothly due to CSS transitions
                    docElement.style.zIndex = 51; // Reset to normal z-index
                }
            }
        }
    }

    /**
     * Adjust textarea height based on content
     * @param {HTMLElement} textarea - The textarea to adjust
     */
    adjustTextareaHeight(textarea) {
        // Save current scroll position
        const scrollTop = textarea.scrollTop;
        
        // Reset height to auto, then set to scrollHeight
        textarea.style.height = 'auto';
        
        // Set height to scrollHeight but limit to reasonable maximum
        const maxHeight = 400; // Maximum height in pixels
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);
        textarea.style.height = `${newHeight}px`;
        
        // Restore scroll position
        textarea.scrollTop = scrollTop;
    }

    /**
     * Save documents to localStorage
     */
    saveDocuments() {
        localStorage.setItem('matrix-documents', JSON.stringify(this.documents));
    }

    /**
     * Renders all documents
     */
    renderDocuments() {
        console.log('🎨 Starting renderDocuments');
        console.log('Current documents:', this.documents);
        
        if (!this.documentsOverlay) {
            console.error('❌ Documents overlay element not found!');
            return;
        }
        
        // Generate HTML for all documents
        const html = this.documents.map(doc => {
            const position = doc.position || { x: 0, y: 0 };
            const expandedClass = doc.isExpanded ? 'expanded' : 'collapsed';
            console.log('📄 Rendering document:', { id: doc.id, position, expanded: doc.isExpanded });
            
            return `
                <div id="document-${doc.id}" class="document-item ${expandedClass}" 
                    data-id="${doc.id}" 
                    style="visibility: hidden; transform: translate(${position.x}px, ${position.y}px); z-index: ${doc.isExpanded ? 52 : 51};">
                    <div class="document-header">
                        <div class="title-container">
                            <span class="document-type-indicator">doc</span>
                            <input type="text" class="document-title" value="${doc.title || 'UNTITLED DOCUMENT'}" placeholder="TITLE">
                        </div>
                        <div class="document-header-buttons">
                            <button class="drag-document" title="Drag">···</button>
                            <button class="delete-document" title="Delete">×</button>
                        </div>
                    </div>
                    <div class="document-content">
                        <textarea placeholder="ENTER DOCUMENT CONTENT">${doc.content || ''}</textarea>
                    </div>
                    <div class="collapsed-click-area">
                        <span class="expand-indicator">▼</span>
                    </div>
                    <button class="minimize-document" title="Minimize">▲</button>
                </div>
            `;
        }).join('');
        
        this.documentsOverlay.innerHTML = html;

        // Initialize dragging for each document
        const documentElements = this.documentsOverlay.querySelectorAll('.document-item');
        console.log('Found document elements:', documentElements.length);

        documentElements.forEach(docEl => {
            // Make sure document is visible and within bounds
            const docId = docEl.dataset.id;
            const doc = this.documents.find(d => d.id === docId);
            if (doc && doc.position) {
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const docWidth = doc.isExpanded ? 800 : 380; // Width based on state - INCREASED WIDTH
                const docHeight = doc.isExpanded ? 600 : 45; // Height based on state - INCREASED HEIGHT
                
                // Keep document within viewport bounds to prevent them getting lost off-screen
                doc.position.x = Math.max(0, Math.min(doc.position.x, viewportWidth - Math.min(docWidth, 200)));
                doc.position.y = Math.max(0, Math.min(doc.position.y, viewportHeight - Math.min(docHeight, 40)));
                
                docEl.style.transform = `translate(${doc.position.x}px, ${doc.position.y}px)`;
            }
            
            // Initialize drag functionality
            this.initializeDragging(docEl);
            
            // Make visible after positioning is done
            docEl.style.visibility = 'visible';
        });

        this.setupEventListeners();
    }

    /**
     * Setup event listeners for documents
     */
    setupEventListeners() {
        // Add event listeners for title inputs
        this.documentsOverlay.querySelectorAll('.document-title').forEach(titleInput => {
            titleInput.addEventListener('input', (e) => {
                const docId = e.target.closest('.document-item').dataset.id;
                this.updateDocumentTitle(docId, e.target.value);
            });
            
            // Prevent task input focus when clicking title input
            titleInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            // Handle Enter key to move to content area
            titleInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    const docEl = e.target.closest('.document-item');
                    if (docEl.classList.contains('expanded')) {
                        const textarea = docEl.querySelector('textarea');
                        if (textarea) textarea.focus();
                    }
                }
            });
        });
        
        // Add event listeners for textareas
        this.documentsOverlay.querySelectorAll('textarea').forEach(textarea => {
            // Initial height adjustment
            this.adjustTextareaHeight(textarea);

            textarea.addEventListener('input', (e) => {
                const docId = e.target.closest('.document-item').dataset.id;
                this.updateDocumentContent(docId, e.target.value);
                // Adjust height on input
                this.adjustTextareaHeight(e.target);
            });

            // Prevent task input focus when clicking textarea
            textarea.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            // Also adjust height on resize
            textarea.addEventListener('resize', (e) => {
                this.adjustTextareaHeight(e.target);
            });
            
            // Fix for textarea focus issues in Firefox and prevent double-click issues
            textarea.addEventListener('mousedown', (e) => {
                // Prevent document drag on textarea mousedown
                e.stopPropagation();
            });
            
            // Prevent double-click from triggering document minimize
            textarea.addEventListener('dblclick', (e) => {
                e.stopPropagation();
            });
        });

        // Add event listeners for delete buttons
        this.documentsOverlay.querySelectorAll('.delete-document').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const docId = e.target.closest('.document-item').dataset.id;
                const doc = this.documents.find(d => d.id === docId);
                
                // Only confirm deletion if the document has content
                if (!doc.content || doc.content.trim() === '' || confirm('Delete this document?')) {
                    this.deleteDocument(docId);
                }
            });
        });
        
        // Add event listeners for drag handle buttons
        this.documentsOverlay.querySelectorAll('.drag-document').forEach(button => {
            // Stop propagation on click to prevent accidentally toggling the document
            button.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });
        
        // Add event listeners for collapsed click area (to expand documents)
        this.documentsOverlay.querySelectorAll('.collapsed-click-area').forEach(clickArea => {
            clickArea.addEventListener('click', (e) => {
                // Only respond if document is collapsed
                const docElement = e.target.closest('.document-item');
                if (docElement && docElement.classList.contains('collapsed')) {
                    e.stopPropagation();
                    const docId = docElement.dataset.id;
                    this.toggleDocumentExpansion(docId);
                }
            });
        });
        
        // Add event listeners for the content area to prevent propagation
        this.documentsOverlay.querySelectorAll('.document-content').forEach(contentEl => {
            contentEl.addEventListener('click', (e) => {
                // Stop propagation to prevent toggles
                e.stopPropagation();
            });
            
            // Prevent double-click from triggering document minimize
            contentEl.addEventListener('dblclick', (e) => {
                e.stopPropagation();
            });
        });
        
        // Add event listeners for the minimize button
        this.documentsOverlay.querySelectorAll('.minimize-document').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const docElement = e.target.closest('.document-item');
                const docId = docElement.dataset.id;
                this.toggleDocumentExpansion(docId);
            });
        });
        
        // Enable double-click ONLY on header to expand/collapse documents
        this.documentsOverlay.querySelectorAll('.document-header').forEach(header => {
            header.addEventListener('dblclick', (e) => {
                // Don't trigger if clicking on buttons or inputs
                if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
                    const docElement = e.target.closest('.document-item');
                    const docId = docElement.dataset.id;
                    this.toggleDocumentExpansion(docId);
                }
            });
        });
        
        // Remove the double-click from collapsed documents since we're now using header double-click
    }

    /**
     * Initialize dragging for a document element
     * @param {HTMLElement} documentElement - The document DOM element
     */
    initializeDragging(documentElement) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;
        let dragStartTime = 0;
        let hasMoved = false;
        let lastClickTime = 0; // To detect double clicks

        const dragStart = (e) => {
            // Don't start drag if clicking on form elements or certain buttons
            if (e.target.tagName === 'TEXTAREA' || 
                e.target.tagName === 'INPUT' ||
                (e.target.tagName === 'BUTTON' && 
                 !e.target.classList.contains('drag-document'))) return;
            
            // Check for double click - this prevents drag starting on double click
            const now = Date.now();
            if (now - lastClickTime < 300) { // 300ms is typical double-click threshold
                lastClickTime = now;
                return; // Exit to allow double-click handlers to work
            }
            lastClickTime = now;
            
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            dragStartTime = Date.now();
            hasMoved = false;

            // Allow dragging via header or specifically via the drag handle
            const isHeader = e.target.classList.contains('document-header') || 
                            e.target.closest('.document-header');
            const isDragHandle = e.target.classList.contains('drag-document');

            if (isHeader || isDragHandle) {
                isDragging = true;
                document.body.style.cursor = 'grabbing';
                documentElement.style.cursor = 'grabbing';
                
                // Set the drag handle to grabbing cursor if it was the trigger
                if (isDragHandle) {
                    e.target.style.cursor = 'grabbing';
                }
                
                // Move this document to top of the stack
                documentElement.style.zIndex = 53;
                
                // Set a data attribute to indicate we're in dragging mode
                documentElement.setAttribute('data-dragging', 'true');
            }
        };

        const dragEnd = (e) => {
            if (!isDragging) return;
            
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
            document.body.style.cursor = '';
            documentElement.style.cursor = '';
            
            // Reset drag handle cursor
            const dragHandle = documentElement.querySelector('.drag-document');
            if (dragHandle) {
                dragHandle.style.cursor = 'grab';
            }

            // Save the final position
            const docId = documentElement.dataset.id;
            this.updateDocumentPosition(docId, { x: xOffset, y: yOffset });
            
            // Reset z-index to normal level based on expanded state
            const isExpanded = documentElement.classList.contains('expanded');
            documentElement.style.zIndex = isExpanded ? 52 : 51;
            
            // After a slight delay, remove the dragging attribute
            // This prevents the toggle from firing when dragging ends
            setTimeout(() => {
                documentElement.removeAttribute('data-dragging');
            }, 100);
        };

        const drag = (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            
            // Determine if we've actually moved enough to consider this a drag
            const moveX = Math.abs(currentX - xOffset);
            const moveY = Math.abs(currentY - yOffset);
            
            if (moveX > 5 || moveY > 5) {
                hasMoved = true;
            }
            
            xOffset = currentX;
            yOffset = currentY;

            setTranslate(currentX, currentY, documentElement);
        };

        const setTranslate = (xPos, yPos, el) => {
            // Get viewport dimensions
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // Get document dimensions
            const docRect = el.getBoundingClientRect();
            const docWidth = docRect.width;
            const docHeight = docRect.height;
            
            // Constrain position to keep at least part of document visible
            // Allow 80% of the document to go off-screen to enable easy retrieval
            const minVisible = 40; // Minimum visible pixels
            xPos = Math.max(-docWidth + minVisible, Math.min(xPos, viewportWidth - minVisible));
            yPos = Math.max(-docHeight + minVisible, Math.min(yPos, viewportHeight - minVisible));
            
            el.style.transform = `translate(${xPos}px, ${yPos}px)`;
        };

        // Set initial position
        const docId = documentElement.dataset.id;
        const doc = this.documents.find(d => d.id === docId);
        if (doc && doc.position) {
            xOffset = doc.position.x;
            yOffset = doc.position.y;
            setTranslate(xOffset, yOffset, documentElement);
        }

        documentElement.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
    }

    /**
     * Clean up document-wide click handler
     */
    cleanupDocumentClickHandler() {
        // Remove any existing handler
        if (this._documentClickHandler) {
            document.removeEventListener('click', this._documentClickHandler);
            this._documentClickHandler = null;
        }
    }
    
    /**
     * Set up document-wide click handler for automatic collapsing
     */
    setupDocumentClickHandler() {
        // This functionality has been removed as requested
    }
}

export default DocumentManager; 