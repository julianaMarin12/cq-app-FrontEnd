import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, DollarSign, Percent, Calendar, X } from "lucide-react"
import { calculateMetrics, ProductSelection } from "@/lib/cash-flow-calculator"
import { useEffect, useState } from "react"

interface MetricsCardsProps {
  investment: number
  years: number
  selections: ProductSelection[]
  simulationVersion?: number // <-- nuevo prop: solo al cambiar esto se abre el modal
}

export function MetricsCards({ investment, years, selections, simulationVersion }: MetricsCardsProps) {
  const metrics = calculateMetrics(investment, selections, years)

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
