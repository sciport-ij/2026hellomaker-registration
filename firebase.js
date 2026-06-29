import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, onSnapshot, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// TODO: Replace this with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let app, db;
let isFirebaseInitialized = false;

try {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        isFirebaseInitialized = true;
        console.log("Firebase initialized successfully.");
    } else {
        console.warn("Firebase config is missing. Falling back to LocalStorage for demonstration.");
    }
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// -------------------------------------------------------------
// Database Abstraction Layer (Firebase with LocalStorage fallback)
// -------------------------------------------------------------

export async function addRegistration(data) {
    if (isFirebaseInitialized) {
        try {
            const docRef = await addDoc(collection(db, "registrations"), data);
            return docRef.id;
        } catch (e) {
            console.error("Error adding document: ", e);
            throw e;
        }
    } else {
        // Fallback
        const regs = JSON.parse(localStorage.getItem('registrations') || '[]');
        data.id = Date.now().toString();
        regs.push(data);
        localStorage.setItem('registrations', JSON.stringify(regs));
        return data.id;
    }
}

export async function getRegistrations() {
    if (isFirebaseInitialized) {
        const querySnapshot = await getDocs(collection(db, "registrations"));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
        return JSON.parse(localStorage.getItem('registrations') || '[]');
    }
}

// For custom fields scheme
export async function saveCustomFields(fields) {
    if (isFirebaseInitialized) {
        await setDoc(doc(db, "settings", "formFields"), { fields });
    } else {
        localStorage.setItem('customFields', JSON.stringify(fields));
    }
}

export async function getCustomFields() {
    if (isFirebaseInitialized) {
        try {
            const querySnapshot = await getDocs(collection(db, "settings"));
            let fields = [];
            querySnapshot.forEach(doc => {
                if (doc.id === 'formFields') fields = doc.data().fields;
            });
            return fields;
        } catch(e) { return []; }
    } else {
        return JSON.parse(localStorage.getItem('customFields') || '[]');
    }
}
