import { BatteryCharging, Gauge, Leaf, Server } from "lucide-react";

import { StatCard } from "@/components/ui/stat-card";

type DashboardStatistics = {
  totalDevices: number;
  activeDevices: number;
  averageBatteryVoltage: number;
  totalEnergyConsumed: number;
};

type StatisticsPanelProps = {
  stats: DashboardStatistics;
};

export function StatisticsPanel({ stats }: StatisticsPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Total Devices" value={stats.totalDevices} icon={<Server className="h-5 w-5" />} />
      <StatCard title="Active Devices" value={stats.activeDevices} icon={<Gauge className="h-5 w-5" />} />
      <StatCard
        title="Average Battery"
        value={`${stats.averageBatteryVoltage.toFixed(2)} V`}
        icon={<BatteryCharging className="h-5 w-5" />}
      />
      <StatCard
        title="Energy Consumed"
        value={`${Math.round(stats.totalEnergyConsumed)} Wh`}
        icon={<Leaf className="h-5 w-5" />}
      />
    </div>
  );
}