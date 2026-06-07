import { cn } from "@/lib/utils";

type ChatUsersIconProps = {
  className?: string;
};

/** Dos personas + burbuja de mensaje */
export function ChatUsersIcon({ className }: ChatUsersIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-6 w-6", className)}
      aria-hidden
    >
      {/* Persona izquierda */}
      <circle cx="6.5" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M2.5 18v-0.75c0-1.8 1.45-3.25 3.25-3.25h1.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Persona derecha (atrás) */}
      <circle cx="11" cy="7" r="2" stroke="currentColor" strokeWidth="1.75" opacity="0.85" />
      <path
        d="M7.5 17.5v-0.5c0-1.5 1.2-2.75 2.75-2.75h0.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity="0.85"
      />
      {/* Burbuja de mensaje */}
      <path
        d="M14.5 10.5h6a1.25 1.25 0 0 1 1.25 1.25v3.5A1.25 1.25 0 0 1 20.5 16.5H18l-1.75 1.75V16.5h-1.5a1.25 1.25 0 0 1-1.25-1.25v-3.5a1.25 1.25 0 0 1 1.25-1.25z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M16 13.25h4M16 15h2.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
