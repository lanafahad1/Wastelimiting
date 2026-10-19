import Link from 'next/link';
import { User, List, BookOpen, Target, ThumbsUp, Leaf, Lock, Shield, Database } from 'lucide-react';
import { publicMetadata } from '@/components/public/seo';
import { TEAM, SITE_URL, SITE_NAME } from '@/lib/site';
import { botanical, teamPortrait } from '@/lib/art.js';
import { AboutNav } from '@/components/cb/misc';
import { Notice } from '@/components/ui/notice';
import { Band, SectionHead, CheckList, CheckItem, Benefit, Pipeline, Panel } from '@/components/public/blocks';
import { Citation } from '@/components/public/citation';
import { JsonLd } from '@/components/public/json-ld';

const DESCRIPTION = 'About CareBite, a university Health Informatics project that connects structured patient information, hospital meal data and documented dietary rules to support meal decisions during a hospital stay. Meet the development team.';
export const metadata = publicMetadata({ title: 'About the Project', description: DESCRIPTION, path: '/about' });

const initials = (n: string) => { const parts = n.split(/\s+/); return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase(); };

export default function AboutPage() {
  const ld = {
    '@context': 'https://schema.org', '@type': 'AboutPage', name: `About ${SITE_NAME}`, url: `${SITE_URL}/about`, description: DESCRIPTION,
    about: { '@id': `${SITE_URL}/#project` },
  };
  return (
    <>
      <JsonLd data={ld} />
      <AboutNav current="/about" />
      <section className="overflow-hidden bg-[radial-gradient(900px_400px_at_90%_0%,var(--cb-rose),transparent_60%),radial-gradient(700px_400px_at_0%_100%,var(--cb-mint),transparent_60%)] py-10 sm:py-14">
        <div className="container-page grid items-center gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <span className="eyebrow">Health Informatics and Project Information</span>
            <h1 className="text-[2rem] leading-tight sm:text-[2.6rem]">Connecting patient information, hospital meals and dietary rules</h1>
            <p className="text-[1.15rem]">CareBite shows how structured patient information, the hospital’s meal data and documented dietary rules can work together to support meal decisions during a hospital stay.</p>
          </div>
          <span className="mx-auto w-44 sm:w-56" dangerouslySetInnerHTML={{ __html: botanical('w-full h-auto') }} />
        </div>
      </section>

      <Band tone="white" aria-label="Mission and project">
        <div className="container-page grid gap-6 md:grid-cols-2">
          <Panel tone="mint">
            <h2 className="text-[1.5rem]">Our Mission</h2>
            <p className="text-[1.1rem]">To demonstrate how Health Informatics can connect patient health information with nutritional data to support personalized, informed dietary decision-making.</p>
          </Panel>
          <Panel tone="blush">
            <h2 className="text-[1.5rem]">About CareBite</h2>
            <p className="text-[1.1rem]">CareBite is a Health Informatics platform that helps hospital nutrition teams recommend meals that match each patient’s prescribed diet, medical restrictions, food allergies, personal preferences, and appetite. Admins define and review dietary requirements; the platform supports their decisions.</p>
          </Panel>
        </div>
      </Band>

      <Band aria-labelledby="flow-h">
        <div className="container-page grid items-start gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <span className="eyebrow">How the information connects</span>
            <h2 id="flow-h" className="text-[1.6rem] leading-tight sm:text-[2rem]">From three sources to one decision</h2>
            <p>Each source is stored in structured, coded form in a relational database, so that the screening can be automatic, repeatable and explained.</p>
            <CheckList>
              <CheckItem icon={User} title="Patient information:">conditions, the prescribed diet order, allergies and intolerances recorded separately, preferences and appetite, entered by the care team and the patient.</CheckItem>
              <CheckItem icon={List} title="Hospital meal data:">the menu cycle by date and meal period, recipes with ingredient weights, available portions, SFDA’s 14 declarable allergens and Saudi Food Composition Table dish values, and MEWA local-produce data.</CheckItem>
              <CheckItem icon={BookOpen} title="Documented dietary rules:">diet categories and screening rules based on Saudi government guidance (MOH, the Saudi National Diabetes Center, SFDA, MEWA and GFSA), each with its logic, threshold, source and review status.</CheckItem>
            </CheckList>
            <p className="text-sm text-muted-foreground">Coded entries, such as choosing “Sesame” from the SFDA list instead of typing it, are what make automatic screening reliable. Text that cannot be coded is kept and sent to an admin.</p>
          </div>
          <Pipeline label="From capture to learning" steps={[
            { title: 'Capture', text: 'Coded patient records, a menu catalogue and a rule knowledge base.' },
            { title: 'Validate', text: 'Server-side validation, role permissions and review flags for incomplete information.', safety: true },
            { title: 'Screen', text: 'Allergies and the diet order first, nutrient limits per portion second.', safety: true },
            { title: 'Support', text: 'Ranked, explained suggestions; the team confirms and the kitchen prepares.' },
            { title: 'Learn', text: 'Intake and feedback improve future ranking and flag patients for professional review.' },
          ]} />
        </div>
      </Band>

      <Band tone="white" aria-labelledby="ben-h">
        <div className="container-page">
          <SectionHead eyebrow="Intended benefits" title="What CareBite is designed to support" id="ben-h" />
          <div className="grid gap-4 md:grid-cols-3">
            <Benefit icon={Target} title="Better alignment between meals and patient needs">Every offered meal has been checked against the patient’s prescribed diet, allergies and restrictions, and portions stay within the plan.</Benefit>
            <Benefit icon={ThumbsUp} title="Improved meal acceptance">Patients choose from options ranked by their own preferences and appetite, and their feedback shapes future suggestions.</Benefit>
            <Benefit icon={Leaf} title="Reduced avoidable waste">Meals patients are more likely to eat, portions matched to appetite, and leftovers tracked so the team can act on patterns, supporting the national programme to reduce food loss and waste led by the General Food Security Authority (GFSA).</Benefit>
          </div>
          <Notice className="mt-5">These are the project’s intended benefits. This prototype uses a fictional hospital and synthetic data, so it does not measure them. Its dashboard shows indicators for review and makes no claim that the platform alone causes any change.</Notice>
        </div>
      </Band>

      <Band aria-label="Data model and privacy by design">
        <div className="container-page grid items-start gap-8 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-3">
            <span className="eyebrow">Data model</span>
            <h2 className="text-[1.6rem] leading-tight sm:text-[2rem]">Relational, coded and auditable</h2>
            <p className="break-words">Main entities in the SQLite database: Users (with roles), Patients, PatientConditions, DietOrders and DietOrderCategories, PatientAllergies (allergies and intolerances kept apart), MedicalExclusions, FoodPreferences, Meals, MealIngredients, Ingredients, SfctDishes (SFDA), Dishes, DishIngredients, MealComponents, MenuCycle and MenuDates, LocalProduction (MEWA / GASTAT), DietCategories, MedicalDietaryRules, MealSchedule, MealOffers, ScheduleChanges and ScheduleEvents (the meal workflow and every change after an order), MealIntake (patient and staff records kept separately), PatientRequests and AuditLog.</p>
            <p className="text-sm text-muted-foreground">The coded structure could later be mapped to interoperability standards such as HL7 FHIR resources for nutrition orders, allergies and intolerances; this prototype does not exchange data with other systems.</p>
          </div>
          <div className="flex flex-col gap-3">
            <span className="eyebrow">Privacy and safety by design</span>
            <h2 className="text-[1.6rem] leading-tight sm:text-[2rem]">Minimum necessary information</h2>
            <CheckList>
              <CheckItem icon={Lock}>Role-based access: staff cannot change clinical information or approve meals that need review, and patients see only their own.</CheckItem>
              <CheckItem icon={Shield}>Only an admin can change clinical dietary restrictions; patients send requests instead.</CheckItem>
              <CheckItem icon={Database}>Fictional demonstration identifiers (CB-####), never medical record numbers.</CheckItem>
              <CheckItem icon={List}>An audit log of every change to a patient’s record and meals.</CheckItem>
            </CheckList>
          </div>
        </div>
      </Band>

      <Band tone="white" aria-labelledby="team-h">
        <div className="container-page">
          <SectionHead center eyebrow="Meet Our Development Team" title="Designed with Care. Built for Better Nutrition." id="team-h">
            <p>CareBite is a Health Informatics project developed to demonstrate how patient health information and nutritional data can support personalized meal recommendations and informed dietary decisions.</p>
          </SectionHead>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {TEAM.map((name, i) => (
              <li key={name} className={`relative flex flex-col items-center gap-3 overflow-hidden rounded-xl border border-border bg-card px-3 pb-5 pt-6 text-center sm:px-5 sm:pb-6 sm:pt-7 after:pointer-events-none after:absolute after:inset-x-[-30%] after:bottom-[-55%] after:h-[70%] after:opacity-70 after:content-[''] ${i % 2 ? 'after:bg-[radial-gradient(closest-side,var(--cb-mint),transparent)]' : 'after:bg-[radial-gradient(closest-side,var(--cb-rose),transparent)]'}`}>
                <span className="relative z-10 size-20 sm:size-28 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: teamPortrait(initials(name), i) }} />
                <h3 className="relative z-10 text-[1rem] font-medium sm:text-[1.1rem]">{name}</h3>
              </li>
            ))}
          </ul>
          <p className="mt-7 text-center text-muted-foreground">Developed as a university Health Informatics project focused on personalized nutrition and patient-centered decision support.</p>
          <Panel className="mx-auto mt-6 max-w-3xl">
            <h3 className="text-lg">Cite this project</h3>
            <Citation id="about-cite" />
            <p className="text-sm"><Link href="/sources">All data sources and limitations</Link></p>
          </Panel>
        </div>
      </Band>
    </>
  );
}
