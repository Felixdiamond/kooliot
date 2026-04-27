import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";

import { registerUserAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type RegisterPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { error } = await searchParams;

  async function submit(formData: FormData) {
    "use server";

    const result = await registerUserAction(formData);

    if (!result.success) {
      const query = new URLSearchParams({ error: result.error });
      redirect(`/register?${query.toString()}`);
    }

    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_22%,color-mix(in_oklab,var(--color-primary)_12%,transparent),transparent_34%),radial-gradient(circle_at_88%_12%,color-mix(in_oklab,var(--color-tertiary)_10%,transparent),transparent_30%)]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-primary/25 bg-primary/12 text-primary">
            <UserPlus className="h-6 w-6" />
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">Create operator account</h1>
          <p className="mt-2 text-sm text-muted-foreground">Provision secure access to the KoolIoT operations console</p>
        </div>

        <div className="surface-elevated pop-in p-8">
          <h2 className="font-heading text-2xl font-semibold text-foreground">Register</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create an internal operator profile to manage devices and token activations.
          </p>

          {error && (
            <div className="mt-6 rounded-md border border-status-error/30 bg-status-error/10 p-3 text-sm font-medium text-status-error">
              {error}
            </div>
          )}

          <form action={submit} className="mt-6 space-y-5">
            <Input
              id="name"
              name="name"
              type="text"
              required
              placeholder="John Doe"
              label="Full name"
            />

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
              Create account
            </Button>
          </form>

          <div className="mt-7 border-t border-border pt-5">
            <p className="text-center text-sm text-muted-foreground">
              Already registered?{' '}
              <Link href="/login" className="font-semibold text-primary transition-colors hover:text-primary/80">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
