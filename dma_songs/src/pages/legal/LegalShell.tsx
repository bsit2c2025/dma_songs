import * as React from "react";
import { useSettings } from "@/hooks/useSettings";
import { settingString } from "@/services/settings";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export interface LegalDetails {
  entity: string;
  contactEmail: string;
  dpoName: string;
  address: string;
  effectiveDate: string;
  termsVersion: string;
}

export function useLegalDetails(): LegalDetails {
  const { data: settings } = useSettings();
  return {
    entity: settingString(settings, "legal.entity_name", "Dalubhasaan ng Lungsod ng Lucena"),
    contactEmail: settingString(settings, "legal.contact_email", ""),
    dpoName: settingString(settings, "legal.dpo_name", ""),
    address: settingString(settings, "legal.address", ""),
    effectiveDate: settingString(settings, "legal.effective_date", ""),
    termsVersion: settingString(settings, "legal.terms_version", "1.0"),
  };
}

/** Shared chrome so the three legal pages read as one document set. */
export function LegalShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  useDocumentTitle(title);
  const details = useLegalDetails();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="border-b border-border pb-5">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass">Legal</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">{title}</h1>
        <p className="mt-3 text-muted-foreground">{intro}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          {details.effectiveDate ? <>In effect from {details.effectiveDate}. </> : null}
          Applies to the song library operated by {details.entity}.
        </p>
      </header>

      <div className="prose-legal space-y-6 text-[0.95rem] leading-relaxed">{children}</div>

      {!details.contactEmail ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          No contact address has been set yet. An administrator should add one in Settings — a
          privacy notice without a way to reach the people responsible does not do its job.
        </p>
      ) : null}
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl">{heading}</h2>
      <div className="space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}
