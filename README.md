# Matrix Todo Tab

![Demo](media/matrix.gif)

Chrome extension that replaces new tab page with a Matrix-themed todo list.

## Features

- Local storage persistence
- Priority tasks with `!urgent` tag
- Progress tracking with visual bar
- Bulk clear completed tasks (Ctrl + Shift + C)
- Community REALTIME tasks sharing: Toggle to view other users' tasks floating in the background, creating a sense of shared digital space and collective productivity
- Interactive diagram with node connections for visualizing relationships

## Installation

Choose one of these options:

### Option 1: Chrome Web Store (Recommended)
Visit [getmatrixtodo.web.app](https://getmatrixtodo.web.app) to install directly from the Chrome Web Store.

### Option 2: Manual Installation (For Developers)
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/matrix-todo-tab.git
   ```
2. Open Chrome Extensions menu (`chrome://extensions/`)
3. Enable Developer mode
4. Click "Load unpacked" and select the cloned extension directory

## Usage

- Type task and press Enter to add
- Add `!urgent` for priority tasks
- Click task to complete
- Hover to show delete button
- Toggle "Fellow Hackers' Tasks" to share and view community tasks

## Diagram Functionality

The interactive diagram feature allows you to create visual node relationships:

1. **Creating Nodes:**
   - Right-click anywhere on the background and select "ADD DIAGRAM NODE" from the context menu
   - Edit node content by clicking on the text

2. **Connecting Nodes:**
   - Use the connection handle on any node and drag to another existing node
   - Connections can only be made between existing nodes
   - Duplicate connections in either direction are prevented

3. **Managing Elements:**
   - Drag nodes to reposition them
   - Delete nodes and connections using the × buttons

### Recent Improvements

- Fixed node positioning to maintain consistent positions after page reload
- Prevented duplicate connections between the same nodes
- Improved dragging behavior to ensure the correct node moves
- Added cleanup of invalid connections during initialization
- Optimized event handling to prevent duplicate event listeners
- Fixed issue with node content being reset when creating new nodes
- Improved rendering performance with incremental updates instead of full re-renders

## Credits

Based on [@joshuawolk](https://x.com/joshuawolk/status/1850408475643502847)'s design