// Generic storage abstraction for saving/loading/removing data
// Can be extended in the future for metrics, encryption, remote sync, etc.

const SANDBOX_IFRAME_ID = 'firebase-sandbox';
const DEBOUNCE_DELAY = 5000; // 5 seconds
const debounceTimers = {};

function getSandboxWindow() {
    const iframe = document.getElementById(SANDBOX_IFRAME_ID);
    return iframe && iframe.contentWindow;
}

function debouncedSendToSandbox(key, value) {
    if (debounceTimers[key]) {
        clearTimeout(debounceTimers[key]);
    }
    debounceTimers[key] = setTimeout(() => {
        const sandboxWindow = getSandboxWindow();
        if (sandboxWindow) {
            sandboxWindow.postMessage({ type: 'saveData', key, value }, '*');
        }
    }, DEBOUNCE_DELAY);
}

export function saveData(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error('Error saving data to storage:', key, e);
    }
    debouncedSendToSandbox(key, value);
}

export function loadData(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        if (item === null || item === undefined) return defaultValue;
        return JSON.parse(item);
    } catch (e) {
        console.error('Error loading data from storage:', key, e);
        return defaultValue;
    }
}

export function removeData(key) {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        console.error('Error removing data from storage:', key, e);
    }
    // Optionally, you could also notify the sandbox of removals if needed
} 