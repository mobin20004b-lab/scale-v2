import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export type SessionPayload = {
  sub: string;
  role: string;
  username: string;
  locale: "fa";
  rtl: true;
};

export function signSession(payload: SessionPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}

export function verifyToken(authHeader?: string) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
