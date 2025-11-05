import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, DollarSign, Percent, Calendar, X } from "lucide-react"
import { calculateMetrics, ProductSelection } from "@/lib/cash-flow-calculator"
import { useEffect, useState } from "react"

interface MetricsCardsProps {
  investment: number
  years: number
  selections: ProductSelection[]
  simulationVersion?: number // <-- nuevo prop: solo al cambiar esto se abre el modal
  onApplySuggestion?: (updatedSelections: ProductSelection[]) => void // nuevo: callback opcional
}

export function MetricsCards({ investment, years, selections, simulationVersion, onApplySuggestion }: MetricsCardsProps) {
  // Usar estado local para permitir aplicar cambios inmediatamente
  const [localSelections, setLocalSelections] = useState<ProductSelection[]>(() => selections)
  useEffect(() => {
    setLocalSelections(selections)
  }, [selections])

  // Escuchar actualizaciones globales para sincronizar inputs externos
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as ProductSelection[] | undefined
      if (Array.isArray(detail)) setLocalSelections(detail)
    }
    window.addEventListener("cq:selectionsUpdated", handler as EventListener)
    return () => window.removeEventListener("cq:selectionsUpdated", handler as EventListener)
  }, [])

  // Calcular métricas con las selecciones locales
  const metrics = calculateMetrics(investment, localSelections, years)

  const irrPercent = metrics.irr
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<"warning" | "success" | null>(null)

  // Mostrar el modal únicamente cuando cambia el trigger simulationVersion
  useEffect(() => {
    if (simulationVersion == null) return
    if (irrPercent > 20) {
      setModalType("success")
      setShowModal(true)
    } else {
      setModalType("warning")
      setShowModal(true)
    }
  }, [simulationVersion]) // <-- depende del trigger, no de irrPercent directo

  // helper: intenta actualizar inputs en el DOM para que muestren el nuevo valor inmediatamente
  function updateDomInputsForSelection(sel: ProductSelection) {
    try {
      // posibles selectores para cantidad
      const qtySelectors = [
        `input[name="quantity-${sel.productId}-${sel.zoneId}"]`,
        `input[data-product-id="${sel.productId}"][data-zone-id="${sel.zoneId}"][name="quantity"]`,
        `input[data-product-id="${sel.productId}"][data-zone-id="${sel.zoneId}"][data-field="quantity"]`,
      ]
      // posibles selectores para precio/manualPrice
      const priceSelectors = [
        `input[name="price-${sel.productId}-${sel.zoneId}"]`,
        `input[data-product-id="${sel.productId}"][data-zone-id="${sel.zoneId}"][name="manualPrice"]`,
        `input[data-product-id="${sel.productId}"][data-zone-id="${sel.zoneId}"][data-field="price"]`,
      ]

      // actualizar cantidad si existe
      for (const qs of qtySelectors) {
        const el = document.querySelector<HTMLInputElement>(qs)
        if (el) {
          el.value = String(sel.quantity)
          el.dispatchEvent(new Event("input", { bubbles: true }))
          el.dispatchEvent(new Event("change", { bubbles: true }))
          break
        }
      }

      // actualizar precio/manualPrice si existe
      if (typeof sel.manualPrice === "number") {
        for (const qs of priceSelectors) {
          const el = document.querySelector<HTMLInputElement>(qs)
          if (el) {
            el.value = String(sel.manualPrice)
            el.dispatchEvent(new Event("input", { bubbles: true }))
            el.dispatchEvent(new Event("change", { bubbles: true }))
            break
          }
        }
      }
    } catch (e) {
      // no bloquear si algo falla al manipular el DOM
      // console.debug("updateDomInputsForSelection error", e)
    }
  }

  // Aplica una sugerencia construyendo un nuevo array de selecciones,
  // actualizando el estado local y notificando al padre si corresponde.
  const applySuggestion = (suggIndex: number) => {
    if (!metrics.suggestions) return
    const s = metrics.suggestions[suggIndex]

    // si es sugerencia de grupo con overrides, aplicar todas las overrides
    if (s.overrides && s.overrides.length > 0) {
      const updatedGroup = localSelections.map((sel) => {
        const ov = s.overrides?.find((o) => o.productId === sel.productId)
        if (!ov) return { ...sel }
        if (s.type === "price") {
          return { ...sel, zoneId: "otro", manualPrice: ov.suggestedValue, editPrice: true }
        } else {
          return { ...sel, quantity: ov.suggestedValue }
        }
      })
      setLocalSelections(updatedGroup)
      if (onApplySuggestion) onApplySuggestion(updatedGroup)
      try {
        window.dispatchEvent(new CustomEvent("cq:selectionsUpdated", { detail: updatedGroup }))
      } catch {}
      updatedGroup.forEach((sel) => updateDomInputsForSelection(sel))
      setShowModal(false)
      return
    }

    const updated = localSelections.map((sel) => {
      if (sel.productId === s.productId && sel.zoneId === s.zoneId) {
        if (s.type === "price") {
          // usar la opción de precio manual: marcar zona "otro" y asignar manualPrice
          return { ...sel, zoneId: "otro", manualPrice: s.suggestedValue, editPrice: true }
        } else {
          return { ...sel, quantity: s.suggestedValue }
        }
      }
      return { ...sel }
    })
    // aplicar inmediatamente en el componente
    setLocalSelections(updated)
    // notificar al padre si lo desea
    if (onApplySuggestion) onApplySuggestion(updated)
    // emitir evento global para que inputs de otros componentes se actualicen
    try {
      window.dispatchEvent(new CustomEvent("cq:selectionsUpdated", { detail: updated }))
    } catch (e) {
      /* no bloquear si el navegador no soporta CustomEvent constructor en algún entorno */
    }

    // además intentar actualizar inputs visibles en el DOM para reflejar el cambio inmediatamente
    updated.forEach((sel) => updateDomInputsForSelection(sel))

    setShowModal(false)
  }

  return (
    <>
      {showModal && modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div
            className={`relative max-w-lg w-full mx-4 rounded-lg shadow-lg p-6 z-10 ${
              modalType === "warning" ? "bg-red-50 border border-red-200 text-red-900" : "bg-green-50 border border-green-200 text-green-900"
            }`}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {modalType === "warning" ? "Advertencia: TIR insuficiente" : "Aprobado: Inversión factible"}
                </h3>
                <p className="mt-1 text-sm">
                  {modalType === "warning"
                    ? `La TIR es ${irrPercent.toFixed(2)}%. Al ser menor o igual al 20% no se recomienda esta inversión.`
                    : `La TIR es ${irrPercent.toFixed(2)}%. La inversión parece factible.`}
                </p>

                {/* Nuevo: mostrar sugerencias cuando hay advertencia y existen recomendaciones */}
                {modalType === "warning" && metrics.suggestions && metrics.suggestions.length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-medium">Sugerencias para lograr TIR &gt; 20%</h4>
                    <ul className="mt-2 list-disc ml-5 text-sm">
                      {metrics.suggestions.map((s, i) => (
                        <li key={i} className="mb-2">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              {s.overrides && s.overrides.length > 0 ? (
                                <div>
                                  <div className="font-medium">{s.detail}</div>
                                  <ul className="ml-4 mt-1">
                                    {s.overrides.map((o, idx) => (
                                      <li key={idx} className="text-sm">
                                        {s.type === "price"
                                          ? `Precio ${o.productId}: ${o.currentValue} → ${o.suggestedValue}`
                                          : `Unidades ${o.productId}: ${o.currentValue} → ${o.suggestedValue}`}
                                      </li>
                                    ))}
                                  </ul>
                                  <div className="text-xs text-muted-foreground mt-1">TIR estimada: {(s.estimatedIrr * 100).toFixed(2)}%</div>
                                </div>
                              ) : (
                                s.type === "price"
                                  ? `Ajustar precio (${s.productId} / ${s.zoneId}): ${s.currentValue} → ${s.suggestedValue} (TIR estimada ${(s.estimatedIrr * 100).toFixed(2)}%)`
                                  : `Ajustar unidades (${s.productId} / ${s.zoneId}): ${s.currentValue} → ${s.suggestedValue} (TIR estimada ${(s.estimatedIrr * 100).toFixed(2)}%)`
                              )}
                              {s.detail ? <div className="text-xs text-muted-foreground">{s.detail}</div> : null}
                            </div>
                            <div>
                              {/* Botón Aplicar: color cambiado a verde y aplica inmediatamente */}
                              <button
                                onClick={() => applySuggestion(i)}
                                className="text-sm px-2 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                              >
                                Aplicar
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Si no hay sugerencias encontradas, opcionalmente mostrar mensaje corto */}
                {modalType === "warning" && (!metrics.suggestions || metrics.suggestions.length === 0) && (
                  <p className="mt-3 text-sm">No se encontraron ajustes factibles dentro de los límites definidos.</p>
                )}
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="inline-flex items-center justify-center p-2 rounded-md hover:bg-black/5"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VAN (Valor Actual Neto)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.npv.toLocaleString("es-ES", { maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.npv > 0 ? "Proyecto viable" : "Revisar proyecto"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TIR (Tasa Interna de Retorno)</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.irr.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Rentabilidad anual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Período de Recuperación</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.paybackPeriod} años</div>
            <p className="text-xs text-muted-foreground mt-1">Tiempo de retorno</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flujo Total Acumulado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics.totalCashFlow.toLocaleString("es-ES", { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Al final del período</p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
