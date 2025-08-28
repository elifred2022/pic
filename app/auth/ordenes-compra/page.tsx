import ListaOrdenesCompra from "@/components/lists/listaordenescompra";

export default function OrdenesCompraPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="flex flex-col gap-2 items-start">
        <ListaOrdenesCompra />
      </div>
    </div>
  );
}

