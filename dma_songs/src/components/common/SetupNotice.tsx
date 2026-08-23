/**
 * Shown instead of the app when the Supabase environment variables are
 * missing, which is by far the most common first-run problem.
 */
export function SetupNotice({ missing }: { missing: string[] }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-6">
      <img src="/logo.svg" alt="" className="h-12 w-12" />
      <h1 className="font-display text-3xl">Finish the setup</h1>
      <p className="text-muted-foreground">
        dma_songs can't reach Supabase yet. Copy <code className="font-mono">.env.example</code> to{" "}
        <code className="font-mono">.env</code>, fill in your project values and restart the dev server.
      </p>
      <ul className="rounded-md border border-border bg-card p-4 font-mono text-sm">
        {missing.map((name) => (
          <li key={name}>
            {name}=<span className="text-muted-foreground">…</span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        Both values are in your Supabase dashboard under Project Settings → API. Use the publishable
        (anon) key — never the service-role key.
      </p>
    </div>
  );
}
