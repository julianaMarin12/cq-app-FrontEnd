"use client"
import { useMemo, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { generateCashFlowData, ProductSelection } from "@/lib/cash-flow-calculator"

interface CashFlowChartProps {
  investment: number
  years: number
  selections: ProductSelection[]
}

export default function CashFlowChartClient({ investment, years, selections }: CashFlowChartProps) {
  const data = generateCashFlowData(investment, selections, years)

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        year: d.year,
        sales: d.sales,
        expenses: d.cost + d.overhead,
        netCashFlow: d.netCashFlow,
        cumulativeCashFlow: d.cumulativeCashFlow,
      })),
    [data],
  )

  const [colors, setColors] = useState({ primary: "#25ABB9", light: "#7FD7DB", dark: "#1f8f95" })

  useEffect(() => {
    const cssPrimary = getComputedStyle(document.documentElement).getPropertyValue("--chart-primary")?.trim()
    const primary = cssPrimary || "#25ABB9"

    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
    const hexToRgb = (hex: string) => {
      const h = hex.replace("#", "")
      return h.length === 3
        ? [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]
        : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
    }
    const rgbToHex = (r: number, g: number, b: number) =>
      "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")

    const lighten = (hex: string, percent: number) => {
      const [r, g, b] = hexToRgb(hex)
      return rgbToHex(clamp(r + (255 - r) * (percent / 100)), clamp(g + (255 - g) * (percent / 100)), clamp(b + (255 - b) * (percent / 100)))
    }
    const darken = (hex: string, percent: number) => {
      const [r, g, b] = hexToRgb(hex)
      return rgbToHex(clamp(r * (1 - percent / 100)), clamp(g * (1 - percent / 100)), clamp(b * (1 - percent / 100)))
    }

    setColors({ primary, light: lighten(primary, 30), dark: darken(primary, 20) })
  }, [])

  const currency = (value?: number) => (value == null ? "-" : `$${value.toLocaleString("es-ES")}`)

  const { barDomain, lineDomain } = useMemo(() => {
    const barVals = chartData.flatMap((d) => [d.sales || 0, d.expenses || 0, d.netCashFlow || 0])
    const lineVals = chartData.map((d) => d.cumulativeCashFlow || 0)

    const computeDomain = (vals: number[]) => {
      if (!vals.length) return [0, 1]
      let min = Math.min(...vals)
      let max = Math.max(...vals)
      if (!isFinite(min) || !isFinite(max)) return [0, 1]
      if (min === max) {
        const pad = Math.max(Math.abs(min) * 0.1, 1)
        min = min - pad
        max = max + pad
      } else {
        const pad = Math.max((max - min) * 0.1, 1)
        min = min - pad
        max = max + pad
      }
      return [Math.floor(min), Math.ceil(max)]
    }

    return {
      barDomain: computeDomain(barVals),
      lineDomain: computeDomain(lineVals),
    }
  }, [chartData])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-transparent shadow-none">
        <CardHeader>
          <CardTitle>Flujo de Caja Anual</CardTitle>
          <CardDescription>Ingresos, egresos y flujo neto por año</CardDescription>
        </CardHeader>
        <CardContent className="!pt-4">
          <ResponsiveContainer width="100%" height="100%" minHeight={260}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={colors.primary} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={colors.light} stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="expensesGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#F97373" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#FDB2B2" stopOpacity={0.6} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="year" tick={{ fill: "var(--muted-foreground, #6b7280)" }} />
              <YAxis
                tick={{ fill: "var(--muted-foreground, #6b7280)" }}
                domain={barDomain}
                tickFormatter={(v) => currency(Number(v))}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                }}
                itemStyle={{ color: "inherit" }}
                formatter={(value: number) => currency(value)}
              />
              <Legend formatter={(val) => val} />
              <Bar dataKey="sales" name="Ingresos" fill="url(#incomeGradient)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" name="Egresos" fill="url(#expensesGradient)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="netCashFlow" name="Flujo Neto" fill={colors.dark} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-transparent shadow-none">
        <CardHeader>
          <CardTitle>Flujo de Caja Acumulado</CardTitle>
          <CardDescription>Evolución del flujo de caja acumulado en el tiempo</CardDescription>
        </CardHeader>
        <CardContent className="!pt-4">
          <ResponsiveContainer width="100%" height="100%" minHeight={260}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="year" tick={{ fill: "var(--muted-foreground, #6b7280)" }} />
              <YAxis
                tick={{ fill: "var(--muted-foreground, #6b7280)" }}
                domain={lineDomain}
                tickFormatter={(v) => currency(Number(v))}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                }}
                formatter={(value: number) => currency(value)}
              />
              <Legend />
              <ReferenceLine y={0} stroke="rgba(0,0,0,0.12)" />
              <Line
                type="monotone"
                dataKey="cumulativeCashFlow"
                stroke={colors.primary}
                strokeWidth={3}
                name="Flujo Acumulado"
                dot={{ fill: colors.primary, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
