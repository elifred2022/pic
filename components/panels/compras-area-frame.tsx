"use client";

import Link from "next/link";
import { Atkinson_Hyperlegible, Bricolage_Grotesque } from "next/font/google";
import type {
  ComprasAreaTone,
  ComprasModuleItem,
} from "@/components/panels/compras-module-card";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600"],
});

const text = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
});

const areaTones: Record<ComprasAreaTone, { ink: string; wash: string }> = {
  proveedores: { ink: "#1F5F7A", wash: "#E3F0F5" },
  usuarios: { ink: "#2F5C49", wash: "#E5F2EB" },
  articulos: { ink: "#7A5B22", wash: "#F6EEDC" },
  pedidos: { ink: "#3E5270", wash: "#E7EDF4" },
  productivos: { ink: "#1F5F7A", wash: "#E3F0F5" },
  ordenes: { ink: "#1B6454", wash: "#E3F3EE" },
  indicadores: { ink: "#24556E", wash: "#E4F0F6" },
  consultas: { ink: "#4A5C64", wash: "#E8EEEF" },
};

type ComprasAreaFrameProps = {
  title: string;
  description: string;
  tab: string;
  backHref?: string;
  backLabel?: string;
  hideBack?: boolean;
  width?: "desk" | "work" | "full";
  children: React.ReactNode;
};

export function ComprasAreaFrame({
  title,
  description,
  tab,
  backHref = "/auth/modulo-compras",
  backLabel = "Volver al módulo de compras",
  hideBack = false,
  width = "work",
  children,
}: ComprasAreaFrameProps) {
  const desk = width === "desk";

  return (
    <div
      className={`${text.className} ${hideBack ? "min-h-full" : "min-h-screen"} bg-[#DCE7EA] text-[#1A333C] print:bg-white dark:bg-[#0E1C22] dark:text-[#E6F0F2]`}
    >
      <div
        className={`mx-auto w-full py-6 print:max-w-none print:p-0 sm:py-8 ${
          width === "full"
            ? "max-w-none px-3 sm:px-4"
            : desk
              ? "max-w-5xl px-4 sm:px-6 sm:py-12"
              : "max-w-[96rem] px-4 sm:px-6"
        }`}
      >
        <div className="print:hidden">
          {!hideBack && (
            <Link
              href={backHref}
              className="inline-flex rounded-md text-sm font-bold text-[#1F5F7A] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1F6B5A] dark:text-[#9FD0E4] dark:focus-visible:outline-[#E0C27A]"
            >
              {backLabel}
            </Link>
          )}

          <h1
            className={`${display.className} max-w-[18ch] font-semibold leading-[1.05] tracking-[-0.03em] text-[#16303A] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700 dark:text-[#F3F7F8] ${
              hideBack ? "mt-0" : "mt-6"
            } ${
              desk
                ? "text-[2.5rem] sm:text-5xl"
                : "text-[2.15rem] sm:text-4xl"
            }`}
          >
            {title}
          </h1>
          <p className="mt-3 max-w-[40rem] text-lg leading-relaxed text-[#4E6570] dark:text-[#A9C0C8]">
            {description}
          </p>
        </div>

        <div className={desk ? "mt-10 print:mt-0" : "mt-8 print:mt-0"}>
          <div className="inline-flex rounded-t-lg bg-[#E0C27A] px-4 py-2 text-sm font-bold text-[#2C2416] print:hidden">
            {tab}
          </div>
          <div className="-mt-px overflow-hidden rounded-b-xl rounded-tr-xl border border-[#C5D5DA] bg-[#F7FBFC] print:mt-0 print:rounded-none print:border-0 print:bg-white dark:border-[#2C4652] dark:bg-[#173038]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ComprasFolderList({
  items,
  label,
}: {
  items: ComprasModuleItem[];
  label: string;
}) {
  return (
    <ul
      aria-label={label}
      className="grid grid-cols-1 gap-px bg-[#D3E0E3] md:grid-cols-2 dark:bg-[#2C4652]"
    >
      {items.map((item) => {
        const tone = areaTones[item.tone ?? "consultas"];
        return (
          <li
            key={item.href}
            className="bg-[#F7FBFC] md:[&:last-child:nth-child(odd)]:col-span-2 dark:bg-[#173038]"
          >
            <Link
              href={item.href}
              className="flex min-h-[5.5rem] items-center gap-4 px-5 py-4 motion-safe:transition-colors hover:bg-[#E7F2F4] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#1F6B5A] dark:hover:bg-[#1E3C48] dark:focus-visible:outline-[#E0C27A]"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md"
                style={{ backgroundColor: tone.wash, color: tone.ink }}
              >
                {item.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-base font-bold leading-snug text-[#16303A] dark:text-[#F3F7F8]">
                  {item.title}
                </span>
                <span className="mt-0.5 block text-sm leading-snug text-[#4E6570] dark:text-[#A9C0C8]">
                  {item.description}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
