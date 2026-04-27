import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-14">
      {Icon && (
        <div className="mb-4 rounded-lg border border-border bg-card p-3">
          <Icon size={24} className="text-muted-foreground" />
        </div>
      )}
      <h3 className="mb-2 text-lg font-semibold text-foreground">
        {title}
      </h3>
      {description && (
        <p className="mb-6 max-w-md text-center text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
