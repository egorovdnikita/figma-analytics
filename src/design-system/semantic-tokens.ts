// Сгенерировано scripts/sync-design-tokens.mjs из egorovdnikita/box-ui@5309aef — ◑ System ・ Theme.
// Руками не править: перезапустите скрипт.
// Значения, зависящие от бренда и статуса, разрешены в модах Deep и Positive.
export interface SemanticToken { name: string; light: string; dark: string; lightPrimitive: string; darkPrimitive: string }
export interface SemanticGroup { namespace: string; tokens: SemanticToken[] }

export const SEMANTIC_GROUPS: SemanticGroup[] = [
  {
    "namespace": "surface/base",
    "tokens": [
      {
        "name": "surface/base/fill/page",
        "light": "#f5f5f5",
        "dark": "#0a0a0a",
        "lightPrimitive": "neutral/solid/100",
        "darkPrimitive": "neutral/solid/950"
      },
      {
        "name": "surface/base/fill/raised",
        "light": "#ffffff",
        "dark": "#171717",
        "lightPrimitive": "alpha/white/100",
        "darkPrimitive": "neutral/solid/900"
      },
      {
        "name": "surface/base/fill/layer-subtle",
        "light": "#f5f5f5",
        "dark": "#262626",
        "lightPrimitive": "neutral/solid/100",
        "darkPrimitive": "neutral/solid/800"
      },
      {
        "name": "surface/base/fill/overlay",
        "light": "#0000007a",
        "dark": "#000000cc",
        "lightPrimitive": "alpha/black/48",
        "darkPrimitive": "alpha/black/80"
      },
      {
        "name": "surface/base/content/strong",
        "light": "#171717",
        "dark": "#fafafa",
        "lightPrimitive": "neutral/solid/900",
        "darkPrimitive": "neutral/solid/50"
      },
      {
        "name": "surface/base/content/muted",
        "light": "#737373",
        "dark": "#a3a3a3",
        "lightPrimitive": "neutral/solid/500",
        "darkPrimitive": "neutral/solid/400"
      },
      {
        "name": "surface/base/content/subtle",
        "light": "#a3a3a3",
        "dark": "#737373",
        "lightPrimitive": "neutral/solid/400",
        "darkPrimitive": "neutral/solid/500"
      },
      {
        "name": "surface/base/border/default",
        "light": "#73737329",
        "dark": "#73737329",
        "lightPrimitive": "neutral/solid/500",
        "darkPrimitive": "neutral/solid/500"
      },
      {
        "name": "surface/base/border/strong",
        "light": "#73737352",
        "dark": "#73737352",
        "lightPrimitive": "neutral/solid/500",
        "darkPrimitive": "neutral/solid/500"
      },
      {
        "name": "surface/base/border/subtle",
        "light": "#73737314",
        "dark": "#73737314",
        "lightPrimitive": "neutral/solid/500",
        "darkPrimitive": "neutral/solid/500"
      }
    ]
  },
  {
    "namespace": "surface/achromatic",
    "tokens": [
      {
        "name": "surface/achromatic/light/fill/solid",
        "light": "#ffffff",
        "dark": "#ffffff",
        "lightPrimitive": "alpha/white/100",
        "darkPrimitive": "alpha/white/100"
      },
      {
        "name": "surface/achromatic/light/fill/soft",
        "light": "#ffffff3d",
        "dark": "#ffffff3d",
        "lightPrimitive": "alpha/white/24",
        "darkPrimitive": "alpha/white/24"
      },
      {
        "name": "surface/achromatic/dark/fill/solid",
        "light": "#000000",
        "dark": "#000000",
        "lightPrimitive": "alpha/black/100",
        "darkPrimitive": "alpha/black/100"
      },
      {
        "name": "surface/achromatic/light/content/strong",
        "light": "#000000",
        "dark": "#000000",
        "lightPrimitive": "alpha/black/100",
        "darkPrimitive": "alpha/black/100"
      },
      {
        "name": "surface/achromatic/light/content/muted",
        "light": "#0000007a",
        "dark": "#0000007a",
        "lightPrimitive": "alpha/black/48",
        "darkPrimitive": "alpha/black/48"
      },
      {
        "name": "surface/achromatic/dark/fill/soft",
        "light": "#00000029",
        "dark": "#00000029",
        "lightPrimitive": "alpha/black/16",
        "darkPrimitive": "alpha/black/16"
      },
      {
        "name": "surface/achromatic/dark/content/strong",
        "light": "#ffffff",
        "dark": "#ffffff",
        "lightPrimitive": "alpha/white/100",
        "darkPrimitive": "alpha/white/100"
      },
      {
        "name": "surface/achromatic/dark/content/muted",
        "light": "#ffffff7a",
        "dark": "#ffffff7a",
        "lightPrimitive": "alpha/white/48",
        "darkPrimitive": "alpha/white/48"
      }
    ]
  },
  {
    "namespace": "interaction/disabled",
    "tokens": [
      {
        "name": "interaction/disabled/fill",
        "light": "#73737329",
        "dark": "#73737329",
        "lightPrimitive": "neutral/solid/500",
        "darkPrimitive": "neutral/solid/500"
      },
      {
        "name": "interaction/disabled/content",
        "light": "#73737352",
        "dark": "#73737352",
        "lightPrimitive": "neutral/solid/500",
        "darkPrimitive": "neutral/solid/500"
      },
      {
        "name": "interaction/disabled/border",
        "light": "#73737329",
        "dark": "#73737329",
        "lightPrimitive": "neutral/solid/500",
        "darkPrimitive": "neutral/solid/500"
      }
    ]
  },
  {
    "namespace": "accent/fill",
    "tokens": [
      {
        "name": "accent/fill/solid",
        "light": "#6366f1",
        "dark": "#7279f5",
        "lightPrimitive": "indigo/solid/500",
        "darkPrimitive": "indigo/solid/450"
      },
      {
        "name": "accent/fill/soft",
        "light": "#6366f129",
        "dark": "#6366f129",
        "lightPrimitive": "indigo/solid/500",
        "darkPrimitive": "indigo/solid/500"
      }
    ]
  },
  {
    "namespace": "accent/content",
    "tokens": [
      {
        "name": "accent/content/on-soft/default",
        "light": "#4f46e5",
        "dark": "#7279f5",
        "lightPrimitive": "indigo/solid/600",
        "darkPrimitive": "indigo/solid/450"
      },
      {
        "name": "accent/content/on-soft/muted",
        "light": "#6366f1cc",
        "dark": "#6366f1cc",
        "lightPrimitive": "indigo/solid/500",
        "darkPrimitive": "indigo/solid/500"
      },
      {
        "name": "accent/content/on-solid/default",
        "light": "#ffffff",
        "dark": "#ffffff",
        "lightPrimitive": "alpha/white/100",
        "darkPrimitive": "alpha/white/100"
      },
      {
        "name": "accent/content/on-solid/muted",
        "light": "#ffffffe0",
        "dark": "#ffffffe0",
        "lightPrimitive": "alpha/white/88",
        "darkPrimitive": "alpha/white/88"
      }
    ]
  },
  {
    "namespace": "status/fill",
    "tokens": [
      {
        "name": "status/fill/solid",
        "light": "#16a34a",
        "dark": "#1cb454",
        "lightPrimitive": "green/solid/600",
        "darkPrimitive": "green/solid/550"
      },
      {
        "name": "status/fill/soft",
        "light": "#22c55e29",
        "dark": "#22c55e29",
        "lightPrimitive": "green/solid/500",
        "darkPrimitive": "green/solid/500"
      }
    ]
  },
  {
    "namespace": "status/content",
    "tokens": [
      {
        "name": "status/content/on-surface/default",
        "light": "#155c31",
        "dark": "#68e796",
        "lightPrimitive": "green/solid/850",
        "darkPrimitive": "green/solid/350"
      },
      {
        "name": "status/content/on-surface/muted",
        "light": "#22c55e7a",
        "dark": "#22c55e7a",
        "lightPrimitive": "green/solid/500",
        "darkPrimitive": "green/solid/500"
      },
      {
        "name": "status/content/on-solid/default",
        "light": "#ffffff",
        "dark": "#ffffff",
        "lightPrimitive": "alpha/white/100",
        "darkPrimitive": "alpha/white/100"
      },
      {
        "name": "status/content/on-solid/muted",
        "light": "#ffffffe0",
        "dark": "#ffffffe0",
        "lightPrimitive": "alpha/white/88",
        "darkPrimitive": "alpha/white/88"
      }
    ]
  },
  {
    "namespace": "interaction/accent",
    "tokens": [
      {
        "name": "interaction/accent/solid/fill/default",
        "light": "#6366f1",
        "dark": "#7279f5",
        "lightPrimitive": "indigo/solid/500",
        "darkPrimitive": "indigo/solid/450"
      },
      {
        "name": "interaction/accent/solid/fill/hover",
        "light": "#7279f5",
        "dark": "#6366f1",
        "lightPrimitive": "indigo/solid/450",
        "darkPrimitive": "indigo/solid/500"
      },
      {
        "name": "interaction/accent/solid/fill/active",
        "light": "#5956eb",
        "dark": "#5956eb",
        "lightPrimitive": "indigo/solid/550",
        "darkPrimitive": "indigo/solid/550"
      },
      {
        "name": "interaction/accent/solid/content/enabled",
        "light": "#ffffff",
        "dark": "#ffffff",
        "lightPrimitive": "alpha/white/100",
        "darkPrimitive": "alpha/white/100"
      },
      {
        "name": "interaction/accent/soft/fill/default",
        "light": "#6366f129",
        "dark": "#6366f129",
        "lightPrimitive": "indigo/solid/500",
        "darkPrimitive": "indigo/solid/500"
      },
      {
        "name": "interaction/accent/soft/fill/hover",
        "light": "#6366f13d",
        "dark": "#6366f13d",
        "lightPrimitive": "indigo/solid/500",
        "darkPrimitive": "indigo/solid/500"
      },
      {
        "name": "interaction/accent/soft/fill/active",
        "light": "#6366f17a",
        "dark": "#6366f17a",
        "lightPrimitive": "indigo/solid/500",
        "darkPrimitive": "indigo/solid/500"
      },
      {
        "name": "interaction/accent/soft/content/enabled",
        "light": "#4f46e5",
        "dark": "#7279f5",
        "lightPrimitive": "indigo/solid/600",
        "darkPrimitive": "indigo/solid/450"
      },
      {
        "name": "interaction/accent/outline/border/default",
        "light": "#6366f17a",
        "dark": "#6366f17a",
        "lightPrimitive": "indigo/solid/500",
        "darkPrimitive": "indigo/solid/500"
      },
      {
        "name": "interaction/accent/outline/border/hover",
        "light": "#6366f1a3",
        "dark": "#6366f1a3",
        "lightPrimitive": "indigo/solid/500",
        "darkPrimitive": "indigo/solid/500"
      },
      {
        "name": "interaction/accent/outline/border/active",
        "light": "#6366f1cc",
        "dark": "#6366f1cc",
        "lightPrimitive": "indigo/solid/500",
        "darkPrimitive": "indigo/solid/500"
      },
      {
        "name": "interaction/accent/outline/content/enabled",
        "light": "#4f46e5",
        "dark": "#7279f5",
        "lightPrimitive": "indigo/solid/600",
        "darkPrimitive": "indigo/solid/450"
      }
    ]
  },
  {
    "namespace": "interaction/status",
    "tokens": [
      {
        "name": "interaction/status/solid/fill/default",
        "light": "#16a34a",
        "dark": "#1cb454",
        "lightPrimitive": "green/solid/600",
        "darkPrimitive": "green/solid/550"
      },
      {
        "name": "interaction/status/solid/fill/hover",
        "light": "#1cb454",
        "dark": "#16a34a",
        "lightPrimitive": "green/solid/550",
        "darkPrimitive": "green/solid/600"
      },
      {
        "name": "interaction/status/solid/fill/active",
        "light": "#169144",
        "dark": "#169144",
        "lightPrimitive": "green/solid/650",
        "darkPrimitive": "green/solid/650"
      },
      {
        "name": "interaction/status/solid/content/enabled",
        "light": "#ffffff",
        "dark": "#ffffff",
        "lightPrimitive": "alpha/white/100",
        "darkPrimitive": "alpha/white/100"
      },
      {
        "name": "interaction/status/soft/fill/default",
        "light": "#22c55e29",
        "dark": "#22c55e29",
        "lightPrimitive": "green/solid/500",
        "darkPrimitive": "green/solid/500"
      },
      {
        "name": "interaction/status/soft/fill/hover",
        "light": "#22c55e3d",
        "dark": "#22c55e3d",
        "lightPrimitive": "green/solid/500",
        "darkPrimitive": "green/solid/500"
      },
      {
        "name": "interaction/status/soft/fill/active",
        "light": "#22c55e7a",
        "dark": "#22c55e7a",
        "lightPrimitive": "green/solid/500",
        "darkPrimitive": "green/solid/500"
      },
      {
        "name": "interaction/status/soft/content/enabled",
        "light": "#155c31",
        "dark": "#68e796",
        "lightPrimitive": "green/solid/850",
        "darkPrimitive": "green/solid/350"
      },
      {
        "name": "interaction/status/outline/border/default",
        "light": "#22c55e7a",
        "dark": "#22c55e7a",
        "lightPrimitive": "green/solid/500",
        "darkPrimitive": "green/solid/500"
      },
      {
        "name": "interaction/status/outline/border/hover",
        "light": "#22c55ea3",
        "dark": "#22c55ea3",
        "lightPrimitive": "green/solid/500",
        "darkPrimitive": "green/solid/500"
      },
      {
        "name": "interaction/status/outline/border/active",
        "light": "#22c55ecc",
        "dark": "#22c55ecc",
        "lightPrimitive": "green/solid/500",
        "darkPrimitive": "green/solid/500"
      },
      {
        "name": "interaction/status/outline/content/enabled",
        "light": "#155c31",
        "dark": "#68e796",
        "lightPrimitive": "green/solid/850",
        "darkPrimitive": "green/solid/350"
      }
    ]
  },
  {
    "namespace": "interaction/neutral",
    "tokens": [
      {
        "name": "interaction/neutral/grayscale/solid/fill/default",
        "light": "#73737329",
        "dark": "#7373733d",
        "lightPrimitive": "neutral/solid/500",
        "darkPrimitive": "neutral/solid/500"
      },
      {
        "name": "interaction/neutral/grayscale/solid/fill/hover",
        "light": "#7373733d",
        "dark": "#73737352",
        "lightPrimitive": "neutral/solid/500",
        "darkPrimitive": "neutral/solid/500"
      },
      {
        "name": "interaction/neutral/grayscale/solid/fill/active",
        "light": "#73737352",
        "dark": "#7373737a",
        "lightPrimitive": "neutral/solid/500",
        "darkPrimitive": "neutral/solid/500"
      },
      {
        "name": "interaction/neutral/grayscale/solid/content/enabled",
        "light": "#171717",
        "dark": "#fafafa",
        "lightPrimitive": "neutral/solid/900",
        "darkPrimitive": "neutral/solid/50"
      },
      {
        "name": "interaction/neutral/grayscale/soft/fill/default",
        "light": "#73737314",
        "dark": "#73737329",
        "lightPrimitive": "neutral/solid/500",
        "darkPrimitive": "neutral/solid/500"
      },
      {
        "name": "interaction/neutral/grayscale/soft/fill/hover",
        "light": "#73737329",
        "dark": "#7373733d",
        "lightPrimitive": "neutral/solid/500",
        "darkPrimitive": "neutral/solid/500"
      },
      {
        "name": "interaction/neutral/grayscale/soft/fill/active",
        "light": "#7373733d",
        "dark": "#73737352",
        "lightPrimitive": "neutral/solid/500",
        "darkPrimitive": "neutral/solid/500"
      },
      {
        "name": "interaction/neutral/grayscale/soft/content/enabled",
        "light": "#171717",
        "dark": "#fafafa",
        "lightPrimitive": "neutral/solid/900",
        "darkPrimitive": "neutral/solid/50"
      },
      {
        "name": "interaction/neutral/grayscale/outline/border/default",
        "light": "#7373733d",
        "dark": "#7373733d",
        "lightPrimitive": "neutral/solid/500",
        "darkPrimitive": "neutral/solid/500"
      },
      {
        "name": "interaction/neutral/grayscale/outline/border/hover",
        "light": "#73737352",
        "dark": "#73737352",
        "lightPrimitive": "neutral/solid/500",
        "darkPrimitive": "neutral/solid/500"
      },
      {
        "name": "interaction/neutral/grayscale/outline/border/active",
        "light": "#7373737a",
        "dark": "#7373737a",
        "lightPrimitive": "neutral/solid/500",
        "darkPrimitive": "neutral/solid/500"
      },
      {
        "name": "interaction/neutral/grayscale/outline/content/enabled",
        "light": "#171717",
        "dark": "#fafafa",
        "lightPrimitive": "neutral/solid/900",
        "darkPrimitive": "neutral/solid/50"
      }
    ]
  },
  {
    "namespace": "interaction/ghost",
    "tokens": [
      {
        "name": "interaction/ghost/fill/default",
        "light": "#00000000",
        "dark": "#00000000",
        "lightPrimitive": "alpha/transparent",
        "darkPrimitive": "alpha/transparent"
      },
      {
        "name": "interaction/ghost/fill/hover",
        "light": "#73737314",
        "dark": "#73737329",
        "lightPrimitive": "neutral/solid/500",
        "darkPrimitive": "neutral/solid/500"
      },
      {
        "name": "interaction/ghost/fill/active",
        "light": "#73737329",
        "dark": "#7373733d",
        "lightPrimitive": "neutral/solid/500",
        "darkPrimitive": "neutral/solid/500"
      },
      {
        "name": "interaction/ghost/fill/disabled",
        "light": "#00000000",
        "dark": "#00000000",
        "lightPrimitive": "alpha/transparent",
        "darkPrimitive": "alpha/transparent"
      },
      {
        "name": "interaction/ghost/content/enabled",
        "light": "#171717",
        "dark": "#fafafa",
        "lightPrimitive": "neutral/solid/900",
        "darkPrimitive": "neutral/solid/50"
      }
    ]
  },
  {
    "namespace": "interaction/selection",
    "tokens": [
      {
        "name": "interaction/selection/neutral/fill/default",
        "light": "#ffffff",
        "dark": "#404040",
        "lightPrimitive": "alpha/white/100",
        "darkPrimitive": "neutral/solid/700"
      },
      {
        "name": "interaction/selection/neutral/fill/hover",
        "light": "#f5f5f5",
        "dark": "#525252",
        "lightPrimitive": "neutral/solid/100",
        "darkPrimitive": "neutral/solid/600"
      },
      {
        "name": "interaction/selection/neutral/fill/active",
        "light": "#e5e5e5",
        "dark": "#737373",
        "lightPrimitive": "neutral/solid/200",
        "darkPrimitive": "neutral/solid/500"
      },
      {
        "name": "interaction/selection/neutral/content/enabled",
        "light": "#171717",
        "dark": "#fafafa",
        "lightPrimitive": "neutral/solid/900",
        "darkPrimitive": "neutral/solid/50"
      }
    ]
  },
  {
    "namespace": "accent/border",
    "tokens": [
      {
        "name": "accent/border/default",
        "light": "#6366f17a",
        "dark": "#6366f17a",
        "lightPrimitive": "indigo/solid/500",
        "darkPrimitive": "indigo/solid/500"
      }
    ]
  },
  {
    "namespace": "status/border",
    "tokens": [
      {
        "name": "status/border/default",
        "light": "#22c55e7a",
        "dark": "#22c55e7a",
        "lightPrimitive": "green/solid/500",
        "darkPrimitive": "green/solid/500"
      }
    ]
  },
  {
    "namespace": "interaction/on-accent",
    "tokens": [
      {
        "name": "interaction/on-accent/control-alpha/24",
        "light": "#ffffff3d",
        "dark": "#ffffff3d",
        "lightPrimitive": "alpha/white/24",
        "darkPrimitive": "alpha/white/24"
      },
      {
        "name": "interaction/on-accent/control-alpha/32",
        "light": "#ffffff52",
        "dark": "#ffffff52",
        "lightPrimitive": "alpha/white/32",
        "darkPrimitive": "alpha/white/32"
      },
      {
        "name": "interaction/on-accent/control-alpha/48",
        "light": "#ffffff7a",
        "dark": "#ffffff7a",
        "lightPrimitive": "alpha/white/48",
        "darkPrimitive": "alpha/white/48"
      }
    ]
  },
  {
    "namespace": "interaction/static",
    "tokens": [
      {
        "name": "interaction/static/solid/fill/default",
        "light": "#ffffff",
        "dark": "#ffffff",
        "lightPrimitive": "alpha/white/100",
        "darkPrimitive": "alpha/white/100"
      },
      {
        "name": "interaction/static/solid/fill/hover",
        "light": "#ffffff",
        "dark": "#ffffff",
        "lightPrimitive": "alpha/white/100",
        "darkPrimitive": "alpha/white/100"
      },
      {
        "name": "interaction/static/solid/fill/active",
        "light": "#ffffff",
        "dark": "#ffffff",
        "lightPrimitive": "alpha/white/100",
        "darkPrimitive": "alpha/white/100"
      },
      {
        "name": "interaction/static/soft/fill/default",
        "light": "#ffffff29",
        "dark": "#ffffff29",
        "lightPrimitive": "alpha/white/16",
        "darkPrimitive": "alpha/white/16"
      },
      {
        "name": "interaction/static/soft/fill/hover",
        "light": "#ffffff3d",
        "dark": "#ffffff3d",
        "lightPrimitive": "alpha/white/24",
        "darkPrimitive": "alpha/white/24"
      },
      {
        "name": "interaction/static/soft/fill/active",
        "light": "#ffffff52",
        "dark": "#ffffff52",
        "lightPrimitive": "alpha/white/32",
        "darkPrimitive": "alpha/white/32"
      },
      {
        "name": "interaction/static/content/on-surface/enabled",
        "light": "#ffffff",
        "dark": "#ffffff",
        "lightPrimitive": "alpha/white/100",
        "darkPrimitive": "alpha/white/100"
      },
      {
        "name": "interaction/static/outline/border/default",
        "light": "#ffffff52",
        "dark": "#ffffff52",
        "lightPrimitive": "alpha/white/32",
        "darkPrimitive": "alpha/white/32"
      },
      {
        "name": "interaction/static/outline/border/hover",
        "light": "#ffffff7a",
        "dark": "#ffffff7a",
        "lightPrimitive": "alpha/white/48",
        "darkPrimitive": "alpha/white/48"
      },
      {
        "name": "interaction/static/outline/border/active",
        "light": "#ffffffa3",
        "dark": "#ffffffa3",
        "lightPrimitive": "alpha/white/64",
        "darkPrimitive": "alpha/white/64"
      },
      {
        "name": "interaction/static/solid/content/default",
        "light": "#4f46e5",
        "dark": "#4f46e5",
        "lightPrimitive": "indigo/solid/600",
        "darkPrimitive": "indigo/solid/600"
      },
      {
        "name": "interaction/static/solid/content/hover",
        "light": "#5956eb",
        "dark": "#5956eb",
        "lightPrimitive": "indigo/solid/550",
        "darkPrimitive": "indigo/solid/550"
      },
      {
        "name": "interaction/static/solid/content/active",
        "light": "#6366f1",
        "dark": "#6366f1",
        "lightPrimitive": "indigo/solid/500",
        "darkPrimitive": "indigo/solid/500"
      }
    ]
  }
]
