class DiagramManager {
    constructor() {
        this.nodes = JSON.parse(localStorage.getItem('matrix-diagram-nodes')) || [];
        this.connections = JSON.parse(localStorage.getItem('matrix-diagram-connections')) || [];
        this.diagramOverlay = document.querySelector('.diagram-overlay');
        
        // Calculate the next node ID based on existing nodes
        this.nextNodeId = this.calculateNextNodeId();
        
        // Clean up connections to remove duplicates and invalid references
        this.cleanupConnections();
        
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
     * Calculate the next node ID based on existing nodes
     * @returns {number} The next available node ID
     */
    calculateNextNodeId() {
        if (this.nodes.length === 0) return 1;
        
        // Extract numeric IDs from node IDs (e.g., "node-5" -> 5)
        const nodeIds = this.nodes.map(node => {
            const match = node.id.match(/^node-(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
        });
        
        // Find the highest ID and add 1
        return Math.max(...nodeIds) + 1;
    }
    
    /**
     * Clean up connections to remove duplicates and invalid references
     */
    cleanupConnections() {
        if (!this.connections.length) return;
        
        // Get a list of valid node IDs
        const validNodeIds = this.nodes.map(node => node.id);
        
        // First, filter out connections with invalid node references
        this.connections = this.connections.filter(conn => 
            validNodeIds.includes(conn.source) && 
            validNodeIds.includes(conn.target)
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
        localStorage.setItem('matrix-diagram-nodes', JSON.stringify(this.nodes));
        localStorage.setItem('matrix-diagram-connections', JSON.stringify(this.connections));
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
        
        // Global event listeners for node dragging
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }
    
    /**
     * Create a new node at specified position
     */
    createNode(x, y) {
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
        this.saveState();
        
        // Create just this node in the DOM instead of re-rendering everything
        this.renderSingleNode(node);
        
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
     * Render a single node without re-rendering the entire diagram
     */
    renderSingleNode(node) {
        if (!this.diagramOverlay) return;
        
        // Get SVG container for connections
        this.getConnectionsContainer();
        
        // Create the node element
        const nodeEl = document.createElement('div');
        nodeEl.id = node.id;
        nodeEl.className = 'diagram-node';
        
        // Set explicit position style
        nodeEl.style.position = 'absolute';
        nodeEl.style.left = `${node.position.x}px`;
        nodeEl.style.top = `${node.position.y}px`;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-node-btn';
        deleteBtn.textContent = '×';
        deleteBtn.style.zIndex = '15';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            this.deleteNode(node.id);
        });
        
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
        
        // Add connection indicators
        this.addConnectionIndicators(nodeEl);
        
        this.diagramOverlay.appendChild(nodeEl);
        
        // Initialize dragging
        this.initializeNodeDragging(nodeEl);
    }
    
    /**
     * Create a connection between two nodes
     */
    createConnection(sourceId, targetId) {
        // Skip if trying to connect to the same node
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
        
        // Add delete button for the connection
        const deleteBtn = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        deleteBtn.textContent = '×';
        deleteBtn.classList.add('delete-connection-btn');
        deleteBtn.setAttribute('data-connection-id', conn.id);
        
        connectionsContainer.appendChild(line);
        connectionsContainer.appendChild(deleteBtn);
        
        // Draw the connection line
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
            
            // Update the DOM element directly to avoid full re-render
            const nodeElement = document.getElementById(nodeId);
            if (nodeElement) {
                const contentElement = nodeElement.querySelector('.node-content');
                if (contentElement && contentElement.textContent !== content) {
                    contentElement.textContent = content;
                }
            }
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
        
        // Check if ended over a node
        const targetNodeElement = e.target.closest('.diagram-node');
        if (targetNodeElement) {
            const targetId = targetNodeElement.id;
            // Create connection if not the same node
            if (targetId !== this.connectionDrag.sourceNode) {
                this.createConnection(this.connectionDrag.sourceNode, targetId);
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
        
        svg.appendChild(line);
    }
    
    /**
     * Calculate intersection point between a line from node center to a point,
     * and the node's edge
     */
    calculateNodeIntersection(nodeElement, pointX, pointY) {
        const diagramRect = this.diagramOverlay.getBoundingClientRect();
        const nodeRect = nodeElement.getBoundingClientRect();
        
        // Calculate node center
        const centerX = nodeRect.left + nodeRect.width / 2 - diagramRect.left;
        const centerY = nodeRect.top + nodeRect.height / 2 - diagramRect.top;
        
        // Calculate angle between center and point
        const angle = Math.atan2(pointY - centerY, pointX - centerX);
        
        // Calculate node half dimensions
        const halfWidth = nodeRect.width / 2;
        const halfHeight = nodeRect.height / 2;
        
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
        
        return { x: intersectX, y: intersectY, side, nodeRect, diagramRect, centerX, centerY };
    }
    
    /**
     * Update temporary connection line during dragging
     */
    updateTemporaryConnectionLine() {
        const line = document.getElementById('temp-connection');
        if (!line) return;
        
        // Check if there's a source node to adjust starting point
        const sourceNode = document.getElementById(this.connectionDrag.sourceNode);
        if (!sourceNode) return;
        
        // Get current mouse position
        const x2 = this.connectionDrag.currentX;
        const y2 = this.connectionDrag.currentY;
        
        // Calculate source node intersection
        const intersection = this.calculateNodeIntersection(sourceNode, x2, y2);
        
        // Set adjusted line attributes
        line.setAttribute('x1', intersection.x);
        line.setAttribute('y1', intersection.y);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        
        // Reset all indicators on this node first
        const indicators = sourceNode.querySelectorAll('.connection-indicator');
        indicators.forEach(indicator => {
            indicator.classList.remove('active');
            indicator.style.opacity = '0';
        });
        
        // Clear all temporary connection points
        const tempPoints = sourceNode.querySelectorAll('.temp-connection-point');
        tempPoints.forEach(point => point.remove());
        
        // Calculate position for the indicator (relative position along the edge)
        const position = intersection.side === 'right' || intersection.side === 'left'
            ? (intersection.y - (intersection.nodeRect.top - intersection.diagramRect.top)) / intersection.nodeRect.height
            : (intersection.x - (intersection.nodeRect.left - intersection.diagramRect.left)) / intersection.nodeRect.width;
        
        // Create a temporary connection point
        const point = document.createElement('div');
        point.className = `temp-connection-point connection-point connection-indicator ${intersection.side}-indicator active`;
        point.setAttribute('data-side', intersection.side);
        point.style.setProperty('--connection-pos', `${position * 100}%`);
        point.style.opacity = '1';
        
        // Add to the node
        sourceNode.appendChild(point);
    }
    
    /**
     * Initialize dragging for a node
     */
    initializeNodeDragging(nodeElement) {
        // Clear any existing event listeners (to avoid duplicates)
        const clone = nodeElement.cloneNode(true);
        nodeElement.parentNode.replaceChild(clone, nodeElement);
        nodeElement = clone;
        
        // Re-attach important event listeners to child elements
        const deleteBtn = nodeElement.querySelector('.delete-node-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                this.deleteNode(nodeElement.id);
            });
        }
        
        const content = nodeElement.querySelector('.node-content');
        if (content) {
            content.addEventListener('input', (e) => {
                this.updateNodeContent(nodeElement.id, e.target.textContent);
            });
            
            content.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    content.blur();
                }
            });
        }
        
        nodeElement.addEventListener('mousedown', (e) => {
            // Skip if clicking on content (for editing), delete button, or connection handle
            if (e.target.classList.contains('node-content') || 
                e.target.classList.contains('delete-node-btn') ||
                e.target.closest('.delete-node-btn') ||  // Also check for child elements of delete button
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
            const nodeRect = nodeElement.getBoundingClientRect();
            
            // Calculate starting point at the edge of the node where the handle is
            // Using the node's bottom center point for starting point
            const startX = nodeRect.left + nodeRect.width / 2 - rect.left;
            const startY = nodeRect.bottom - rect.top;
            
            this.startConnectionDrag(nodeId, startX, startY);
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
        
        // Ensure the node element still exists
        const nodeEl = document.getElementById(this.dragState.currentNode);
        if (!nodeEl) {
            this.dragState.isDragging = false;
            return;
        }
        
        // Constrain to diagram area
        const nodeWidth = nodeEl.offsetWidth;
        const nodeHeight = nodeEl.offsetHeight;
        
        const constrainedX = Math.max(0, Math.min(x, rect.width - nodeWidth));
        const constrainedY = Math.max(0, Math.min(y, rect.height - nodeHeight));
        
        this.dragState.xOffset = constrainedX;
        this.dragState.yOffset = constrainedY;
        
        // Use absolute positioning instead of transform
        nodeEl.style.left = `${constrainedX}px`;
        nodeEl.style.top = `${constrainedY}px`;
        
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
        
        // Update the connection indicators as well
        this.updateConnectionIndicators();
    }
    
    /**
     * Draw a connection line between two nodes
     */
    drawConnectionLine(connId, sourceId, targetId) {
        const sourceNode = document.getElementById(sourceId);
        const targetNode = document.getElementById(targetId);
        const connectionLine = document.getElementById(connId);
        
        if (!sourceNode || !targetNode || !connectionLine) return;
        
        // Calculate target center for source node intersection
        const targetRect = targetNode.getBoundingClientRect();
        const diagramRect = this.diagramOverlay.getBoundingClientRect();
        const targetCenterX = targetRect.left + targetRect.width / 2 - diagramRect.left;
        const targetCenterY = targetRect.top + targetRect.height / 2 - diagramRect.top;
        
        // Calculate source intersection point
        const sourceIntersection = this.calculateNodeIntersection(
            sourceNode, targetCenterX, targetCenterY
        );
        
        // Calculate target intersection point (using source center)
        const targetIntersection = this.calculateNodeIntersection(
            targetNode, sourceIntersection.centerX, sourceIntersection.centerY
        );
        
        // Set line attributes
        connectionLine.setAttribute('x1', sourceIntersection.x);
        connectionLine.setAttribute('y1', sourceIntersection.y);
        connectionLine.setAttribute('x2', targetIntersection.x);
        connectionLine.setAttribute('y2', targetIntersection.y);
    }
    
    /**
     * Render the diagram with all nodes and connections
     */
    renderDiagram() {
        // Only render if overlay exists
        if (!this.diagramOverlay) return;
        
        // Get or create SVG container for connections
        const connectionsContainer = this.getConnectionsContainer();
        
        // Clear existing connections
        connectionsContainer.innerHTML = '';
        
        // Clear existing nodes
        const existingNodes = this.diagramOverlay.querySelectorAll('.diagram-node');
        existingNodes.forEach(node => {
            if (node !== connectionsContainer) {
                node.remove();
            }
        });
        
        // Create a Map of node IDs to track rendered nodes
        const nodeElements = new Map();
        
        // Render nodes first
        this.nodes.forEach(node => {
            this.renderSingleNode(node);
            nodeElements.set(node.id, document.getElementById(node.id));
        });
        
        // Render connections between nodes
        this.connections.forEach(conn => {
            // Verify both nodes exist
            if (nodeElements.has(conn.source) && nodeElements.has(conn.target)) {
                this.renderSingleConnection(conn);
            }
        });
    }
    
    /**
     * Add connection indicators to a node
     * @param {HTMLElement} nodeElement - The node DOM element
     */
    addConnectionIndicators(nodeElement) {
        // Create indicators for each side of the node
        const sides = ['top', 'right', 'bottom', 'left'];
        
        sides.forEach(side => {
            // Create a container for indicators on this side
            const indicatorContainer = document.createElement('div');
            indicatorContainer.className = `connection-indicator-container ${side}-container`;
            indicatorContainer.setAttribute('data-side', side);
            nodeElement.appendChild(indicatorContainer);
            
            // Create base indicator
            const indicator = document.createElement('div');
            indicator.className = `connection-indicator ${side}-indicator`;
            indicator.setAttribute('data-side', side);
            nodeElement.appendChild(indicator);
        });
    }
    
    /**
     * Determine which side of a node a connection point is on
     */
    determineConnectionSide(x, y, nodeInfo) {
        const { centerX, centerY, nodeRect, diagramRect } = nodeInfo;
        
        // Determine side by checking distance to each edge
        const distanceToRight = Math.abs(x - (centerX + nodeRect.width / 2));
        const distanceToLeft = Math.abs(x - (centerX - nodeRect.width / 2));
        const distanceToTop = Math.abs(y - (centerY - nodeRect.height / 2));
        const distanceToBottom = Math.abs(y - (centerY + nodeRect.height / 2));
        
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
     * Calculate relative position of a connection point along a node edge
     */
    calculateConnectionPosition(x, y, side, nodeRect, diagramRect) {
        // Calculate position (0-1) along the edge
        return side === 'right' || side === 'left'
            ? (y - (nodeRect.top - diagramRect.top)) / nodeRect.height
            : (x - (nodeRect.left - diagramRect.left)) / nodeRect.width;
    }
    
    /**
     * Create a connection point element for a node
     */
    createConnectionPoint(nodeElement, side, position) {
        // Create a connection point
        const point = document.createElement('div');
        point.className = `connection-point connection-indicator ${side}-indicator active`;
        point.setAttribute('data-side', side);
        point.style.setProperty('--connection-pos', `${position * 100}%`);
        point.style.opacity = '1';
        
        // Add to the node
        nodeElement.appendChild(point);
        
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
        
        // Track connections by node side to handle multiple connections per side
        const nodeSideConnections = new Map();
        
        // Process each connection to collect connection points
        this.connections.forEach(conn => {
            const sourceNode = document.getElementById(conn.source);
            const targetNode = document.getElementById(conn.target);
            const connectionLine = document.getElementById(conn.id);
            
            if (!sourceNode || !targetNode || !connectionLine) return;
            
            // Get line coordinates
            const x1 = parseFloat(connectionLine.getAttribute('x1'));
            const y1 = parseFloat(connectionLine.getAttribute('y1'));
            const x2 = parseFloat(connectionLine.getAttribute('x2'));
            const y2 = parseFloat(connectionLine.getAttribute('y2'));
            
            // Get node rectangles
            const diagramRect = this.diagramOverlay.getBoundingClientRect();
            const sourceRect = sourceNode.getBoundingClientRect();
            const targetRect = targetNode.getBoundingClientRect();
            
            // Calculate node centers
            const sourceCenterX = sourceRect.left + sourceRect.width / 2 - diagramRect.left;
            const sourceCenterY = sourceRect.top + sourceRect.height / 2 - diagramRect.top;
            const targetCenterX = targetRect.left + targetRect.width / 2 - diagramRect.left;
            const targetCenterY = targetRect.top + targetRect.height / 2 - diagramRect.top;
            
            // Calculate connection sides
            const sourceNodeInfo = { centerX: sourceCenterX, centerY: sourceCenterY, nodeRect: sourceRect, diagramRect };
            const targetNodeInfo = { centerX: targetCenterX, centerY: targetCenterY, nodeRect: targetRect, diagramRect };
            
            const sourceSide = this.determineConnectionSide(x1, y1, sourceNodeInfo);
            const targetSide = this.determineConnectionSide(x2, y2, targetNodeInfo);
            
            // Track connection points for source
            const sourceKey = `${conn.source}-${sourceSide}`;
            if (!nodeSideConnections.has(sourceKey)) {
                nodeSideConnections.set(sourceKey, []);
            }
            
            const sourcePosition = this.calculateConnectionPosition(x1, y1, sourceSide, sourceRect, diagramRect);
            
            nodeSideConnections.get(sourceKey).push({
                nodeId: conn.source,
                side: sourceSide,
                position: sourcePosition,
                x: x1,
                y: y1
            });
            
            // Track connection points for target
            const targetKey = `${conn.target}-${targetSide}`;
            if (!nodeSideConnections.has(targetKey)) {
                nodeSideConnections.set(targetKey, []);
            }
            
            const targetPosition = this.calculateConnectionPosition(x2, y2, targetSide, targetRect, diagramRect);
            
            nodeSideConnections.get(targetKey).push({
                nodeId: conn.target,
                side: targetSide,
                position: targetPosition,
                x: x2,
                y: y2
            });
        });
        
        // Create connection points for each node side
        nodeSideConnections.forEach((connections, key) => {
            connections.forEach(conn => {
                const node = document.getElementById(conn.nodeId);
                if (!node) return;
                
                this.createConnectionPoint(node, conn.side, conn.position);
            });
        });
    }
}

export default DiagramManager; 