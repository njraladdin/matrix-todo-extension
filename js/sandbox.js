const config = {
    apiKey: "AIzaSyDvXLsk1KYGNEB7Hd3mPsPHLT4aNbNVZ-c",
    authDomain: "matrix-todo-landing-page.firebaseapp.com",
    projectId: "matrix-todo-landing-page",
    storageBucket: "matrix-todo-landing-page.firebasestorage.app",
    messagingSenderId: "663810537114",
    appId: "1:663810537114:web:d592f28709dfad0503d123",
    measurementId: "G-WG176B9QR4"
};

console.log("Initializing Firebase with config:", config);
const app = firebase.initializeApp(config);
const db = firebase.firestore();
console.log("Firebase initialized:", app);

// Add this at the top to verify the script is loaded
console.log("Sandbox script starting...");

window.addEventListener("message", async (event) => {
    console.log("👉 Message received in sandbox:", event.data);
    console.log("👉 Message origin:", event.origin);
    
    if (event.data.type === "getGlobalTodos") {
        console.log("🔍 Attempting to fetch global todos");
        try {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

            const snapshot = await db.collection("tasks")
                .where("timestamp", ">=", new Date(startOfDay))
                .where("timestamp", "<", new Date(endOfDay))
                .get();
            
            console.log("📊 Raw snapshot:", snapshot);
            console.log("📊 Snapshot size:", snapshot.size);
            
            const tasks = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                console.log("📄 Document:", doc.id, data);
                tasks.push({
                    id: doc.id,
                    text: data.text || '',
                    completed: data.completed || false,
                    timestamp: data.timestamp ? data.timestamp.toDate().getTime() : Date.now()
                });
            });

            console.log("📤 Tasks before sending:", tasks);
            try {
                window.parent.postMessage({
                    type: "globalTodosLoaded",
                    tasks: tasks
                }, "*");
                console.log("📤 Message sent successfully");
            } catch (sendError) {
                console.error("❌ Error sending message:", sendError);
            }
        } catch (error) {
            console.error("❌ Error in getGlobalTodos:", error);
        }
    }
    else if (event.data.type === "addTask") {
        console.log("Adding task to Firebase:", event.data.task);
        try {
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("tasks").add({
                ...event.data.task,
                timestamp
            });
            console.log("Task added successfully");
        } catch (error) {
            console.error("Error adding task:", error);
        }
    } 

});

// Add this to test postMessage
setTimeout(() => {
    console.log("🧪 Testing postMessage to parent");
    window.parent.postMessage({
        type: "test",
        message: "Hello from sandbox!"
    }, "*");
}, 2000);

// Test if sandbox is loaded and working
console.log("Sandbox script loaded and running");

// Test Firestore connection
db.collection("tasks").limit(1).get()
    .then(() => console.log("Successfully connected to Firestore"))
    .catch(error => console.error("Error connecting to Firestore:", error));

// Add this to verify the message handler is set up
console.log("🎮 Message event listener installed");
// Test the message handler immediately
setTimeout(() => {
    console.log("🧪 Testing message handler directly");
    window.dispatchEvent(new MessageEvent("message", {
        data: { type: "getGlobalTodos" }
    }));
}, 3000);

// Add this right after Firebase initialization to test the connection
db.collection("tasks").limit(3).get().then(snapshot => {
    console.log("TEST QUERY - Number of documents:", snapshot.size);
    snapshot.forEach(doc => {
        console.log("TEST QUERY - Document:", doc.id, doc.data());
    });
}).catch(error => {
    console.error("TEST QUERY - Error:", error);
});

let currentUser = null;

// Helper to save user data to Firestore
async function saveUserDataToFirestore(uid, key, value) {
    try {
        const userDocRef = db.collection('users').doc(uid);
        // Use dot notation for nested fields: data.key
        const updateObj = {};
        updateObj[`data.${key}`] = value;
        await userDocRef.set(updateObj, { merge: true });
        console.log(`✅ Saved data for user ${uid}, key: ${key}`);
    } catch (error) {
        console.error('❌ Error saving user data to Firestore:', error);
    }
}

// Listen for saveData messages from the main app
window.addEventListener('message', async (event) => {
    if (!event.data || !event.data.type) return;
    if (event.data.type === 'saveData') {
        if (currentUser && currentUser.uid) {
            await saveUserDataToFirestore(currentUser.uid, event.data.key, event.data.value);
        } else {
            console.log('User not authenticated, skipping Firestore save for', event.data.key);
        }
    }
});

// --- Firebase Auth Integration ---
if (firebase.auth) {
    const auth = firebase.auth();
    let lastUser = null;

    // Helper to send auth state to parent
    function sendAuthState(user) {
        window.parent.postMessage({
            type: 'authState',
            user: user ? {
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                uid: user.uid
            } : null
        }, '*');
    }

    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
        if (user !== lastUser) {
            lastUser = user;
            currentUser = user;
            sendAuthState(user);
        }
    });

    // Listen for login/logout/getAuthState messages
    window.addEventListener('message', async (event) => {
        if (!event.data || !event.data.type) return;
        if (event.data.type === 'loginWithGoogle') {
            try {
                const provider = new firebase.auth.GoogleAuthProvider();
                const result = await auth.signInWithPopup(provider);
                sendAuthState(result.user);
            } catch (error) {
                window.parent.postMessage({ type: 'authError', error: error.message }, '*');
            }
        } else if (event.data.type === 'logout') {
            try {
                await auth.signOut();
                sendAuthState(null);
            } catch (error) {
                window.parent.postMessage({ type: 'authError', error: error.message }, '*');
            }
        } else if (event.data.type === 'getAuthState') {
            sendAuthState(auth.currentUser);
        }
    });
}
