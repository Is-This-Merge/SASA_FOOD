import { NextRequest } from "next/server";
import { adminAuth } from "./firebase-admin";

export type ReviewUser = {
  uid: string;
  email: string;
  name: string;
  isAdmin: boolean;
};

function adminEmails() {
  return new Set((process.env.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}

function isAllowedEmail(email: string) {
  const domain = (process.env.ALLOWED_EMAIL_DOMAIN ?? "sasa.hs.kr").trim().toLowerCase();
  return email.endsWith(`@${domain}`);
}

export async function getReviewUser(request: NextRequest): Promise<ReviewUser | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = decoded.email?.toLowerCase();
    if (!email) return null;
    if (!isAllowedEmail(email)) return null;
    return {
      uid: decoded.uid,
      email,
      name: typeof decoded.name === "string" && decoded.name.trim() ? decoded.name.trim().slice(0, 30) : email.split("@")[0],
      isAdmin: adminEmails().has(email),
    };
  } catch {
    return null;
  }
}
