import Link from "next/link";


export function Hero() {
  return (
    <div className="flex flex-col gap-16 items-center">
      <div className="flex gap-8 justify-center items-center">
        
      </div>
      <h1 className="sr-only">Bienvenido al modulo de pedido interno de compras</h1>
      <p className="text-3xl lg:text-4xl !leading-tight mx-auto max-w-xl text-center">
        Bienvenido al modulo de pedido interno de compras, 
        registrese, si ya esta regitrado legueese       
      </p>
       <Link
        href="/protected"
        className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-grey-700 transition-colors duration-200"
      >
        Dashboard
      </Link>
      <div className="w-full p-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-8" />
    </div>
  );
}
