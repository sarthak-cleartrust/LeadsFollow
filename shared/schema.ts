import { pgTable, text, serial, integer, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  gmailConnected: boolean("gmail_connected").default(false),
  refreshToken: text("refresh_token"),
  lastSyncDate: timestamp("last_sync_date"),
});

export const usersRelations = relations(users, ({ many }) => ({
  prospects: many(prospects),
  followUpSettings: many(followUpSettings),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
});

// Prospects table
export const prospects = pgTable("prospects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  position: text("position"),
  phone: text("phone"),
  status: text("status").notNull().default("active"),
  category: text("category"),
  lastContactDate: timestamp("last_contact_date"),
});

export const prospectsRelations = relations(prospects, ({ one, many }) => ({
  user: one(users, {
    fields: [prospects.userId],
    references: [users.id],
  }),
  emails: many(emails),
  followUps: many(followUps),
}));

export const insertProspectSchema = createInsertSchema(prospects).pick({
  userId: true,
  name: true,
  email: true,
  company: true,
  position: true,
  phone: true,
  status: true,
  category: true,
  lastContactDate: true,
});

// Emails table
export const emails = pgTable("emails", {
  id: serial("id").primaryKey(),
  prospectId: integer("prospect_id").notNull().references(() => prospects.id, { onDelete: "cascade" }),
  fromEmail: text("from_email").notNull(),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  date: timestamp("date").notNull(),
  gmailId: text("gmail_id").notNull().unique(),
  isRead: boolean("is_read").default(true),
});

export const emailsRelations = relations(emails, ({ one }) => ({
  prospect: one(prospects, {
    fields: [emails.prospectId],
    references: [prospects.id],
  }),
}));

export const insertEmailSchema = createInsertSchema(emails).pick({
  prospectId: true,
  fromEmail: true,
  toEmail: true,
  subject: true,
  content: true,
  date: true,
  gmailId: true,
  isRead: true,
});

// FollowUps table
export const followUps = pgTable("follow_ups", {
  id: serial("id").primaryKey(),
  prospectId: integer("prospect_id").notNull().references(() => prospects.id, { onDelete: "cascade" }),
  dueDate: timestamp("due_date").notNull(),
  type: text("type").notNull(), // email, call, meeting
  notes: text("notes"),
  completed: boolean("completed").default(false),
  completedDate: timestamp("completed_date"),
});

export const followUpsRelations = relations(followUps, ({ one }) => ({
  prospect: one(prospects, {
    fields: [followUps.prospectId],
    references: [prospects.id],
  }),
}));

export const insertFollowUpSchema = createInsertSchema(followUps).pick({
  prospectId: true,
  dueDate: true,
  type: true,
  notes: true,
  completed: true,
  completedDate: true,
});

// FollowUpSettings table
export const followUpSettings = pgTable("follow_up_settings", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  initialResponseDays: integer("initial_response_days").notNull().default(2),
  standardFollowUpDays: integer("standard_follow_up_days").notNull().default(4),
  notifyEmail: boolean("notify_email").default(true),
  notifyBrowser: boolean("notify_browser").default(true),
  notifyDailyDigest: boolean("notify_daily_digest").default(true),
  highPriorityDays: integer("high_priority_days").notNull().default(3),
  mediumPriorityDays: integer("medium_priority_days").notNull().default(1),
  lowPriorityDays: integer("low_priority_days").notNull().default(3),
});

export const followUpSettingsRelations = relations(followUpSettings, ({ one }) => ({
  user: one(users, {
    fields: [followUpSettings.userId],
    references: [users.id],
  }),
}));

export const insertFollowUpSettingsSchema = createInsertSchema(followUpSettings).pick({
  userId: true,
  initialResponseDays: true,
  standardFollowUpDays: true,
  notifyEmail: true,
  notifyBrowser: true,
  notifyDailyDigest: true,
  highPriorityDays: true,
  mediumPriorityDays: true,
  lowPriorityDays: true,
});

// Types for the storage interface
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Prospect = typeof prospects.$inferSelect;
export type InsertProspect = z.infer<typeof insertProspectSchema>;

export type Email = typeof emails.$inferSelect;
export type InsertEmail = z.infer<typeof insertEmailSchema>;

export type FollowUp = typeof followUps.$inferSelect;
export type InsertFollowUp = z.infer<typeof insertFollowUpSchema>;

export type FollowUpSetting = typeof followUpSettings.$inferSelect;
export type InsertFollowUpSetting = z.infer<typeof insertFollowUpSettingsSchema>;
