import { controlClassName } from "../components/common/controlStyles";

// Compatibility helper for existing react-hook-form fields. New form markup
// should use the typed Input primitive directly.
export function fieldClassName(hasError: boolean): string {
  return controlClassName(hasError, "mt-grid-1");
}
