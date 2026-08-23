import { Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/common/Field";
import { Logo } from "@/components/layout/Logo";
import { GoogleButton } from "@/components/common/GoogleButton";
import { useAuth } from "@/features/auth/AuthProvider";
import { signInWithPassword } from "@/services/auth";
import { signInSchema, type SignInValues } from "@/schemas/auth";
import { errorMessage } from "@/lib/errors";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/**
 * A separate door, not a separate lock. Signing in here uses the same Supabase
 * Auth call as the member page; whether the account can actually do anything
 * administrative is decided by its role in the database.
 */
export default function AdminLogin() {
  useDocumentTitle("Administrator sign in");
  const { status, isAdmin } = useAuth();
  const navigate = useNavigate();

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  if (status === "authenticated") return <Navigate to={isAdmin ? "/admin" : "/unauthorized"} replace />;

  async function onSubmit(values: SignInValues) {
    try {
      await signInWithPassword(values.email, values.password);
      navigate("/admin", { replace: true });
    } catch (error) {
      form.setError("password", { message: errorMessage(error, "That sign-in didn't work.") });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary/[0.04] p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo to="/" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brass" aria-hidden /> Administrator sign in
            </CardTitle>
            <CardDescription>
              Administrator access is granted in the database. Signing in here with a member account
              will not unlock the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <Field label="Email" htmlFor="admin-email" error={form.formState.errors.email?.message} required>
                <Input id="admin-email" type="email" autoComplete="email" {...form.register("email")} />
              </Field>
              <Field label="Password" htmlFor="admin-password" error={form.formState.errors.password?.message} required>
                <Input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  {...form.register("password")}
                />
              </Field>
              <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
                Sign in
              </Button>
            </form>
            <GoogleButton label="Continue with Google" redirectPath="/admin" />
          </CardContent>
        </Card>
        <p className="text-center text-sm text-muted-foreground">
          Not an administrator?{" "}
          <a href="/login" className="text-primary underline underline-offset-2">
            Member sign in
          </a>
        </p>
      </div>
    </div>
  );
}
