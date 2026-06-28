import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpUser: text("smtp_user"),
  smtpPassword: text("smtp_password"),
  smtpSecure: boolean("smtp_secure").notNull().default(true),
  hunterApiKey: text("hunter_api_key"),
  apolloApiKey: text("apollo_api_key"),
  openaiApiKey: text("openai_api_key"),
  googleSearchApiKey: text("google_search_api_key"),
  googleSearchCx: text("google_search_cx"),
  defaultFromName: text("default_from_name"),
  defaultFromEmail: text("default_from_email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Settings = typeof settingsTable.$inferSelect;
