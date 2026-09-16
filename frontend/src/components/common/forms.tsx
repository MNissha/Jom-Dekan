import {
  forwardRef,
  type FieldsetHTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { controlClassName } from "./controlStyles";

export function FormField({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex min-w-0 flex-col gap-grid-1 ${className}`}>{children}</div>;
}

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(function Label(
  { className = "", ...props }, ref,
) {
  return <label ref={ref} className={`text-label text-content-secondary ${className}`} {...props} />;
});

export function HelpText({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) {
  return <p id={id} className={`text-caption text-content-muted ${className}`}>{children}</p>;
}

export function ErrorMessage({ id, children, className = "" }: { id?: string; children?: ReactNode; className?: string }) {
  if (!children) return null;
  return <p id={id} className={`text-caption text-danger ${className}`} role="alert">{children}</p>;
}

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  invalid?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({
  invalid = false,
  prefix,
  suffix,
  containerClassName = "",
  className = "",
  "aria-invalid": ariaInvalid,
  ...props
}, ref) {
  const input = <input ref={ref} aria-invalid={ariaInvalid ?? (invalid || undefined)} className={controlClassName(invalid, `${prefix ? "pl-10" : ""} ${suffix ? "pr-10" : ""} ${className}`)} {...props} />;
  if (!prefix && !suffix) return input;
  return (
    <div className={`relative min-w-0 ${containerClassName}`}>
      {prefix && <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-content-muted">{prefix}</span>}
      {input}
      {suffix && <span className="absolute inset-y-0 right-0 flex min-w-10 items-center justify-center text-content-muted">{suffix}</span>}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea(
  { invalid = false, className = "", "aria-invalid": ariaInvalid, ...props }, ref,
) {
  return <textarea ref={ref} aria-invalid={ariaInvalid ?? (invalid || undefined)} className={controlClassName(invalid, `min-h-24 resize-y ${className}`)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(function Select(
  { invalid = false, className = "", "aria-invalid": ariaInvalid, ...props }, ref,
) {
  return <select ref={ref} aria-invalid={ariaInvalid ?? (invalid || undefined)} className={controlClassName(invalid, `appearance-none pr-10 ${className}`)} {...props} />;
});

export const Checkbox = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type">>(function Checkbox(
  { className = "", ...props }, ref,
) {
  return <input ref={ref} type="checkbox" className={`h-5 w-5 shrink-0 rounded border-border text-brand-primary accent-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55 ${className}`} {...props} />;
});

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export function RadioGroup({
  name,
  value,
  options,
  onChange,
  legend,
  className = "",
  ...props
}: Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, "onChange"> & {
  name: string;
  value?: string;
  options: RadioOption[];
  onChange: (value: string) => void;
  legend: ReactNode;
}) {
  return (
    <fieldset className={`min-w-0 ${className}`} {...props}>
      <legend className="text-label text-content-secondary">{legend}</legend>
      <div className="mt-grid-2 grid gap-grid-2">
        {options.map((option) => (
          <label key={option.value} className="flex min-h-control cursor-pointer items-start gap-grid-3 rounded-control border border-border bg-surface-card p-grid-3 text-body-sm text-content-primary has-[:checked]:border-border-focus has-[:checked]:bg-brand-primary-soft has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-55">
            <input type="radio" name={name} value={option.value} checked={value === option.value} disabled={option.disabled} onChange={() => onChange(option.value)} className="mt-0.5 h-5 w-5 shrink-0 accent-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus" />
            <span className="min-w-0"><span className="font-label">{option.label}</span>{option.description && <span className="mt-grid-1 block text-caption text-content-muted">{option.description}</span>}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
