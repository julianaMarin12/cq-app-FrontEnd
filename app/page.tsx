"use client"
import { useRouter } from "next/navigation"
import type React from "react"

import { useState, useMemo, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash, Plus, RotateCw, Printer } from "lucide-react"
import { MetricsCards } from "@/components/metrics-cards"
import { Header } from "@/components/header"
import {
  zones,
  getCategories,
  getLineasByCategoria,
  getSublineasByLinea,
  getProductsByFilters,
} from "@/lib/products-data"
import { productsDatabase } from "@/lib/products-data" 
import { calculateMetrics } from "@/lib/cash-flow-calculator"
import type { ProductSelection } from "@/lib/cash-flow-calculator"
import machinesJson from "@/lib/machines-data.json"

interface MachineEntry { id: string; type: string; description: string; priceBeforeIva: number }
const machinesDatabase = machinesJson as MachineEntry[]

export default function CashFlowSimulator() {
	const router = useRouter()

  const [categoria, setCategoria] = useState("")
  const [linea, setLinea] = useState("")
  const [sublinea, setSublinea] = useState("")
  const [investment, setInvestment] = useState("")
  const [years, setYears] = useState("")
  const [showResults, setShowResults] = useState(false)
  const [lastIrr, setLastIrr] = useState<number | null>(null)

  const [simulationVersion, setSimulationVersion] = useState(0)

  const [items, setItems] = useState<ProductSelection[]>([
    { productId: "", zoneId: "", quantity: 1, manualPrice: undefined },
  ])

  const [machinesSelected, setMachinesSelected] = useState<{ machineId: string; quantity: number }[]>([])
  const [machinePicker, setMachinePicker] = useState<string>("")

  const categorias = useMemo(() => getCategories(), [])
  const lineas = useMemo(() => (categoria ? getLineasByCategoria(categoria) : []), [categoria])
  const sublineas = useMemo(() => (categoria && linea ? getSublineasByLinea(categoria, linea) : []), [categoria, linea])
  const filteredProducts = useMemo(() => {
    if (categoria && linea && sublinea) {
      return getProductsByFilters(categoria, linea, sublinea)
    }
    return []
  }, [categoria, linea, sublinea])

  const handleCategoriaChange = (newCategoria: string) => {
    setCategoria(newCategoria)
    setLinea("")
    setSublinea("")
    setItems([{ productId: "", zoneId: "", quantity: 1 }])
  }

  const handleLineaChange = (newLinea: string) => {
    setLinea(newLinea)
    setSublinea("")
  }

  const handleSublineaChange = (newSublinea: string) => {
    setSublinea(newSublinea)
  }

  const formatCurrencyForInput = (value?: number | string) => {
    if (value == null || value === "") return ""
    const num = typeof value === "number" ? value : Number(String(value).replace(/\D/g, ""))
    if (!isFinite(num)) return ""
    const hasDecimals = typeof value === "number" && Math.abs(value % 1) > 0
    return num.toLocaleString("es-CO", { minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 })
  }

  const parseCurrencyInput = (text: string): number | undefined => {
    if (!text) return undefined
    const cleaned = text.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "")
    if (!cleaned) return undefined
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : undefined
  }

  const formatInvestment = (value: string) => {
    const numericValue = value.replace(/\D/g, "")
    if (!numericValue) return ""
    return Number.parseInt(numericValue).toLocaleString("es-CO")
  }

  const getInvestmentMagnitude = (value: string) => {
    const numericValue = Number.parseInt(value.replace(/\D/g, "") || "0")
    if (numericValue >= 1000000) {
      return `${(numericValue / 1000000).toFixed(2)} millones`
    } else if (numericValue >= 1000) {
      return `${(numericValue / 1000).toFixed(0)} mil`
    }
    return ""
  }

  const handleInvestmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "")
    setInvestment(value)
  }

  const updateItem = (index: number, patch: Partial<ProductSelection>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  const addItem = () => {
    setItems((prev) => [...prev, { productId: "", zoneId: "", quantity: 1, editPrice: false }])
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const addMachine = () => {
    if (!machinePicker) return
    setMachinesSelected((prev) => [...prev, { machineId: machinePicker, quantity: 1 }])
    setMachinePicker("")
  }

  const updateMachine = (idx: number, patch: Partial<{ machineId: string; quantity: number }>) =>
    setMachinesSelected((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)))

  const removeMachine = (idx: number) => setMachinesSelected((prev) => prev.filter((_, i) => i !== idx))

  const formatCurrencyForDisplay = (v?: number) => (v == null ? "-" : `$${Number(v).toLocaleString("es-CO")}`)
  const parseCurrency = (text: string) => {
    const cleaned = String(text).replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "")
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : undefined
  }

  const getZonePrice = (productId?: string, zoneId?: string): number | undefined => {
    if (!productId || !zoneId || zoneId === "otro") return undefined
    const product = productsDatabase.find((p) => p.id === productId)
    if (!product) return undefined
    const zone = zones.find((z) => z.id === zoneId)
    const zoneKey = zone?.key
    const price = zoneKey ? (product.prices as any)[zoneKey] : undefined
    return price && price > 0 ? price : undefined
  }

  const handleSimulate = () => {
    const invOk = investment && Number.parseFloat(investment) > 0
    const yearsOk = !!years
    const itemsOk = items.some((it) => it.productId && it.zoneId && it.quantity > 0)
    if (invOk && yearsOk && itemsOk) {
      const machinesInvestment = machinesSelected.reduce((acc, m) => {
        const entry = machinesDatabase.find((x) => x.id === m.machineId)
        const unit = entry ? entry.priceBeforeIva : 0
        return acc + unit * (m.quantity || 0)
      }, 0)

      const totalInvestment = Number.parseFloat(investment || "0") + machinesInvestment
      const metrics = calculateMetrics(totalInvestment, items, Number.parseInt(years || "0"))
      let irrValue = metrics.irr
      if (typeof irrValue === "number" && Math.abs(irrValue) > 1) {
        irrValue = irrValue / 100
      }
      setLastIrr(irrValue)
      setSimulationVersion((v) => v + 1)
      setShowResults(true)
    }
  }

  const handleReset = () => {
    setCategoria("")
    setLinea("")
    setSublinea("")
    setInvestment("")
    setYears("")
    setItems([{ productId: "", zoneId: "", quantity: 1, editPrice: false }])
    setMachinesSelected([])
    setShowResults(false)
    setLastIrr(null)
    setSimulationVersion(0)
  }


  const goToPrint = async () => {
    const machinesPayload = machinesSelected.map((m) => {
      const entry = machinesDatabase.find((x) => x.id === m.machineId)
      return {
        machineId: m.machineId,
        description: entry?.description ?? m.machineId,
        unitPriceBeforeIva: entry?.priceBeforeIva ?? 0,
        quantity: m.quantity,
      }
    })
    const machinesInvestment = machinesPayload.reduce((acc, m) => acc + (m.unitPriceBeforeIva * (m.quantity || 0)), 0)

    const payload = {
      items: items.filter((s) => s.productId && s.quantity > 0),
      years: Number.parseInt(years || "0"),
      machines: machinesPayload,
      machinesInvestment,
      totalInvestment: Number.parseInt(investment || "0") + machinesInvestment,
    }

    try {
      sessionStorage.setItem("cq_print_payload", JSON.stringify(payload))
    } catch {
    }

    try {
      await router.push("/print")
    } catch {
      try {
        window.location.href = "/print"
      } catch {
      }
    }
  }

  const machinesInvestmentComputed = machinesSelected.reduce((acc, m) => {
    const entry = machinesDatabase.find((x) => x.id === m.machineId)
    const unit = entry ? entry.priceBeforeIva : 0
    return acc + unit * (m.quantity || 0)
  }, 0)
  const totalInvestmentComputed = Number.parseFloat(investment || "0") + machinesInvestmentComputed

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{ fontFamily: '"Neutra Text", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
    >
      <Header />

      <div
        className="min-h-screen py-12"
        style={
          {
            backgroundImage: "linear-gradient(rgba(255,255,255,0.4), rgba(255,255,255,0.4)), url(/FONDO.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "fixed",
            ["--primary" as any]: "#25ABB9",
            ["--primary-foreground" as any]: "#ffffff",
            ["--chart-primary" as any]: "#25ABB9",
          } as React.CSSProperties
        }
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="mb-8">
            <div className="space-y-3 pb-6">
              <h2 className="text-2xl font-bold text-[#25ABB9]">Parámetros de Simulación</h2>
            </div>
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg ">Productos en la simulación</h3>
                  <div className="flex gap-2 items-center">
                    <Button
                      size="sm"
                      onClick={addItem}
                      className="h-9 w-9 p-0 flex items-center justify-center"
                      title="Agregar producto"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setItems([{ productId: "", zoneId: "", quantity: 1, editPrice: false }])}
                      className="h-9 w-9 p-0 flex items-center justify-center"
                      title="Limpiar productos"
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {items.map((it, idx) => {
                    const itemLineas = it.categoria ? getLineasByCategoria(it.categoria) : []
                    const itemSublineas = it.categoria && it.linea ? getSublineasByLinea(it.categoria, it.linea) : []
                    const availableProducts =
                      it.categoria && it.linea && it.sublinea
                        ? getProductsByFilters(it.categoria, it.linea, it.sublinea)
                        : productsDatabase 

                    return (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3 items-end">
                        <div>
                          <Label className="text-sm font-semibold">Categoría</Label>
                          <Select
                            value={it.categoria ?? ""}
                            onValueChange={(v) =>
                              updateItem(idx, {
                                categoria: v === "__none" ? undefined : v,
                                linea: undefined,
                                sublinea: undefined,
                                productId: "",
                              })
                            }
                          >
                            <SelectTrigger className="w-full h-11">
                              <SelectValue placeholder="Categoría (opcional)" />
                            </SelectTrigger>
                            <SelectContent>
                              {getCategories().map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))}
                              <SelectItem value="__none">Ninguna</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm font-semibold">Línea</Label>
                          <Select
                            value={it.linea ?? ""}
                            onValueChange={(v) =>
                              updateItem(idx, { linea: v === "" ? undefined : v, sublinea: undefined, productId: "" })
                            }
                            disabled={!it.categoria}
                          >
                            <SelectTrigger className="w-full h-11">
                              <SelectValue placeholder={it.categoria ? "Seleccionar línea" : "Selecciona categoría"} />
                            </SelectTrigger>
                            <SelectContent>
                              {itemLineas.map((lin) => (
                                <SelectItem key={lin} value={lin}>
                                  {lin}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm font-semibold">Sublínea</Label>
                          <Select
                            value={it.sublinea ?? ""}
                            onValueChange={(v) => updateItem(idx, { sublinea: v === "" ? undefined : v, productId: "" })}
                            disabled={!it.linea}
                          >
                            <SelectTrigger className="w-full h-11">
                              <SelectValue placeholder={it.linea ? "Seleccionar sublínea" : "Selecciona línea"} />
                            </SelectTrigger>
                            <SelectContent>
                              {itemSublineas.map((sub) => (
                                <SelectItem key={sub} value={sub}>
                                  {sub}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm font-semibold">Producto</Label>
                          <Select
                            value={it.productId}
                            onValueChange={(v) => {
                              const defaultPrice = it.zoneId === "otro" ? undefined : getZonePrice(v, it.zoneId)
                              updateItem(idx, {
                                productId: v,
                                manualPrice: defaultPrice !== undefined ? defaultPrice : it.manualPrice,
                              })
                            }}
                            disabled={!availableProducts.length}
                          >
                            <SelectTrigger className="w-full h-11">
                              <SelectValue placeholder="Seleccionar producto" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableProducts.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.description}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm font-semibold">Zona</Label>
                          <Select
                            value={it.zoneId}
                            onValueChange={(v) => {
                              const defaultPrice = v === "otro" ? undefined : getZonePrice(it.productId, v)
                              updateItem(idx, {
                                zoneId: v,
                                manualPrice: v === "otro" ? undefined : defaultPrice !== undefined ? defaultPrice : it.manualPrice,
                              })
                            }}
                            disabled={!it.productId}
                          >
                            <SelectTrigger className="w-full h-11">
                              <SelectValue placeholder={it.productId ? "Seleccionar zona" : "Primero selecciona producto"} />
                            </SelectTrigger>
                            <SelectContent>
                              {zones.map((z) => (
                                <SelectItem key={z.id} value={z.id}>
                                  {z.name}
                                </SelectItem>
                              ))}
                              <SelectItem key="otro" value="otro">
                                Otro (introducir precio)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm font-semibold">Unidades</Label>
                          <Input
                            type="number"
                            min={1}
                            value={String(it.quantity)}
                            onChange={(e) => updateItem(idx, { quantity: Math.max(1, Number(e.target.value || 1)) })}
                            className="h-10 w-35"
                          />
                        </div>

                        <div>
                          <Label className="text-sm font-semibold">Precio </Label>
                          <div className="flex items-center gap-2">
                            <div className="relative w-50 sm:flex-3 -ml-2">
                               <span className="absolute left-1 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
                               <Input
                                 type="text"
                                 placeholder="Ingresa precio"
                                 value={it.manualPrice !== undefined ? formatCurrencyForInput(it.manualPrice) : ""}
                                 onChange={(e) => {
                                   const parsed = parseCurrencyInput(e.target.value)
                                   updateItem(idx, { manualPrice: parsed })
                                 }}
                                 /* ahora siempre editable para permitir override manual */
                                 className="h-11 pl-8 w-full"
                               />
                             </div>

                             <Button
                               size="sm"
                               variant="destructive"
                               onClick={() => removeItem(idx)}
                               className="h-11 w-11 p-0 flex items-center justify-center"
                               title="Quitar"
                             >
                               <Trash className="h-4 w-4" />
                             </Button>
                           </div>
                         </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Sección: Selección y edición de Máquinas */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-full">
                    <Label className="text-sm font-semibold">Agregar máquina</Label>
                    <div className="flex gap-2">
                      <Select value={machinePicker} onValueChange={setMachinePicker}>
                        <SelectTrigger className="w-full h-11">
                          <SelectValue placeholder="Seleccionar máquina..." />
                        </SelectTrigger>
                        <SelectContent>
                          {machinesDatabase.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button onClick={addMachine} className="h-11" title="Agregar máquina">
                        Agregar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Lista editable de máquinas seleccionadas */}
                {machinesSelected.length > 0 && (
                  <div className="space-y-2">
                    {machinesSelected.map((m, mi) => {
                      const entry = machinesDatabase.find((x) => x.id === m.machineId)
                      const unit = entry ? entry.priceBeforeIva : 0
                      const computedTotal = unit * (m.quantity || 0)
                      return (
                        <div key={mi} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                          <div className="md:col-span-5">
                            <div className="text-sm font-medium">{entry?.description ?? m.machineId}</div>
                            <div className="text-xs text-gray-600">Valor unitario (antes IVA): {formatCurrencyForDisplay(unit)}</div>
                          </div>

                          <div className="md:col-span-2">
                            <Label className="text-xs">Cantidad</Label>
                            <Input
                              type="number"
                              min={1}
                              value={String(m.quantity)}
                              onChange={(e) => updateMachine(mi, { quantity: Math.max(1, Number(e.target.value || 1)) })}
                              className="h-9"
                            />
                          </div>

                          <div className="md:col-span-1 text-right">
                            <Label className="text-xs">Total</Label>
                            <div className="font-medium">{formatCurrencyForDisplay(computedTotal)}</div>
                          </div>

                          <div className="md:col-span-1 flex justify-end">
                            <Button size="sm" variant="destructive" onClick={() => removeMachine(mi)} className="h-9 w-9 p-0">
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}

                    {/* Totales ocultos: no mostrar "Total inversión máquinas" */}
                   </div>
                 )}
               </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="investment" className="text-sm font-semibold text-gray-700">
                    Inversión Inicial ($)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
                    <Input
                      id="investment"
                      type="text"
                      placeholder="100.000"
                      value={formatInvestment(investment)}
                      onChange={handleInvestmentChange}
                      className="h-11 pl-8 border-gray-300 focus:border-[#25ABB9] focus:ring-[#25ABB9]"
                    />
                  </div>
                  {investment && <p className="text-xs text-gray-500 mt-1">{getInvestmentMagnitude(investment)}</p>}
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700">Total inversión (incluye máquinas)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
                    <Input id="totalInvestment" type="text" value={formatInvestment(String(Math.round(totalInvestmentComputed)))} readOnly className="h-11 pl-8 border-gray-300 bg-gray-50" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Suma inversión inicial + precio máquinas × cantidad</p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="years" className="text-sm font-semibold text-gray-700">
                    Años de Proyección
                  </Label>
                  <Select value={years} onValueChange={setYears}>
                    <SelectTrigger
                      id="years"
                      className="w-full h-11 border-gray-300 focus:border-[#25ABB9] focus:ring-[#25ABB9]"
                    >
                      <SelectValue placeholder="Seleccionar años" className="truncate max-w-full" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3" className="truncate max-w-full">
                        3 años
                      </SelectItem>
                      <SelectItem value="4" className="truncate max-w-full">
                        4 años
                      </SelectItem>
                      <SelectItem value="5" className="truncate max-w-full">
                        5 años
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center">
                  <Button
                    size="sm"
                    onClick={() => goToPrint()}
                    disabled={!(showResults && lastIrr !== null && lastIrr >= 0.2)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-md transition ${
                      showResults && lastIrr !== null && lastIrr >= 0.2
                        ? "bg-[#25ABB9] text-white hover:bg-[#1e8a95]"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                    title={
                      showResults
                        ? lastIrr !== null && lastIrr >= 0.2
                          ? "Imprimir"
                          : "No disponible: la TIR no alcanza 20%"
                        : "Ejecuta 'Simular' para habilitar impresión"
                    }
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </Button>
                </div>

                <div />
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-200">
                <Button
                  onClick={handleSimulate}
                  disabled={!investment || !years || !items.some((it) => it.productId && it.zoneId && it.quantity > 0)}
                  className="h-12 px-8 text-base font-semibold bg-[#25ABB9] hover:bg-[#1e8a95] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Simular 
                </Button>
                {showResults && (
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="h-12 px-6 text-base font-medium border-2 border-gray-300 hover:bg-gray-50 bg-transparent"
                  >
                    Reiniciar
                  </Button>
                )}
              </div>

              {showResults && (
                <div className="space-y-8 pt-8">
                  <div className="w-full">
                    <MetricsCards
                      investment={totalInvestmentComputed}
                      years={Number.parseInt(years)}
                      selections={items}
                      simulationVersion={simulationVersion}
                      onApplySuggestion={(updated) => {
                        setItems(updated)
                      }}
                    />
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
