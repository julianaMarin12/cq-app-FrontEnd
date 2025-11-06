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
  suggestions?: Suggestion[]  
}

interface Suggestion {
  type: "price" | "units"
  productId: string
  zoneId: string
  currentValue: number
  suggestedValue: number
  estimatedIrr: number
  detail?: string
  overrides?: { productId: string; zoneId: string; currentValue: number; suggestedValue: number }[]
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

export function generateCashFlowData(
  investment: number,
  productSelections: ProductSelection[],
  years: number,
): CashFlowData[] {
  const data: CashFlowData[] = []
  let cumulative = -investment

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

  for (let year = 1, len = years; year <= len; year++) {
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

/* Agregado: helper para calcular IRR (devuelve decimal, p.ej. 0.12 => 12%) */
/* usando la misma aproximación (Newton + bisección) extraída */
function computeIrrFromCashFlows(cashFlows: number[]): number {
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
  return irr
}

function suggestAdjustments(
  investment: number,
  productSelections: ProductSelection[],
  years: number,
): Suggestion[] {
  const suggestions: Suggestion[] = []
  const maxPriceFactor = 5 
  const maxUnitsFactor = 10 
  const eps = 1e-6
  const targetIrr = 0.2 
  const maxSuggestions = 2

  const irrForOverrideAtIndex = (idx: number, override: Partial<ProductSelection>) => {
    const modified = productSelections.map((s, i) => (i === idx ? { ...s, ...override } : { ...s }))
    const data = generateCashFlowData(investment, modified, years)
    const cashFlows = [-investment, ...data.slice(1).map((d) => d.netCashFlow)]
    return computeIrrFromCashFlows(cashFlows)
  }

  const irrForOverrides = (overrides: Partial<ProductSelection>[]) => {
    const modified = productSelections.map((s, i) => ({ ...s, ...(overrides[i] ?? {}) }))
    const data = generateCashFlowData(investment, modified, years)
    const cashFlows = [-investment, ...data.slice(1).map((d) => d.netCashFlow)]
    return computeIrrFromCashFlows(cashFlows)
  }

  const individualSuggestions: Suggestion[] = []
  const groupSuggestions: Suggestion[] = []

  for (let idx = 0; idx < productSelections.length; idx++) {
    const sel = productSelections[idx]
    const product = getProductById(sel.productId)
    if (!product) continue

    const basePrice = getPriceForZone(product, sel.zoneId, sel.manualPrice)
    const baseQty = sel.quantity

    if (basePrice > 0) {
      let low = 1
      let high = maxPriceFactor
      let foundFactor: number | null = null

      if (irrForOverrideAtIndex(idx, { manualPrice: basePrice * high }) > targetIrr) {
        for (let iter = 0; iter < 60; iter++) {
          const mid = (low + high) / 2
          const irr = irrForOverrideAtIndex(idx, { manualPrice: basePrice * mid })
          if (irr > targetIrr) {
            foundFactor = mid
            high = mid
          } else {
            low = mid
          }
          if (high - low < eps) break
        }
      }

      if (foundFactor) {
        const suggestedPrice = Math.round(basePrice * foundFactor * 100) / 100
        const estimatedIrr = irrForOverrideAtIndex(idx, { manualPrice: suggestedPrice })
        individualSuggestions.push({
          type: "price",
          productId: sel.productId,
          zoneId: sel.zoneId,
          currentValue: basePrice,
          suggestedValue: suggestedPrice,
          estimatedIrr,
          detail: `Aumentar precio ~${Math.round((foundFactor - 1) * 100)}% (individual)`,
        })
      }
    }

    if (baseQty > 0) {
      let low = baseQty
      let high = Math.max(Math.ceil(baseQty * maxUnitsFactor), baseQty + 100)
      let foundQty: number | null = null

      if (irrForOverrideAtIndex(idx, { quantity: high }) > targetIrr) {
        for (let iter = 0; iter < 80; iter++) {
          const mid = Math.floor((low + high) / 2)
          if (mid === low) break
          const irr = irrForOverrideAtIndex(idx, { quantity: mid })
          if (irr > targetIrr) {
            foundQty = mid
            high = mid
          } else {
            low = mid
          }
        }
      }

      if (foundQty) {
        const estimatedIrr = irrForOverrideAtIndex(idx, { quantity: foundQty })
        individualSuggestions.push({
          type: "units",
          productId: sel.productId,
          zoneId: sel.zoneId,
          currentValue: baseQty,
          suggestedValue: foundQty,
          estimatedIrr,
          detail: `Aumentar unidades a ${foundQty} (individual)`,
        })
      }
    }
  }

  const validSelections = productSelections.map((s, i) => ({ ...s, index: i })).filter((s) => s.productId && s.quantity > 0)

  if (validSelections.length >= 2) {
    const bases = validSelections.map((vs) => {
      const product = getProductById(vs.productId)
      const price = product ? getPriceForZone(product, vs.zoneId, vs.manualPrice) : 0
      return { index: vs.index, price, qty: vs.quantity, zoneId: vs.zoneId, productId: vs.productId }
    })

    const totalRevenue = bases.reduce((acc, b) => acc + b.price * b.qty, 0)
    if (totalRevenue > 0) {
      const shares = bases.map((b) => ({ ...b, share: (b.price * b.qty) / totalRevenue }))

      let lowK = 0
      let highK = 5
      let foundK: number | null = null

      const maxMultiplierCheck = (k: number) => shares.every((s) => 1 + k * s.share <= maxPriceFactor)

      if (maxMultiplierCheck(highK)) {
        if (
          irrForOverrides(
            productSelections.map((s, i) => {
              const sh = shares.find((x) => x.index === i)
              if (!sh) return {}
              const newPrice = Math.round(sh.price * (1 + highK * sh.share) * 100) / 100
              return { manualPrice: newPrice, zoneId: "otro" }
            }),
          ) > targetIrr
        ) {
          for (let iter = 0; iter < 80; iter++) {
            const mid = (lowK + highK) / 2
            const overrides = productSelections.map((s, i) => {
              const sh = shares.find((x) => x.index === i)
              if (!sh) return {}
              const newPrice = Math.round(sh.price * (1 + mid * sh.share) * 100) / 100
              return { manualPrice: newPrice, zoneId: "otro" }
            })
            const irr = irrForOverrides(overrides)
            if (irr > targetIrr) {
              foundK = mid
              highK = mid
            } else {
              lowK = mid
            }
            if (highK - lowK < 1e-6) break
          }
        }
      } else {
        const allowableHigh = Math.min(...shares.map((s) => (maxPriceFactor - 1) / s.share))
        if (allowableHigh > 0) {
          highK = Math.min(highK, allowableHigh)
          if (
            irrForOverrides(
              productSelections.map((s, i) => {
                const sh = shares.find((x) => x.index === i)
                if (!sh) return {}
                const newPrice = Math.round(sh.price * (1 + highK * sh.share) * 100) / 100
                return { manualPrice: newPrice, zoneId: "otro" }
              }),
            ) > targetIrr
          ) {
            for (let iter = 0; iter < 80; iter++) {
              const mid = (lowK + highK) / 2
              const overrides = productSelections.map((s, i) => {
                const sh = shares.find((x) => x.index === i)
                if (!sh) return {}
                const newPrice = Math.round(sh.price * (1 + mid * sh.share) * 100) / 100
                return { manualPrice: newPrice, zoneId: "otro" }
              })
              const irr = irrForOverrides(overrides)
              if (irr > targetIrr) {
                foundK = mid
                highK = mid
              } else {
                lowK = mid
              }
              if (highK - lowK < 1e-6) break
            }
          }
        }
      }

      if (foundK !== null) {
        const overrides = productSelections.map((s, i) => {
          const sh = shares.find((x) => x.index === i)
          if (!sh) return null
          const suggestedPrice = Math.round(sh.price * (1 + foundK * sh.share) * 100) / 100
          const pct = sh.price > 0 ? Math.round(((suggestedPrice / sh.price) - 1) * 100) : 0
          return { suggestedPrice, sh, pct }
        }).filter(Boolean as any)

        const finalIrr = irrForOverrides(
          productSelections.map((s, i) => {
            const ov = overrides[i] as any
            if (!ov || ov.suggestedPrice === undefined) return {}
            return { manualPrice: ov.suggestedPrice, zoneId: "otro" }
          }),
        )

        for (const ov of overrides) {
          if (!ov || !(ov as any).sh) continue
          const sh = (ov as any).sh
          const suggestedPrice = (ov as any).suggestedPrice as number
          const pct = (ov as any).pct as number
          individualSuggestions.push({
            type: "price",
            productId: sh.productId,
            zoneId: sh.zoneId,
            currentValue: sh.price,
            suggestedValue: suggestedPrice,
            estimatedIrr: finalIrr,
            detail: `+${pct}% (derivado combinado)`,
          })
        }

        const groupOverrides = overrides.map((ov: any) => ({
          productId: ov.sh.productId,
          zoneId: ov.sh.zoneId,
          currentValue: ov.sh.price,
          suggestedValue: ov.suggestedPrice,
        }))

        const detailParts = overrides.map((ov: any) => `${ov.sh.productId} +${ov.pct}%`)
        groupSuggestions.push({
          type: "price",
          productId: "__group__",
          zoneId: "",
          currentValue: 0,
          suggestedValue: 0,
          estimatedIrr: finalIrr,
          detail: `Ajuste combinado de precios: ${detailParts.join(", ")}`,
          overrides: groupOverrides,
        })
      }

      let lowKU = 0
      let highKU = 10
      let foundKU: number | null = null

      if (
        irrForOverrides(
          productSelections.map((s, i) => {
            const sh = shares.find((x) => x.index === i)
            if (!sh) return {}
            const newQty = Math.ceil(sh.qty * (1 + highKU * sh.share))
            return { quantity: newQty }
          }),
        ) > targetIrr
      ) {
        for (let iter = 0; iter < 80; iter++) {
          const mid = (lowKU + highKU) / 2
          const overrides = productSelections.map((s, i) => {
            const sh = shares.find((x) => x.index === i)
            if (!sh) return {}
            const newQty = Math.ceil(sh.qty * (1 + mid * sh.share))
            return { quantity: newQty }
          })
          const irr = irrForOverrides(overrides)
          if (irr > targetIrr) {
            foundKU = mid
            highKU = mid
          } else {
            lowKU = mid
          }
          if (highKU - lowKU < 1e-6) break
        }
      }

      if (foundKU !== null) {
        const overridesQty = productSelections.map((s, i) => {
          const sh = shares.find((x) => x.index === i)
          if (!sh) return null
          const suggestedQty = Math.ceil(sh.qty * (1 + foundKU * sh.share))
          const pct = Math.round(((suggestedQty / sh.qty) - 1) * 100)
          return { suggestedQty, sh, pct }
        }).filter(Boolean as any)

        const finalIrrQty = irrForOverrides(
          productSelections.map((s, i) => {
            const ov = overridesQty[i] as any
            if (!ov || ov.suggestedQty === undefined) return {}
            return { quantity: ov.suggestedQty }
          }),
        )

        for (const ov of overridesQty) {
          if (!ov || !(ov as any).sh) continue
          const sh = (ov as any).sh
          const suggestedQty = (ov as any).suggestedQty as number
          const pct = (ov as any).pct as number
          individualSuggestions.push({
            type: "units",
            productId: sh.productId,
            zoneId: sh.zoneId,
            currentValue: sh.qty,
            suggestedValue: suggestedQty,
            estimatedIrr: finalIrrQty,
            detail: `+${pct}% (derivado combinado)`,
          })
        }

        const groupOverridesQty = overridesQty
          .map((ov: any) => ({
            productId: ov.sh.productId,
            zoneId: ov.sh.zoneId,
            currentValue: ov.sh.qty,
            suggestedValue: ov.suggestedQty,
          }))

        const detailPartsQty = overridesQty.map((ov: any) => `${ov.sh.productId} +${ov.pct}%`)
        groupSuggestions.push({
          type: "units",
          productId: "__group__",
          zoneId: "",
          currentValue: 0,
          suggestedValue: 0,
          estimatedIrr: finalIrrQty,
          detail: `Ajuste combinado de unidades: ${detailPartsQty.join(", ")}`,
          overrides: groupOverridesQty,
        })
      }
    }
  }

  const sortedIndividual = individualSuggestions.sort((a, b) => (b.estimatedIrr || 0) - (a.estimatedIrr || 0))
  const sortedGroup = groupSuggestions.sort((a, b) => (b.estimatedIrr || 0) - (a.estimatedIrr || 0))

  const final: Suggestion[] = []

  if (validSelections.length >= 2) {
    const groupPrice = sortedGroup.find((g) => g.type === "price")
    const groupUnits = sortedGroup.find((g) => g.type === "units")
    if (groupPrice) final.push(groupPrice)
    if (groupUnits && final.length < maxSuggestions) final.push(groupUnits)

    for (const ind of sortedIndividual) {
      if (final.length >= maxSuggestions) break
      if (!final.find((f) => f.productId === ind.productId && f.type === ind.type)) final.push(ind)
    }

    for (const g of sortedGroup) {
      if (final.length >= maxSuggestions) break
      if (!final.includes(g)) final.push(g)
    }

    return final.slice(0, maxSuggestions)
  }

  for (const g of sortedGroup) {
    if (final.length >= maxSuggestions) break
    final.push(g)
  }
  for (const ind of sortedIndividual) {
    if (final.length >= maxSuggestions) break
    final.push(ind)
  }

  return final.slice(0, maxSuggestions)
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

  const irrDecimal = computeIrrFromCashFlows(cashFlows)

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

  let suggestions: Suggestion[] | undefined = undefined
  if (!(isFinite(irrDecimal) && irrDecimal > 0.2)) {
    suggestions = suggestAdjustments(investment, productSelections, years)
  }

  return {
    npv: Math.round(npv),
    irr: irrDecimal * 100,
    roi,
    paybackPeriod,
    totalCashFlow: Math.round(totalCashFlow),
    suggestions,
  }
}
