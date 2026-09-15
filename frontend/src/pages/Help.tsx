import { useState, type FormEvent } from 'react';
import { PrivacyNoticeModal, TermsModal } from '../components/common/TermsModal';
import { useSubmitSupportRequest } from '../hooks/useSupportRequests';

export default function Help() {
  const submitRequest = useSubmitSupportRequest();
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [suggestionMessage, setSuggestionMessage] = useState('');

  function handleSupportSubmit(event: FormEvent) {
    event.preventDefault();
    submitRequest.mutate(
      { type: 'SUPPORT', subject: supportSubject, message: supportMessage },
      {
        onSuccess: () => {
          setSupportSubject('');
          setSupportMessage('');
        },
      },
    );
  }

  function handleSuggestionSubmit(event: FormEvent) {
    event.preventDefault();
    submitRequest.mutate(
      { type: 'SUGGESTION', message: suggestionMessage },
      { onSuccess: () => setSuggestionMessage('') },
    );
  }

  return (
    <div className="mx-auto max-w-[1000px] px-[18px] py-[22px]">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Help &amp; Support</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Learn about JomDekan, get help from our team, or tell us how to make it better.
      </p>

      <section className="mt-6 rounded-[22px] border border-[#ECEBF7] bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-800">About Us</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          JomDekan is a platform built for Malaysian university students to find and share academic
          resources — past papers, notes, and study materials — searchable by university, programme,
          subject, and year. Students can discuss coursework and get help through moderated forum
          discussions, and connect with verified tutors for legitimate, moderated tutoring and
          mentoring. JomDekan is built and maintained to make student life a little easier, one
          resource at a time.
        </p>
      </section>

      <section className="mt-6 rounded-[22px] border border-[#ECEBF7] bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-800">Contact Support</h2>
        <p className="mt-1 text-sm text-slate-500">
          Ran into a problem or have a question? Send us the details and our team will get back to
          you by email.
        </p>
        <form onSubmit={handleSupportSubmit} className="mt-4 space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Subject<span className="text-red-500"> *</span>
            </span>
            <input
              type="text"
              required
              minLength={3}
              maxLength={200}
              value={supportSubject}
              onChange={(e) => setSupportSubject(e.target.value)}
              placeholder="e.g. Can't download a resource"
              className="h-11 rounded-xl border border-[#E4E3F2] px-3 text-sm font-medium text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Message<span className="text-red-500"> *</span>
            </span>
            <textarea
              required
              minLength={10}
              maxLength={3000}
              rows={4}
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              placeholder="Tell us what's going on…"
              className="rounded-xl border border-[#E4E3F2] px-3 py-2 text-sm font-medium text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </label>
          <button
            type="submit"
            disabled={submitRequest.isPending}
            className="h-11 rounded-xl bg-primary-600 px-5 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitRequest.isPending ? 'Sending…' : 'Send request'}
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-[22px] border border-[#ECEBF7] bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-800">Any suggestions?</h2>
        <p className="mt-1 text-sm text-slate-500">
          Got an idea to make JomDekan better? We&apos;d love to hear it.
        </p>
        <form onSubmit={handleSuggestionSubmit} className="mt-4 space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Your suggestion<span className="text-red-500"> *</span>
            </span>
            <textarea
              required
              minLength={10}
              maxLength={3000}
              rows={4}
              value={suggestionMessage}
              onChange={(e) => setSuggestionMessage(e.target.value)}
              placeholder="What would you like to see improved or added?"
              className="rounded-xl border border-[#E4E3F2] px-3 py-2 text-sm font-medium text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </label>
          <button
            type="submit"
            disabled={submitRequest.isPending}
            className="h-11 rounded-xl bg-primary-600 px-5 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitRequest.isPending ? 'Sending…' : 'Submit suggestion'}
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-[22px] border border-[#ECEBF7] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-800">Terms of Service</h2>
            <p className="mt-1 text-sm text-slate-500">
              Review the agreement that governs your use of JomDekan.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsTermsOpen(true)}
            className="h-11 shrink-0 rounded-xl border border-[#E4E3F2] px-5 text-sm font-bold text-slate-700 transition hover:border-primary-300 hover:text-primary-700"
          >
            View Terms
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-[22px] border border-[#ECEBF7] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-800">Privacy Notice</h2>
            <p className="mt-1 text-sm text-slate-500">Review how JomDekan handles personal data and AI-related processing.</p>
          </div>
          <button type="button" onClick={() => setIsPrivacyOpen(true)} className="h-11 shrink-0 rounded-xl border border-[#E4E3F2] px-5 text-sm font-bold text-slate-700 transition hover:border-primary-300 hover:text-primary-700">View Privacy Notice</button>
        </div>
      </section>

      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
      <PrivacyNoticeModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </div>
  );
}
