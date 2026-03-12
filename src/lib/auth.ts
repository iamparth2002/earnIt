import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-do-not-use-in-prod";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "14d";
const COOKIE_NAME = "earnit_token";

// 14 days in seconds
const COOKIE_MAX_AGE = 14 * 24 * 60 * 60;

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  createdAt: Date;
  balance: number;
  currentStreak: number;
  longestStreak: number;
  totalEarned: number;
  totalSpent: number;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Sign JWT token
export function signToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, JWT_SECRET, options);
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// Set auth cookie
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

// Get auth cookie
export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

// Remove auth cookie
export async function removeAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Get current user from cookie
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getAuthCookie();
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  try {
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        balance: true,
        currentStreak: true,
        longestStreak: true,
        totalEarned: true,
        totalSpent: true,
      },
    });

    return user;
  } catch {
    return null;
  }
}

// Validate request and get user (for API routes)
export async function validateRequest(): Promise<{ user: AuthUser | null; error: string | null }> {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, error: "Unauthorized" };
  }
  return { user, error: null };
}
