import { sql } from "drizzle-orm";

import { db } from "@/db/client";
import { activationLogs, devices } from "@/db/schema";
import { desc, eq, gte, sql as dSql } from "drizzle-orm";

export async function getRecentActivations(limit = 10) {
  const records = await db
    .select({
      id: activationLogs.id,
      deviceSerial: devices.serialNumber,
      days: activationLogs.days,
      tokenGenerated: activationLogs.tokenGenerated,
      generatedBy: activationLogs.generatedBy,
      activatedAt: activationLogs.activatedAt,
      productType: devices.productType,
    })
    .from(activationLogs)
    .innerJoin(devices, eq(activationLogs.deviceId, devices.id))
    .orderBy(desc(activationLogs.activatedAt))
    .limit(limit);

  return records;
}

export async function getDashboardKPIs() {
  const [totalDevicesObj, activationsTodayObj] = await Promise.all([
    db.select({ count: dSql<number>`count(*)` }).from(devices),
    db
      .select({ count: dSql<number>`count(*)` })
      .from(activationLogs)
      .where(gte(activationLogs.activatedAt, dSql`current_date`)),
  ]);

  return {
    totalDevices: Number(totalDevicesObj[0]?.count ?? 0),
    activationsToday: Number(activationsTodayObj[0]?.count ?? 0),
  };
}

export async function getProductTypeBreakdown() {
  const records = await db
    .select({
      productType: devices.productType,
      count: dSql<number>`count(*)`,
    })
    .from(devices)
    .groupBy(devices.productType);

  return records.map((r) => ({
    name: r.productType || "Unknown",
    value: Number(r.count),
  }));
}

export async function getActivationTrends(days = 30) {
  const result = await db.execute(sql`
    select
      time_bucket('1 day', activated_at) as bucket,
      count(*) as count
    from ${activationLogs}
    where activated_at >= current_date - interval '${days} days'
    group by 1
    order by 1 asc
  `);

  return result.map((row: Record<string, unknown>) => ({
    date: new Date(String(row.bucket)).toISOString().split("T")[0],
    count: Number(row.count),
  }));
}

export async function getDeviceActivationSummary(deviceId: number) {
  const [summary] = await db
    .select({
      totalActivations: dSql<number>`count(*)`,
      lastActivatedAt: dSql<Date | null>`max(${activationLogs.activatedAt})`,
    })
    .from(activationLogs)
    .where(eq(activationLogs.deviceId, deviceId));

  const count = Number(summary?.totalActivations ?? 0);
  
  if (count === 0) {
    return { totalActivations: 0, lastActivatedAt: null, lastActivatedBy: null };
  }

  const [lastLog] = await db
    .select({ generatedBy: activationLogs.generatedBy })
    .from(activationLogs)
    .where(eq(activationLogs.deviceId, deviceId))
    .orderBy(desc(activationLogs.activatedAt))
    .limit(1);

  return {
    totalActivations: count,
    lastActivatedAt: summary?.lastActivatedAt ?? null,
    lastActivatedBy: lastLog?.generatedBy ?? null,
  };
}
