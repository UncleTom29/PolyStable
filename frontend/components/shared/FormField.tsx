import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, htmlFor, hint, error, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-[#c4c0b8]"
      >
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[12px] text-dim">{hint}</p>
      )}
      {error && (
        <p className="text-[12px] text-rose flex items-center gap-1">
          <span className="inline-block w-3.5 h-3.5 rounded-full border border-rose/60 text-[9px] flex items-center justify-center shrink-0">!</span>
          {error}
        </p>
      )}
    </div>
  );
}