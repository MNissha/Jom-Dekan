import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ScrollReveal as Reveal } from "../components/common/ScrollReveal";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  GraduationCap,
  Heart,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRoundCheck,
  Users,
} from "lucide-react";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2";

function ResourcePreview() {
  return (
    <div className="rounded-[22px] border border-[#E5E2F5] bg-white p-4 shadow-lg shadow-primary-900/5">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-400">
        <Search className="h-4 w-4" /> Search notes, papers or exercises
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-primary-700">
        {['University', 'Programme', 'Subject', 'Category'].map((label) => <span key={label} className="rounded-full bg-primary-50 px-2.5 py-1">{label}</span>)}
      </div>
      <div className="mt-4 rounded-2xl border border-[#ECEBF7] p-4 transition hover:border-primary-200 hover:shadow-md">
        <div className="flex items-start justify-between gap-3"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">PDF</span><Heart className="h-5 w-5 text-primary-500" /></div>
        <p className="mt-3 font-bold text-slate-800">Database Systems Study Notes</p>
        <p className="mt-1 text-xs text-slate-500">Subject-organised academic material</p>
      </div>
    </div>
  );
}

function AiPreview() {
  return (
    <div className="overflow-hidden rounded-[22px] border border-[#DDD8F4] bg-white shadow-lg shadow-primary-900/5">
      <div className="flex items-center justify-between bg-[#332475] px-4 py-3 text-white"><span className="flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4 text-amber-300" />AI Study Summary</span><span className="rounded-full bg-white/10 px-2 py-1 text-[10px]">AI-generated</span></div>
      <div className="space-y-3 p-4"><div className="rounded-xl bg-[#EFEEFB] p-3"><p className="text-xs font-bold text-primary-700">Overview</p><div className="mt-2 h-2 rounded bg-primary-200" /><div className="mt-2 h-2 w-4/5 rounded bg-primary-100" /></div><div className="flex gap-2"><span className="rounded-full border border-primary-200 px-3 py-1 text-xs font-semibold text-primary-700">Download PDF</span><span className="rounded-full border border-primary-200 px-3 py-1 text-xs font-semibold text-primary-700">Download Word</span></div><div className="flex items-center gap-2 rounded-xl border border-[#ECEBF7] px-3 py-2 text-xs text-slate-500"><Bot className="h-4 w-4 text-primary-600" />Ask this resource…</div></div>
    </div>
  );
}

function DiscussionPreview() {
  return (
    <div className="space-y-3 rounded-[22px] border border-[#E5E2F5] bg-[#FBFBFE] p-4 shadow-lg shadow-primary-900/5">
      <div className="rounded-2xl bg-white p-4 shadow-sm"><div className="flex justify-between gap-3"><p className="font-bold text-slate-800">How does normalization work?</p><span className="h-fit rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">Solved</span></div><p className="mt-2 text-xs leading-5 text-slate-500">Ask a question, reply to classmates and mark a useful answer.</p><div className="mt-3 flex gap-4 text-xs font-semibold text-slate-500"><span>12 likes</span><span>5 replies</span></div></div>
      <button type="button" tabIndex={-1} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-2 text-xs font-bold text-white"><MessageSquare className="h-4 w-4" />Start a discussion</button>
    </div>
  );
}

function SupportPreview() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-[20px] border border-[#E6E2F5] bg-white p-4 shadow-md transition hover:-translate-y-1 hover:shadow-lg"><div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-100 text-primary-700"><GraduationCap className="h-5 w-5" /></div><p className="mt-3 font-bold text-slate-800">Tutoring</p><p className="mt-1 text-xs leading-5 text-slate-500">Browse student support by mode and subject.</p></div>
      <div className="rounded-[20px] border border-[#F4E5B8] bg-white p-4 shadow-md transition hover:-translate-y-1 hover:shadow-lg"><div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-700"><BriefcaseBusiness className="h-5 w-5" /></div><p className="mt-3 font-bold text-slate-800">Opportunities</p><p className="mt-1 text-xs leading-5 text-slate-500">Discover legitimate student freelance work.</p></div>
    </div>
  );
}

const steps = [
  { number: '01', icon: UserRoundCheck, title: 'Join and set up your student profile', copy: 'Create your account, select your university and field of study, and keep your academic details together.', visual: <div className="rounded-[22px] border border-[#E5E2F5] bg-white p-5 shadow-lg shadow-primary-900/5"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-full bg-[#F5C21A] font-bold text-[#231C57]">JD</div><div><p className="font-bold text-slate-800">Your student profile</p><p className="text-xs text-slate-500">University · Field of study</p></div></div><div className="mt-4 grid grid-cols-2 gap-2">{['Study year', 'Semester'].map(x => <div key={x} className="rounded-xl bg-[#EFEEFB] p-3 text-xs font-semibold text-primary-700">{x}</div>)}</div></div> },
  { number: '02', icon: BookOpen, title: 'Find and share academic resources', copy: 'Search by university, programme, subject and category. Open text resources or supported files, and upload one or several files as one organised resource.', visual: <ResourcePreview /> },
  { number: '03', icon: Bot, title: 'Turn resources into study support', copy: 'For supported content, generate a cached AI study summary, download it as PDF or Word, or continue with questions grounded in the selected resource.', visual: <AiPreview /> },
  { number: '04', icon: MessageSquare, title: 'Ask, discuss and solve together', copy: 'Create discussion threads, reply, vote, save useful conversations and mark your own question as solved.', visual: <DiscussionPreview /> },
  { number: '05', icon: Users, title: 'Find support and opportunities', copy: 'Explore tutoring listings for academic guidance or browse legitimate freelance opportunities available through the marketplace.', visual: <SupportPreview /> },
  { number: '06', icon: Bell, title: 'Save what matters and stay updated', copy: 'Favourite resources, discussions, tutors and opportunities, then revisit them in one place and follow new activity through notifications.', visual: <div className="rounded-[22px] border border-[#E5E2F5] bg-white p-4 shadow-lg shadow-primary-900/5"><p className="text-sm font-bold text-slate-800">Saved Items</p><div className="mt-3 flex gap-2">{['Resources', 'Discussions', 'Tutors'].map((x, i) => <span key={x} className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${i === 0 ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{x}</span>)}</div><div className="mt-4 flex items-center gap-3 rounded-xl bg-[#FBFAFF] p-3"><Heart className="h-5 w-5 fill-red-400 text-red-400" /><div className="flex-1"><div className="h-2 rounded bg-primary-200" /><div className="mt-2 h-2 w-2/3 rounded bg-slate-200" /></div><Bell className="h-5 w-5 text-amber-500" /></div></div> },
];

export default function HowItWorks() {
  return (
    <div className="overflow-hidden bg-[#FBFBFE] text-slate-800">
      <section id="journey" className="page-container page-container-standard scroll-mt-24 py-grid-16 sm:py-grid-20">
        <Reveal className="text-center"><p className="text-overline uppercase text-brand-primary">How JomDekan works</p><h2 className="mt-grid-3 break-words text-page-title text-brand-secondary sm:text-4xl">From joining to getting study help</h2><p className="mx-auto mt-grid-3 max-w-2xl text-body text-content-secondary">A practical student journey built around tools already available in JomDekan.</p></Reveal>
        <div className="relative mt-14 space-y-14 sm:space-y-20"><div className="absolute bottom-8 left-6 top-8 hidden w-px bg-gradient-to-b from-primary-300 via-amber-300 to-primary-200 lg:left-1/2 lg:block" aria-hidden="true" />{steps.map(({ number, icon: Icon, title, copy, visual }, index) => <Reveal key={number} className={`relative grid items-center gap-8 lg:grid-cols-2 lg:gap-16 ${index % 2 ? 'lg:[&>*:first-child]:order-2' : ''}`}><div className="relative"><span className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-100 px-3 py-1 text-xs font-extrabold text-primary-700"><Icon className="h-4 w-4" />STEP {number}</span><h3 className="text-2xl font-extrabold text-[#231C57] sm:text-3xl">{title}</h3><p className="mt-3 max-w-xl leading-7 text-slate-600">{copy}</p><div className="mt-5 flex items-center gap-2 text-sm font-bold text-primary-700"><CheckCircle2 className="h-5 w-5 text-emerald-500" />Built into the current JomDekan experience</div></div><div className="transition duration-300 motion-safe:hover:-translate-y-1">{visual}</div></Reveal>)}</div>
      </section>

      <section className="border-y border-border bg-surface-card"><div className="page-container page-container-standard py-grid-20"><Reveal><p className="text-overline uppercase text-brand-primary">One connected workspace</p><h2 className="mt-grid-3 max-w-2xl break-words text-page-title text-brand-secondary">Useful tools without losing your study flow</h2></Reveal><div className="mt-grid-10 grid min-w-0 gap-grid-4 md:grid-cols-2 lg:grid-cols-4"><FeatureCard className="md:col-span-2 lg:row-span-2" icon={<UploadCloud />} title="Academic resources, properly organised" copy="Upload text or supported files, group multiple files in one resource, filter precisely and download what you need." large /><FeatureCard icon={<Bot />} title="AI study tools" copy="Summaries and grounded resource conversations for supported content." /><FeatureCard icon={<MessageSquare />} title="Student discussions" copy="Questions, replies, voting and solved threads." /><FeatureCard icon={<Heart />} title="Favourites" copy="Save resources, discussions and listings for later." /><FeatureCard icon={<ShieldCheck />} title="Safer participation" copy="Report inappropriate content for review without exposing admin tools." /></div></div></section>

      <section className="page-container page-container-standard py-grid-20"><Reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-feature bg-brand-secondary px-grid-6 py-grid-12 text-center text-white shadow-modal sm:px-grid-12"><div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary-500/30 blur-3xl" /><div className="relative"><GraduationCap className="mx-auto h-10 w-10 text-amber-300" /><h2 className="mt-grid-4 break-words text-page-title">Ready to make university life a little easier?</h2><p className="mx-auto mt-grid-3 max-w-xl text-body text-primary-100">Create your account and bring your resources, questions and study support together.</p><div className="mt-7 flex flex-col justify-center gap-grid-3 sm:flex-row"><Link to="/register" className={`group inline-flex min-h-control items-center justify-center gap-grid-2 rounded-full bg-amber-400 px-grid-6 text-label text-[#231C57] transition hover:-translate-y-0.5 hover:bg-amber-300 ${focusRing}`}>Create your free account<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link><Link to="/" className={`inline-flex min-h-control items-center justify-center rounded-full border border-white/40 px-grid-6 text-label text-white transition hover:-translate-y-0.5 hover:border-white hover:bg-white/10 ${focusRing}`}>Back to home</Link></div></div></Reveal></section>
    </div>
  );
}

function FeatureCard({ icon, title, copy, large = false, className = '' }: { icon: ReactNode; title: string; copy: string; large?: boolean; className?: string }) {
  return <Reveal className={className}><article className={`group h-full rounded-[22px] border border-[#ECEBF7] bg-[#FBFBFE] p-5 transition duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg ${large ? 'sm:p-7' : ''}`}><div className={`${large ? 'h-12 w-12' : 'h-10 w-10'} grid place-items-center rounded-xl bg-primary-100 text-primary-700 transition group-hover:scale-110 group-hover:bg-primary-600 group-hover:text-white [&>svg]:h-5 [&>svg]:w-5`}>{icon}</div><h3 className={`${large ? 'mt-5 text-2xl' : 'mt-4 text-lg'} font-extrabold text-[#231C57]`}>{title}</h3><p className="mt-2 leading-6 text-slate-600">{copy}</p>{large && <div className="mt-6 flex flex-wrap gap-2">{['Past papers', 'Notes', 'Slides', 'Exercises', 'Multi-file'].map(x => <span key={x} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-primary-700 shadow-sm">{x}</span>)}</div>}</article></Reveal>;
}
