# CareBite (Next.js) — conventions for contributors

CareBite is a hospital meal recommendation platform (university Health Informatics project).
This app is the Next.js 16 migration of an earlier vanilla-JS version of CareBite. Keep its
behaviour and wording; improve layout and UX.

Next.js 16 differs from older versions: read `node_modules/next/dist/docs/` when unsure
(`params`/`searchParams` are Promises; `proxy.ts` replaces middleware; `forbidden()` is enabled).

## Stack
- Next.js 16 App Router, React 19, TypeScript (domain code is plain JS in `domain/`, used untyped).
- Tailwind v4 + shadcn-style components in `components/ui` built on **Base UI** (`@base-ui/react`),
  with **transitions.dev** CSS (`app/styles/transitions.css`, classes `t-*`).
- better-auth (server sessions in SQLite, HttpOnly cookie, no JWT). RBAC in `domain/rbac.js`.
- SWR for client reads with server-fetched `fallbackData`.

## Roles and RBAC (primary authorization)
Three roles: `admin` (everything, incl. clinical edits, review approvals, menu verification, staff
access), `staff` (daily meal service; no clinical edits/approvals/access management), `patient`
(own record only). Permissions are named in `domain/rbac.js` (e.g. `patient:list`,
`patient:edit-clinical`, `meal:approve-review`, `kitchen:progress`, `menu:verify`, `staff:manage`).
- Pages: `const actor = await requirePermission('<permission>', '/path')` (from `@/lib/server/session`).
  Patient pages: `requirePermission('patient:read', ...)` then check `actor.role === 'patient'`
  (use `forbidden()` from `next/navigation` for other roles where the page is patient-only).
- UI: hide actions the role lacks using `viewer.permissions` (from `getViewer()`), passed as props.
  The server re-checks everything; the UI hiding is convenience only.

## Data-page pattern (copy `app/schedule/`)
1. `page.tsx` (server component): `requirePermission(...)`, read `searchParams`, fetch initial data
   with `serviceCall((s) => s.someMethod(actor, …))` (from `@/lib/server/data`; maps 404/403/401).
   Export `metadata = privateMetadata('Title')` for signed-in pages, or `pageMetadata({...})` for
   public pages (from `@/lib/seo`).
2. `*-view.tsx` (client component, `'use client'`): `useApi(key, fallback)` from `@/lib/api-client`
   where `key` is the API path (see `domain/routes.js` for every endpoint) built with `apiPath()`.
   Pass the server data as fallback **only when the key equals the initial key**.
   Update the URL with `window.history.replaceState` (no RSC round-trip).
3. Mutations: `await apiSend('POST' | 'PATCH' | 'DELETE', path, body)` then `mutate()` the SWR
   key(s) (from `useApi()` result or `useSWRConfig().mutate`). On `ApiError`, show
   `err.errors` per field (`FormErrors` + `FieldError` from `@/components/forms/errors`) and
   `err.message` otherwise. Success → `toast('…')` from `@/components/ui/toast`.
   Never call `fetch` directly; never put secrets or tokens in client code.

The JSON API is `app/api/[...path]/route.ts` → `lib/server/api-handler.ts` (CSRF: same origin +
`X-CareBite-Request` header, which `apiSend` adds). Auth endpoints are better-auth at `/api/auth/*`
(use `authClient` from `@/lib/auth-client`).

## Components you should reuse (do not modify shared files; create area-local ones instead)
- `components/ui`: `Button`/`buttonVariants`, `Input`/`Textarea`/`NativeSelect`/`Label`, `Field`
  (label+hint+error with shake), `OptionCard` (radio/checkbox cards), `Badge`, `Card`, `Notice`,
  `Dialog*` (Base UI modal: `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`,
  `DialogDescription`, `DialogBody`, `DialogFooter`, `DialogClose`), `DropdownMenu*`, `Popover*`,
  `Tabs`/`TabsList`/`TabsTab`/`TabsPanel`, `Accordion`, `Skeleton`/`LoadingBlock`, `Tooltip`
  (icon hints), `Table`/`Th`/`Td`, `SuccessCheck`, `toast()`.
  Controlled dialogs: `<Dialog open={open} onOpenChange={setOpen}>`; focus returns to the opener.
- `components/cb`: `EntryChip`, `ScreenChip`, `Stepper`, `RequestStatusChip`, `FlagChips`,
  `AppetiteChip`, `AllergyChips`, `PeriodStrip`, `DietNames`/`DietCodes` (toggletips), `Toggletip`,
  `MealArt`, `NutriSummary`, `MealType`, `AllergenLine`, `LocalLine`, `WhyThisMeal`, `MealRow`,
  `DateNav`, `PatientHeader`, `Pid`, `AboutNav`, `EmptyState`, `Stat`; labels in `components/cb/labels.ts`.
- `components/forms`: `SectionFields`/`readSection`/`SectionSummary` (patient profile sections),
  `IntakeFields`/`readIntake`, `IngredientPicker`, `TextList`, `Fieldset`, `Options`,
  `FormErrors`/`FieldError`/`scrollToFirstError`.
- `components/site`: `PageHead`, `PageBody`. Header/footer are global (in `app/layout.tsx`).
- `lib/format.ts` (`formatDate`, `formatLongDate`, `formatDateTime`, `timeAgo`, `plural`, `isoDate`),
  `lib/site.ts` (`TEAM`, `DISCLAIMER`, `CITATION`, nav), `lib/art.js` (`heroArt`, `botanical`, `teamPortrait`).
- Icons: `lucide-react` (always `aria-hidden` on decorative icons).

## Design and accessibility rules (from the project brief — keep them)
- Palette tokens only (Tailwind classes: `bg-background`, `bg-blush`, `bg-mint`, `bg-rose`,
  `bg-sage`, `text-heading`, `text-rose-ink`, `bg-primary`, …). No black backgrounds.
  Fonts: Poppins (`font-display`) for headings/buttons, Nunito body.
- **Mobile first**: design for 360–390 px first; no horizontal page scroll (tables scroll inside
  `Table`); primary actions full-width or easy to reach on phones; 44 px tap targets.
- Status is always text + icon, never colour alone. Diet codes explained via toggletips.
- Every form control has a visible label; errors are specific; dialogs are keyboard usable.
- Empty, loading (`loading.tsx` with `LoadingBlock`), success and error states explain next steps.
- Exact required texts (keep verbatim where they appear in the old pages), e.g. the My Food Profile
  notice and the patient messages "Choose your lunch." / "Your choice has been sent to the nutrition
  team." / "Your meal is confirmed." / "Your meal is being prepared." / "Your meal has been delivered."
- Never claim notifications, real identity verification, storage or hospital integrations work.
- Use the demo/synthetic wording the old pages use. No shopping lists or consumer features.

## SEO (public pages)
Server-render content, one `h1`, semantic landmarks, `pageMetadata({ title, description, path })`,
JSON-LD where meaningful (`jsonLd()` helper; add `nonce` from `(await headers()).get('x-nonce')`
to `<script type="application/ld+json">`). Private pages use `privateMetadata` (noindex).

## Dev and testing
- `npm run dev` starts the development server at http://localhost:3000 (auth config changes need a restart,
  because the server runtime is created once per process).
- Demo accounts (password `CareBite#2026`, demonstration access only): `admin.demo`, `staff.demo`,
  `noura.1001` (patient CB-1001), `khalid.1004` (patient CB-1004); `layla.applicant` is a pending staff request.
- `npm run typecheck`, `npm test` (domain, RBAC and password-policy tests), and `npm run test:e2e`
  (cross-role browser test; run it against a freshly seeded server: `npm run reset-db`, then start the server).
- Sign-in is rate limited (5 per minute per IP) and sign-up (5 per 5 minutes per IP); a 429 during tests means wait.
