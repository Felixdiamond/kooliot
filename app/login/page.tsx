import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { loginAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  async function submit(formData: FormData) {
    "use server";

    const result = await loginAction(formData);

    if (!result.success) {
      const query = new URLSearchParams({ error: result.error });
      redirect(`/login?${query.toString()}`);
    }

    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,color-mix(in_oklab,var(--color-primary)_12%,transparent),transparent_32%),radial-gradient(circle_at_85%_10%,color-mix(in_oklab,var(--color-quaternary)_10%,transparent),transparent_28%)]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-primary/25 bg-primary/12 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">KoolIoT</h1>
          <p className="mt-2 text-sm text-muted-foreground">Secure operations access for PAYG fleet management</p>
        </div>

        <div className="surface-elevated pop-in p-8">
          <h2 className="font-heading text-2xl font-semibold text-foreground">Sign in</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your operator credentials to continue.
          </p>

          {error && (
            <div className="mt-6 rounded-md border border-status-error/30 bg-status-error/10 p-3 text-sm font-medium text-status-error">
              {error}
            </div>
          )}

          <form action={submit} className="mt-6 space-y-5">
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="operator@company.com"
              label="Email"
            />

            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              label="Password"
            />

            <Button type="submit" variant="primary" size="lg" className="mt-2 w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-7 border-t border-border pt-5">
            <p className="text-center text-sm text-muted-foreground">
              No account yet?{' '}
              <Link href="/register" className="font-semibold text-primary transition-colors hover:text-primary/80">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
