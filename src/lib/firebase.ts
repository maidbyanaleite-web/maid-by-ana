// This file exports the Firebase services initialized in index.html
// We use the 'compat' version as requested to match the previous project pattern

declare global {
  interface Window {
    firebase: any;
  }
}

const firebase = window.firebase;

if (!firebase) {
  console.error("Firebase not found on window object. Make sure it's configured in index.html");
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();

export default firebase;
