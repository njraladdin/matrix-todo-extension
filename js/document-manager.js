import { saveData, loadData } from './storage.js';

class DocumentManager {
    constructor() {
        this.documents = loadData('matrix-documents', []);
        this.documentsOverlay = document.querySelector('.documents-overlay');
        // Store original positions for documents that are repositioned when expanded
        this.originalPositions = {};
    }

    /**
     * Adds a new document
     * @param {number} x - Optional X coordinate for the document
     * @param {number} y - Optional Y coordinate for the document
     * @returns {object} The newly created document
     */
    addDocument(x, y) {
        // Calculate position for new document
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const docWidth = 500; // Width defined in CSS
        const docHeight = 250; // Approximate default height
        
        // Use provided coordinates if available, otherwise center the document
        // Note: x and y are already page coordinates (including scroll position)
        // from the context menu handler, so we don't need to adjust them further
        const posX = x !== undefined ? x - (docWidth / 2) : (viewportWidth - docWidth) / 2;
        
        // For Y position, if coordinates are provided, use them directly
        // Otherwise, center in the current viewport (accounting for scroll)
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        const posY = y !== undefined ? y - (docHeight / 2) : scrollY + (viewportHeight - docHeight) / 2;
        
        const newDocument = {
            id: Date.now().toString(),
            title: 'UNTITLED DOCUMENT',
            content: '',
            timestamp: new Date().toISOString(),
            position: {
                x: posX,
                y: posY
            },
            isExpanded: true // Start expanded by default
        };
        
        this.documents.unshift(newDocument);
        this.saveDocuments();
        this.renderDocuments();
        
        // Return the document so the caller can focus it if needed
        return newDocument;
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
     * Process text replacements like @today -> current date
     * @param {string} text - The text to process
     * @returns {string} The processed text
     */
    processTextReplacements(text) {
        // Replace @today with current date in YYYY-MM-DD format
        if (text.includes('@today')) {
            const today = new Date();
            const dateString = today.getFullYear() + '-' + 
                             String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                             String(today.getDate()).padStart(2, '0');
            return text.replace(/@today/g, dateString);
        }
        return text;
    }

    /**
     * Updates a document's content with text replacements
     * @param {string} id - Document ID
     * @param {string} content - New content
     * @param {HTMLTextAreaElement} textarea - The textarea element (optional)
     */
    updateDocumentContentWithReplacements(id, content, textarea = null) {
        const processedContent = this.processTextReplacements(content);
        
        // If content was changed by replacements, update the textarea and cursor position
        if (processedContent !== content && textarea) {
            // Store cursor position before replacement
            const cursorPos = textarea.selectionStart;
            const textBeforeCursor = content.substring(0, cursorPos);
            const processedTextBeforeCursor = this.processTextReplacements(textBeforeCursor);
            
            // Calculate new cursor position after replacement
            const cursorOffset = processedTextBeforeCursor.length - textBeforeCursor.length;
            const newCursorPos = cursorPos + cursorOffset;
            
            // Update textarea value
            textarea.value = processedContent;
            
            // Restore cursor position
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            
            // Adjust height after content change
            this.adjustTextareaHeight(textarea);
        }
        
        // Update the document content
        const doc = this.documents.find(d => d.id === id);
        if (doc) {
            doc.content = processedContent;
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
            // Toggle expanded state
            doc.isExpanded = !doc.isExpanded;
            
            // Update just this document's UI instead of re-rendering all
            const docElement = document.getElementById(`document-${id}`);
            if (docElement) {
                if (doc.isExpanded) {
                    // Store original position before repositioning
                    if (!this.originalPositions[id]) {
                        this.originalPositions[id] = { 
                            x: doc.position.x, 
                            y: doc.position.y 
                        };
                    }
                    
                    // Calculate if document will fit in viewport when expanded
                    const expandedWidth = 1000; // Width when expanded
                    const expandedHeight = 600; // Height when expanded
                    const viewportWidth = window.innerWidth;
                    const viewportHeight = window.innerHeight;
                    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
                    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
                    
                    // Calculate safe position that ensures document stays within viewport
                    let safeX = doc.position.x;
                    let safeY = doc.position.y;
                    
                    // Ensure at least 20px margin from viewport edges
                    const margin = 20;
                    
                    // Check if document would go off the right edge
                    if (safeX + expandedWidth > viewportWidth + scrollX - margin) {
                        safeX = Math.max(margin + scrollX, viewportWidth + scrollX - expandedWidth - margin);
                    }
                    
                    // Check if document would go off the left edge
                    if (safeX < margin + scrollX) {
                        safeX = margin + scrollX;
                    }
                    
                    // Check if document would go off the bottom edge
                    // We want to ensure the header is always visible
                    const headerHeight = 50; // Approximate header height
                    if (safeY + expandedHeight > viewportHeight + scrollY - margin) {
                        safeY = Math.max(margin + scrollY, viewportHeight + scrollY - expandedHeight - margin);
                    }
                    
                    // Check if document would go off the top edge
                    if (safeY < margin + scrollY) {
                        safeY = margin + scrollY;
                    }
                    
                    // First add class to start animation
                    docElement.classList.remove('collapsed');
                    docElement.classList.add('expanded');
                    
                    // Update position if needed with smooth transition
                    if (safeX !== doc.position.x || safeY !== doc.position.y) {
                        // Add transition for smooth repositioning
                        docElement.style.transition = 'transform 0.3s ease, width 0.25s cubic-bezier(0.25, 1, 0.5, 1), min-height 0.25s cubic-bezier(0.25, 1, 0.5, 1)';
                        
                        // Update the document position
                        doc.position.x = safeX;
                        doc.position.y = safeY;
                        docElement.style.transform = `translate(${safeX}px, ${safeY}px)`;
                        
                        // Remove transition after animation completes
                        setTimeout(() => {
                            docElement.style.transition = '';
                        }, 300);
                    }
                    
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
                    
                    // Check if we should restore the original position
                    if (this.originalPositions[id]) {
                        // Get the original position
                        const originalPos = this.originalPositions[id];
                        
                        // Add transition for smooth repositioning back
                        docElement.style.transition = 'transform 0.3s ease, width 0.25s cubic-bezier(0.25, 1, 0.5, 1), min-height 0.25s cubic-bezier(0.25, 1, 0.5, 1)';
                        
                        // Wait for collapse animation to start before repositioning
                        setTimeout(() => {
                            // Update the document position to original position
                            doc.position.x = originalPos.x;
                            doc.position.y = originalPos.y;
                            docElement.style.transform = `translate(${originalPos.x}px, ${originalPos.y}px)`;
                            
                            // Remove transition after animation completes
                            setTimeout(() => {
                                docElement.style.transition = '';
                            }, 300);
                        }, 50);
                        
                        // Clear the stored original position
                        delete this.originalPositions[id];
                    }
                    
                    // The content will collapse smoothly due to CSS transitions
                    docElement.style.zIndex = 51; // Reset to normal z-index
                }
            }
            
            // Save the document state
            this.saveDocuments();
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
        saveData('matrix-documents', this.documents);
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
        
        // Save current scroll position to restore it after rendering
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
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
                            <div class="doc-drag-col">
                                <button class="drag-document" title="Drag">···</button>
                            </div>
                            <input type="text" class="document-title" value="${doc.title || 'UNTITLED DOCUMENT'}" placeholder="TITLE">
                        </div>
                        <div class="document-header-buttons">
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
                const docWidth = doc.isExpanded ? 800 : 380; // Width based on state - INCREASED WIDTH
                
                // Keep document within viewport bounds horizontally, but allow vertical freedom
                doc.position.x = Math.max(0, Math.min(doc.position.x, viewportWidth - Math.min(docWidth, 200)));
                
                // No vertical constraints - allow documents to be placed anywhere in the scrollable area
                
                docEl.style.transform = `translate(${doc.position.x}px, ${doc.position.y}px)`;
            }
            
            // Initialize drag functionality
            this.initializeDragging(docEl);
            
            // Make visible after positioning is done
            docEl.style.visibility = 'visible';
        });

        this.setupEventListeners();
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
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
                this.updateDocumentContentWithReplacements(docId, e.target.value, e.target);
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
        let wasDraggingExpanded = false; // Track if we were dragging an expanded document

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
            
            // Get the document ID and current position
            const docId = documentElement.dataset.id;
            const doc = this.documents.find(d => d.id === docId);
            if (!doc) return;
            
            // Clear any transitions to prevent interference with dragging
            documentElement.style.transition = '';
            
            // Use the current actual position from the document object
            xOffset = doc.position.x;
            yOffset = doc.position.y;
            
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            dragStartTime = Date.now();
            hasMoved = false;
            
            // Track if we're dragging an expanded document
            wasDraggingExpanded = documentElement.classList.contains('expanded');

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
            
            // If this was an expanded document being dragged, update the stored position
            // in originalPositions to prevent it from jumping back on collapse
            if (wasDraggingExpanded) {
                const doc = this.documents.find(d => d.id === docId);
                if (doc && doc.isExpanded) {
                    // If we have an original position stored, update it if we've moved significantly
                    if (this.originalPositions[docId]) {
                        const distanceMoved = Math.sqrt(
                            Math.pow(xOffset - this.originalPositions[docId].x, 2) + 
                            Math.pow(yOffset - this.originalPositions[docId].y, 2)
                        );
                        
                        // If moved significantly, don't restore position on collapse
                        // Using a more generous threshold to allow for small adjustments
                        const significantMovementThreshold = 1500; // Increased from 100 to 250
                        if (distanceMoved > significantMovementThreshold) {
                            delete this.originalPositions[docId];
                        }
                    }
                }
            }
            
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
            
            // Get document dimensions
            const docRect = el.getBoundingClientRect();
            const docWidth = docRect.width;
            
            // Constrain position horizontally only, allow vertical scrolling
            // Allow 80% of the document to go off-screen to enable easy retrieval
            const minVisible = 40; // Minimum visible pixels
            xPos = Math.max(-docWidth + minVisible, Math.min(xPos, viewportWidth - minVisible));
            
            // No vertical constraints - allow documents to be placed anywhere in the scrollable area
            
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