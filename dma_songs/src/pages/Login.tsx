import * as React from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/common/Field";
import { Logo } from "@/components/layout/Logo";
import { GoogleButton } from "@/components/common/GoogleButton";
import { useAuth } from "@/features/auth/AuthProvider";
import { signInWithPassword, signUpWithPassword, requestPasswordReset } from "@/services/auth";
import { signInSchema, signUpSchema, resetRequestSchema } from "@/schemas/auth";
import type { SignInValues, SignUpValues, ResetRequestValues } from "@/schemas/auth";
import { errorMessage } from "@/lib/errors";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Login() {
  useDocumentTitle("Sign in");
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [resetOpen, setResetOpen] = React.useState(false);

  const signIn = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const signUp = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: "", email: "", password: "", voiceClassificationId: null },
  });
  const reset = useForm<ResetRequestValues>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: { email: "" },
  });

  if (status === "authenticated") return <Navigate to={from} replace />;

  async function onSignIn(values: SignInValues) {
    try {
      await signInWithPassword(values.email, values.password);
      toast.success("Signed in");
      navigate(from, { replace: true });
    } catch (error) {
      signIn.setError("password", { message: errorMessage(error, "That sign-in didn't work.") });
    }
  }

  async function onSignUp(values: SignUpValues) {
    try {
      const result = await signUpWithPassword({
        email: values.email,
        password: values.password,
        displayName: values.displayName,
      });
      if (result.session) {
        toast.success("Account created");
        navigate("/profile", { replace: true });
      } else {
        toast.success("Check your email to confirm your account.");
        setMode("signin");
      }
    } catch (error) {
      signUp.setError("email", { message: errorMessage(error, "That account couldn't be created.") });
    }
  }

  async function onReset(values: ResetRequestValues) {
    try {
      await requestPasswordReset(values.email);
      toast.success("If that address has an account, a reset link is on its way.");
      setResetOpen(false);
    } catch (error) {
      toast.error(errorMessage(error, "The reset email couldn't be sent."));
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center gap-6">
      <div className="flex justify-center">
        <Logo to="/" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{mode === "signin" ? "Sign in" : "Create your account"}</CardTitle>
          <CardDescription>
            An account keeps your voice part with you on every device. You can also{" "}
            <Link to="/songs" className="text-primary underline underline-offset-2">
              browse as a guest
            </Link>
            .
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <GoogleButton label={mode === "signin" ? "Continue with Google" : "Sign up with Google"} redirectPath={from} />

          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <Tabs value={mode} onValueChange={(value) => setMode(value as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              {resetOpen ? (
                <form onSubmit={reset.handleSubmit(onReset)} className="space-y-4" noValidate>
                  <Field label="Email" htmlFor="reset-email" error={reset.formState.errors.email?.message} required>
                    <Input id="reset-email" type="email" autoComplete="email" {...reset.register("email")} />
                  </Field>
                  <div className="flex gap-2">
                    <Button type="submit" loading={reset.formState.isSubmitting}>
                      Send reset link
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setResetOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={signIn.handleSubmit(onSignIn)} className="space-y-4" noValidate>
                  <Field label="Email" htmlFor="email" error={signIn.formState.errors.email?.message} required>
                    <Input id="email" type="email" autoComplete="email" {...signIn.register("email")} />
                  </Field>
                  <Field label="Password" htmlFor="password" error={signIn.formState.errors.password?.message} required>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      {...signIn.register("password")}
                    />
                  </Field>
                  <Button type="submit" className="w-full" loading={signIn.formState.isSubmitting}>
                    Sign in
                  </Button>
                  <button
                    type="button"
                    onClick={() => setResetOpen(true)}
                    className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    Forgot your password?
                  </button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp.handleSubmit(onSignUp)} className="space-y-4" noValidate>
                <Field label="Name" htmlFor="name" error={signUp.formState.errors.displayName?.message} required>
                  <Input id="name" autoComplete="name" {...signUp.register("displayName")} />
                </Field>
                <Field label="Email" htmlFor="signup-email" error={signUp.formState.errors.email?.message} required>
                  <Input id="signup-email" type="email" autoComplete="email" {...signUp.register("email")} />
                </Field>
                <Field
                  label="Password"
                  htmlFor="signup-password"
                  error={signUp.formState.errors.password?.message}
                  hint="At least 8 characters, with letters and numbers."
                  required
                >
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    {...signUp.register("password")}
                  />
                </Field>
                <Button type="submit" className="w-full" loading={signUp.formState.isSubmitting}>
                  Create account
                </Button>
                <p className="text-xs text-muted-foreground">
                  You can set your voice part right after signing up.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
