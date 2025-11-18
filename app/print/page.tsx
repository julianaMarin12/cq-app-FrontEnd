"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft } from "lucide-react"
import { productsDatabase, zones } from "@/lib/products-data"

type PrintItem = {
  productId: string
  zoneId: string
  quantity: number
  manualPrice?: number
}

export default function PrintPage() {
  const router = useRouter()
  const [items, setItems] = useState<PrintItem[]>([])
  const [years, setYears] = useState<number>(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const originalTitle = document.title
      document.title = ""
      return () => {
        document.title = originalTitle
      }
    } catch {
      return
    }
  }, [])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("cq_print_payload")
      if (!raw) {
        setLoaded(true)
        return
      }
      const parsed = JSON.parse(raw)
      setItems(parsed.items || [])
      setYears(parsed.years || 0)
      setMachines(parsed.machines || [])
      setTotalMachinesInvestment(parsed.machinesInvestment || 0)
      setTotalInvestment(parsed.totalInvestment || 0)

      // Escribir también un estado de simulación para que al volver se restaure la UI
      try {
        const simState = {
          categoria: "",
          linea: "",
          sublinea: "",
          // Estimamos "investment" como total - máquinas (si está disponible)
          investment: String((parsed.totalInvestment || 0) - (parsed.machinesInvestment || 0)),
          years: String(parsed.years || ""),
          items: parsed.items || [],
          machinesSelected: (parsed.machines || []).map((m: any) => ({ machineId: m.machineId, quantity: m.quantity || 1 })),
          machinePicker: "",
          showResults: true,
          lastIrr: null,
          simulationVersion: 1,
        }
        sessionStorage.setItem("cq_simulation_state", JSON.stringify(simState))
      } catch {
        // ignore
      }
    } catch {
    } finally {
      setLoaded(true)
    }
  }, [])

  const [machines, setMachines] = useState<any[]>([])
  const [totalMachinesInvestment, setTotalMachinesInvestment] = useState<number>(0)
  const [totalInvestment, setTotalInvestment] = useState<number>(0)

  const resolvePrice = (sel: PrintItem) => {
    if (!sel.productId) return 0
    const product = productsDatabase.find((p) => p.id === sel.productId)
    if (!product) return 0
    if (sel.manualPrice !== undefined) return sel.manualPrice
    if (sel.zoneId === "otro") return sel.manualPrice ?? 0
    const zone = zones.find((z) => z.id === sel.zoneId)
    const zoneKey = zone?.key
    const price = zoneKey ? (product.prices as any)[zoneKey] : 0
    return price && price > 0 ? price : 0
  }

  const formatCurrency = (v?: number) =>
    v == null ? "-" : `$${Number(v).toLocaleString("es-ES", { maximumFractionDigits: 0 })}`
  // Extrae unidades e indica si la descripción refiere a cápsulas
  const parseUnitsInfoFromDescription = (desc?: string): { count?: number; isCapsule?: boolean } => {
    if (!desc) return {}
    const unitWords = "(cápsulas|capsulas|caps|cápsula|capsula|uds|unidades|comprimidos|tabletas|comprimido|tableta)"
    const re1 = new RegExp("(\\d+)\\s*" + unitWords + "\\b", "i")
    const m1 = desc.match(re1)
    if (m1 && m1[1]) {
      const n = Number(m1[1])
      const unitWord = (m1[2] || "").toLowerCase()
      const isCapsule = /cápsulas|capsulas|caps|cápsula|capsula/i.test(unitWord)
      return { count: Number.isFinite(n) && n > 0 ? n : undefined, isCapsule }
    }
    const re2 = /x\s*(\d+)\b/i
    const m2 = desc.match(re2)
    if (m2 && m2[1]) {
      const n = Number(m2[1])
      return { count: Number.isFinite(n) && n > 0 ? n : undefined, isCapsule: false }
    }
    const re3 = /(\d+)\s*x\b/i
    const m3 = desc.match(re3)
    if (m3 && m3[1]) {
      const n = Number(m3[1])
      return { count: Number.isFinite(n) && n > 0 ? n : undefined, isCapsule: false }
    }
    return {}
  }

  const formatCurrencyDecimals = (v?: number) =>
    v == null ? "-" : `$${Number(v).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Nuevo handler para volver: asegura que el estado de simulación está guardado y recarga la página principal
  const handleBack = () => {
    try {
      const simState = {
        categoria: "",
        linea: "",
        sublinea: "",
        investment: String((totalInvestment || 0) - (totalMachinesInvestment || 0)),
        years: String(years || ""),
        items,
        machinesSelected: machines.map((m) => ({ machineId: m.machineId, quantity: m.quantity || 1 })),
        machinePicker: "",
        showResults: true,
        lastIrr: null,
        simulationVersion: 1,
      }
      sessionStorage.setItem("cq_simulation_state", JSON.stringify(simState))
    } catch {
      // ignore
    }
    // FORZAR recarga completa para que la página principal monte y restaure desde sessionStorage
    try {
      window.location.href = "/"
    } catch {
      // fallback a router si por algún motivo no está disponible
      try { router.push("/") } catch {}
    }
  }

  if (loaded && items.length === 0 && machines.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Imprimir simulación</h1>
        <p className="text-gray-600 mb-6">No hay datos de simulación para imprimir.</p>
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />Volver
        </Button>
      </div>
    )
  }

  return (
    <div
      className="p-4 sm:p-8 min-h-screen"
      style={
        {
          fontFamily: '"Neutra Text", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6), rgba(255,255,255,0.6)), url(/Hoja.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
          ["--primary" as any]: "#25ABB9",
          ["--primary-foreground" as any]: "#ffffff",
        } as any
      }
    >
      <div className="w-full max-w-full sm:max-w-5xl mx-auto">
        {/* Encabezado responsive: columna en móvil, fila en sm+ */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8 border-b border-gray-300 pb-4 sm:pb-6">
          <div className="flex items-center gap-4">
            <img src="/Logo.png" alt="Café Quindío" className="h-10 sm:h-12 w-auto object-contain" />
            {/* título visible en sm+ al lado del logo */}
            <div className="hidden sm:block">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">Resumen de la simulación</h1>
              <p className="text-sm text-gray-600 mt-1">Lista de productos con precio unitario, pedido mínimo y años proyectados.</p>
            </div>
          </div>

          {/* en móvil mostrar título/desc debajo del logo para mejor legibilidad */}
          <div className="block sm:hidden text-left">
            <h1 className="text-base font-bold text-gray-900">Resumen de la simulación</h1>
            <p className="text-sm text-gray-600 mt-1">Lista de productos con precio unitario, pedido mínimo y años proyectados.</p>
          </div>

          <div className="flex gap-2 sm:gap-3 items-center text-sm">
            <Button
              variant="outline"
              onClick={handleBack}
              className="border-gray-400 text-gray-700 hover:bg-gray-50 no-print text-xs sm:text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <Button
              onClick={() => window.print()}
              className="bg-[#25ABB9] hover:bg-[#1e8a95] text-white no-print text-xs sm:text-sm"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* Tabla: overflow horizontal en móviles, textos y paddings más compactos */}
        <div className="overflow-x-auto">
          <div className="min-w-[640px] border border-gray-300">
            <table className="w-full border-collapse text-xs sm:text-sm">
             <thead>
               <tr className="bg-[#25ABB9] text-white">
                <th className="p-3 sm:p-4 text-left font-semibold border-b border-gray-400">Producto</th>
                <th className="p-3 sm:p-4 text-right font-semibold border-b border-gray-400">Precio unitario</th>
                <th className="p-3 sm:p-4 text-right font-semibold border-b border-gray-400">Precio / cápsula</th>
                <th className="p-3 sm:p-4 text-center font-semibold border-b border-gray-400">Pedido mínimo</th>
                <th className="p-3 sm:p-4 text-center font-semibold border-b border-gray-400">Duración</th>
               </tr>
             </thead>
             <tbody>
              {items.map((it, idx) => {
                 const product = productsDatabase.find((p) => p.id === it.productId)
                 const desc = product ? product.description : it.productId
                 const price = resolvePrice(it)
                 // detectar unidades y cápsulas a partir de la descripción del producto
                 const unitsInfo = parseUnitsInfoFromDescription(product?.description)
                 const unitsCount = unitsInfo.count
                 const isCapsule = !!unitsInfo.isCapsule
                 const pricePerCapsule = typeof unitsCount === "number" && unitsCount > 0 ? price / unitsCount : undefined
                 const lineTotal = price * (it.quantity || 0)
                 return (
                   <tr
                     key={idx}
                     className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} border-b border-gray-200`}
                   >
                    <td className="p-3 sm:p-4 text-gray-800 font-medium">{desc}</td>
                    <td className="p-3 sm:p-4 text-right text-gray-800 font-medium">{formatCurrency(price)}</td>
                    <td className="p-3 sm:p-4 text-right text-gray-800 font-medium">
                      {pricePerCapsule != null ? formatCurrencyDecimals(pricePerCapsule) : "-"}
                      {unitsCount && (
                        <div className="text-xs text-gray-500 mt-1">
                        </div>
                      )}
                    </td>
                    <td className="p-3 sm:p-4 text-center text-gray-800">{it.quantity}</td>
                    <td className="p-3 sm:p-4 text-center text-gray-800">{years} {years === 1 ? "mes" : "meses"}</td>
                   </tr>
                 )
               })}
             </tbody>
            </table>
          </div>
         </div>
 
        {/* Máquinas seleccionadas (mostrar unidad, cantidad y total por línea) */}
        {machines && machines.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">Máquinas seleccionadas</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#25ABB9] text-white">
                    <th className="p-2 text-left">Máquina</th>
                    <th className="p-2 text-right">Valor antes de IVA (unit.)</th>
                    <th className="p-2 text-center">Cantidad</th>
                    <th className="p-2 text-right">Total (unit. × qty)</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.map((m, idx) => {
                    const lineTotal = (m.unitPriceBeforeIva || 0) * (m.quantity || 0)
                    return (
                      <tr key={idx} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                        <td className="p-2">{m.description}</td>
                        <td className="p-2 text-right">{formatCurrency(m.unitPriceBeforeIva)}</td>
                        <td className="p-2 text-center">{m.quantity}</td>
                        <td className="p-2 text-right">{formatCurrency(lineTotal)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
           </div>
         )}
 
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row sm:justify-between text-xs text-gray-500 border-t border-gray-300 pt-4 gap-2">
           <div>Fecha: {new Date().toLocaleString("es-ES", {
             year: "numeric",
             month: "2-digit",
             day: "2-digit",
             hour: "2-digit",
             minute: "2-digit",
             hour12: false
           })}</div>
          <div className="text-right">Café Quindío ®</div>
         </div>
       </div>
 
       {/* Estilos de impresión */}
       <style jsx>{`
         @media print {
          /* Forzar fondo visible en impresión (si el navegador lo permite) */
           body, html {
             margin: 0;
             padding: 0;
             -webkit-print-color-adjust: exact;
             print-color-adjust: exact;
             background-image: linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url('/Fondo.jpg') !important;
             background-size: cover !important;
             background-position: center !important;
             background-repeat: no-repeat !important;
             background-attachment: scroll !important;
           }
 
           .no-print { display: none !important; }
 
 
           table { font-size: 12px; border-collapse: collapse; width: 100%; }
           th, td { padding: 10px !important; border: 1px solid #ddd !important; }
 
           thead tr th {
             background-color: #25ABB9 !important;
             color: #ffffff !important;
             -webkit-print-color-adjust: exact;
             print-color-adjust: exact;
           }
 
           tbody tr:nth-child(odd) { background: #ffffff !important; }
           tbody tr:nth-child(even) { background: #f8fafc !important; }
         }
       `}</style>
     </div>
   )
 }