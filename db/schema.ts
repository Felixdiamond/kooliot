import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).default("VIEWER").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const devices = pgTable(
  "devices",
  {
    id: serial("id").primaryKey(),
    serialNumber: varchar("serial_number", { length: 50 }).notNull().unique(),
    angazaId: varchar("angaza_id", { length: 20 }),
    paygoId: varchar("paygo_id", { length: 20 }),
    boardType: varchar("board_type", { length: 30 }),
    secretKey: varchar("secret_key", { length: 64 }).notNull(),
    startingCode: varchar("starting_code", { length: 20 }),
    productType: varchar("product_type", { length: 50 }),
    timeDivider: integer("time_divider"),
    messageId: integer("message_id"),
    tokenCount: integer("token_count").default(0).notNull(),
    lastCount: integer("last_count"),
    status: varchar("status", { length: 20 }),
    assignmentStatus: varchar("assignment_status", { length: 20 })
      .default("FREE")
      .notNull(),
    customerName: varchar("customer_name", { length: 255 }),
    customerPhone: varchar("customer_phone", { length: 50 }),
    customerEmail: varchar("customer_email", { length: 255 }),
    customerLocation: varchar("customer_location", { length: 255 }),
    customerMetadata: jsonb("customer_metadata"),
    sourceWorkbook: varchar("source_workbook", { length: 255 }),
    sourceSheet: varchar("source_sheet", { length: 255 }),
    extraFields: jsonb("extra_fields"),
    lastActivatedAt: timestamp("last_activated_at", { mode: "date" }),
    lastActivatedBy: varchar("last_activated_by", { length: 100 }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    serialNumberIdx: index("devices_serial_number_idx").on(table.serialNumber),
    boardTypeIdx: index("devices_board_type_idx").on(table.boardType),
    angazaIdIdx: index("devices_angaza_id_idx").on(table.angazaId),
    paygoIdIdx: index("devices_paygo_id_idx").on(table.paygoId),
    assignmentStatusIdx: index("devices_assignment_status_idx").on(table.assignmentStatus),
    productTypeIdx: index("devices_product_type_idx").on(table.productType),
  })
);

export const assignmentTasks = pgTable(
  "assignment_tasks",
  {
    id: serial("id").primaryKey(),
    createdBy: integer("created_by")
      .references(() => users.id)
      .notNull(),
    status: varchar("status", { length: 20 }).default("OPEN").notNull(),
    requestedBoardType: varchar("requested_board_type", { length: 30 }),
    preferredIdentifier: varchar("preferred_identifier", { length: 100 }),
    customerName: varchar("customer_name", { length: 255 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 50 }),
    customerEmail: varchar("customer_email", { length: 255 }),
    customerLocation: varchar("customer_location", { length: 255 }),
    notes: varchar("notes", { length: 500 }),
    payload: jsonb("payload"),
    assignedDeviceId: integer("assigned_device_id").references(() => devices.id),
    completedBy: integer("completed_by").references(() => users.id),
    completedAt: timestamp("completed_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("assignment_tasks_status_idx").on(table.status),
    createdByIdx: index("assignment_tasks_created_by_idx").on(table.createdBy),
    assignedDeviceIdx: index("assignment_tasks_assigned_device_idx").on(table.assignedDeviceId),
    createdAtIdx: index("assignment_tasks_created_at_idx").on(table.createdAt),
  })
);

export const accessGrants = pgTable(
  "access_grants",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    deviceId: integer("device_id")
      .references(() => devices.id)
      .notNull(),
    role: varchar("role", { length: 20 }).notNull(),
    grantedBy: integer("granted_by")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    userDeviceIdx: uniqueIndex("access_grants_user_device_idx").on(
      table.userId,
      table.deviceId
    ),
    userIdx: index("access_grants_user_idx").on(table.userId),
    deviceIdx: index("access_grants_device_idx").on(table.deviceId),
  })
);

export const tokenLedger = pgTable(
  "token_ledger",
  {
    id: serial("id").primaryKey(),
    deviceId: integer("device_id")
      .references(() => devices.id)
      .notNull(),
    tokenType: varchar("token_type", { length: 20 }).notNull(),
    value: integer("value").notNull(),
    token: varchar("token", { length: 15 }).notNull(),
    generatedBy: integer("generated_by")
      .references(() => users.id)
      .notNull(),
    generatedAt: timestamp("generated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    deviceIdx: index("token_ledger_device_idx").on(table.deviceId),
    generatedAtIdx: index("token_ledger_generated_at_idx").on(table.generatedAt),
  })
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id),
    action: varchar("action", { length: 50 }).notNull(),
    resourceType: varchar("resource_type", { length: 50 }).notNull(),
    resourceId: integer("resource_id"),
    details: jsonb("details"),
    timestamp: timestamp("timestamp", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("audit_logs_user_idx").on(table.userId),
    timestampIdx: index("audit_logs_timestamp_idx").on(table.timestamp),
  })
);

export const activationLogs = pgTable(
  "activation_logs",
  {
    id: serial("id").primaryKey(),
    deviceId: integer("device_id").references(() => devices.id),
    angazaId: varchar("angaza_id", { length: 20 }),
    days: integer("days").notNull(),
    tokenGenerated: varchar("token_generated", { length: 20 }).notNull(),
    generatedBy: varchar("generated_by", { length: 100 }).notNull(),
    activatedAt: timestamp("activated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    deviceIdx: index("activation_logs_device_idx").on(table.deviceId),
    activatedAtIdx: index("activation_logs_activated_at_idx").on(table.activatedAt),
    angazaIdx: index("activation_logs_angaza_idx").on(table.angazaId),
  })
);
