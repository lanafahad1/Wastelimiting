import { HeartPulse } from 'lucide-react';
import { publicMetadata } from '@/components/public/seo';
import { DISCLAIMER } from '@/lib/site';
import { PageHead } from '@/components/site/page-head';
import { Notice } from '@/components/ui/notice';

export const metadata = publicMetadata({ title: 'Medical Disclaimer', description: DISCLAIMER, path: '/disclaimer' });

export default function DisclaimerPage() {
  return (
    <>
      <PageHead eyebrow="Medical Disclaimer" title="Medical disclaimer" narrow />
      <div className="container-page container-narrow pb-16">
        <div className="prose-cb">
          <Notice tone="rose" icon={<HeartPulse aria-hidden />}>{DISCLAIMER}</Notice>
          <h2>What this means in practice</h2>
          <ul>
            <li>CareBite does not diagnose conditions, prescribe diets or recommend treatment. Admins define and review every diet order; CareBite supports their decisions.</li>
            <li>Screening rules were checked against cited Saudi government guidance by the project team. They have not been clinically validated; a hospital dietetics department would need to review and approve them before real use.</li>
            <li>Nutrition values come only from SFDA laboratory analysis of traditional dishes, where imported; the hospital’s own preparation may differ. Where no values are imported, none are shown or estimated.</li>
            <li>CareBite never labels a meal “allergy-safe”. The kitchen checks packaged ingredient labels.</li>
            <li>Dashboard figures are indicators from recorded meals. They do not show cause and effect.</li>
            <li>All patients, staff and records in this demonstration are fictional.</li>
            <li>In an emergency, such as a severe allergic reaction, alert clinical staff or emergency services immediately.</li>
          </ul>
        </div>
      </div>
    </>
  );
}
