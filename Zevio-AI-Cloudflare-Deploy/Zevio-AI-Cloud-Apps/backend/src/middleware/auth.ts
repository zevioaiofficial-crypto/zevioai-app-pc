import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { config } from "../config.js";

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const supabase = config.supabase.url && config.supabase.anonKey
  ? createClient(config.supabase.url, config.supabase.anonKey)
  : null;

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ") || !supabase) {
    return next();
  }

  const token = authHeader.replace(/^Bearer\s+/, "");
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role
      };
    }
  } catch (_) {
    // Continue as guest
  }

  next();
}

