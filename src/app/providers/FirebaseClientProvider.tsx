"use client";
import { clientFirebaseAppJson } from "@root/shared/safe-consts";
import { initializeApp } from "firebase/app";
import { createContext, useState } from "react";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

export const firebaseClientContext = createContext<{
  firebaseApp: any;
} | null>(null);

export function FirebaseClientProvider(props: { children: React.ReactNode }) {
  // console.log(process.env.NEXT_PUBLIC_FIREBASE_CLIENT_JSON);
  const firebaseApp = useState(initializeApp(clientFirebaseAppJson));

  return (
    <firebaseClientContext.Provider value={{ firebaseApp }}>
      {props.children}
    </firebaseClientContext.Provider>
  );
}
