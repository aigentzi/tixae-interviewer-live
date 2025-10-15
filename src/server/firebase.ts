import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK once
const getServerApp = () => {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  // Initialize with service account if available
  return admin.initializeApp({
    // If GOOGLE_APPLICATION_CREDENTIALS_JSON is set, use it to initialize the admin SDK
    ...(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON && {
      credential: admin.credential.cert(
        JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
      ),
    }),
    // Or use the application default credentials
    ...(process.env.FIREBASE_PROJECT_ID && {
      projectId: process.env.FIREBASE_PROJECT_ID,
    }),
  });
};

// Export the server app instance
export const serverApp = getServerApp();

// Initialize Firestore
export const db = getFirestore(serverApp);
