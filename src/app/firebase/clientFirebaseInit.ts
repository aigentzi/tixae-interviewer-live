import { initializeApp } from "firebase/app";
import { clientFirebaseAppJson } from "@root/shared/safe-consts";

export const app = initializeApp(clientFirebaseAppJson);
