import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { firebaseApp } from "./firebase";

export const firebaseAuth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
