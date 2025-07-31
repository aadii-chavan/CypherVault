// Script to create a test user for your Firebase project
// Run this with: node create-test-user.js

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Get test user credentials from environment variables or use defaults
const email = process.env.TEST_USER_EMAIL || "testuser@example.com";
const password = process.env.TEST_USER_PASSWORD || "Test1234!";

// Create the user
createUserWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {
    // User created successfully
    const user = userCredential.user;
    console.log("Test user created successfully:", user.uid);
    console.log("Email:", email);
    console.log("Password:", password);
  })
  .catch((error) => {
    // Handle errors
    const errorCode = error.code;
    const errorMessage = error.message;
    console.error("Error creating test user:", errorCode, errorMessage);
  }); 