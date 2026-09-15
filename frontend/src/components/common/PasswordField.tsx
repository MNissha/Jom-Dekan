import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

// Shared show/hide password input used across auth forms (login, register)
// so the toggle behaviour and error styling never drift between them.
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ hasError, className, id, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative mt-1">
        <input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={hasError}
          className={`w-full rounded-lg border px-3 py-2 pr-10 transition-colors focus:outline-none focus:ring-2 ${
            hasError
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
              : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500'
          } ${className ?? ''}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition-colors hover:text-slate-600"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          tabIndex={-1}
        >
          {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);
PasswordField.displayName = 'PasswordField';
