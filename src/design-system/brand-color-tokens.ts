// Сгенерировано scripts/sync-design-tokens.mjs из egorovdnikita/box-ui@5309aef — ☯︎ Brand ・ Color.
// Руками не править: перезапустите скрипт.
// Приложение использует моду Deep: её значения сведены в --grass и соседей в src/index.css.

export const BRAND_MODES = ["Deep","Bright","Monochrome"] as const
export type BrandMode = (typeof BRAND_MODES)[number]

export interface BrandColorToken {
  name: string
  byMode: Record<BrandMode, string>
}

export const BRAND_COLOR_TOKENS: BrandColorToken[] = [
  {
    "name": "color/solid/500",
    "byMode": {
      "Deep": "#6366f1",
      "Bright": "#bef264",
      "Monochrome": "#000000"
    }
  },
  {
    "name": "color/solid/450",
    "byMode": {
      "Deep": "#7279f5",
      "Bright": "#cbf580",
      "Monochrome": "#000000"
    }
  },
  {
    "name": "color/alpha/8",
    "byMode": {
      "Deep": "#6366f114",
      "Bright": "#84cc1614",
      "Monochrome": "#00000014"
    }
  },
  {
    "name": "color/alpha/16",
    "byMode": {
      "Deep": "#6366f129",
      "Bright": "#84cc1629",
      "Monochrome": "#00000029"
    }
  },
  {
    "name": "color/alpha/24",
    "byMode": {
      "Deep": "#6366f13d",
      "Bright": "#84cc163d",
      "Monochrome": "#0000003d"
    }
  },
  {
    "name": "color/alpha/48",
    "byMode": {
      "Deep": "#6366f17a",
      "Bright": "#84cc167a",
      "Monochrome": "#0000007a"
    }
  },
  {
    "name": "color/solid/550",
    "byMode": {
      "Deep": "#5956eb",
      "Bright": "#b1ec4d",
      "Monochrome": "#000000"
    }
  },
  {
    "name": "color/contrast",
    "byMode": {
      "Deep": "#000000",
      "Bright": "#000000",
      "Monochrome": "#ffffff"
    }
  },
  {
    "name": "color/alpha/64",
    "byMode": {
      "Deep": "#6366f1a3",
      "Bright": "#84cc16a3",
      "Monochrome": "#000000a3"
    }
  },
  {
    "name": "color/alpha/80",
    "byMode": {
      "Deep": "#6366f1cc",
      "Bright": "#84cc16cc",
      "Monochrome": "#000000cc"
    }
  },
  {
    "name": "color/on-solid",
    "byMode": {
      "Deep": "#ffffff",
      "Bright": "#262626",
      "Monochrome": "#ffffff"
    }
  },
  {
    "name": "color/on-solid-muted",
    "byMode": {
      "Deep": "#ffffffe0",
      "Bright": "#0000007a",
      "Monochrome": "#ffffffe0"
    }
  },
  {
    "name": "color/inverse/solid/450",
    "byMode": {
      "Deep": "#7279f5",
      "Bright": "#93d926",
      "Monochrome": "#ffffff"
    }
  },
  {
    "name": "color/inverse/solid/500",
    "byMode": {
      "Deep": "#6366f1",
      "Bright": "#84cc16",
      "Monochrome": "#ffffff"
    }
  },
  {
    "name": "color/inverse/solid/550",
    "byMode": {
      "Deep": "#5956eb",
      "Bright": "#75b712",
      "Monochrome": "#ffffff"
    }
  },
  {
    "name": "color/inverse/alpha/8",
    "byMode": {
      "Deep": "#6366f114",
      "Bright": "#84cc1614",
      "Monochrome": "#ffffff14"
    }
  },
  {
    "name": "color/inverse/alpha/16",
    "byMode": {
      "Deep": "#6366f129",
      "Bright": "#84cc1629",
      "Monochrome": "#ffffff29"
    }
  },
  {
    "name": "color/inverse/alpha/48",
    "byMode": {
      "Deep": "#6366f17a",
      "Bright": "#84cc167a",
      "Monochrome": "#ffffff7a"
    }
  },
  {
    "name": "color/inverse/alpha/64",
    "byMode": {
      "Deep": "#6366f1a3",
      "Bright": "#84cc16a3",
      "Monochrome": "#ffffffa3"
    }
  },
  {
    "name": "color/inverse/alpha/80",
    "byMode": {
      "Deep": "#6366f1cc",
      "Bright": "#84cc16cc",
      "Monochrome": "#ffffffcc"
    }
  },
  {
    "name": "color/inverse/on-solid",
    "byMode": {
      "Deep": "#ffffff",
      "Bright": "#262626",
      "Monochrome": "#000000"
    }
  },
  {
    "name": "color/inverse/on-solid-muted",
    "byMode": {
      "Deep": "#ffffffe0",
      "Bright": "#0000007a",
      "Monochrome": "#0000007a"
    }
  },
  {
    "name": "color/solid/600",
    "byMode": {
      "Deep": "#4f46e5",
      "Bright": "#3f6212",
      "Monochrome": "#000000"
    }
  },
  {
    "name": "color/inverse/alpha/24",
    "byMode": {
      "Deep": "#6366f13d",
      "Bright": "#84cc163d",
      "Monochrome": "#ffffff3d"
    }
  },
  {
    "name": "color/control-contrast-alpha/24",
    "byMode": {
      "Deep": "#ffffff3d",
      "Bright": "#00000029",
      "Monochrome": "#ffffff3d"
    }
  },
  {
    "name": "color/inverse/control-contrast-alpha/24",
    "byMode": {
      "Deep": "#ffffff3d",
      "Bright": "#00000029",
      "Monochrome": "#0000003d"
    }
  },
  {
    "name": "color/control-contrast-alpha/32",
    "byMode": {
      "Deep": "#ffffff52",
      "Bright": "#0000003d",
      "Monochrome": "#ffffff52"
    }
  },
  {
    "name": "color/inverse/control-contrast-alpha/32",
    "byMode": {
      "Deep": "#ffffff52",
      "Bright": "#0000003d",
      "Monochrome": "#00000052"
    }
  },
  {
    "name": "color/control-contrast-alpha/48",
    "byMode": {
      "Deep": "#ffffff7a",
      "Bright": "#00000052",
      "Monochrome": "#ffffff7a"
    }
  },
  {
    "name": "color/inverse/control-contrast-alpha/48",
    "byMode": {
      "Deep": "#ffffff7a",
      "Bright": "#00000052",
      "Monochrome": "#0000007a"
    }
  },
  {
    "name": "color/control-contrast-alpha/64",
    "byMode": {
      "Deep": "#ffffffa3",
      "Bright": "#000000a3",
      "Monochrome": "#ffffffa3"
    }
  },
  {
    "name": "color/inverse/control-contrast-alpha/64",
    "byMode": {
      "Deep": "#ffffffa3",
      "Bright": "#000000a3",
      "Monochrome": "#000000a3"
    }
  },
  {
    "name": "color/control-contrast-alpha/80",
    "byMode": {
      "Deep": "#ffffffcc",
      "Bright": "#000000cc",
      "Monochrome": "#ffffffcc"
    }
  },
  {
    "name": "color/inverse/control-contrast-alpha/80",
    "byMode": {
      "Deep": "#ffffffcc",
      "Bright": "#000000cc",
      "Monochrome": "#000000cc"
    }
  },
  {
    "name": "color/control-content-on-solid",
    "byMode": {
      "Deep": "#4f46e5",
      "Bright": "#ffffff",
      "Monochrome": "#000000"
    }
  },
  {
    "name": "color/inverse/control-content-on-solid",
    "byMode": {
      "Deep": "#4f46e5",
      "Bright": "#ffffff",
      "Monochrome": "#ffffff"
    }
  },
  {
    "name": "color/static-fill-hover",
    "byMode": {
      "Deep": "#ffffff",
      "Bright": "#333333",
      "Monochrome": "#ffffff"
    }
  },
  {
    "name": "color/static-fill-active",
    "byMode": {
      "Deep": "#ffffff",
      "Bright": "#494949",
      "Monochrome": "#ffffff"
    }
  },
  {
    "name": "color/inverse/static-fill-hover",
    "byMode": {
      "Deep": "#ffffff",
      "Bright": "#333333",
      "Monochrome": "#333333"
    }
  },
  {
    "name": "color/inverse/static-fill-active",
    "byMode": {
      "Deep": "#ffffff",
      "Bright": "#494949",
      "Monochrome": "#494949"
    }
  },
  {
    "name": "color/static-content-hover",
    "byMode": {
      "Deep": "#5956eb",
      "Bright": "#ffffff",
      "Monochrome": "#000000"
    }
  },
  {
    "name": "color/static-content-active",
    "byMode": {
      "Deep": "#6366f1",
      "Bright": "#ffffff",
      "Monochrome": "#000000"
    }
  },
  {
    "name": "color/inverse/static-content-hover",
    "byMode": {
      "Deep": "#5956eb",
      "Bright": "#ffffff",
      "Monochrome": "#ffffff"
    }
  },
  {
    "name": "color/inverse/static-content-active",
    "byMode": {
      "Deep": "#6366f1",
      "Bright": "#ffffff",
      "Monochrome": "#ffffff"
    }
  },
  {
    "name": "color/control-contrast-alpha/16",
    "byMode": {
      "Deep": "#ffffff29",
      "Bright": "#00000014",
      "Monochrome": "#ffffff29"
    }
  },
  {
    "name": "color/inverse/control-contrast-alpha/16",
    "byMode": {
      "Deep": "#ffffff29",
      "Bright": "#00000014",
      "Monochrome": "#00000029"
    }
  }
]

export interface StaticColorToken { name: string; hex: string }

export const STATIC_COLOR_TOKENS: StaticColorToken[] = [
  {
    "name": "color/inverse/contrast",
    "hex": "#000000"
  }
]
