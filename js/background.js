chrome.runtime.onInstalled.addListener(() => {
    // Create parent menus for each category
    chrome.contextMenus.create({
        id: "notesCategory",
        title: "Notes",
        contexts: ["page"]
    });
    
    chrome.contextMenus.create({
        id: "documentsCategory",
        title: "Documents",
        contexts: ["page"]
    });
    
    chrome.contextMenus.create({
        id: "diagramsCategory",
        title: "Diagrams",
        contexts: ["page"]
    });
    
    // Add items under each category
    chrome.contextMenus.create({
        id: "addMatrixNote",
        parentId: "notesCategory",
        title: "Add Matrix Note",
        contexts: ["page"]
    });
    
    chrome.contextMenus.create({
        id: "addMatrixDocument",
        parentId: "documentsCategory", 
        title: "Add Matrix Document",
        contexts: ["page"]
    });
    
    chrome.contextMenus.create({
        id: "addDiagramNode",
        parentId: "diagramsCategory",
        title: "Add Diagram Node",
        contexts: ["page"]
    });
    
    chrome.contextMenus.create({
        id: "addDashedNode",
        parentId: "diagramsCategory",
        title: "Add Dashed Node",
        contexts: ["page"]
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        const isNewTab = tab.url === 'chrome://newtab/' || tab.pendingUrl === 'chrome://newtab/';
        
        // Update visibility for all categories and their items
        chrome.contextMenus.update("notesCategory", {
            visible: isNewTab
        });
        
        chrome.contextMenus.update("documentsCategory", {
            visible: isNewTab
        });
        
        chrome.contextMenus.update("diagramsCategory", {
            visible: isNewTab
        });
        
        chrome.contextMenus.update("addMatrixNote", {
            visible: isNewTab
        });
        
        chrome.contextMenus.update("addMatrixDocument", {
            visible: isNewTab
        });
        
        chrome.contextMenus.update("addDiagramNode", {
            visible: isNewTab
        });
        
        chrome.contextMenus.update("addDashedNode", {
            visible: isNewTab
        });
    }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    const isNewTab = tab.url === 'chrome://newtab/' || tab.pendingUrl === 'chrome://newtab/';
    
    // Update visibility for all categories and their items
    chrome.contextMenus.update("notesCategory", {
        visible: isNewTab
    });
    
    chrome.contextMenus.update("documentsCategory", {
        visible: isNewTab
    });
    
    chrome.contextMenus.update("diagramsCategory", {
        visible: isNewTab
    });
    
    chrome.contextMenus.update("addMatrixNote", {
        visible: isNewTab
    });
    
    chrome.contextMenus.update("addMatrixDocument", {
        visible: isNewTab
    });
    
    chrome.contextMenus.update("addDiagramNode", {
        visible: isNewTab
    });
    
    chrome.contextMenus.update("addDashedNode", {
        visible: isNewTab
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "addMatrixNote") {
        chrome.tabs.sendMessage(tab.id, { action: "addNote" });
    } else if (info.menuItemId === "addMatrixDocument") {
        chrome.tabs.sendMessage(tab.id, { action: "addDocument" });
    } else if (info.menuItemId === "addDiagramNode") {
        chrome.tabs.sendMessage(tab.id, { action: "addDiagramNode" });
    } else if (info.menuItemId === "addDashedNode") {
        chrome.tabs.sendMessage(tab.id, { action: "addDashedNode" });
    }
}); 