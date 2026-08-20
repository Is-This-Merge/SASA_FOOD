"use client";

import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { firebaseAuth, googleProvider } from "@/lib/firebase-auth";

const allowedDomain = (process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN ?? "sasa.hs.kr").toLowerCase();

function isAllowedUser(user: User | null) {
  return Boolean(user?.email?.toLowerCase().endsWith(`@${allowedDomain}`));
}

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(firebaseAuth, (nextUser) => {
    if (nextUser && !isAllowedUser(nextUser)) {
      void signOut(firebaseAuth);
      setUser(null);
      setLoading(false);
      return;
    }
    setUser(nextUser);
    setLoading(false);
  }), []);

  const value = useMemo(() => ({
    user,
    loading,
    signInWithGoogle: async () => {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      if (!isAllowedUser(result.user)) {
        await signOut(firebaseAuth);
        throw new Error(`@${allowedDomain} 계정으로만 로그인할 수 있습니다.`);
      }
    },
    signOutUser: async () => { await signOut(firebaseAuth); },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
