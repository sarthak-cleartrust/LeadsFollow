import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { z } from "zod";
import { AuthenticatedRequest, isAuthenticated } from "./auth";
import { getAuthUrl, getTokenFromCode, processEmails } from "./gmail";
import { checkFollowUpNeeds, autoCreateFollowUpTasks, getNotificationSummary } from "./notifications";
import {
  insertUserSchema,
  insertProspectSchema,
  insertFollowUpSchema,
  insertFollowUpSettingsSchema,
  users
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Session storage using MemoryStore
import memorystore from 'memorystore';
const MemoryStore = memorystore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "leadfollow-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === "production", maxAge: 24 * 60 * 60 * 1000 }, // 1 day
      store: new MemoryStore({
        checkPeriod: 86400000 // prune expired entries every 24h
      })
    })
  );

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Invalid username or password" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Auth routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword
      });

      // Create default follow-up settings
      await storage.createFollowUpSettings({
        userId: user.id,
        initialResponseDays: 2,
        standardFollowUpDays: 4,
        notifyEmail: true,
        notifyBrowser: true,
        notifyDailyDigest: true,
        highPriorityDays: 3,
        mediumPriorityDays: 1,
        lowPriorityDays: 3
      });

      // Login the user
      req.session.userId = user.id;
      
      res.status(201).json({ 
        id: user.id, 
        username: user.username, 
        email: user.email,
        fullName: user.fullName,
        gmailConnected: user.gmailConnected
      });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/auth/login", (req: Request, res: Response, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        req.session.userId = user.id;
        return res.json({ 
          id: user.id, 
          username: user.username, 
          email: user.email,
          fullName: user.fullName,
          gmailConnected: user.gmailConnected
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    // Get fresh user data from storage to include lastSyncDate
    const freshUser = await storage.getUser(req.user!.id);
    
    // Disable caching for this endpoint to ensure fresh data
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('ETag', `"${Date.now()}"`);
    
    const responseData = { 
      id: freshUser!.id, 
      username: freshUser!.username, 
      email: freshUser!.email,
      fullName: freshUser!.fullName,
      gmailConnected: freshUser!.gmailConnected,
      lastSyncDate: freshUser!.lastSyncDate,
      _timestamp: Date.now()
    };
    
    res.json(responseData);
  });

  // Test endpoint to debug lastSyncDate
  app.get("/api/test/user-sync", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    const freshUser = await storage.getUser(req.user!.id);
    console.log('[TEST DEBUG] Full user object:', freshUser);
    res.json({
      message: "Debug endpoint",
      userId: req.user!.id,
      lastSyncDate: freshUser?.lastSyncDate,
      fullUser: freshUser
    });
  });

  // Gmail integration routes
  app.get("/api/gmail/auth-url", isAuthenticated, (req: AuthenticatedRequest, res: Response) => {
    const authUrl = getAuthUrl();
    // Store the auth URL in session for verification later
    req.session.gmailAuthRequested = true;
    res.json({ authUrl });
  });
  
  // Handle direct Google OAuth callback - this catches the redirect from Google
  app.get(["/api/gmail/callback", "/gmail/callback", "/auth/gmail-callback"], async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string;
      
      if (!code) {
        return res.redirect('/settings?error=no_code');
      }
      
      // Get the user ID from the session
      if (!req.session || !req.session.passport || !req.session.passport.user) {
        return res.redirect('/auth?error=auth_required');
      }
      
      const userId = req.session.passport.user;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.redirect('/auth?error=user_not_found');
      }
      
      // Process the OAuth code
      const tokens = await getTokenFromCode(code);
      
      if (!tokens.refresh_token) {
        return res.redirect('/settings?error=no_refresh_token');
      }
      
      // Save refresh token and update Gmail connected status
      await storage.updateUser(user.id, {
        refreshToken: tokens.refresh_token,
        gmailConnected: true
      });
      
      // Redirect to settings with success message
      return res.redirect('/settings?gmail=connected');
    } catch (error) {
      console.error("Gmail callback error:", error);
      return res.redirect('/settings?error=authorization_failed');
    }
  });

  app.post("/api/gmail/callback", async (req: Request, res: Response) => {
    try {
      const code = z.string().parse(req.body.code);
      
      // Get the user ID from the session
      if (!req.session || !req.session.passport || !req.session.passport.user) {
        return res.status(401).json({ message: "You must be logged in to connect Gmail" });
      }
      
      const userId = req.session.passport.user;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const tokens = await getTokenFromCode(code);

      if (!tokens.refresh_token) {
        return res.status(400).json({ 
          message: "No refresh token returned. You may need to revoke access in your Google account and try again." 
        });
      }

      // Save refresh token and update Gmail connected status
      await storage.updateUser(user.id, {
        refreshToken: tokens.refresh_token,
        gmailConnected: true
      });

      res.json({ success: true });
    } catch (err: any) {
      console.error("Gmail callback error:", err);
      res.status(400).json({ message: "Failed to process Gmail authorization", error: err.message });
    }
  });

  app.post("/api/gmail/sync", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user!.gmailConnected) {
        return res.status(400).json({ message: "Gmail not connected" });
      }

      const emails = await processEmails(req.user!);
      
      // Update last sync date directly in database
      const syncTime = new Date();
      await storage.updateUser(req.user!.id, {
        lastSyncDate: syncTime
      });
      
      res.json({ 
        success: true, 
        emailsProcessed: emails.length,
        lastSyncDate: syncTime
      });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });
  
  // Disconnect Gmail integration
  app.post("/api/gmail/disconnect", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Direct SQL query to ensure proper disconnection
      await db
        .update(users)
        .set({
          gmailConnected: false,
          refreshToken: null
        })
        .where(eq(users.id, req.user.id));
      
      // Also update the session user data to reflect the change
      if (req.user) {
        req.user.gmailConnected = false;
        req.user.refreshToken = null;
      }
      
      res.json({ 
        success: true,
        message: "Gmail disconnected successfully",
        user: {
          ...req.user,
          gmailConnected: false,
          refreshToken: null
        }
      });
    } catch (error) {
      console.error("Error disconnecting Gmail:", error);
      res.status(500).json({ message: "Failed to disconnect Gmail" });
    }
  });

  // Prospect routes
  app.get("/api/prospects", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const prospects = await storage.getProspectsByUser(req.user!.id);
      res.json(prospects);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/prospects/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const prospect = await storage.getProspect(id);
      
      if (!prospect) {
        return res.status(404).json({ message: "Prospect not found" });
      }
      
      // Ensure user owns this prospect
      if (prospect.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(prospect);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/prospects", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = insertProspectSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      
      const prospect = await storage.createProspect(validatedData);
      res.status(201).json(prospect);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/prospects/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const prospect = await storage.getProspect(id);
      
      if (!prospect) {
        return res.status(404).json({ message: "Prospect not found" });
      }
      
      // Ensure user owns this prospect
      if (prospect.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedProspect = await storage.updateProspect(id, req.body);
      res.json(updatedProspect);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/prospects/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const prospect = await storage.getProspect(id);
      
      if (!prospect) {
        return res.status(404).json({ message: "Prospect not found" });
      }
      
      // Ensure user owns this prospect
      if (prospect.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteProspect(id);
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Emails routes
  app.get("/api/prospects/:id/emails", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const prospectId = parseInt(req.params.id);
      const prospect = await storage.getProspect(prospectId);
      
      if (!prospect) {
        return res.status(404).json({ message: "Prospect not found" });
      }
      
      // Ensure user owns this prospect
      if (prospect.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const emails = await storage.getEmails(prospectId);
      res.json(emails);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Follow-up routes
  app.get("/api/follow-ups", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const followUps = await storage.getPendingFollowUps(req.user!.id);
      res.json(followUps);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/prospects/:id/follow-ups", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const prospectId = parseInt(req.params.id);
      const prospect = await storage.getProspect(prospectId);
      
      if (!prospect) {
        return res.status(404).json({ message: "Prospect not found" });
      }
      
      // Ensure user owns this prospect
      if (prospect.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const followUps = await storage.getFollowUpsByProspect(prospectId);
      res.json(followUps);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/follow-ups", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = insertFollowUpSchema.parse(req.body);
      
      // Verify prospect belongs to user
      const prospect = await storage.getProspect(validatedData.prospectId);
      if (!prospect || prospect.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const followUp = await storage.createFollowUp(validatedData);
      res.status(201).json(followUp);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/follow-ups/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const followUp = await storage.getFollowUp(id);
      
      if (!followUp) {
        return res.status(404).json({ message: "Follow-up not found" });
      }
      
      // Verify prospect belongs to user
      const prospect = await storage.getProspect(followUp.prospectId);
      if (!prospect || prospect.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedFollowUp = await storage.updateFollowUp(id, req.body);
      res.json(updatedFollowUp);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/follow-ups/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const followUp = await storage.getFollowUp(id);
      
      if (!followUp) {
        return res.status(404).json({ message: "Follow-up not found" });
      }
      
      // Verify prospect belongs to user
      const prospect = await storage.getProspect(followUp.prospectId);
      if (!prospect || prospect.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteFollowUp(id);
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Notification and alert routes
  app.get("/api/notifications/alerts", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const alerts = await checkFollowUpNeeds(req.user!.id);
      res.json(alerts);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/notifications/summary", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const summary = await getNotificationSummary(req.user!.id);
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/notifications/auto-create-tasks", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tasksCreated = await autoCreateFollowUpTasks(req.user!.id);
      res.json({ tasksCreated, message: `${tasksCreated} follow-up tasks created automatically` });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Follow-up settings routes
  app.get("/api/follow-up-settings", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      let settings = await storage.getFollowUpSettings(req.user!.id);
      
      if (!settings) {
        // Create default settings if none exist
        settings = await storage.createFollowUpSettings({
          userId: req.user!.id,
          initialResponseDays: 2,
          standardFollowUpDays: 4,
          notifyEmail: true,
          notifyBrowser: true,
          notifyDailyDigest: true,
          highPriorityDays: 3,
          mediumPriorityDays: 1,
          lowPriorityDays: 3
        });
      }
      
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/follow-up-settings", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      let settings = await storage.getFollowUpSettings(req.user!.id);
      
      if (!settings) {
        // Create settings if they don't exist
        const validatedData = insertFollowUpSettingsSchema.parse({
          ...req.body,
          userId: req.user!.id
        });
        
        settings = await storage.createFollowUpSettings(validatedData);
      } else {
        // Update existing settings
        settings = await storage.updateFollowUpSettings(req.user!.id, req.body);
      }
      
      res.json(settings);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
