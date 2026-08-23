import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/services/auth";
import { errorMessage } from "@/lib/errors";

/**
 * Google sign-in is optional: if the provider isn't configured in Supabase the
 * request fails cleanly here and email/password still works.
 */
export function GoogleButton({ label, redirectPath = "/" }: { label: string; redirectPath?: string }) {
  const [loading, setLoading] = React.useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await signInWithGoogle(redirectPath);
    } catch (error) {
      toast.error(errorMessage(error, "Google sign-in isn't available right now."));
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="outline" className="w-full" onClick={handleClick} loading={loading}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
        <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1 .7-2.3 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
        <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
      </svg>
      {label}
    </Button>
  );
}
