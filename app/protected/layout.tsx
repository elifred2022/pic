import { EnvVarWarning } from "@/components/shared/env-var-warning";
import { AuthButton } from "@/components/auth/auth-button";
import { hasEnvVars } from "@/lib/utils";
import ProtectedRealtimeListeners from "@/components/protected/protected-realtime-listeners";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col bg-[#DCE7EA] text-[#1A333C] dark:bg-[#0E1C22] dark:text-[#E6F0F2]">
      <nav className="border-b border-[#C5D5DA] dark:border-[#2C4652]">
        <div className="mx-auto flex w-full max-w-[96rem] items-center justify-between px-4 py-3 text-sm sm:px-6">
          <h1 className="text-base font-bold tracking-tight">PIC P&S</h1>
          {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
        </div>
      </nav>
      <div className="flex-1">
        <ProtectedRealtimeListeners />
        {children}
      </div>
      <footer className="border-t border-[#C5D5DA] py-6 text-center text-xs text-[#4E6570] dark:border-[#2C4652] dark:text-[#A9C0C8]">
        <p>Dev by Eli</p>
      </footer>
    </main>
  );
}
