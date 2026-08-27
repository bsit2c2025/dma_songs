import { Link } from "react-router-dom";
import { LegalSection, LegalShell, useLegalDetails } from "./LegalShell";

export default function Terms() {
  const details = useLegalDetails();
  const contact = details.contactEmail || "the Music and Arts office";

  return (
    <LegalShell
      title="Terms of use"
      intro="The rules for using this song library. Short, and meant to be readable."
    >
      <LegalSection heading="Who this is for">
        <p>
          This library exists for members and staff of the {details.entity} Music and Arts
          programme, and for anyone who wants to browse the repertoire. Accounts are for members of
          the ensemble.
        </p>
      </LegalSection>

      <LegalSection heading="Your account">
        <p>
          Keep your sign-in to yourself. You are responsible for what happens under your account, so
          tell {contact} promptly if you think someone else has access to it. Do not create an
          account for somebody else or pretend to be another person.
        </p>
      </LegalSection>

      <LegalSection heading="What you may do with the material">
        <p>
          Recordings, lyrics and rehearsal notes here are for learning your part. You may use them
          to practise and prepare for rehearsals and performances of this ensemble.
        </p>
        <p>You may not:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Republish, sell or redistribute the material outside the ensemble.</li>
          <li>Download and re-upload the videos anywhere else.</li>
          <li>Present the arrangements as your own work.</li>
          <li>Use anything here commercially without written permission from the rights holders.</li>
        </ul>
        <p>
          Much of this material belongs to composers, arrangers and publishers who are not us. See
          the <Link to="/copyright">copyright page</Link>.
        </p>
      </LegalSection>

      <LegalSection heading="Voice parts">
        <p>
          Your first choice of voice part applies immediately. Changing section afterwards needs an
          administrator's approval, because the balance of the ensemble is a musical decision. You
          may browse and practise any part's music at any time regardless of which section you are
          in — there is nothing to unlock.
        </p>
      </LegalSection>

      <LegalSection heading="Behaviour">
        <p>
          Do not attempt to reach information belonging to other members, interfere with the
          service, or use automated tools to scrape it. Accounts that do may be suspended.
        </p>
      </LegalSection>

      <LegalSection heading="Availability, and what we do not promise">
        <p>
          This is a departmental tool run on a small budget, not a commercial service. It may be
          offline for maintenance and material may change or be removed without notice. Keep your
          own copies of anything you cannot afford to lose.
        </p>
        <p>
          The service is provided as it is. To the extent the law allows, {details.entity} is not
          liable for loss arising from its use, and nothing here limits liability that cannot
          lawfully be limited.
        </p>
      </LegalSection>

      <LegalSection heading="Ending your access">
        <p>
          You may erase your account at any time from <Link to="/profile">your profile</Link>.
          Administrators may deactivate an account that breaks these terms or belongs to somebody
          who has left the ensemble.
        </p>
      </LegalSection>

      <LegalSection heading="Governing law">
        <p>
          These terms are governed by the laws of the Republic of the Philippines, and disputes go
          to the courts of Lucena City, Quezon Province.
        </p>
      </LegalSection>

      <LegalSection heading="Questions">
        <p>Write to {contact}.</p>
        <p className="text-xs">Version {details.termsVersion}.</p>
      </LegalSection>
    </LegalShell>
  );
}
