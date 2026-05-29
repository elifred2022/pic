import Link from "next/link";
import { getVerOrdenCompraUrl } from "@/lib/pic-links";

type OcBackLinkProps = {
  ordenCompraId: string | null;
  ordenCompraNoc?: string | null;
  variant?: "light" | "dark";
};

export function OcBackLink({
  ordenCompraId,
  ordenCompraNoc,
  variant = "light",
}: OcBackLinkProps) {
  if (!ordenCompraId) return null;

  const label = ordenCompraNoc ? `OC #${ordenCompraNoc}` : `OC (id ${ordenCompraId})`;
  const className =
    variant === "light"
      ? "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-green-800 font-bold shadow-md hover:bg-green-50 border-2 border-white transition-colors shrink-0"
      : "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-bold shadow hover:bg-blue-700 transition-colors";

  return (
    <Link
      href={getVerOrdenCompraUrl(ordenCompraId)}
      className={className}
      title="Volver a la orden de compra"
    >
      📋 {label}
    </Link>
  );
}
