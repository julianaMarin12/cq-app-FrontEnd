import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { generateCashFlowData, ProductSelection } from "@/lib/cash-flow-calculator"

interface CashFlowTableProps {
  investment: number
  years: number
  selections: ProductSelection[]
}

export function CashFlowTable({ investment, years, selections }: CashFlowTableProps) {
  const data = generateCashFlowData(investment, selections, years)

  const colors = {
    venta: "#208498ff", 
    costo: "#08816eff", 
    overhead: "#fb6e2e", 
    fcl: "#0b7a7f", 
    negative: "#ef4444", 
    muted: "var(--muted-foreground, #6b7280)",
  }

  const formatCurrency = (v?: number) => (v == null ? "-" : `$${v.toLocaleString("es-ES")}`)

  const cellStyle = (value?: number, defaultHex?: string) => {
    if (value == null) return { color: colors.muted }
    return { color: value < 0 ? colors.negative : defaultHex || colors.muted }
  }

  const totals = data.reduce(
    (acc, r) => {
      acc.investment += r.investment || 0
      acc.sales += r.sales || 0
      acc.cost += r.cost || 0
      acc.overhead += r.overhead || 0
      acc.fcl += r.fcl || 0
      return acc
    },
    { investment: 0, sales: 0, cost: 0, overhead: 0, fcl: 0 },
  )

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-4">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">Detalle del Flujo de Caja</h3>
        <p className="text-sm text-gray-600">Proyección detallada año por año</p>
      </div>
      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sm:text-sm" style={{ color: "#000" }}>
                  Año
                </TableHead>
                <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap" style={{ color: "#000" }}>
                  Inversión
                </TableHead>
                <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap" style={{ color: "#000" }}>
                  Venta
                </TableHead>
                <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap" style={{ color: "#000" }}>
                  Costo
                </TableHead>
                <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap" style={{ color: "#000" }}>
                  Overhead
                </TableHead>
                <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap" style={{ color: "#000" }}>
                  FCL
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.year}>
                  <TableCell className="font-medium text-xs sm:text-sm" style={{ color: colors.muted }}>
                    {row.year}
                  </TableCell>

                  <TableCell
                    className="text-right text-xs sm:text-sm whitespace-nowrap"
                    style={cellStyle(row.investment, colors.muted)}
                  >
                    {formatCurrency(row.investment)}
                  </TableCell>

                  <TableCell
                    className="text-right text-xs sm:text-sm whitespace-nowrap"
                    style={cellStyle(row.sales, colors.venta)}
                  >
                    {formatCurrency(row.sales)}
                  </TableCell>

                  <TableCell
                    className="text-right text-xs sm:text-sm whitespace-nowrap"
                    style={cellStyle(row.cost, colors.costo)}
                  >
                    {formatCurrency(row.cost)}
                  </TableCell>

                  <TableCell
                    className="text-right text-xs sm:text-sm whitespace-nowrap"
                    style={cellStyle(row.overhead, colors.overhead)}
                  >
                    {formatCurrency(row.overhead)}
                  </TableCell>

                  <TableCell
                    className="text-right font-bold text-xs sm:text-sm whitespace-nowrap"
                    style={cellStyle(row.fcl, colors.fcl)}
                  >
                    {formatCurrency(row.fcl)}
                  </TableCell>
                </TableRow>
              ))}

              {/* Fila de totales */}
              <TableRow key="totales" className="border-t">
                <TableCell className="font-medium text-xs sm:text-sm" style={{ color: colors.muted }}>
                  Totales
                </TableCell>

                <TableCell
                  className="text-right text-xs sm:text-sm whitespace-nowrap"
                  style={cellStyle(totals.investment, colors.muted)}
                >
                  {formatCurrency(totals.investment)}
                </TableCell>

                <TableCell
                  className="text-right text-xs sm:text-sm whitespace-nowrap"
                  style={cellStyle(totals.sales, colors.venta)}
                >
                  {formatCurrency(totals.sales)}
                </TableCell>

                <TableCell
                  className="text-right text-xs sm:text-sm whitespace-nowrap"
                  style={cellStyle(totals.cost, colors.costo)}
                >
                  {formatCurrency(totals.cost)}
                </TableCell>

                <TableCell
                  className="text-right text-xs sm:text-sm whitespace-nowrap"
                  style={cellStyle(totals.overhead, colors.overhead)}
                >
                  {formatCurrency(totals.overhead)}
                </TableCell>

                <TableCell
                  className="text-right font-bold text-xs sm:text-sm whitespace-nowrap"
                  style={cellStyle(totals.fcl, colors.fcl)}
                >
                  {formatCurrency(totals.fcl)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
