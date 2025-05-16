chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "addMatrixNote",
        title: "Add Matrix Note",
        contexts: ["page"]
    });
    
    chrome.contextMenus.create({
        id: "addDiagramNode",
        title: "Add Diagram Node",
        contexts: ["page"]
    });
    
    chrome.contextMenus.create({
        id: "addDashedNode",
        title: "Add Dashed Node",
        contexts: ["page"]
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        const isNewTab = tab.url === 'chrome://newtab/' || tab.pendingUrl === 'chrome://newtab/';
        chrome.contextMenus.update("addMatrixNote", {
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
    chrome.contextMenus.update("addMatrixNote", {
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
    } else if (info.menuItemId === "addDiagramNode") {
        chrome.tabs.sendMessage(tab.id, { action: "addDiagramNode" });
    } else if (info.menuItemId === "addDashedNode") {
        chrome.tabs.sendMessage(tab.id, { action: "addDashedNode" });
    }
}); 