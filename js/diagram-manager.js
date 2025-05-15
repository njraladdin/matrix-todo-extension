class DiagramManager {
    constructor() {
        this.nodes = JSON.parse(localStorage.getItem('matrix-diagram-nodes')) || [];
        this.connections = JSON.parse(localStorage.getItem('matrix-diagram-connections')) || [];
        this.diagramOverlay = document.querySelector('.diagram-overlay');
        this.nextNodeId = 1;
        
        // Keep track of drag state
        this.dragState = {
            isDragging: false,
            currentNode: null,
            initialX: 0,
            initialY: 0,
            xOffset: 0,
            yOffset: 0
        };
        
        // Keep track of connection drag state
        this.connectionDrag = {
            isActive: false,
            sourceNode: null,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0
        };
        
        // Initialize
        this.bindEvents();
    }
    
    /**
     * Save state to localStorage
     */
    saveState() {
        localStorage.setItem('matrix-diagram-nodes', JSON.stringify(this.nodes));
        localStorage.setItem('matrix-diagram-connections', JSON.stringify(this.connections));
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
    }
    
    /**
     * Create a new node at specified position
     */
    createNode(x, y, sourceNodeId = null) {
        // Calculate position relative to the container
        const rect = this.diagramOverlay.getBoundingClientRect();
        const relX = x - rect.left;
        const relY = y - rect.top;
        
        const node = {
            id: `node-${this.nextNodeId++}`,
            content: 'NODE',
            position: {
                x: relX,
                y: relY
            }
        };
        
        this.nodes.push(node);
        
        // If source node is provided, create a connection
        if (sourceNodeId) {
            this.connections.push({
                id: `conn-${Date.now()}`,
                source: sourceNodeId,
                target: node.id
            });
        }
        
        this.saveState();
        this.renderDiagram();
        
        // Focus the text content of the new node for editing
        setTimeout(() => {
            const nodeEl = document.getElementById(node.id);
            if (nodeEl) {
                const contentEl = nodeEl.querySelector('.node-content');
                if (contentEl) {
                    contentEl.focus();
                }
            }
        }, 100);
        
        return node;
    }
    
    /**
     * Create a connection between two nodes
     */
    createConnection(sourceId, targetId) {
        // Check if connection already exists
        const connectionExists = this.connections.some(
            conn => conn.source === sourceId && conn.target === targetId
        );
        
        if (!connectionExists && sourceId !== targetId) {
            this.connections.push({
                id: `conn-${Date.now()}`,
                source: sourceId,
                target: targetId
            });
            
            this.saveState();
            this.renderDiagram();
        }
    }
    
    /**
     * Delete a node and its connections
     */
    deleteNode(nodeId) {
        this.nodes = this.nodes.filter(node => node.id !== nodeId);
        this.connections = this.connections.filter(
            conn => conn.source !== nodeId && conn.target !== nodeId
        );
        
        this.saveState();
        this.renderDiagram();
    }
    
    /**
     * Update node content
     */
    updateNodeContent(nodeId, content) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
            node.content = content;
            this.saveState();
        }
    }
    
    /**
     * Update node position
     */
    updateNodePosition(nodeId, x, y) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
            node.position = { x, y };
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
     * Start connection drag from a node
     */
    startConnectionDrag(nodeId, x, y) {
        this.connectionDrag = {
            isActive: true,
            sourceNode: nodeId,
            startX: x,
            startY: y,
            currentX: x,
            currentY: y
        };
        
        // Create temporary connection line
        this.createTemporaryConnectionLine(x, y, x, y);
        this.diagramOverlay.classList.add('connection-dragging');
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
        this.updateTemporaryConnectionLine(
            this.connectionDrag.startX,
            this.connectionDrag.startY,
            this.connectionDrag.currentX,
            this.connectionDrag.currentY
        );
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
        
        // Check if ended over a node
        const targetNodeElement = e.target.closest('.diagram-node');
        if (targetNodeElement) {
            const targetId = targetNodeElement.id;
            // Create connection if not the same node
            if (targetId !== this.connectionDrag.sourceNode) {
                this.createConnection(this.connectionDrag.sourceNode, targetId);
            }
        } else {
            // Create a new node with connection
            const rect = this.diagramOverlay.getBoundingClientRect();
            const x = e.clientX;
            const y = e.clientY;
            
            this.createNode(x, y, this.connectionDrag.sourceNode);
        }
        
        this.connectionDrag.isActive = false;
        this.diagramOverlay.classList.remove('connection-dragging');
    }
    
    /**
     * Create temporary connection line during dragging
     */
    createTemporaryConnectionLine(x1, y1, x2, y2) {
        let svg = this.diagramOverlay.querySelector('.connections-container');
        if (!svg) {
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.classList.add('connections-container');
            svg.style.position = 'absolute';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.pointerEvents = 'none';
            svg.style.zIndex = '1';
            this.diagramOverlay.appendChild(svg);
        }
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('id', 'temp-connection');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.classList.add('diagram-connection', 'temp-connection');
        
        svg.appendChild(line);
    }
    
    /**
     * Update temporary connection line during dragging
     */
    updateTemporaryConnectionLine(x1, y1, x2, y2) {
        const line = document.getElementById('temp-connection');
        if (line) {
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
        }
    }
    
    /**
     * Initialize dragging for a node
     */
    initializeNodeDragging(nodeElement) {
        nodeElement.addEventListener('mousedown', (e) => {
            // Skip if clicking on content (for editing), delete button, or connection handle
            if (e.target.classList.contains('node-content') || 
                e.target.classList.contains('delete-node-btn') ||
                e.target.classList.contains('connection-handle')) {
                return;
            }
            
            const nodeId = nodeElement.id;
            const node = this.nodes.find(n => n.id === nodeId);
            
            if (!node) return;
            
            const rect = this.diagramOverlay.getBoundingClientRect();
            
            this.dragState = {
                isDragging: true,
                currentNode: nodeId,
                initialX: e.clientX - rect.left - node.position.x,
                initialY: e.clientY - rect.top - node.position.y,
                xOffset: node.position.x,
                yOffset: node.position.y
            };
            
            nodeElement.classList.add('dragging');
        });
        
        // Add handle for creating connections
        const handle = document.createElement('div');
        handle.className = 'connection-handle';
        handle.setAttribute('title', 'Drag to connect');
        nodeElement.appendChild(handle);
        
        // Start connection drag on handle mousedown
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const nodeId = nodeElement.id;
            const rect = this.diagramOverlay.getBoundingClientRect();
            const handleRect = handle.getBoundingClientRect();
            
            // Use handle center as starting point
            const startX = handleRect.left + handleRect.width/2 - rect.left;
            const startY = handleRect.top + handleRect.height/2 - rect.top;
            
            this.startConnectionDrag(nodeId, startX, startY);
        });
        
        // These listeners are attached to document to catch events outside the node
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
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
        
        // Constrain to diagram area
        const nodeEl = document.getElementById(this.dragState.currentNode);
        const nodeWidth = nodeEl.offsetWidth;
        const nodeHeight = nodeEl.offsetHeight;
        
        const constrainedX = Math.max(0, Math.min(x, rect.width - nodeWidth));
        const constrainedY = Math.max(0, Math.min(y, rect.height - nodeHeight));
        
        this.dragState.xOffset = constrainedX;
        this.dragState.yOffset = constrainedY;
        
        nodeEl.style.transform = `translate(${constrainedX}px, ${constrainedY}px)`;
        
        // Update connection lines during drag
        this.updateConnectionsPosition();
    }
    
    /**
     * Handle mouse up to end dragging
     */
    handleMouseUp() {
        if (!this.dragState.isDragging) return;
        
        const nodeEl = document.getElementById(this.dragState.currentNode);
        if (nodeEl) {
            nodeEl.classList.remove('dragging');
            
            // Save the final position
            this.updateNodePosition(
                this.dragState.currentNode,
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
    }
    
    /**
     * Draw a connection line between two nodes
     */
    drawConnectionLine(connId, sourceId, targetId) {
        const sourceNode = document.getElementById(sourceId);
        const targetNode = document.getElementById(targetId);
        const connectionLine = document.getElementById(connId);
        
        if (!sourceNode || !targetNode || !connectionLine) return;
        
        const sourceRect = sourceNode.getBoundingClientRect();
        const targetRect = targetNode.getBoundingClientRect();
        const diagramRect = this.diagramOverlay.getBoundingClientRect();
        
        // Calculate center points
        const sourceX = sourceRect.left + sourceRect.width / 2 - diagramRect.left;
        const sourceY = sourceRect.top + sourceRect.height / 2 - diagramRect.top;
        const targetX = targetRect.left + targetRect.width / 2 - diagramRect.left;
        const targetY = targetRect.top + targetRect.height / 2 - diagramRect.top;
        
        connectionLine.setAttribute('x1', sourceX);
        connectionLine.setAttribute('y1', sourceY);
        connectionLine.setAttribute('x2', targetX);
        connectionLine.setAttribute('y2', targetY);
    }
    
    /**
     * Render the diagram with all nodes and connections
     */
    renderDiagram() {
        // Only render if overlay exists
        if (!this.diagramOverlay) return;
        
        // Create SVG container for connections if it doesn't exist
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
        } else {
            // Clear existing connections
            connectionsContainer.innerHTML = '';
        }
        
        // Clear existing nodes
        const existingNodes = this.diagramOverlay.querySelectorAll('.diagram-node');
        existingNodes.forEach(node => {
            if (node !== connectionsContainer) {
                this.diagramOverlay.removeChild(node);
            }
        });
        
        // Render connections
        this.connections.forEach(conn => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('id', conn.id);
            line.classList.add('diagram-connection');
            
            // Add delete button for the connection
            const deleteBtn = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            deleteBtn.textContent = '×';
            deleteBtn.classList.add('delete-connection-btn');
            deleteBtn.setAttribute('data-connection-id', conn.id);
            
            // Position will be set when nodes are rendered
            connectionsContainer.appendChild(line);
            connectionsContainer.appendChild(deleteBtn);
            
            // Add click event for delete button
            deleteBtn.addEventListener('click', (e) => {
                const connectionId = e.target.getAttribute('data-connection-id');
                this.deleteConnection(connectionId);
            });
        });
        
        // Render nodes
        this.nodes.forEach(node => {
            const nodeEl = document.createElement('div');
            nodeEl.id = node.id;
            nodeEl.className = 'diagram-node';
            nodeEl.style.transform = `translate(${node.position.x}px, ${node.position.y}px)`;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-node-btn';
            deleteBtn.textContent = '×';
            deleteBtn.addEventListener('click', () => this.deleteNode(node.id));
            
            const content = document.createElement('div');
            content.className = 'node-content';
            content.contentEditable = true;
            content.textContent = node.content;
            content.addEventListener('input', (e) => {
                this.updateNodeContent(node.id, e.target.textContent);
            });
            
            // Prevent default behavior for better editing
            content.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    content.blur();
                }
            });
            
            nodeEl.appendChild(deleteBtn);
            nodeEl.appendChild(content);
            
            this.diagramOverlay.appendChild(nodeEl);
            
            // Initialize dragging
            this.initializeNodeDragging(nodeEl);
        });
        
        // Update connection positions
        this.connections.forEach(conn => {
            this.drawConnectionLine(conn.id, conn.source, conn.target);
            
            // Position delete button
            const connectionLine = document.getElementById(conn.id);
            const deleteBtn = document.querySelector(`[data-connection-id="${conn.id}"]`);
            
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
        });
    }
}

export default DiagramManager; 