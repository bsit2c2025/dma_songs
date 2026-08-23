import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { FullPageLoader } from "@/components/common/FullPageLoader";
import { ErrorState } from "@/components/common/ErrorState";

/**
 * Lands here after Google OAuth or an emailed link. The Supabase client is
 * configured with detectSessionInUrl, so all this page does is wait for the
 * session to settle and then send the person where they were going.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = React.useState<string | null>(null);
  const next = params.get("next") ?? "/";

  React.useEffect(() => {
    const description = params.get("error_description");
    if (description) {
      setError(description);
      return;
    }
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      navigate(data.session ? next : "/login", { replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [navigate, next, params]);

  if (error) {
    return (
      <div className="container py-16">
        <ErrorState title="Sign-in didn't complete" error={{ message: error }} onRetry={() => navigate("/login")} />
      </div>
    );
  }
  return <FullPageLoader label="Finishing sign-in" />;
}
