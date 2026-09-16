import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button, IconButton } from './ui';
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
    <div className="overlay-root">
      <div className="overlay-backdrop" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="dialog-surface max-w-2xl">
        <div className="dialog-header relative bg-gradient-to-r from-primary-900 via-primary-800 to-primary-600 px-6 py-6 text-white">
          <IconButton onClick={onClose} aria-label="Close" size="small" variant="ghost" className="absolute right-4 top-4 rounded-full bg-white/10 text-white shadow-none hover:rotate-90 hover:bg-white/20 focus-visible:ring-white motion-reduce:transform-none"><X className="h-4 w-4" /></IconButton>
          <span className="inline-block rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-900">{label}</span>
          <h2 id={titleId} className="mt-3 text-xl font-bold">{title}</h2>
          <p className="mt-1 pr-8 text-sm text-primary-100">{description}</p>
        </div>
        <div className="dialog-body flex-1 px-6 py-5">
          <p className="text-xs text-content-muted">Last updated: {updated}</p>
          <div className="mt-4 space-y-5">{sections.map(section => <section key={section.heading}><h3 className="text-sm font-semibold text-content-primary">{section.heading}</h3>{section.body.map((paragraph, index) => <p key={index} className="mt-1.5 text-sm leading-relaxed text-content-secondary">{paragraph}</p>)}</section>)}</div>
        </div>
        <div className="dialog-footer flex justify-end gap-3 px-6 py-4">
          <Button onClick={onClose} variant="secondary" className="rounded-full">Close</Button>
          {onAccept && <Button onClick={onAccept} className="rounded-full">I agree</Button>}
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
