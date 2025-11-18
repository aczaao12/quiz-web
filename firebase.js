// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyALbH3l5s-r9fLuerAObc0fR6kf-5xFNRE",
  authDomain: "minigame-798ee.firebaseapp.com",
  projectId: "minigame-798ee",
  storageBucket: "minigame-798ee.firebasestorage.app",
  messagingSenderId: "731201129435",
  appId: "1:731201129435:web:b24600356743641561b5fe",
  measurementId: "G-V2RES39RM2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);