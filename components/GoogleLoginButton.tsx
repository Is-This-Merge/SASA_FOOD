"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";

function GoogleLogo() {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M21.35 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.51h3.14c1.84-1.69 2.91-4.19 2.91-7.28Z" />
    <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.24l-3.14-2.51c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.02H3.3v2.59A9.75 9.75 0 0 0 12 21.75Z" />
    <path fill="#FBBC05" d="M6.54 13.9A5.87 5.87 0 0 1 6.23 12c0-.66.11-1.29.31-1.9V7.51H3.3A9.75 9.75 0 0 0 3.3 16.5l3.24-2.6Z" />
    <path fill="#EA4335" d="M12 6.08c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.83 3.18 14.62 2.25 12 2.25A9.75 9.75 0 0 0 3.3 7.51l3.24 2.59C7.31 7.8 9.46 6.08 12 6.08Z" />
  </svg>;
}

function ProfileAvatar({ name, photoURL }: { name: string; photoURL: string | null }) {
  if (photoURL) return <img className="profile-avatar" src={photoURL} alt="프로필" referrerPolicy="no-referrer" />;
  return <span className="profile-avatar profile-initial" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>;
}

export default function GoogleLoginButton() {
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  async function signIn() {
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("[GOOGLE LOGIN]", error);
      alert("Google 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;
  if (user) return <button type="button" className="google-login-button signed-in" onClick={() => void signOutUser()} aria-label={`${user.displayName ?? user.email} 로그아웃`} title="로그아웃"><ProfileAvatar name={user.displayName ?? user.email ?? "사용자"} photoURL={user.photoURL} /></button>;
  return <button type="button" className="google-login-button" onClick={() => void signIn()} disabled={submitting} aria-label="Google 로그인" title="Google 로그인"><GoogleLogo /></button>;
}
