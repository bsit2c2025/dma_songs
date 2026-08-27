import { Link } from "react-router-dom";
import { LegalSection, LegalShell, useLegalDetails } from "./LegalShell";

export default function Privacy() {
  const details = useLegalDetails();
  const contact = details.contactEmail || "the Music and Arts office";

  return (
    <LegalShell
      title="Privacy notice"
      intro="What this site records about you, why, and what you can do about it."
    >
      <LegalSection heading="Who is responsible">
        <p>
          {details.entity} operates this song library and decides how the information here is used.
          {details.dpoName ? ` Questions go to ${details.dpoName}.` : ""}{" "}
          {details.contactEmail ? (
            <>
              Reach us at <a href={`mailto:${details.contactEmail}`}>{details.contactEmail}</a>.
            </>
          ) : null}
          {details.address ? ` Postal address: ${details.address}.` : ""}
        </p>
        <p>
          This notice is written to meet the Philippines' Data Privacy Act of 2012 (Republic Act
          10173) and its implementing rules.
        </p>
      </LegalSection>

      <LegalSection heading="You can use this site without an account">
        <p>
          Browsing songs, watching practice videos and reading announcements requires no sign-in and
          no account. If you pick a voice part as a guest, that choice is stored in your own browser
          and never sent to us.
        </p>
      </LegalSection>

      <LegalSection heading="What we hold if you do sign in">
        <ul className="list-disc space-y-1 pl-5">
          <li>Your email address, which comes from how you signed in.</li>
          <li>The display name you set, and a profile picture if your sign-in provider supplies one.</li>
          <li>The voice part you sing, and any requests you have made to change it.</li>
          <li>Whether you hold administrator access.</li>
          <li>The date your account was created and when it was last seen.</li>
        </ul>
        <p>
          We do not collect your address, phone number, date of birth, student number or payment
          details, because the site has no use for them.
        </p>
        <p>
          Administrators can attach notes to a member's record — for example about section placement.
          You have the right to ask what those notes say; write to {contact}.
        </p>
      </LegalSection>

      <LegalSection heading="Why we hold it">
        <p>
          To run the choir: to show you the music written for your part, to let section leaders plan
          rehearsals against an accurate list of who sings what, and to keep administrative changes
          accountable. The legal basis is the legitimate interests of the institution in running its
          music programme, and your consent where you have given it by creating an account.
        </p>
      </LegalSection>

      <LegalSection heading="Who else sees it">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Supabase</strong> hosts the database and handles sign-in.
          </li>
          <li>
            <strong>Vercel</strong> serves the site.
          </li>
          <li>
            <strong>Google</strong>, only if you choose to sign in with a Google account.
          </li>
          <li>
            <strong>YouTube</strong>, when you press play on a practice video. Videos are embedded
            through youtube-nocookie.com and no request reaches YouTube until you press play.
          </li>
        </ul>
        <p>
          We do not sell your information, and there is no advertising or third-party analytics on
          this site.
        </p>
      </LegalSection>

      <LegalSection heading="How long we keep it">
        <p>
          For as long as you are a member of the ensemble, and for one academic year afterwards so
          that records of past performances stay coherent. You can ask for erasure sooner.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          Under RA 10173 you may be informed about, access, correct, object to, and erase your
          personal data, and you may ask for a copy of it in a portable form. Two of these are
          buttons rather than requests: on{" "}
          <Link to="/profile">your profile</Link> you can download everything we hold about you as a
          file, and you can erase your account yourself.
        </p>
        <p>
          For anything else, write to {contact}. If you are not satisfied with our response, you may
          complain to the National Privacy Commission at privacy.gov.ph.
        </p>
      </LegalSection>

      <LegalSection heading="Storage on your device">
        <p>
          We use browser storage only for things the site cannot work without: your sign-in session,
          your voice part if you are browsing as a guest, and whether you have seen the storage
          notice. There are no advertising or tracking cookies.
        </p>
      </LegalSection>

      <LegalSection heading="Security">
        <p>
          Access rules are enforced by the database itself rather than by the interface, so hiding a
          button is never the only thing standing between someone and information they should not
          see. Administrative changes are logged in a record administrators cannot edit or delete.
          No system is perfect; if you find a weakness, please report it to {contact} rather than
          making it public.
        </p>
      </LegalSection>

      <LegalSection heading="Changes">
        <p>
          If this notice changes in a way that affects you, we will say so on the site. The version
          in force is the one published here.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
