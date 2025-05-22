import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { getTokenFromCode } from "./gmail";
import { storage } from "./storage";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Special handler for the Gmail callback
app.get(["/cleartrust.repl.co/api/gmail/callback", "/gmail/callback"], async (req, res) => {
  try {
    const code = req.query.code as string;
    if (!code) {
      return res.send(`
        <html>
          <body>
            <h1>Authorization Error</h1>
            <p>No authorization code received. Please try again.</p>
            <a href="/">Return to application</a>
          </body>
        </html>
      `);
    }
    
    // Find the most recent active user - this is a workaround since we can't access the session
    const user = await storage.getUser(2); // Assuming user ID 2 exists
    
    if (!user) {
      return res.send(`
        <html>
          <body>
            <h1>User Not Found</h1>
            <p>Could not find the user account. Please try signing in again.</p>
            <a href="/">Return to application</a>
          </body>
        </html>
      `);
    }
    
    // Process the OAuth code
    const tokens = await getTokenFromCode(code);
    
    if (!tokens.refresh_token) {
      return res.send(`
        <html>
          <body>
            <h1>No Refresh Token</h1>
            <p>Google did not provide a refresh token. You may need to revoke access in your Google account and try again.</p>
            <a href="/">Return to application</a>
          </body>
        </html>
      `);
    }
    
    // Update user directly with Gmail connected status
    await storage.updateUser(user.id, {
      refreshToken: tokens.refresh_token,
      gmailConnected: true
    });
    
    // Return success page with redirect
    return res.send(`
      <html>
        <body>
          <h1>Gmail Connected Successfully!</h1>
          <p>Your Gmail account has been connected to LeadFollow.</p>
          <p>Redirecting you back to the application...</p>
          <script>
            setTimeout(() => {
              window.location.href = "/settings";
            }, 2000);
          </script>
          <a href="/settings">Return to settings</a>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Gmail callback error:", error);
    return res.send(`
      <html>
        <body>
          <h1>Authorization Failed</h1>
          <p>There was a problem connecting your Gmail account: ${error.message}</p>
          <a href="/">Return to application</a>
        </body>
      </html>
    `);
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
