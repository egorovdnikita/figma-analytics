// Сгенерировано scripts/sync-design-tokens.mjs из egorovdnikita/box-ui@5309aef — ☯︎ Brand ・ Rounding.
// Руками не править: перезапустите скрипт.
// Приложение использует моду Medium: rounded-card = rounding/xl, rounded-control = rounding/m,
// rounded-chip = rounding/xs (tailwind.config.ts).

export const ROUNDING_DENSITIES = ["Low","Medium","High"] as const
export type RoundingDensity = (typeof ROUNDING_DENSITIES)[number]

export interface RoundingModeToken {
  name: string
  byDensity: Record<RoundingDensity, number>
}

export const ROUNDING_MODE_TOKENS: RoundingModeToken[] = [
  {
    "name": "rounding/none",
    "byDensity": {
      "Low": 0,
      "Medium": 0,
      "High": 0
    }
  },
  {
    "name": "rounding/min",
    "byDensity": {
      "Low": 2,
      "Medium": 4,
      "High": 6
    }
  },
  {
    "name": "rounding/2xs",
    "byDensity": {
      "Low": 4,
      "Medium": 6,
      "High": 8
    }
  },
  {
    "name": "rounding/xs",
    "byDensity": {
      "Low": 6,
      "Medium": 8,
      "High": 12
    }
  },
  {
    "name": "rounding/s",
    "byDensity": {
      "Low": 8,
      "Medium": 12,
      "High": 16
    }
  },
  {
    "name": "rounding/m",
    "byDensity": {
      "Low": 12,
      "Medium": 16,
      "High": 20
    }
  },
  {
    "name": "rounding/l",
    "byDensity": {
      "Low": 16,
      "Medium": 20,
      "High": 24
    }
  },
  {
    "name": "rounding/xl",
    "byDensity": {
      "Low": 20,
      "Medium": 24,
      "High": 32
    }
  },
  {
    "name": "rounding/2xl",
    "byDensity": {
      "Low": 24,
      "Medium": 32,
      "High": 40
    }
  },
  {
    "name": "rounding/max",
    "byDensity": {
      "Low": 32,
      "Medium": 40,
      "High": 48
    }
  },
  {
    "name": "rounding/full",
    "byDensity": {
      "Low": 9999,
      "Medium": 9999,
      "High": 9999
    }
  }
]
