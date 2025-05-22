import { google } from "googleapis";
import { storage } from "./storage";
import { User, InsertEmail } from "@shared/schema";

// Check for required environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// Use the redirect URI directly from environment variable
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

// Set up OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

// Get Gmail API client
export function getGmailClient(user: User) {
  if (!user.refreshToken) {
    throw new Error("User does not have a Gmail refresh token");
  }

  oauth2Client.setCredentials({
    refresh_token: user.refreshToken
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

// Get authorization URL for connecting Gmail
export function getAuthUrl() {
  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.labels",
    "https://www.googleapis.com/auth/gmail.modify"
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent" // Force to get refresh token
  });
}

// Get token from authorization code
export async function getTokenFromCode(code: string) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    console.error("Error getting tokens from code:", error);
    throw new Error("Invalid authorization code. Please make sure you're using the correct code from Google.");
  }
}

// Extract email content from Gmail API message format
function extractEmailContent(message: any): { subject: string; body: string; date: Date } {
  const headers = message.payload.headers;
  const subject = headers.find((header: any) => header.name === "Subject")?.value || "(No Subject)";
  const date = new Date(headers.find((header: any) => header.name === "Date")?.value || new Date());
  
  let body = "";
  if (message.payload.parts) {
    // Multipart message
    const textPart = message.payload.parts.find((part: any) => part.mimeType === "text/plain");
    if (textPart && textPart.body.data) {
      body = Buffer.from(textPart.body.data, "base64").toString();
    }
  } else if (message.payload.body && message.payload.body.data) {
    // Simple message
    body = Buffer.from(message.payload.body.data, "base64").toString();
  }
  
  return { subject, body, date };
}

// Process emails from Gmail
export async function processEmails(user: User) {
  const gmail = getGmailClient(user);
  
  // Get list of messages
  const res = await gmail.users.messages.list({
    userId: "me",
    maxResults: 20, // Adjust as needed
  });
  
  if (!res.data.messages) {
    return [];
  }

  const processedEmails = [];
  
  // Process each message
  for (const message of res.data.messages) {
    // Check if we've already processed this message
    const existingEmail = await storage.getEmailByGmailId(message.id!);
    if (existingEmail) {
      continue;
    }
    
    // Get full message details
    const messageDetails = await gmail.users.messages.get({
      userId: "me",
      id: message.id!,
    });
    
    // Extract email info
    const { subject, body, date } = extractEmailContent(messageDetails.data);
    const from = messageDetails.data.payload?.headers?.find((h: any) => h.name === "From")?.value || "";
    const to = messageDetails.data.payload?.headers?.find((h: any) => h.name === "To")?.value || "";
    
    // Extract email addresses
    const fromEmail = from.match(/<([^>]+)>/) ? from.match(/<([^>]+)>/)?.[1] : from;
    const toEmail = to.match(/<([^>]+)>/) ? to.match(/<([^>]+)>/)?.[1] : to;
    
    if (!fromEmail || !toEmail) {
      continue;
    }
    
    // Find or create prospect
    let prospect;
    const isInbound = toEmail.includes(user.email);
    const prospectEmail = isInbound ? fromEmail : toEmail;
    
    prospect = await storage.getProspectByEmail(prospectEmail, user.id);
    
    if (!prospect) {
      // Extract name from email
      const fromName = from.split('<')[0].trim();
      
      // Create new prospect
      prospect = await storage.createProspect({
        userId: user.id,
        name: fromName || prospectEmail.split('@')[0],
        email: prospectEmail,
        company: prospectEmail.split('@')[1]?.split('.')[0] || "",
        position: "",
        phone: "",
        status: "active",
        category: "",
        lastContactDate: date
      });
    }
    
    // Store the email
    const newEmail: InsertEmail = {
      prospectId: prospect.id,
      fromEmail,
      toEmail,
      subject,
      content: body,
      date,
      gmailId: message.id!,
      isRead: true
    };
    
    const savedEmail = await storage.createEmail(newEmail);
    processedEmails.push(savedEmail);
  }
  
  return processedEmails;
}
