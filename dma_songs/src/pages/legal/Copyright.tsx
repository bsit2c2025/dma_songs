import { LegalSection, LegalShell, useLegalDetails } from "./LegalShell";

export default function CopyrightPage() {
  const details = useLegalDetails();
  const contact = details.contactEmail || "the Music and Arts office";

  return (
    <LegalShell
      title="Copyright and takedown"
      intro="Whose music this is, and how to tell us if we have got something wrong."
    >
      <LegalSection heading="What we host and what we don't">
        <p>
          Practice videos are not stored here. They are embedded from YouTube and remain on
          YouTube's servers under whatever terms their uploader agreed to. What this site holds is a
          link, a title, and the notes our staff wrote.
        </p>
        <p>
          Lyrics and rehearsal notes, where present, are stored on this site. Before lyrics can be
          saved, an administrator has to record where the material came from — public domain, owned
          by the institution, licensed, or used with written permission. That record is kept with
          the song.
        </p>
      </LegalSection>

      <LegalSection heading="Rights stay with their owners">
        <p>
          Compositions, arrangements, recordings and lyrics belong to their composers, arrangers,
          performers and publishers. Nothing here transfers any of those rights. Material is made
          available to members of this ensemble for rehearsal, which is a narrower purpose than
          publication.
        </p>
        <p>
          Where {details.entity} commissioned or created an arrangement, the institution holds those
          rights and members may use it for the ensemble's own work.
        </p>
      </LegalSection>

      <LegalSection heading="If you are a rights holder">
        <p>
          If something here uses your work and you would rather it did not, write to {contact} and
          it will be taken down. You do not need a lawyer to ask, and we would rather remove
          something quickly than argue about it.
        </p>
        <p>Please include:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Which work it is, and enough detail to identify it.</li>
          <li>A link to the page here where it appears.</li>
          <li>Your name, your role in relation to the work, and how to reach you.</li>
          <li>A statement that you believe the use is not authorised.</li>
        </ul>
        <p>
          We aim to respond within ten working days. Material that is clearly identified is usually
          removed straight away while the question is settled.
        </p>
      </LegalSection>

      <LegalSection heading="Members">
        <p>
          Do not upload or link to material you do not have the right to share, and do not
          redistribute anything from here outside the ensemble. If you are unsure about a piece,
          ask before adding it.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
