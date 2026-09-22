// Firebase project untuk WEBSITE SANTOSOFT & PARDI (afiliator & tracking referral).
// Ini project Firebase TERPISAH dari project Pardi Finance — keduanya produk
// berbeda, jadi datanya sengaja tidak dicampur.
const firebaseConfig = {
  apiKey: "AIzaSyA9AFH3mVS75Gg7JFSfLqcYSZXL4Kr8RpU",
  authDomain: "pardi-website.firebaseapp.com",
  projectId: "pardi-website",
  storageBucket: "pardi-website.firebasestorage.app",
  messagingSenderId: "511902184335",
  appId: "1:511902184335:web:3ad7b2f1a372d5941ad1fa",
}

firebase.initializeApp(firebaseConfig);
const affAuth = firebase.auth();
const affDb = firebase.firestore();