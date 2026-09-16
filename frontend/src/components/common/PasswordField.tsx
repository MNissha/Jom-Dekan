import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { controlClassName } from './controlStyles';
import { IconButton } from './ui';

interface PasswordFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

// Shared show/hide password input used across auth forms (login, register)
// so the toggle behaviour and error styling never drift between them.
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ hasError, className, id, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative mt-1 min-w-0">
        <input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={hasError}
          className={controlClassName(Boolean(hasError), `password-field-input pr-12 ${className ?? ''}`)}
          {...props}
        />
        <span className="absolute inset-y-0 right-0 flex items-center">
          <IconButton
            onClick={() => setVisible((prev) => !prev)}
            variant="ghost"
            className="h-full rounded-l-none rounded-r-control text-content-muted shadow-none hover:bg-surface-muted hover:text-content-primary"
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            tabIndex={-1}
          >
            {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </IconButton>
        </span>
      </div>
    );
  },
);
PasswordField.displayName = 'PasswordField';
