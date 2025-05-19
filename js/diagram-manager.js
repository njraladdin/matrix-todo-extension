import { saveData, loadData } from './storage.js';

class DiagramManager {
    constructor() {
        this.entities = loadData('matrix-diagram-entities', []);
        this.connections = loadData('matrix-diagram-connections', []);
        this.diagramOverlay = document.querySelector('.diagram-overlay');
        
        // Calculate the next entity ID based on existing entities
        this.nextEntityId = this.calculateNextEntityId();
        
        // Clean up connections to remove duplicates and invalid references
        this.cleanupConnections();
        
        // Keep track of drag state
        this.dragState = {
            isDragging: false,
            currentEntity: null,
            initialX: 0,
            initialY: 0,
            xOffset: 0,
            yOffset: 0
        };
        
        // Keep track of connection drag state
        this.connectionDrag = {
            isActive: false,
            sourceEntity: null,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0
        };
        
        // Initialize
        this.bindEvents();
    }
    
    /**
     * Calculate the next entity ID based on existing entities
     * @returns {number} The next available entity ID
     */
    calculateNextEntityId() {
        if (this.entities.length === 0) return 1;
        
        // Extract numeric IDs from entity IDs (e.g., "entity-5" -> 5)
        const entityIds = this.entities.map(entity => {
            const match = entity.id.match(/^entity-(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
        });
        
        // Find the highest ID and add 1
        return Math.max(...entityIds) + 1;
    }
    
    /**
     * Clean up connections to remove duplicates and invalid references
     */
    cleanupConnections() {
        if (!this.connections.length) return;
        
        // Get a list of valid entity IDs
        const validEntityIds = this.entities.map(entity => entity.id);
        
        // First, filter out connections with invalid entity references
        this.connections = this.connections.filter(conn => 
            validEntityIds.includes(conn.source) && 
            validEntityIds.includes(conn.target)
        );
        
        // Then, remove duplicate connections (same source and target)
        const uniqueConnections = [];
        const connectionMap = new Map();
        
        this.connections.forEach(conn => {
            // Create a unique key for this connection based on source and target
            const key = `${conn.source}-${conn.target}`;
            
            // Only keep the first occurrence of each unique connection
            if (!connectionMap.has(key)) {
                connectionMap.set(key, true);
                uniqueConnections.push(conn);
            }
        });
        
        this.connections = uniqueConnections;
        
        // Save cleaned-up connections to localStorage
        this.saveState();
    }
    
    /**
     * Save state to localStorage
     */
    saveState() {
        const cleanEntities = this.entities.map(entity => ({
            id: entity.id,
            type: entity.type,
            content: entity.content,
            position: {
                x: entity.position.x,
                y: entity.position.y
            },
            isDashed: entity.isDashed
        }));
        const cleanConnections = this.connections.map(conn => ({
            id: conn.id,
            source: conn.source,
            target: conn.target
        }));
        saveData('matrix-diagram-entities', cleanEntities);
        saveData('matrix-diagram-connections', cleanConnections);
    }
    
    /**
     * Create or get SVG container for connections
     * @returns {SVGElement} The SVG container element
     */
    getConnectionsContainer() {
        let connectionsContainer = this.diagramOverlay.querySelector('.connections-container');
        if (!connectionsContainer) {
            connectionsContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            connectionsContainer.classList.add('connections-container');
            connectionsContainer.style.position = 'absolute';
            connectionsContainer.style.top = '0';
            connectionsContainer.style.left = '0';
            connectionsContainer.style.width = '100%';
            connectionsContainer.style.height = '100%';
            connectionsContainer.style.pointerEvents = 'none';
            connectionsContainer.style.zIndex = '1';
            this.diagramOverlay.appendChild(connectionsContainer);
        }
        return connectionsContainer;
    }
    
    /**
     * Bind all necessary event listeners
     */
    bindEvents() {
        // Only bind events if overlay exists
        if (!this.diagramOverlay) return;
        
        // Event listeners for connection line
        this.diagramOverlay.addEventListener('mousemove', this.handleConnectionDragMove.bind(this));
        document.addEventListener('mouseup', this.handleConnectionDragEnd.bind(this));
        
        // Global event listeners for entity dragging
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }
    
    /**
     * Create a new entity at specified position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {boolean} isDashed - Whether this is a dashed entity
     * @returns {Object} The created entity object
     */
    createEntity(x, y, isDashed = false) {
        // Calculate position relative to the container
        // Note: x and y are already page coordinates (including scroll position)
        // from the context menu handler, so we need to adjust them for the overlay
        const rect = this.diagramOverlay.getBoundingClientRect();
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        // Adjust coordinates to be relative to the diagram overlay accounting for scroll
        const relX = x - rect.left - scrollX;
        const relY = y - rect.top - scrollY;
        
        const entity = {
            id: `entity-${this.nextEntityId++}`,
            type: 'block',
            content: '', // Empty content instead of 'BLOCK'
            position: {
                x: relX,
                y: relY
            },
            isDashed: isDashed
        };
        
        this.entities.push(entity);
        this.saveState();
        
        // Create just this entity in the DOM instead of re-rendering everything
        this.renderSingleEntity(entity);
        
        // Focus the text content of the new entity for editing
        setTimeout(() => {
            const entityEl = document.getElementById(entity.id);
            if (entityEl) {
                const contentEl = entityEl.querySelector('.entity-content');
                if (contentEl) {
                    contentEl.focus();
                }
            }
        }, 100);
        
        return entity;
    }
    
    /**
     * Render a single entity without re-rendering the entire diagram
     */
    renderSingleEntity(entity) {
        if (!this.diagramOverlay) return;
        
        // Get SVG container for connections
        this.getConnectionsContainer();
        
        // Create the entity element
        const entityEl = document.createElement('div');
        entityEl.id = entity.id;
        entityEl.className = 'diagram-entity';
        
        // Apply dashed class if needed
        if (entity.isDashed) {
            entityEl.classList.add('dashed');
        }
        
        // Set explicit position style
        entityEl.style.position = 'absolute';
        entityEl.style.left = `${entity.position.x}px`;
        entityEl.style.top = `${entity.position.y}px`;
        
        // Create note-style drag handle at the bottom-right like in notes-manager.js
        const dragHandle = document.createElement('div');
        dragHandle.className = 'note-drag-handle';
        dragHandle.setAttribute('title', 'Drag to move');
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-entity-btn';
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            this.deleteEntity(entity.id);
        });
        
        // Handle backward compatibility - if entity has title and tags, convert to content
        if (entity.title !== undefined && entity.content === undefined) {
            // Create content from title and tags if they exist
            let newContent = entity.title || '';
            if (entity.tags && entity.tags.length > 0) {
                // Add each tag as a hashtag
                newContent += ' ' + entity.tags.map(tag => `#${tag}`).join(' ');
            }
            entity.content = newContent;
            delete entity.title;
            delete entity.tags;
            this.saveState();
        }
        
        // Create content editable div
        const content = document.createElement('div');
        content.className = 'entity-content';
        content.contentEditable = true;
        
        // Use innerHTML instead of textContent to preserve line breaks
        if (entity.content.includes('<br') || entity.content.includes('\n') || entity.content.includes('</div>')) {
            // This content contains line breaks, use it directly as HTML
            content.innerHTML = entity.content;
        } else {
            // For simple content without line breaks, use textContent for safety
            content.textContent = entity.content;
        }
        
        content.spellcheck = false;
        content.addEventListener('input', (e) => {
            // Use innerHTML to capture formatted content including line breaks
            this.updateEntityContent(entity.id, e.target.innerHTML);
            this.updateEntityTags(entity.id);
        });
        
        // Create tags container for floating tags
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'entity-floating-tags';
        
        // Add elements to the entity in the correct order
        entityEl.appendChild(tagsContainer);
        entityEl.appendChild(deleteBtn);
        entityEl.appendChild(content);
        entityEl.appendChild(dragHandle);
        
        // Add connection indicators
        this.addConnectionIndicators(entityEl);
        
        this.diagramOverlay.appendChild(entityEl);
        
        // Initialize dragging
        this.initializeEntityDragging(entityEl);
        
        // Apply hashtag highlighting to content
        this.highlightHashtags(content);
        
        // Parse and display any hashtags
        this.updateEntityTags(entity.id);
    }
    
    /**
     * Parse hashtags from entity content and create floating tags
     */
    updateEntityTags(entityId) {
        const entity = this.entities.find(n => n.id === entityId);
        if (!entity || !entity.content) return;
        
        const entityElement = document.getElementById(entityId);
        if (!entityElement) return;
        
        // Clear existing floating tags
        const tagsContainer = entityElement.querySelector('.entity-floating-tags');
        if (!tagsContainer) return;
        tagsContainer.innerHTML = '';
        
        // Get a text-only version of content for hashtag extraction
        let plainContent = entity.content;
        
        // If content has HTML, create a temporary element to extract plain text
        if (entity.content.includes('<')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = entity.content;
            plainContent = tempDiv.textContent;
        }
        
        // Extract hashtags using regex
        const hashtags = plainContent.match(/#[a-zA-Z0-9_]+/g) || [];
        if (hashtags.length === 0) return;
        
        // Create floating tags for each hashtag in a row above the entity
        hashtags.forEach((hashtag) => {
            const tag = document.createElement('div');
            tag.className = 'floating-tag';
            tag.textContent = hashtag.substring(1); // Remove the # symbol
            
            // Add tag to container
            tagsContainer.appendChild(tag);
        });
    }
    
    /**
     * Update entity content
     */
    updateEntityContent(entityId, content) {
        const entity = this.entities.find(n => n.id === entityId);
        if (entity) {
            // Store the raw HTML content to preserve line breaks
            entity.content = content;
            this.saveState();
            
            // Update the DOM element directly to avoid full re-render
            const entityElement = document.getElementById(entityId);
            if (entityElement) {
                const contentElement = entityElement.querySelector('.entity-content');
                // Don't use textContent here as it would lose formatting
                // We'll let the browser's contentEditable handle the formatting
                
                // Only apply hashtag highlighting when there's no risk of losing formatting
                if (!content.includes('\n') && !content.includes('<br') && !content.includes('</div>')) {
                    this.highlightHashtags(contentElement);
                }
            }
        }
    }
    
    /**
     * Highlight hashtags in entity content
     */
    highlightHashtags(contentElement) {
        try {
            // Save current cursor position if there is a selection
            const selection = window.getSelection();
            let cursorOffset = 0;
            let hasSelection = false;
            
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                cursorOffset = range.startOffset;
                hasSelection = true;
            }
            
            // Get the text content - use innerHTML to preserve line breaks
            const text = contentElement.innerHTML || '';
            
            // Check if there are hashtags
            if (!text.includes('#')) return;
            
            // Skip hashtag highlighting if text contains line breaks
            // This is needed to preserve line breaks - let's just not highlight in this case
            if (text.includes('\n') || text.includes('<br') || text.includes('</div>')) {
                // Line breaks are present - don't process with regex to avoid breaking format
                return;
            }
            
            // Create temporary div to build HTML
            const tempDiv = document.createElement('div');
            
            // Replace hashtags with highlighted spans
            const htmlContent = text.replace(/#[a-zA-Z0-9_]+/g, match => {
                return `<span class="hashtag">${match}</span>`;
            });
            
            tempDiv.innerHTML = htmlContent;
            
            // Replace content in the entity
            contentElement.innerHTML = tempDiv.innerHTML;
            
            // Restore cursor position if there was a selection
            if (hasSelection) {
                const newRange = document.createRange();
                
                // Find the right entity and position
                let currentEntity = contentElement.firstChild;
                let currentOffset = 0;
                let targetEntity = contentElement.firstChild;
                let targetOffset = cursorOffset;
                
                // Navigate through the entities to find the position
                while (currentEntity && currentOffset + currentEntity.textContent.length < cursorOffset) {
                    currentOffset += currentEntity.textContent.length;
                    currentEntity = currentEntity.nextSibling;
                }
                
                if (currentEntity) {
                    targetEntity = currentEntity;
                    targetOffset = cursorOffset - currentOffset;
                    
                    // Adjust if inside a span (hashtag)
                    if (targetEntity.nodeType === Node.ELEMENT_NODE && targetEntity.tagName.toLowerCase() === 'span') {
                        targetEntity = targetEntity.firstChild;
                    }
                }
                
                // Set range and selection
                if (targetEntity && targetEntity.nodeType === Node.TEXT_NODE) {
                    newRange.setStart(targetEntity, Math.min(targetOffset, targetEntity.textContent.length));
                    newRange.setEnd(targetEntity, Math.min(targetOffset, targetEntity.textContent.length));
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                }
            }
        } catch (e) {
            console.error('Error in highlightHashtags:', e);
            // Fallback to plain text if there's an error
            if (contentElement) {
                // Don't modify the content when error occurs
                console.log('Hashtag highlighting skipped due to error');
            }
        }
    }
    
    /**
     * Create a connection between two entities
     */
    createConnection(sourceId, targetId) {
        // Skip if trying to connect to the same entity
        if (sourceId === targetId) return;
        
        // Check if connection already exists (either direction)
        const connectionExists = this.connections.some(
            conn => (conn.source === sourceId && conn.target === targetId) || 
                   (conn.source === targetId && conn.target === sourceId)
        );
        
        if (!connectionExists) {
            const connection = {
                id: `conn-${Date.now()}`,
                source: sourceId,
                target: targetId
            };
            
            this.connections.push(connection);
            this.saveState();
            
            // Render just this connection instead of re-rendering everything
            this.renderSingleConnection(connection);
        }
    }
    
    /**
     * Render a single connection without re-rendering the entire diagram
     */
    renderSingleConnection(conn) {
        if (!this.diagramOverlay) return;
        
        // Get SVG container
        const connectionsContainer = this.getConnectionsContainer();
        
        // Create the connection line element
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('id', conn.id);
        line.classList.add('diagram-connection');
        line.style.cursor = 'pointer'; // Add pointer cursor to indicate clickability
        
        // Check if either source or target entity is dashed
        const sourceEntity = this.entities.find(n => n.id === conn.source);
        const targetEntity = this.entities.find(n => n.id === conn.target);
        
        // Apply appropriate connection style
        if ((sourceEntity && sourceEntity.isDashed) || (targetEntity && targetEntity.isDashed)) {
            line.classList.add('dashed-connection');
        } else {
            line.classList.add('solid-connection');
        }
        
        // Add delete button for the connection
        const deleteBtn = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        deleteBtn.textContent = '×'; // Simple X character
        deleteBtn.classList.add('delete-connection-btn');
        deleteBtn.setAttribute('data-connection-id', conn.id);
        
        // Create a wider invisible hit area to make hovering easier
        const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        hitArea.setAttribute('id', `hit-${conn.id}`);
        hitArea.classList.add('connection-hit-area');
        hitArea.style.cursor = 'pointer';
        hitArea.style.stroke = 'transparent';
        hitArea.style.strokeWidth = '10px'; // Much wider than the visible line
        hitArea.style.pointerEvents = 'stroke'; // Only detect events on the stroke
        
        // Add event listeners to the hit area
        hitArea.addEventListener('mouseenter', () => {
            deleteBtn.style.opacity = '0.8';
        });
        
        hitArea.addEventListener('mouseleave', (e) => {
            // Check if the cursor moved from the line to the delete button
            // by checking all elements under the cursor after leaving
            const elementsUnderCursor = document.elementsFromPoint(e.clientX, e.clientY);
            const isOverDeleteBtn = elementsUnderCursor.some(el => 
                el === deleteBtn || el.classList.contains('delete-connection-btn')
            );
            
            if (!isOverDeleteBtn) {
                deleteBtn.style.opacity = '0';
            }
        });
        
        // Events for the delete button
        deleteBtn.addEventListener('mouseenter', () => {
            deleteBtn.style.opacity = '0.8';
        });
        
        deleteBtn.addEventListener('mouseleave', (e) => {
            // Check if cursor is over the hit area or line
            const elementsUnderCursor = document.elementsFromPoint(e.clientX, e.clientY);
            const isOverLine = elementsUnderCursor.some(el => 
                el === line || el === hitArea
            );
            
            if (!isOverLine) {
                deleteBtn.style.opacity = '0';
            }
        });
        
        // Add click events to both the line and hit area
        line.addEventListener('click', () => {
            this.deleteConnection(conn.id);
        });
        
        hitArea.addEventListener('click', () => {
            this.deleteConnection(conn.id);
        });
        
        // Add elements to the SVG in proper order
        connectionsContainer.appendChild(line);
        connectionsContainer.appendChild(hitArea);
        connectionsContainer.appendChild(deleteBtn);
        
        // Draw the connection line and hit area
        this.drawConnectionLine(conn.id, conn.source, conn.target);
        
        // Position delete button
        this.positionConnectionDeleteButton(conn.id);
        
        // Add click event for delete button
        deleteBtn.addEventListener('click', (e) => {
            const connectionId = e.target.getAttribute('data-connection-id');
            this.deleteConnection(connectionId);
        });
        
        // Update connection indicators
        this.updateConnectionIndicators();
    }
    
    /**
     * Position delete button for a connection
     */
    positionConnectionDeleteButton(connectionId) {
        const connectionLine = document.getElementById(connectionId);
        const deleteBtn = document.querySelector(`[data-connection-id="${connectionId}"]`);
        
        if (connectionLine && deleteBtn) {
            const x1 = parseFloat(connectionLine.getAttribute('x1'));
            const y1 = parseFloat(connectionLine.getAttribute('y1'));
            const x2 = parseFloat(connectionLine.getAttribute('x2'));
            const y2 = parseFloat(connectionLine.getAttribute('y2'));
            
            // Position delete button at midpoint
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            
            deleteBtn.setAttribute('x', midX);
            deleteBtn.setAttribute('y', midY);
        }
    }
    
    /**
     * Delete an entity and its connections
     */
    deleteEntity(entityId) {
        this.entities = this.entities.filter(entity => entity.id !== entityId);
        this.connections = this.connections.filter(
            conn => conn.source !== entityId && conn.target !== entityId
        );
        
        this.saveState();
        this.renderDiagram();
    }
    
    /**
     * Update entity position
     */
    updateEntityPosition(entityId, x, y) {
        const entity = this.entities.find(n => n.id === entityId);
        if (entity) {
            entity.position = { x, y };
            this.saveState();
        }
    }
    
    /**
     * Delete a connection
     */
    deleteConnection(connectionId) {
        this.connections = this.connections.filter(conn => conn.id !== connectionId);
        this.saveState();
        this.renderDiagram();
    }
    
    /**
     * Start connection drag from a entity
     */
    startConnectionDrag(entityId, x, y) {
        this.connectionDrag = {
            isActive: true,
            sourceEntity: entityId,
            startX: x,  // We'll calculate edge intersection in updateTemporaryConnectionLine
            startY: y,
            currentX: x,
            currentY: y
        };
        
        // Create temporary connection line
        this.createTemporaryConnectionLine(x, y, x, y);
        this.diagramOverlay.classList.add('connection-dragging');
        
        // Immediately update to calculate proper source point
        this.updateTemporaryConnectionLine();
    }
    
    /**
     * Handle mousemove during connection dragging
     */
    handleConnectionDragMove(e) {
        if (!this.connectionDrag.isActive) return;
        
        e.preventDefault();
        
        const rect = this.diagramOverlay.getBoundingClientRect();
        this.connectionDrag.currentX = e.clientX - rect.left;
        this.connectionDrag.currentY = e.clientY - rect.top;
        
        // Update temporary connection line
        this.updateTemporaryConnectionLine();
    }
    
    /**
     * Handle mouseup to end connection dragging
     */
    handleConnectionDragEnd(e) {
        if (!this.connectionDrag.isActive) return;
        
        // Remove temporary connection line
        const tempLine = document.getElementById('temp-connection');
        if (tempLine) {
            tempLine.remove();
        }
        
        // Check if ended over a entity
        const targetEntityElement = e.target.closest('.diagram-entity');
        if (targetEntityElement) {
            const targetId = targetEntityElement.id;
            // Create connection if not the same entity
            if (targetId !== this.connectionDrag.sourceEntity) {
                this.createConnection(this.connectionDrag.sourceEntity, targetId);
            }
        }
        
        this.connectionDrag.isActive = false;
        this.diagramOverlay.classList.remove('connection-dragging');
    }
    
    /**
     * Create temporary connection line during dragging
     */
    createTemporaryConnectionLine(x1, y1, x2, y2) {
        const svg = this.getConnectionsContainer();
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('id', 'temp-connection');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.classList.add('diagram-connection', 'temp-connection');
        
        // Check if source entity is dashed to set appropriate style
        if (this.connectionDrag.sourceEntity) {
            const sourceEntity = this.entities.find(n => n.id === this.connectionDrag.sourceEntity);
            if (sourceEntity && sourceEntity.isDashed) {
                line.classList.add('dashed-connection');
            } else {
                line.classList.add('solid-connection');
            }
        }
        
        svg.appendChild(line);
    }
    
    /**
     * Calculate intersection point between a line from entity center to a point,
     * and the entity's edge
     */
    calculateEntityIntersection(entityElement, pointX, pointY) {
        const diagramRect = this.diagramOverlay.getBoundingClientRect();
        const entityRect = entityElement.getBoundingClientRect();
        
        // Calculate entity center
        const centerX = entityRect.left + entityRect.width / 2 - diagramRect.left;
        const centerY = entityRect.top + entityRect.height / 2 - diagramRect.top;
        
        // Calculate angle between center and point
        const angle = Math.atan2(pointY - centerY, pointX - centerX);
        
        // Calculate entity half dimensions
        const halfWidth = entityRect.width / 2;
        const halfHeight = entityRect.height / 2;
        
        // Determine intersection point
        let intersectX, intersectY, side;
        
        // Find border point based on angle
        if (Math.abs(Math.cos(angle)) * halfHeight > Math.abs(Math.sin(angle)) * halfWidth) {
            // Intersects with left or right edge
            intersectX = centerX + Math.sign(Math.cos(angle)) * halfWidth;
            intersectY = centerY + Math.tan(angle) * Math.sign(Math.cos(angle)) * halfWidth;
            side = Math.cos(angle) > 0 ? 'right' : 'left';
        } else {
            // Intersects with top or bottom edge
            intersectX = centerX + Math.tan(Math.PI/2 - angle) * Math.sign(Math.sin(angle)) * halfHeight;
            intersectY = centerY + Math.sign(Math.sin(angle)) * halfHeight;
            side = Math.sin(angle) > 0 ? 'bottom' : 'top';
        }
        
        return { x: intersectX, y: intersectY, side, entityRect, diagramRect, centerX, centerY };
    }
    
    /**
     * Update temporary connection line during dragging
     */
    updateTemporaryConnectionLine() {
        const line = document.getElementById('temp-connection');
        if (!line) return;
        
        // Check if there's a source entity to adjust starting point
        const sourceEntity = document.getElementById(this.connectionDrag.sourceEntity);
        if (!sourceEntity) return;
        
        // Get current mouse position
        const x2 = this.connectionDrag.currentX;
        const y2 = this.connectionDrag.currentY;
        
        // Calculate source entity intersection
        const intersection = this.calculateEntityIntersection(sourceEntity, x2, y2);
        
        // Set adjusted line attributes
        line.setAttribute('x1', intersection.x);
        line.setAttribute('y1', intersection.y);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        
        // Reset all indicators on this entity first
        const indicators = sourceEntity.querySelectorAll('.connection-indicator');
        indicators.forEach(indicator => {
            indicator.classList.remove('active');
            indicator.style.opacity = '0';
        });
        
        // Clear all temporary connection points
        const tempPoints = sourceEntity.querySelectorAll('.temp-connection-point');
        tempPoints.forEach(point => point.remove());
        
        // Calculate position for the indicator (relative position along the edge)
        const position = intersection.side === 'right' || intersection.side === 'left'
            ? (intersection.y - (intersection.entityRect.top - intersection.diagramRect.top)) / intersection.entityRect.height
            : (intersection.x - (intersection.entityRect.left - intersection.diagramRect.left)) / intersection.entityRect.width;
        
        // Create a temporary connection point
        const point = document.createElement('div');
        point.className = `temp-connection-point connection-point connection-indicator ${intersection.side}-indicator active`;
        point.setAttribute('data-side', intersection.side);
        point.style.setProperty('--connection-pos', `${position * 100}%`);
        point.style.opacity = '1';
        
        // Add to the entity
        sourceEntity.appendChild(point);
    }
    
    /**
     * Initialize dragging for a entity
     */
    initializeEntityDragging(entityElement) {
        // Clear any existing event listeners (to avoid duplicates)
        const clone = entityElement.cloneNode(true);
        entityElement.parentNode.replaceChild(clone, entityElement);
        entityElement = clone;
        
        // Re-attach important event listeners to child elements
        const deleteBtn = entityElement.querySelector('.delete-entity-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                this.deleteEntity(entityElement.id);
            });
        }
        
        const content = entityElement.querySelector('.entity-content');
        if (content) {
            content.addEventListener('input', (e) => {
                // Use innerHTML to capture formatted content including line breaks
                this.updateEntityContent(entityElement.id, e.target.innerHTML);
                this.updateEntityTags(entityElement.id);
            });
            
            // Add explicit mousedown handler to the content to stop propagation
            content.addEventListener('mousedown', (e) => {
                e.stopPropagation(); // Prevent entity dragging when interacting with content
            });
        }
        
        // Get drag handle and setup drag handling
        const dragHandle = entityElement.querySelector('.note-drag-handle');
        
        // Main entity mousedown handler - allow dragging from borders or handle
        entityElement.addEventListener('mousedown', (e) => {
            // Skip if clicking on content (for editing), delete button, or connection handle
            // Check if the click target is or is contained within the entity-content
            if (e.target.classList.contains('entity-content') || 
                e.target.closest('.entity-content') ||
                e.target.classList.contains('delete-entity-btn') ||
                e.target.closest('.delete-entity-btn') ||  // Also check for child elements of delete button
                e.target.classList.contains('connection-handle')) {
                return;
            }
            
            const entityId = entityElement.id;
            const entity = this.entities.find(n => n.id === entityId);
            
            if (!entity) return;
            
            const rect = this.diagramOverlay.getBoundingClientRect();
            
            this.dragState = {
                isDragging: true,
                currentEntity: entityId,
                initialX: e.clientX - rect.left - entity.position.x,
                initialY: e.clientY - rect.top - entity.position.y,
                xOffset: entity.position.x,
                yOffset: entity.position.y
            };
            
            entityElement.classList.add('dragging');
        });
        
        // Add handle for creating connections
        const handle = document.createElement('div');
        handle.className = 'connection-handle';
        handle.setAttribute('title', 'Drag to connect');
        entityElement.appendChild(handle);
        
        // Start connection drag on handle mousedown
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const entityId = entityElement.id;
            const rect = this.diagramOverlay.getBoundingClientRect();
            const entityRect = entityElement.getBoundingClientRect();
            
            // Calculate starting point at the edge of the entity where the handle is
            // Using the entity's bottom center point for starting point
            const startX = entityRect.left + entityRect.width / 2 - rect.left;
            const startY = entityRect.bottom - rect.top;
            
            this.startConnectionDrag(entityId, startX, startY);
        });
    }
    
    /**
     * Handle mouse move for dragging
     */
    handleMouseMove(e) {
        if (!this.dragState.isDragging) return;
        
        e.preventDefault();
        
        const rect = this.diagramOverlay.getBoundingClientRect();
        const x = e.clientX - rect.left - this.dragState.initialX;
        const y = e.clientY - rect.top - this.dragState.initialY;
        
        // Ensure the entity element still exists
        const entityEl = document.getElementById(this.dragState.currentEntity);
        if (!entityEl) {
            this.dragState.isDragging = false;
            return;
        }
        
        // Constrain horizontally to diagram area, but allow vertical freedom
        const entityWidth = entityEl.offsetWidth;
        
        const constrainedX = Math.max(0, Math.min(x, rect.width - entityWidth));
        // No vertical constraints - allow entities to be placed anywhere in the scrollable area
        const constrainedY = y;
        
        this.dragState.xOffset = constrainedX;
        this.dragState.yOffset = constrainedY;
        
        // Use absolute positioning instead of transform
        entityEl.style.left = `${constrainedX}px`;
        entityEl.style.top = `${constrainedY}px`;
        
        // Update connection lines during drag
        this.updateConnectionsPosition();
    }
    
    /**
     * Handle mouse up to end dragging
     */
    handleMouseUp() {
        if (!this.dragState.isDragging) return;
        
        const entityEl = document.getElementById(this.dragState.currentEntity);
        if (entityEl) {
            entityEl.classList.remove('dragging');
            
            // Save the final position
            this.updateEntityPosition(
                this.dragState.currentEntity,
                this.dragState.xOffset,
                this.dragState.yOffset
            );
        }
        
        this.dragState.isDragging = false;
    }
    
    /**
     * Update connection positions during drag
     */
    updateConnectionsPosition() {
        this.connections.forEach(conn => {
            this.drawConnectionLine(conn.id, conn.source, conn.target);
        });
        
        // Update the connection indicators as well
        this.updateConnectionIndicators();
    }
    
    /**
     * Draw a connection line between two entities
     */
    drawConnectionLine(connId, sourceId, targetId) {
        const sourceEntity = document.getElementById(sourceId);
        const targetEntity = document.getElementById(targetId);
        const connectionLine = document.getElementById(connId);
        const hitArea = document.getElementById(`hit-${connId}`);
        
        if (!sourceEntity || !targetEntity || !connectionLine) return;
        
        // Calculate target center for source entity intersection
        const targetRect = targetEntity.getBoundingClientRect();
        const diagramRect = this.diagramOverlay.getBoundingClientRect();
        const targetCenterX = targetRect.left + targetRect.width / 2 - diagramRect.left;
        const targetCenterY = targetRect.top + targetRect.height / 2 - diagramRect.top;
        
        // Calculate source intersection point
        const sourceIntersection = this.calculateEntityIntersection(
            sourceEntity, targetCenterX, targetCenterY
        );
        
        // Calculate target intersection point (using source center)
        const targetIntersection = this.calculateEntityIntersection(
            targetEntity, sourceIntersection.centerX, sourceIntersection.centerY
        );
        
        // Set line attributes
        connectionLine.setAttribute('x1', sourceIntersection.x);
        connectionLine.setAttribute('y1', sourceIntersection.y);
        connectionLine.setAttribute('x2', targetIntersection.x);
        connectionLine.setAttribute('y2', targetIntersection.y);
        
        // Update hit area if it exists
        if (hitArea) {
            hitArea.setAttribute('x1', sourceIntersection.x);
            hitArea.setAttribute('y1', sourceIntersection.y);
            hitArea.setAttribute('x2', targetIntersection.x);
            hitArea.setAttribute('y2', targetIntersection.y);
        }
    }
    
    /**
     * Render the diagram with all entities and connections
     */
    renderDiagram() {
        // Only render if overlay exists
        if (!this.diagramOverlay) return;
        
        // Save current scroll position to restore it after rendering
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        // Get or create SVG container for connections
        const connectionsContainer = this.getConnectionsContainer();
        
        // Clear existing connections
        connectionsContainer.innerHTML = '';
        
        // Clear existing entities
        const existingEntities = this.diagramOverlay.querySelectorAll('.diagram-entity');
        existingEntities.forEach(entity => {
            if (entity !== connectionsContainer) {
                entity.remove();
            }
        });
        
        // Create a Map of entity IDs to track rendered entities
        const entityElements = new Map();
        
        // Render entities first
        this.entities.forEach(entity => {
            this.renderSingleEntity(entity);
            entityElements.set(entity.id, document.getElementById(entity.id));
        });
        
        // Render connections between entities
        this.connections.forEach(conn => {
            // Verify both entities exist
            if (entityElements.has(conn.source) && entityElements.has(conn.target)) {
                this.renderSingleConnection(conn);
            }
        });
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
    }
    
    /**
     * Add connection indicators to an entity
     * @param {HTMLElement} entityElement - The entity DOM element
     */
    addConnectionIndicators(entityElement) {
        // Create indicators for each side of the entity
        const sides = ['top', 'right', 'bottom', 'left'];
        
        sides.forEach(side => {
            // Create a container for indicators on this side
            const indicatorContainer = document.createElement('div');
            indicatorContainer.className = `connection-indicator-container ${side}-container`;
            indicatorContainer.setAttribute('data-side', side);
            entityElement.appendChild(indicatorContainer);
            
            // Create base indicator
            const indicator = document.createElement('div');
            indicator.className = `connection-indicator ${side}-indicator`;
            indicator.setAttribute('data-side', side);
            entityElement.appendChild(indicator);
        });
    }
    
    /**
     * Determine which side of an entity a connection point is on
     */
    determineConnectionSide(x, y, entityInfo) {
        const { centerX, centerY, entityRect, diagramRect } = entityInfo;
        
        // Determine side by checking distance to each edge
        const distanceToRight = Math.abs(x - (centerX + entityRect.width / 2));
        const distanceToLeft = Math.abs(x - (centerX - entityRect.width / 2));
        const distanceToTop = Math.abs(y - (centerY - entityRect.height / 2));
        const distanceToBottom = Math.abs(y - (centerY + entityRect.height / 2));
        
        const minDistance = Math.min(
            distanceToRight, 
            distanceToLeft,
            distanceToTop,
            distanceToBottom
        );
        
        if (minDistance === distanceToRight) return 'right';
        if (minDistance === distanceToLeft) return 'left';
        if (minDistance === distanceToTop) return 'top';
        return 'bottom';
    }
    
    /**
     * Calculate relative position of a connection point along an entity edge
     */
    calculateConnectionPosition(x, y, side, entityRect, diagramRect) {
        // Calculate position (0-1) along the edge
        return side === 'right' || side === 'left'
            ? (y - (entityRect.top - diagramRect.top)) / entityRect.height
            : (x - (entityRect.left - diagramRect.left)) / entityRect.width;
    }
    
    /**
     * Create a connection point element for an entity
     */
    createConnectionPoint(entityElement, side, position) {
        // Create a connection point
        const point = document.createElement('div');
        point.className = `connection-point connection-indicator ${side}-indicator active`;
        point.setAttribute('data-side', side);
        point.style.setProperty('--connection-pos', `${position * 100}%`);
        point.style.opacity = '1';
        
        // Add to the entity
        entityElement.appendChild(point);
        
        return point;
    }
    
    /**
     * Update connection indicators based on actual connections
     */
    updateConnectionIndicators() {
        // Reset all indicators first
        const indicators = document.querySelectorAll('.connection-indicator');
        indicators.forEach(indicator => {
            indicator.classList.remove('active');
            indicator.style.opacity = '0';
        });
        
        // Clear all dynamic connection points
        const pointContainers = document.querySelectorAll('.connection-point');
        pointContainers.forEach(container => container.remove());
        
        // Track connections by entity side to handle multiple connections per side
        const entitySideConnections = new Map();
        
        // Process each connection to collect connection points
        this.connections.forEach(conn => {
            const sourceEntity = document.getElementById(conn.source);
            const targetEntity = document.getElementById(conn.target);
            const connectionLine = document.getElementById(conn.id);
            
            if (!sourceEntity || !targetEntity || !connectionLine) return;
            
            // Get line coordinates
            const x1 = parseFloat(connectionLine.getAttribute('x1'));
            const y1 = parseFloat(connectionLine.getAttribute('y1'));
            const x2 = parseFloat(connectionLine.getAttribute('x2'));
            const y2 = parseFloat(connectionLine.getAttribute('y2'));
            
            // Get entity rectangles
            const diagramRect = this.diagramOverlay.getBoundingClientRect();
            const sourceRect = sourceEntity.getBoundingClientRect();
            const targetRect = targetEntity.getBoundingClientRect();
            
            // Calculate entity centers
            const sourceCenterX = sourceRect.left + sourceRect.width / 2 - diagramRect.left;
            const sourceCenterY = sourceRect.top + sourceRect.height / 2 - diagramRect.top;
            const targetCenterX = targetRect.left + targetRect.width / 2 - diagramRect.left;
            const targetCenterY = targetRect.top + targetRect.height / 2 - diagramRect.top;
            
            // Calculate connection sides
            const sourceEntityInfo = { centerX: sourceCenterX, centerY: sourceCenterY, entityRect: sourceRect, diagramRect };
            const targetEntityInfo = { centerX: targetCenterX, centerY: targetCenterY, entityRect: targetRect, diagramRect };
            
            const sourceSide = this.determineConnectionSide(x1, y1, sourceEntityInfo);
            const targetSide = this.determineConnectionSide(x2, y2, targetEntityInfo);
            
            // Track connection points for source
            const sourceKey = `${conn.source}-${sourceSide}`;
            if (!entitySideConnections.has(sourceKey)) {
                entitySideConnections.set(sourceKey, []);
            }
            
            const sourcePosition = this.calculateConnectionPosition(x1, y1, sourceSide, sourceRect, diagramRect);
            
            entitySideConnections.get(sourceKey).push({
                entityId: conn.source,
                side: sourceSide,
                position: sourcePosition,
                x: x1,
                y: y1
            });
            
            // Track connection points for target
            const targetKey = `${conn.target}-${targetSide}`;
            if (!entitySideConnections.has(targetKey)) {
                entitySideConnections.set(targetKey, []);
            }
            
            const targetPosition = this.calculateConnectionPosition(x2, y2, targetSide, targetRect, diagramRect);
            
            entitySideConnections.get(targetKey).push({
                entityId: conn.target,
                side: targetSide,
                position: targetPosition,
                x: x2,
                y: y2
            });
        });
        
        // Create connection points for each entity side
        entitySideConnections.forEach((connections, key) => {
            connections.forEach(conn => {
                const entity = document.getElementById(conn.entityId);
                if (!entity) return;
                
                this.createConnectionPoint(entity, conn.side, conn.position);
            });
        });
    }
}

export default DiagramManager; 