import Link from 'next/link';
import { publicMetadata } from '@/components/public/seo';
import { PageHead } from '@/components/site/page-head';

export const metadata = publicMetadata({
  title: 'Privacy Policy',
  description: 'How CareBite, an academic demonstration built around a fictional hospital, handles information: what is stored and why, who can see what, how it is protected, your controls and the Saudi Personal Data Protection Law (PDPL).',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <>
      <PageHead eyebrow="Privacy Policy" title="How CareBite handles information" narrow>
        <p>CareBite is an academic demonstration built around a fictional hospital. It is designed to show privacy-conscious handling of health information. Use synthetic information only.</p>
      </PageHead>
      <div className="container-page container-narrow pb-16">
        <div className="prose-cb">
          <h2>Who manages the information</h2>
          <p>CareBite is managed by the hospital. Patient nutrition records are created and maintained by the hospital nutrition team, which remains responsible for dietary oversight. Patients can link a personal account to take part in planning their own meals.</p>
          <h2>What is stored, and why</h2>
          <ul>
            <li><b>Accounts:</b> username, email, display name, role and a hashed password.</li>
            <li><b>Patient nutrition profile:</b> a demonstration identifier (CB-####), ward and bed, age range, relevant conditions, the prescribed diet order, allergies and intolerances (recorded separately), medically required exclusions, food preferences and appetite. Used only to screen, rank and prepare meals.</li>
            <li><b>Meals and feedback:</b> offered options, selections and confirmations, appetite before meals, intake, reasons, satisfaction, weighed plate waste and requests to the nutrition team.</li>
            <li><b>Audit log:</b> who changed a patient’s record or meals, and when.</li>
            <li>CareBite does not store real names, medical record numbers, national ID numbers, contact details or device identifiers.</li>
          </ul>
          <h2>Who can see what</h2>
          <ul>
            <li><b>Admins</b> control the whole platform. They see and edit full nutrition profiles, are the only role that can change diet orders, allergies and medical restrictions or approve meals that need review, and approve staff access and assign roles.</li>
            <li><b>Staff</b> see patient profiles and update details, preferences, appetite, schedules and intake, run the kitchen (menu, preparation and delivery) and answer non-clinical requests. They cannot change clinical information.</li>
            <li><b>Kitchen tray tickets</b> show only what preparation needs: ward, bed, demonstration ID, diet, allergy alerts and preparation instructions.</li>
            <li><b>Patients</b> see only their own profile, schedule, options, feedback and requests. Staff notes are not shown to them.</li>
          </ul>
          <h2>How information is protected</h2>
          <ul>
            <li>Permissions and all screening run on the server for every request; the browser is never trusted to enforce them.</li>
            <li>Sessions use an HttpOnly cookie; passwords are hashed with scrypt. No secret keys are sent to the browser.</li>
            <li>Information is never sold, shared with third parties or used for advertising.</li>
          </ul>
          <h2>Your controls</h2>
          <ul>
            <li>Patients can view their record, update preferences and appetite, and report changes to allergies or diet for an admin to review.</li>
            <li>Every user can export the information linked to their account as a JSON file from <Link href="/settings">Your account &amp; data</Link>.</li>
            <li><b>Discharge keeps records:</b> when a patient is discharged, upcoming meals are cancelled and the patient leaves meal and kitchen lists, but past meals, intake and requests are kept read-only by the hospital. Discharge, removing a patient account link and deleting a record are separate actions; only an admin can permanently delete a demonstration record.</li>
            <li>You can delete your personal account at any time. The hospital nutrition record is kept by the hospital nutrition team; an admin can delete a demonstration record.</li>
          </ul>
          <h2>Saudi data protection</h2>
          <p>Health information is sensitive personal data under the Saudi Personal Data Protection Law (PDPL), overseen by the Saudi Data &amp; AI Authority (SDAIA). CareBite is designed around its principles: health data is used only for the purpose it was collected for (meal screening and preparation), access is limited to what each role needs, and every change is logged. A real deployment would also need the hospital’s own PDPL compliance review.</p>
        </div>
      </div>
    </>
  );
}
