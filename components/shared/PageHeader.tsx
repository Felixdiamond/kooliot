import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
  subtitle?: string;
}

export function PageHeader({ title, breadcrumb, actions, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-8">
      {breadcrumb && (
        <div className="mb-3 text-sm font-medium text-muted-foreground">
          {breadcrumb}
        </div>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{subtitle}</p>
          )}
        </div>
          {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
