import {
  users,
  User,
  InsertUser,
  prospects,
  Prospect,
  InsertProspect,
  emails,
  Email,
  InsertEmail,
  followUps,
  FollowUp,
  InsertFollowUp,
  followUpSettings,
  FollowUpSetting,
  InsertFollowUpSetting,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

// Storage interface for all operations
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;

  // Prospect methods
  getProspect(id: number): Promise<Prospect | undefined>;
  getProspectByEmail(email: string, userId: number): Promise<Prospect | undefined>;
  getProspectsByUser(userId: number): Promise<Prospect[]>;
  getProspectsRequiringFollowUp(userId: number): Promise<Prospect[]>;
  createProspect(prospect: InsertProspect): Promise<Prospect>;
  updateProspect(id: number, data: Partial<Prospect>): Promise<Prospect | undefined>;
  deleteProspect(id: number): Promise<boolean>;

  // Email methods
  getEmails(prospectId: number): Promise<Email[]>;
  getEmailByGmailId(gmailId: string): Promise<Email | undefined>;
  createEmail(email: InsertEmail): Promise<Email>;

  // FollowUp methods
  getFollowUp(id: number): Promise<FollowUp | undefined>;
  getFollowUpsByProspect(prospectId: number): Promise<FollowUp[]>;
  getPendingFollowUps(userId: number): Promise<(FollowUp & { prospect: Prospect })[]>;
  createFollowUp(followUp: InsertFollowUp): Promise<FollowUp>;
  updateFollowUp(id: number, data: Partial<FollowUp>): Promise<FollowUp | undefined>;
  deleteFollowUp(id: number): Promise<boolean>;

  // FollowUpSettings methods
  getFollowUpSettings(userId: number): Promise<FollowUpSetting | undefined>;
  createFollowUpSettings(settings: InsertFollowUpSetting): Promise<FollowUpSetting>;
  updateFollowUpSettings(userId: number, data: Partial<FollowUpSetting>): Promise<FollowUpSetting | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private prospects: Map<number, Prospect>;
  private emails: Map<number, Email>;
  private followUps: Map<number, FollowUp>;
  private followUpSettings: Map<number, FollowUpSetting>;
  private userCurrentId: number;
  private prospectCurrentId: number;
  private emailCurrentId: number;
  private followUpCurrentId: number;

  constructor() {
    this.users = new Map();
    this.prospects = new Map();
    this.emails = new Map();
    this.followUps = new Map();
    this.followUpSettings = new Map();
    this.userCurrentId = 1;
    this.prospectCurrentId = 1;
    this.emailCurrentId = 1;
    this.followUpCurrentId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id, gmailConnected: false, refreshToken: null, lastSyncDate: null };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Prospect methods
  async getProspect(id: number): Promise<Prospect | undefined> {
    return this.prospects.get(id);
  }

  async getProspectByEmail(email: string, userId: number): Promise<Prospect | undefined> {
    return Array.from(this.prospects.values()).find(
      (prospect) => prospect.email === email && prospect.userId === userId,
    );
  }

  async getProspectsByUser(userId: number): Promise<Prospect[]> {
    return Array.from(this.prospects.values()).filter(
      (prospect) => prospect.userId === userId,
    );
  }

  async getProspectsRequiringFollowUp(userId: number): Promise<Prospect[]> {
    const userProspects = await this.getProspectsByUser(userId);
    const settings = await this.getFollowUpSettings(userId) || {
      userId,
      initialResponseDays: 2,
      standardFollowUpDays: 4,
      notifyEmail: true,
      notifyBrowser: true,
      notifyDailyDigest: true,
      highPriorityDays: 3,
      mediumPriorityDays: 1,
      lowPriorityDays: 3,
    };

    const now = new Date();
    return userProspects.filter(prospect => {
      if (!prospect.lastContactDate) return false;
      
      const lastContact = new Date(prospect.lastContactDate);
      const daysSinceLastContact = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
      
      return daysSinceLastContact >= settings.standardFollowUpDays;
    });
  }

  async createProspect(insertProspect: InsertProspect): Promise<Prospect> {
    const id = this.prospectCurrentId++;
    const prospect: Prospect = { ...insertProspect, id };
    this.prospects.set(id, prospect);
    return prospect;
  }

  async updateProspect(id: number, data: Partial<Prospect>): Promise<Prospect | undefined> {
    const prospect = await this.getProspect(id);
    if (!prospect) return undefined;
    
    const updatedProspect = { ...prospect, ...data };
    this.prospects.set(id, updatedProspect);
    return updatedProspect;
  }

  async deleteProspect(id: number): Promise<boolean> {
    return this.prospects.delete(id);
  }

  // Email methods
  async getEmails(prospectId: number): Promise<Email[]> {
    return Array.from(this.emails.values())
      .filter(email => email.prospectId === prospectId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getEmailByGmailId(gmailId: string): Promise<Email | undefined> {
    return Array.from(this.emails.values()).find(
      (email) => email.gmailId === gmailId,
    );
  }

  async createEmail(insertEmail: InsertEmail): Promise<Email> {
    const id = this.emailCurrentId++;
    const email: Email = { ...insertEmail, id };
    this.emails.set(id, email);
    
    // Update prospect's lastContactDate
    const prospect = await this.getProspect(insertEmail.prospectId);
    if (prospect) {
      await this.updateProspect(prospect.id, { lastContactDate: insertEmail.date });
    }
    
    return email;
  }

  // FollowUp methods
  async getFollowUp(id: number): Promise<FollowUp | undefined> {
    return this.followUps.get(id);
  }

  async getFollowUpsByProspect(prospectId: number): Promise<FollowUp[]> {
    return Array.from(this.followUps.values())
      .filter(followUp => followUp.prospectId === prospectId)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  async getPendingFollowUps(userId: number): Promise<(FollowUp & { prospect: Prospect })[]> {
    const userProspects = await this.getProspectsByUser(userId);
    const prospectIds = userProspects.map(prospect => prospect.id);
    
    return Array.from(this.followUps.values())
      .filter(followUp => 
        prospectIds.includes(followUp.prospectId) && 
        !followUp.completed
      )
      .map(followUp => {
        const prospect = userProspects.find(p => p.id === followUp.prospectId)!;
        return { ...followUp, prospect };
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  async createFollowUp(insertFollowUp: InsertFollowUp): Promise<FollowUp> {
    const id = this.followUpCurrentId++;
    const followUp: FollowUp = { ...insertFollowUp, id };
    this.followUps.set(id, followUp);
    return followUp;
  }

  async updateFollowUp(id: number, data: Partial<FollowUp>): Promise<FollowUp | undefined> {
    const followUp = await this.getFollowUp(id);
    if (!followUp) return undefined;
    
    const updatedFollowUp = { ...followUp, ...data };
    this.followUps.set(id, updatedFollowUp);
    return updatedFollowUp;
  }

  async deleteFollowUp(id: number): Promise<boolean> {
    return this.followUps.delete(id);
  }

  // FollowUpSettings methods
  async getFollowUpSettings(userId: number): Promise<FollowUpSetting | undefined> {
    return this.followUpSettings.get(userId);
  }

  async createFollowUpSettings(settings: InsertFollowUpSetting): Promise<FollowUpSetting> {
    this.followUpSettings.set(settings.userId, settings as FollowUpSetting);
    return settings as FollowUpSetting;
  }

  async updateFollowUpSettings(userId: number, data: Partial<FollowUpSetting>): Promise<FollowUpSetting | undefined> {
    const settings = await this.getFollowUpSettings(userId);
    if (!settings) return undefined;
    
    const updatedSettings = { ...settings, ...data };
    this.followUpSettings.set(userId, updatedSettings);
    return updatedSettings;
  }
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Prospect methods
  async getProspect(id: number): Promise<Prospect | undefined> {
    const [prospect] = await db.select().from(prospects).where(eq(prospects.id, id));
    return prospect;
  }

  async getProspectByEmail(email: string, userId: number): Promise<Prospect | undefined> {
    const [prospect] = await db
      .select()
      .from(prospects)
      .where(and(eq(prospects.email, email), eq(prospects.userId, userId)));
    return prospect;
  }

  async getProspectsByUser(userId: number): Promise<Prospect[]> {
    return db.select().from(prospects).where(eq(prospects.userId, userId)).orderBy(desc(prospects.id));
  }

  async getProspectsRequiringFollowUp(userId: number): Promise<Prospect[]> {
    const settings = await this.getFollowUpSettings(userId) || {
      userId,
      initialResponseDays: 2,
      standardFollowUpDays: 4,
      notifyEmail: true,
      notifyBrowser: true,
      notifyDailyDigest: true,
      highPriorityDays: 3,
      mediumPriorityDays: 1,
      lowPriorityDays: 3,
    };

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - settings.standardFollowUpDays);

    return db
      .select()
      .from(prospects)
      .where(
        and(
          eq(prospects.userId, userId),
          sql`${prospects.lastContactDate} <= ${daysAgo.toISOString()}::timestamp`
        )
      );
  }

  async createProspect(insertProspect: InsertProspect): Promise<Prospect> {
    const [prospect] = await db.insert(prospects).values(insertProspect).returning();
    return prospect;
  }

  async updateProspect(id: number, data: Partial<Prospect>): Promise<Prospect | undefined> {
    const [updatedProspect] = await db
      .update(prospects)
      .set(data)
      .where(eq(prospects.id, id))
      .returning();
    return updatedProspect;
  }

  async deleteProspect(id: number): Promise<boolean> {
    const result = await db.delete(prospects).where(eq(prospects.id, id));
    return !!result.rowCount && result.rowCount > 0;
  }

  // Email methods
  async getEmails(prospectId: number): Promise<Email[]> {
    return db
      .select()
      .from(emails)
      .where(eq(emails.prospectId, prospectId))
      .orderBy(desc(emails.date));
  }

  async getEmailByGmailId(gmailId: string): Promise<Email | undefined> {
    const [email] = await db.select().from(emails).where(eq(emails.gmailId, gmailId));
    return email;
  }

  async createEmail(insertEmail: InsertEmail): Promise<Email> {
    const [email] = await db.insert(emails).values(insertEmail).returning();
    
    // Update prospect's lastContactDate
    await db
      .update(prospects)
      .set({ lastContactDate: insertEmail.date })
      .where(eq(prospects.id, insertEmail.prospectId));
    
    return email;
  }

  // FollowUp methods
  async getFollowUp(id: number): Promise<FollowUp | undefined> {
    const [followUp] = await db.select().from(followUps).where(eq(followUps.id, id));
    return followUp;
  }

  async getFollowUpsByProspect(prospectId: number): Promise<FollowUp[]> {
    return db
      .select()
      .from(followUps)
      .where(eq(followUps.prospectId, prospectId))
      .orderBy(followUps.dueDate);
  }

  async getPendingFollowUps(userId: number): Promise<(FollowUp & { prospect: Prospect })[]> {
    const userProspects = await this.getProspectsByUser(userId);
    if (userProspects.length === 0) return [];

    const prospectIds = userProspects.map(p => p.id);
    const followUpsList = await db
      .select()
      .from(followUps)
      .where(
        and(
          inArray(followUps.prospectId, prospectIds),
          eq(followUps.completed, false)
        )
      )
      .orderBy(followUps.dueDate);

    return followUpsList.map(followUp => {
      const prospect = userProspects.find(p => p.id === followUp.prospectId)!;
      return { ...followUp, prospect };
    });
  }

  async createFollowUp(insertFollowUp: any): Promise<FollowUp> {
    const [followUp] = await db.insert(followUps).values(insertFollowUp).returning();
    return followUp;
  }

  async updateFollowUp(id: number, data: Partial<FollowUp>): Promise<FollowUp | undefined> {
    try {
      console.log("=== DATABASE STORAGE UPDATE ===");
      console.log("Update data received:", JSON.stringify(data, null, 2));
      console.log("Data types:", Object.keys(data).map(key => `${key}: ${typeof data[key as keyof typeof data]}`));
      
      debugger; // DEBUGGER LINE 439
      
      // Convert string dates to Date objects before passing to Drizzle
      const processedData = { ...data };
      
      if (processedData.dueDate) {
        if (typeof processedData.dueDate === 'string') {
          console.log("Converting dueDate string to Date:", processedData.dueDate);
          processedData.dueDate = new Date(processedData.dueDate);
        }
      }
      
      if (processedData.completedDate) {
        if (typeof processedData.completedDate === 'string') {
          console.log("Converting completedDate string to Date:", processedData.completedDate);
          processedData.completedDate = new Date(processedData.completedDate);
        }
      }
      
      console.log("Processed data before DB:", processedData);
      console.log("About to call Drizzle update...");
      
      const [updatedFollowUp] = await db
        .update(followUps)
        .set(processedData)
        .where(eq(followUps.id, id))
        .returning();
        
      console.log("Drizzle update successful!");
      return updatedFollowUp;
    } catch (error) {
      console.log("=== STORAGE ERROR CAUGHT ===");
      console.log("Error:", error);
      console.log("Error message:", (error as Error).message);
      console.log("Error stack:", (error as Error).stack);
      throw error;
    }
  }

  async deleteFollowUp(id: number): Promise<boolean> {
    const result = await db.delete(followUps).where(eq(followUps.id, id));
    return !!result.rowCount && result.rowCount > 0;
  }

  // FollowUpSettings methods
  async getFollowUpSettings(userId: number): Promise<FollowUpSetting | undefined> {
    const [settings] = await db
      .select()
      .from(followUpSettings)
      .where(eq(followUpSettings.userId, userId));
    return settings;
  }

  async createFollowUpSettings(settings: InsertFollowUpSetting): Promise<FollowUpSetting> {
    const [newSettings] = await db
      .insert(followUpSettings)
      .values(settings)
      .returning();
    return newSettings;
  }

  async updateFollowUpSettings(userId: number, data: Partial<FollowUpSetting>): Promise<FollowUpSetting | undefined> {
    const [updatedSettings] = await db
      .update(followUpSettings)
      .set(data)
      .where(eq(followUpSettings.userId, userId))
      .returning();
    return updatedSettings;
  }
}

// Export database storage instance instead of memory storage
export const storage = new DatabaseStorage();