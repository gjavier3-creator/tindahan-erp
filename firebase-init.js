  import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
  import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, setDoc }
    from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

  const firebaseConfig = {
    apiKey: "AIzaSyCUOCbyhmN-zB0NX3zEIC0joBzNTXy4IL4",
    authDomain: "ministore-database.firebaseapp.com",
    projectId: "ministore-database",
    storageBucket: "ministore-database.firebasestorage.app",
    messagingSenderId: "985249938829",
    appId: "1:985249938829:web:2a188e7fd6ad5da47911c4",
  };

  const app = initializeApp(firebaseConfig);
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  const COLLECTION = 'tindahan-store';

  // Same shape as the rest of the app already expects: get/set a JSON string by key.
  window.fsGet = async function(key){
    const snap = await getDoc(doc(db, COLLECTION, key));
    if(!snap.exists()) return undefined;
    return snap.data().json;
  };
  window.fsSet = async function(key, jsonString){
    await setDoc(doc(db, COLLECTION, key), { json: jsonString, updatedAt: Date.now() });
  };
