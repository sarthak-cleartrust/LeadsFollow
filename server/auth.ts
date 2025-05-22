import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { User } from "@shared/schema";

// Basic session-based auth middleware
export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function isAuthenticated(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.session && req.session.userId) {
    // Load user from storage
    storage.getUser(req.session.userId)
      .then(user => {
        if (user) {
          req.user = user;
          next();
        } else {
          res.status(401).json({ message: "Authentication required" });
        }
      })
      .catch(err => {
        console.error("Auth middleware error:", err);
        res.status(500).json({ message: "Internal server error" });
      });
  } else {
    res.status(401).json({ message: "Authentication required" });
  }
}
