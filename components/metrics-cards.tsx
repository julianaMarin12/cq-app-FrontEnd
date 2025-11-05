import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, DollarSign, Percent, Calendar, X } from "lucide-react"
import { calculateMetrics, ProductSelection } from "@/lib/cash-flow-calculator"
import { useEffect, useState } from "react"

interface MetricsCardsProps {
  investment: number
  years: number
  selections: ProductSelection[]
  simulationVersion?: number
  onApplySuggestion?: (updatedSelections: ProductSelection[]) => void
}

export function MetricsCards({ investment, years, selections, simulationVersion, onApplySuggestion }: MetricsCardsProps) {
  const [localSelections, setLocalSelections] = useState<ProductSelection[]>(() => selections)
  useEffect(() => {
    setLocalSelections(selections)
  }, [selections])

  const metrics = calculateMetrics(investment, localSelections, years)
  const irrPercent = metrics.irr

  // formateadores: moneda con separadores y signo $, y número con separadores
  const formatCurrency = (v?: number) =>
    v == null ? "-" : `$${v.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`

  const formatNumber = (v?: number) => (v == null ? "-" : v.toLocaleString("es-CO"))

  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<"warning" | "success" | null>(null)
  useEffect(() => {
    if (simulationVersion == null) return
    if (irrPercent > 20) {
      setModalType("success")
      setShowModal(true)
    } else {
      setModalType("warning")
      setShowModal(true)
    }
  }, [simulationVersion]) 

  function updateDomInputsForSelection(sel: ProductSelection) {
    try {
      const qtySelectors = [
        `input[name="quantity-${sel.productId}-${sel.zoneId}"]`,
        `input[data-product-id="${sel.productId}"][data-zone-id="${sel.zoneId}"][name="quantity"]`,
        `input[data-product-id="${sel.productId}"][data-zone-id="${sel.zoneId}"][data-field="quantity"]`,
      ]
      const priceSelectors = [
        `input[name="price-${sel.productId}-${sel.zoneId}"]`,
        `input[data-product-id="${sel.productId}"][data-zone-id="${sel.zoneId}"][name="manualPrice"]`,
        `input[data-product-id="${sel.productId}"][data-zone-id="${sel.zoneId}"][data-field="price"]`,
      ]
      for (const qs of qtySelectors) {
        const el = document.querySelector<HTMLInputElement>(qs)
        if (el) {
          el.value = String(sel.quantity)
          el.dispatchEvent(new Event("input", { bubbles: true }))
          el.dispatchEvent(new Event("change", { bubbles: true }))
          break
        }
      }
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
    } catch {}
  }

  // aplicar sugerencia (individual o grupo/overrides)
  const applySuggestion = (suggIndex: number) => {
    const sugg = metrics.suggestions?.[suggIndex]
    if (!sugg) return

    // si es sugerencia de grupo (overrides) aplicar todas
    if (sugg.overrides && sugg.overrides.length > 0) {
      const updatedGroup = localSelections.map((sel) => {
        const ov = sugg.overrides?.find((o) => o.productId === sel.productId)
        if (!ov) return { ...sel }
        return sugg.type === "price"
          ? { ...sel, zoneId: "otro", manualPrice: ov.suggestedValue, editPrice: true }
          : { ...sel, quantity: ov.suggestedValue }
      })
      setLocalSelections(updatedGroup)
      if (onApplySuggestion) onApplySuggestion(updatedGroup)
      try { window.dispatchEvent(new CustomEvent("cq:selectionsUpdated", { detail: updatedGroup })) } catch {}
      updatedGroup.forEach((sel) => updateDomInputsForSelection(sel))
      setShowModal(false)
      return
    }

    // individual
    const updated = localSelections.map((sel) => {
      if (sel.productId === sugg.productId && sel.zoneId === sugg.zoneId) {
        return sugg.type === "price"
          ? { ...sel, zoneId: "otro", manualPrice: sugg.suggestedValue, editPrice: true }
          : { ...sel, quantity: sugg.suggestedValue }
      }
      return { ...sel }
    })
    setLocalSelections(updated)
    if (onApplySuggestion) onApplySuggestion(updated)
    try { window.dispatchEvent(new CustomEvent("cq:selectionsUpdated", { detail: updated })) } catch {}
    updated.forEach((sel) => updateDomInputsForSelection(sel))
    setShowModal(false)
  }

  const sortedSuggestions = (() => {
    const calcList = metrics.suggestions ? [...metrics.suggestions] : []

    if (calcList.length > 0) {
      calcList.sort((a, b) => {
        const aGroup = a.productId === "__group__" ? 0 : 1
        const bGroup = b.productId === "__group__" ? 0 : 1
        if (aGroup !== bGroup) return aGroup - bGroup
        return (b.estimatedIrr || 0) - (a.estimatedIrr || 0)
      })
      return calcList
    }

    const negativeSituation = (metrics.npv ?? 0) < 0 || (metrics.irr ?? 0) <= 20
    if (!negativeSituation) return []

    const fallbacks: any[] = []

    const groupPriceOverrides = localSelections
      .filter((s) => typeof (s.manualPrice ?? s.manualPrice) === "number" || typeof s.manualPrice === "number")
      .map((s) => {
        const current = typeof s.manualPrice === "number" ? s.manualPrice : (s.manualPrice ?? 0)
        const suggested = Math.round((current || 1) * 1.1 * 100) / 100
        return { productId: s.productId, zoneId: s.zoneId, currentValue: current, suggestedValue: suggested }
      })
    if (groupPriceOverrides.length > 0) {
      fallbacks.push({
        type: "price",
        productId: "__group__",
        zoneId: "",
        currentValue: 0,
        suggestedValue: 0,
        estimatedIrr: metrics.irr,
        detail: "Ajuste proporcional (fallback) +10% precios",
        overrides: groupPriceOverrides,
      })
    }

    // Construir un ajuste combinado de unidades (proporcional simple: +10%)
    const groupQtyOverrides = localSelections
      .filter((s) => typeof s.quantity === "number" && s.quantity > 0)
      .map((s) => {
        const currentQty = s.quantity || 0
        const suggestedQty = Math.max(1, Math.ceil(currentQty * 1.1))
        const pct = Math.round(((suggestedQty / currentQty) - 1) * 100)
        return { productId: s.productId, zoneId: s.zoneId, currentValue: currentQty, suggestedValue: suggestedQty, pct }
      })
    if (groupQtyOverrides.length > 0) {
      fallbacks.push({
        type: "units",
        productId: "__group__",
        zoneId: "",
        currentValue: 0,
        suggestedValue: 0,
        estimatedIrr: metrics.irr,
        detail: `Ajuste proporcional unidades (fallback): ${groupQtyOverrides.map((g) => `${g.productId} +${g.pct}%`).join(", ")}`,
        overrides: groupQtyOverrides.map((g) => ({ productId: g.productId, zoneId: g.zoneId, currentValue: g.currentValue, suggestedValue: g.suggestedValue })),
      })
    }

    // Limitar a máximo 2 sugerencias (priorizar price then units)
    return fallbacks.slice(0, 2)
  })()

  return (
    <>
      {showModal && modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div
            className={`relative w-full max-w-2xl mx-4 ${modalType === "warning" ? "bg-red-50 border-red-200 text-red-900" : "bg-green-50 border-green-200 text-green-900"} border p-5 z-10`}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{modalType === "warning" ? "Advertencia: TIR insuficiente" : "Aprobado: Inversión factible"}</h3>
                <p className="mt-1 text-sm">{modalType === "warning" ? `La TIR es ${irrPercent.toFixed(2)}%. No se recomienda esta inversión.` : `La TIR es ${irrPercent.toFixed(2)}%.`}</p>

                {sortedSuggestions && sortedSuggestions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-[#025e63]">Sugerencias</h4>
                    <div className="mt-3 space-y-3 max-h-56 overflow-y-auto pr-2">
                      {sortedSuggestions.map((s, i) => (
                        <div key={i} className="flex items-start justify-between gap-4 p-3 bg-white/6 border border-[#25ABB9]/10 rounded-sm">
                          <div className="min-w-0">
                            {s.overrides && s.overrides.length > 0 ? (
                              <div className="flex flex-col gap-2">
                                <div className="flex flex-wrap gap-2 text-sm text-slate-800">
                                  {s.overrides.map((o: any, idx: number) => (
                                    <span key={idx} className="px-2 py-0.5 bg-white/40 rounded text-slate-800">
                                      {o.productId}:{" "}
                                      {s.type === "price"
                                        ? `${formatCurrency(o.currentValue)} → ${formatCurrency(o.suggestedValue)}`
                                        : `${formatNumber(o.currentValue)} → ${formatNumber(o.suggestedValue)}`}
                                    </span>
                                  ))}
                                </div>
                                {s.detail && <div className="mt-1 text-xs text-slate-600">{s.detail}</div>}
                              </div>
                            ) : (
                              <div className="mt-2 text-sm text-slate-800">
                                {s.type === "price" ? formatCurrency(s.currentValue) : formatNumber(s.currentValue)} →{" "}
                                <strong>{s.type === "price" ? formatCurrency(s.suggestedValue) : formatNumber(s.suggestedValue)}</strong>
                                {s.detail && <div className="mt-1 text-xs text-slate-600">{s.detail}</div>}
                              </div>
                            )}
                          </div>

                          <div className="flex-shrink-0 flex flex-col items-end gap-2">
                            <div className="px-2 py-0.5 rounded-full bg-[#25ABB9]/12 text-[#025e63] text-sm font-medium">
                              {(s.estimatedIrr * 100).toFixed(1)}%
                            </div>
                            <button
                              onClick={() => applySuggestion(i)}
                              className="text-sm px-3 py-1 bg-[#25ABB9] text-white rounded-md hover:bg-[#1e8a95] transition"
                              aria-label={`Aplicar sugerencia ${i + 1}`}
                            >
                              Aplicar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={() => setShowModal(false)} className="inline-flex items-center justify-center p-2 rounded-md hover:bg-black/5" aria-label="Cerrar">
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
            <p className="text-xs text-muted-foreground mt-1">{metrics.npv > 0 ? "Proyecto viable" : "Revisar proyecto"}</p>
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
            <div className="text-2xl font-bold">${metrics.totalCashFlow.toLocaleString("es-ES", { maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground mt-1">Al final del período</p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
