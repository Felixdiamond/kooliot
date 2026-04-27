import { GlassCard } from "@/components/ui/glass-card";

type TokenHistoryRow = {
  id: number;
  tokenType: string;
  value: number;
  token: string;
  generatedAt: Date;
  generatedBy: number;
};

type TokenHistoryProps = {
  records: TokenHistoryRow[];
};

export function TokenHistory({ records }: TokenHistoryProps) {
  return (
    <GlassCard className="p-5">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Token History</h3>

      {records.length === 0 ? (
        <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">No tokens generated yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-slate-700 dark:text-slate-300">
                <th className="pb-2">Type</th>
                <th className="pb-2">Value</th>
                <th className="pb-2">Token</th>
                <th className="pb-2">Generated At</th>
                <th className="pb-2">By</th>
              </tr>
            </thead>
            <tbody>
              {records.map((item) => (
                <tr key={item.id} className="border-t border-white/15 text-slate-800 dark:text-slate-200">
                  <td className="py-2">{item.tokenType}</td>
                  <td className="py-2">{item.value}</td>
                  <td className="py-2 font-mono">{item.token}</td>
                  <td className="py-2">{item.generatedAt.toLocaleString()}</td>
                  <td className="py-2">{item.generatedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
}