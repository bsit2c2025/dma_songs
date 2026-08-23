import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/common/Field";
import { updatePassword } from "@/services/auth";
import { newPasswordSchema, type NewPasswordValues } from "@/schemas/auth";
import { errorMessage } from "@/lib/errors";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function ResetPassword() {
  useDocumentTitle("Choose a new password");
  const navigate = useNavigate();
  const { status } = useAuth();

  const form = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  async function onSubmit(values: NewPasswordValues) {
    try {
      await updatePassword(values.password);
      toast.success("Password updated");
      navigate("/profile", { replace: true });
    } catch (error) {
      form.setError("password", { message: errorMessage(error, "The password couldn't be updated.") });
    }
  }

  return (
    <div className="mx-auto w-full max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>
            {status === "authenticated"
              ? "Pick something you haven't used here before."
              : "Open the link from your email first — this page needs that session to change your password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Field
              label="New password"
              htmlFor="new-password"
              error={form.formState.errors.password?.message}
              hint="At least 8 characters."
              required
            >
              <Input id="new-password" type="password" autoComplete="new-password" {...form.register("password")} />
            </Field>
            <Field
              label="Confirm password"
              htmlFor="confirm-password"
              error={form.formState.errors.confirm?.message}
              required
            >
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                {...form.register("confirm")}
              />
            </Field>
            <Button
              type="submit"
              className="w-full"
              loading={form.formState.isSubmitting}
              disabled={status !== "authenticated"}
            >
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
