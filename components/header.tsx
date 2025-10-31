import Image from "next/image"

export function Header() {
  return (
    <header className="w-full bg-[#25ABB9] sticky top-0 z-50">
      <div className="py-3">
        <div className="container mx-auto px-4 relative">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Image
                src="/logo-1.png"
                alt="Café Quindío"
                width={240}
                height={80}
                className="h-8 sm:h-10 md:h-12 w-auto object-contain"
                priority
              />
            </div>
          </div>

          <div className="sm:hidden mt-2 text-center">
            <h1 className="text-base sm:text-lg font-bold tracking-wide text-white">
              Simulador de Comodatos Financieros
            </h1>
          </div>

          <div className="hidden sm:block absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none w-full px-4">
            <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-wide text-white text-center">
              Simulador de Comodatos Financieros - Gerencia Comercial
            </h1>
          </div>
        </div>
      </div>
    </header>
  )
}
