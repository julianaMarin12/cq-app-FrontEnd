import { productsDatabase, zones, type Product } from "./products-data"

interface CashFlowData {
  year: string
  investment: number
  sales: number
  cost: number
  overhead: number
  fcl: number
  netCashFlow: number
  cumulativeCashFlow: number
}

interface Metrics {
  npv: number
  irr: number
  roi: number
  paybackPeriod: number
  totalCashFlow: number
}

export interface ProductSelection {
  productId: string
  zoneId: string
  quantity: number
  manualPrice?: number
  editPrice?: boolean
  categoria?: string
  linea?: string
  sublinea?: string
}

function getProductById(productId: string): Product | undefined {
  return productsDatabase.find((p) => p.id === productId)
}

function getPriceForZone(product: Product, zoneId: string, manualPrice?: number): number {
  // usar manualPrice si fue definido por el usuario (override)
  if (manualPrice !== undefined) {
    return manualPrice
  }

  if (zoneId === "otro") {
    return 0
  }

  const zone = zones.find((z) => z.id === zoneId)
  if (!zone) return 0

  const zoneKey = zone.key
  const price = product.prices[zoneKey]
  return price && price > 0 ? price : 0
}

// Ahora recibe una lista de selecciones de productos
export function generateCashFlowData(
  investment: number,
  productSelections: ProductSelection[],
  years: number,
): CashFlowData[] {
  const data: CashFlowData[] = []
  let cumulative = -investment

  // Selecciones válidas
  const validSelections = productSelections.filter((s) => !!s.productId && s.quantity > 0)
  if (!validSelections.length) {
    return [
      {
        year: "Año 0",
        investment: investment,
        sales: 0,
        cost: 0,
        overhead: 0,
        fcl: -investment,
        netCashFlow: -investment,
        cumulativeCashFlow: cumulative,
      },
    ]
  }

  data.push({
    year: "Año 0",
    investment: investment,
    sales: 0,
    cost: 0,
    overhead: 0,
    fcl: -investment,
    netCashFlow: -investment,
    cumulativeCashFlow: cumulative,
  })

  // Inicializar estado por producto: precio actual, costo actual, aumento anual y cantidad
  const states = validSelections
    .map((sel) => {
      const product = getProductById(sel.productId)
      if (!product) return null
      const initialPrice = getPriceForZone(product, sel.zoneId, sel.manualPrice)
      return {
        product,
        quantity: sel.quantity,
        currentPrice: initialPrice, 
        currentCost: product.baseCost2024, 
        annualIncrease: product.annualIncrease ?? 0.05,
      }
    })
    .filter(Boolean) as {
      product: Product
      quantity: number
      currentPrice: number
      currentCost: number
      annualIncrease: number
    }[]

  for (let year = 1; year <= years; year++) {
    let monthlyPriceSum = 0
    let monthlyCostSum = 0

    states.forEach((s) => {
      const price = s.currentPrice || 0
      const cost = s.currentCost || 0

      monthlyPriceSum += price * s.quantity
      monthlyCostSum += cost * s.quantity
    })

    const sales = monthlyPriceSum * 12
    const cost = monthlyCostSum * 12
    const overhead = sales * 0.2

    const netCashFlow = sales - cost - overhead
    cumulative += netCashFlow

    data.push({
      year: `Año ${year}`,
      investment: 0,
      sales: Math.round(sales),
      cost: Math.round(cost),
      overhead: Math.round(overhead),
      fcl: Math.round(netCashFlow),
      netCashFlow: Math.round(netCashFlow),
      cumulativeCashFlow: Math.round(cumulative),
    })

    states.forEach((s) => {
      s.currentPrice = s.currentPrice * (1 + s.annualIncrease)
      s.currentCost = s.currentCost * (1 + s.annualIncrease)
    })
  }

  return data
}

export function calculateMetrics(
  investment: number,
  productSelections: ProductSelection[],
  years: number,
): Metrics {
  const data = generateCashFlowData(investment, productSelections, years)
  const discountRate = 0.1

  let npv = -investment
  for (let i = 1; i < data.length; i++) {
    npv += data[i].netCashFlow / Math.pow(1 + discountRate, i)
  }

  const cashFlows: number[] = [-investment, ...data.slice(1).map((d) => d.netCashFlow)]

  const npvAtRate = (rate: number) => {
    if (!isFinite(rate) || rate <= -0.999999) return Number.POSITIVE_INFINITY
    return cashFlows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + rate, i), 0)
  }

  let irr = 0.1
  let converged = false
  for (let iter = 0; iter < 100; iter++) {
    let f = 0
    let df = 0
    for (let i = 0; i < cashFlows.length; i++) {
      const cf = cashFlows[i]
      const denom = Math.pow(1 + irr, i)
      f += cf / denom
      if (i > 0) {
        df -= (i * cf) / (Math.pow(1 + irr, i + 1))
      }
    }

    if (!isFinite(f) || !isFinite(df)) break
    if (Math.abs(f) < 1e-6) {
      converged = true
      break
    }
    if (Math.abs(df) < 1e-12) break

    const next = irr - f / df
    if (!isFinite(next) || next <= -0.999999) break
    irr = next
  }

  if (!converged) {
    let low = -0.9999
    let high = 10
    let fLow = npvAtRate(low)
    let fHigh = npvAtRate(high)

    if (Math.abs(fLow) < 1e-6) {
      irr = low
      converged = true
    } else if (Math.abs(fHigh) < 1e-6) {
      irr = high
      converged = true
    } else if (fLow * fHigh < 0) {
      for (let iter = 0; iter < 200; iter++) {
        const mid = (low + high) / 2
        const fMid = npvAtRate(mid)
        if (Math.abs(fMid) < 1e-6) {
          irr = mid
          converged = true
          break
        }
        if (fLow * fMid < 0) {
          high = mid
          fHigh = fMid
        } else {
          low = mid
          fLow = fMid
        }
      }
      if (!converged) irr = (low + high) / 2
    } else {
      let bestRate = irr
      let bestVal = Math.abs(npvAtRate(irr))
      for (let r = -0.9; r <= 5; r += 0.05) {
        const v = Math.abs(npvAtRate(r))
        if (v < bestVal) {
          bestVal = v
          bestRate = r
        }
      }
      irr = bestRate
    }
  }

  if (!isFinite(irr)) irr = -1

  const totalCashFlow = data[data.length - 1].cumulativeCashFlow
  const roi = investment > 0 ? (totalCashFlow / investment) * 100 : 0

  let paybackPeriod = 0
  for (let i = 1; i < data.length; i++) {
    if (data[i].cumulativeCashFlow >= 0) {
      paybackPeriod = i
      break
    }
  }
  if (paybackPeriod === 0) paybackPeriod = years

  return {
    npv: Math.round(npv),
    irr: irr * 100,
    roi,
    paybackPeriod,
    totalCashFlow: Math.round(totalCashFlow),
  }
}
