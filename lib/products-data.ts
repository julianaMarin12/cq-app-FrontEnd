import productsJson from "./products-data.json"

export interface Product {
  id: string
  description: string
  unit: string
  baseCost2024: number
  annualIncrease: number
  categoria: string
  linea: string
  sublinea: string
  prices: {
    zona1?: number
    zona2?: number
    [k: string]: number | undefined
  }
}

export const productsDatabase: Product[] = productsJson as Product[]

export const zones = [
  { id: "zona1", name: "Zona 1", key: "zona1" as const },
  { id: "zona2", name: "Zona 2", key: "zona2" as const },
]

export const getCategories = (): string[] => {
  const categories = new Set(productsDatabase.map((p) => p.categoria).filter(Boolean))
  return Array.from(categories).sort()
}

export const getLineasByCategoria = (categoria: string): string[] => {
  const lineas = new Set(
    productsDatabase
      .filter((p) => p.categoria === categoria)
      .map((p) => p.linea)
      .filter(Boolean),
  )
  return Array.from(lineas).sort()
}

export const getSublineasByLinea = (categoria: string, linea: string): string[] => {
  const sublineas = new Set(
    productsDatabase
      .filter((p) => p.categoria === categoria && p.linea === linea)
      .map((p) => p.sublinea)
      .filter(Boolean),
  )
  return Array.from(sublineas).sort()
}

export const getProductsByFilters = (categoria: string, linea: string, sublinea: string): Product[] => {
  return productsDatabase.filter((p) => p.categoria === categoria && p.linea === linea && p.sublinea === sublinea)
}
