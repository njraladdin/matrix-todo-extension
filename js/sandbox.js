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
    else if (event.data.type === "getTasks") {
        console.log("Fetching all tasks...");
        try {
            const snapshot = await db.collection("tasks")
                .orderBy("timestamp", "desc")
                .get();

            console.log("Snapshot size:", snapshot.size);
            const tasks = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                console.log("Document data:", data);
                tasks.push({ 
                    id: doc.id, 
                    ...data,
                    timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
                });
            });

            console.log("Tasks array before sending:", tasks);
            window.parent.postMessage({ 
                type: "tasksLoaded", 
                tasks 
            }, "*");
        } catch (error) {
            console.error("Error fetching tasks:", error);
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