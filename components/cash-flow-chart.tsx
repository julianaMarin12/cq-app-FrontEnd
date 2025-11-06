import dynamic from "next/dynamic"
import type { ProductSelection } from "@/lib/cash-flow-calculator"

const ChartClient = dynamic(() => import("./cash-flow-chart.client"), { ssr: false })

export function CashFlowChart(props: { investment: number; years: number; selections: ProductSelection[] }) {
  return <ChartClient {...props} />
}
