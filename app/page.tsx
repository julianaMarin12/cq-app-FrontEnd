"use client"
import { useRouter } from "next/navigation"
import type React from "react"

import { useState, useMemo } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash, Plus, RotateCw, Printer } from "lucide-react"
import { CashFlowChart } from "@/components/cash-flow-chart"
import { MetricsCards } from "@/components/metrics-cards"
import { CashFlowTable } from "@/components/cash-flow-table"
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

export default function CashFlowSimulator() {
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

  const handleSimulate = () => {
    const invOk = investment && Number.parseFloat(investment) > 0
    const yearsOk = !!years
    const itemsOk = items.some((it) => it.productId && it.zoneId && it.quantity > 0)
    if (invOk && yearsOk && itemsOk) {
      // calcular métricas aquí y guardar la TIR para controlar el botón de imprimir
      const metrics = calculateMetrics(Number.parseFloat(investment || "0"), items, Number.parseInt(years || "0"))
      setLastIrr(metrics.irr) // metrics.irr ya viene en porcentaje (p.ej. 30.5)
      // marcar una nueva ejecución y mostrar resultados
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
    setShowResults(false)
  }

  const router = useRouter()

  const getZonePrice = (productId?: string, zoneId?: string): number | undefined => {
    if (!productId || !zoneId || zoneId === "otro") return undefined
    const product = productsDatabase.find((p) => p.id === productId)
    if (!product) return undefined
    const zone = zones.find((z) => z.id === zoneId)
    const zoneKey = zone?.key
    const price = zoneKey ? (product.prices as any)[zoneKey] : undefined
    return price && price > 0 ? price : undefined
  }

  const resolvePrice = (sel: ProductSelection) => {
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

  // Guardar datos en sessionStorage y navegar a /print
  const goToPrint = () => {
    const payload = {
      items: items.filter((s) => s.productId && s.quantity > 0),
      years: Number.parseInt(years || "0"),
    }
    try {
      sessionStorage.setItem("cq_print_payload", JSON.stringify(payload))
      router.push("/print")
    } catch {
      // ignore
    }
  }

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
                              // al cambiar zona:
                              // - si se elige "otro" => limpiar manualPrice (input vacío)
                              // - si la zona tiene precio conocido => precargar ese precio
                              // - si no tiene precio conocido => conservar manualPrice existente
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
                  {showResults && lastIrr !== null && lastIrr > 20 && (
                    <Button
                      size="sm"
                      onClick={() => goToPrint()}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-[#25ABB9] text-white hover:bg-[#1e8a95]"
                      title="Imprimir"
                    >
                      <Printer className="w-4 h-4" />
                      Imprimir
                    </Button>
                  )}
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
                      investment={Number.parseFloat(investment)}
                      years={Number.parseInt(years)}
                      selections={items}
                      simulationVersion={simulationVersion}
                    />
                  </div>

                  <div className="w-full">
                    <CashFlowTable
                      investment={Number.parseFloat(investment)}
                      years={Number.parseInt(years)}
                      selections={items}
                    />
                  </div>

                  <div className="w-full">
                    <div className="w-full h-96">
                      <CashFlowChart
                        investment={Number.parseFloat(investment)}
                        years={Number.parseInt(years)}
                        selections={items}
                      />
                    </div>
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
