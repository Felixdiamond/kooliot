import { GlassCard } from "@/components/ui/glass-card";

type CommandHistoryRow = {
  id: number;
  commandType: string;
  issuedBy: number;
  issuedAt: Date;
  status: string;
  errorMessage: string | null;
};

type CommandHistoryProps = {
  records: CommandHistoryRow[];
};

export function CommandHistory({ records }: CommandHistoryProps) {
  return (
    <GlassCard className="p-5">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Command History</h3>

      {records.length === 0 ? (
        <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">No commands issued yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-slate-700 dark:text-slate-300">
                <th className="pb-2">Command</th>
                <th className="pb-2">Issued By</th>
                <th className="pb-2">Issued At</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {records.map((item) => (
                <tr key={item.id} className="border-t border-white/15 text-slate-800 dark:text-slate-200">
                  <td className="py-2 capitalize">{item.commandType}</td>
                  <td className="py-2">{item.issuedBy}</td>
                  <td className="py-2">{item.issuedAt.toLocaleString()}</td>
                  <td className="py-2 capitalize">{item.status}</td>
                  <td className="py-2">{item.errorMessage ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
}