import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { TERMS_LAST_UPDATED, TERMS_SECTIONS, type TermsSection } from '../../constants/termsAndConditions';
import { PRIVACY_LAST_UPDATED, PRIVACY_SECTIONS } from '../../constants/privacyNotice';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

function LegalModal({ isOpen, onClose, onAccept, title, label, description, updated, sections }: LegalModalProps & { title: string; label: string; description: string; updated: string; sections: TermsSection[] }) {
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKeyDown); };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const titleId = `${label.toLowerCase().replace(/\W+/g, '-')}-modal-title`;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl motion-safe:animate-[modalRise_180ms_ease-out]">
        <div className="relative shrink-0 bg-gradient-to-r from-primary-900 via-primary-800 to-primary-600 px-6 py-6 text-white">
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:rotate-90 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transform-none"><X className="h-4 w-4" /></button>
          <span className="inline-block rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-900">{label}</span>
          <h2 id={titleId} className="mt-3 text-xl font-bold">{title}</h2>
          <p className="mt-1 pr-8 text-sm text-primary-100">{description}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <p className="text-xs text-slate-400">Last updated: {updated}</p>
          <div className="mt-4 space-y-5">{sections.map(section => <section key={section.heading}><h3 className="text-sm font-semibold text-slate-900">{section.heading}</h3>{section.body.map((paragraph, index) => <p key={index} className="mt-1.5 text-sm leading-relaxed text-slate-600">{paragraph}</p>)}</section>)}</div>
        </div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-full border border-slate-300 px-5 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">Close</button>
          {onAccept && <button type="button" onClick={onAccept} className="rounded-full bg-primary-600 px-5 py-2.5 font-medium text-white transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">I agree</button>}
        </div>
      </div>
    </div>, document.body,
  );
}

export function TermsModal(props: LegalModalProps) {
  return <LegalModal {...props} label="Terms & Conditions" title="JomDekan Terms & Conditions" description="Please read this agreement carefully before creating or using your account." updated={TERMS_LAST_UPDATED} sections={TERMS_SECTIONS} />;
}

export function PrivacyNoticeModal(props: LegalModalProps) {
  return <LegalModal {...props} label="Privacy Notice" title="JomDekan Privacy Notice / Notis Privasi" description="How JomDekan collects, uses, shares, stores, and protects personal data." updated={PRIVACY_LAST_UPDATED} sections={PRIVACY_SECTIONS} />;
}
