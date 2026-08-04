// Box UI | Tokens — коллекция Mode (Light/Dark), сгенерировано из Figma-переменных.
export interface SemanticToken { name: string; light: string; dark: string; lightPrimitive: string; darkPrimitive: string }
export interface SemanticGroup { namespace: string; tokens: SemanticToken[] }

export const SEMANTIC_GROUPS: SemanticGroup[] = [
  {
    "namespace": "background",
    "tokens": [
      {
        "name": "background/base/primary",
        "light": "#f5f5f5",
        "dark": "#0a0a0a",
        "lightPrimitive": "neutral/solid/100",
        "darkPrimitive": "neutral/solid/950"
      },
      {
        "name": "background/base/secondary",
        "light": "#ffffff",
        "dark": "#171717",
        "lightPrimitive": "alpha/white/100",
        "darkPrimitive": "neutral/solid/900"
      },
      {
        "name": "background/base/tertiary",
        "light": "#f5f5f5",
        "dark": "#262626",
        "lightPrimitive": "neutral/solid/100",
        "darkPrimitive": "neutral/solid/800"
      },
      {
        "name": "background/base/overlay",
        "light": "#0000007a",
        "dark": "#000000cc",
        "lightPrimitive": "alpha/black/48",
        "darkPrimitive": "alpha/black/80"
      },
      {
        "name": "background/static/white",
        "light": "#ffffff",
        "dark": "#ffffff",
        "lightPrimitive": "alpha/white/100",
        "darkPrimitive": "alpha/white/100"
      },
      {
        "name": "background/static/white-subtle",
        "light": "#ffffff3d",
        "dark": "#ffffff3d",
        "lightPrimitive": "alpha/white/24",
        "darkPrimitive": "alpha/white/24"
      },
      {
        "name": "background/static/black",
        "light": "#000000",
        "dark": "#000000",
        "lightPrimitive": "alpha/black/100",
        "darkPrimitive": "alpha/black/100"
      },
      {
        "name": "background/static/black-subtle",
        "light": "#00000029",
        "dark": "#00000029",
        "lightPrimitive": "alpha/black/16",
        "darkPrimitive": "alpha/black/16"
      },
      {
        "name": "background/sentiment/primary",
        "light": "#3b82f6",
        "dark": "#3b82f6",
        "lightPrimitive": "blue/solid/500",
        "darkPrimitive": "blue/solid/500"
      },
      {
        "name": "background/sentiment/primary-subtle",
        "light": "#3b82f614",
        "dark": "#3b82f629",
        "lightPrimitive": "blue/alpha/8",
        "darkPrimitive": "blue/alpha/16"
      },
      {
        "name": "background/sentiment/informative",
        "light": "#3b82f6",
        "dark": "#3b82f6",
        "lightPrimitive": "blue/solid/500",
        "darkPrimitive": "blue/solid/500"
      },
      {
        "name": "background/sentiment/informative-subtle",
        "light": "#3b82f629",
        "dark": "#3b82f629",
        "lightPrimitive": "blue/alpha/16",
        "darkPrimitive": "blue/alpha/16"
      },
      {
        "name": "background/sentiment/positive",
        "light": "#22c55e",
        "dark": "#22c55e",
        "lightPrimitive": "green/solid/500",
        "darkPrimitive": "green/solid/500"
      },
      {
        "name": "background/sentiment/positive-subtle",
        "light": "#22c55e29",
        "dark": "#22c55e29",
        "lightPrimitive": "green/alpha/16",
        "darkPrimitive": "green/alpha/16"
      },
      {
        "name": "background/sentiment/warning",
        "light": "#f59e0b",
        "dark": "#f59e0b",
        "lightPrimitive": "amber/solid/500",
        "darkPrimitive": "amber/solid/500"
      },
      {
        "name": "background/sentiment/warning-subtle",
        "light": "#f59e0b29",
        "dark": "#f59e0b29",
        "lightPrimitive": "amber/alpha/16",
        "darkPrimitive": "amber/alpha/16"
      },
      {
        "name": "background/sentiment/negative",
        "light": "#ef4444",
        "dark": "#ef4444",
        "lightPrimitive": "red/solid/500",
        "darkPrimitive": "red/solid/500"
      },
      {
        "name": "background/sentiment/negative-subtle",
        "light": "#ef444429",
        "dark": "#ef444429",
        "lightPrimitive": "red/alpha/16",
        "darkPrimitive": "red/alpha/16"
      }
    ]
  },
  {
    "namespace": "content",
    "tokens": [
      {
        "name": "content/base/primary",
        "light": "#171717",
        "dark": "#fafafa",
        "lightPrimitive": "neutral/solid/900",
        "darkPrimitive": "neutral/solid/50"
      },
      {
        "name": "content/base/secondary",
        "light": "#737373",
        "dark": "#a3a3a3",
        "lightPrimitive": "neutral/solid/500",
        "darkPrimitive": "neutral/solid/400"
      },
      {
        "name": "content/base/tertiary",
        "light": "#a3a3a3",
        "dark": "#737373",
        "lightPrimitive": "neutral/solid/400",
        "darkPrimitive": "neutral/solid/500"
      },
      {
        "name": "content/base/disabled",
        "light": "#73737352",
        "dark": "#73737352",
        "lightPrimitive": "neutral/alpha/32",
        "darkPrimitive": "neutral/alpha/32"
      },
      {
        "name": "content/static/white",
        "light": "#ffffff",
        "dark": "#ffffff",
        "lightPrimitive": "alpha/white/100",
        "darkPrimitive": "alpha/white/100"
      },
      {
        "name": "content/static/white-subtle",
        "light": "#ffffff7a",
        "dark": "#ffffff7a",
        "lightPrimitive": "alpha/white/48",
        "darkPrimitive": "alpha/white/48"
      },
      {
        "name": "content/static/black",
        "light": "#000000",
        "dark": "#000000",
        "lightPrimitive": "alpha/black/100",
        "darkPrimitive": "alpha/black/100"
      },
      {
        "name": "content/static/black-subtle",
        "light": "#0000007a",
        "dark": "#0000007a",
        "lightPrimitive": "alpha/black/48",
        "darkPrimitive": "alpha/black/48"
      },
      {
        "name": "content/sentiment/primary",
        "light": "#3b82f6",
        "dark": "#3b82f6",
        "lightPrimitive": "blue/solid/500",
        "darkPrimitive": "blue/solid/500"
      },
      {
        "name": "content/sentiment/primary-subtle",
        "light": "#3b82f67a",
        "dark": "#3b82f67a",
        "lightPrimitive": "blue/alpha/48",
        "darkPrimitive": "blue/alpha/48"
      },
      {
        "name": "content/sentiment/informative",
        "light": "#3b82f6",
        "dark": "#3b82f6",
        "lightPrimitive": "blue/solid/500",
        "darkPrimitive": "blue/solid/500"
      },
      {
        "name": "content/sentiment/informative-subtle",
        "light": "#3b82f67a",
        "dark": "#3b82f67a",
        "lightPrimitive": "blue/alpha/48",
        "darkPrimitive": "blue/alpha/48"
      },
      {
        "name": "content/sentiment/positive",
        "light": "#22c55e",
        "dark": "#22c55e",
        "lightPrimitive": "green/solid/500",
        "darkPrimitive": "green/solid/500"
      },
      {
        "name": "content/sentiment/positive-subtle",
        "light": "#22c55e7a",
        "dark": "#22c55e7a",
        "lightPrimitive": "green/alpha/48",
        "darkPrimitive": "green/alpha/48"
      },
      {
        "name": "content/sentiment/warning",
        "light": "#f59e0b",
        "dark": "#f59e0b",
        "lightPrimitive": "amber/solid/500",
        "darkPrimitive": "amber/solid/500"
      },
      {
        "name": "content/sentiment/warning-subtle",
        "light": "#f59e0b7a",
        "dark": "#f59e0b7a",
        "lightPrimitive": "amber/alpha/48",
        "darkPrimitive": "amber/alpha/48"
      },
      {
        "name": "content/sentiment/negative",
        "light": "#ef4444",
        "dark": "#ef4444",
        "lightPrimitive": "red/solid/500",
        "darkPrimitive": "red/solid/500"
      },
      {
        "name": "content/sentiment/negative-subtle",
        "light": "#ef44447a",
        "dark": "#ef44447a",
        "lightPrimitive": "red/alpha/48",
        "darkPrimitive": "red/alpha/48"
      },
      {
        "name": "content/sentiment/neutral",
        "light": "#262626",
        "dark": "#e5e5e5",
        "lightPrimitive": "neutral/solid/800",
        "darkPrimitive": "neutral/solid/200"
      },
      {
        "name": "content/sentiment/neutral-subtle",
        "light": "#7373737a",
        "dark": "#7373737a",
        "lightPrimitive": "neutral/alpha/48",
        "darkPrimitive": "neutral/alpha/48"
      }
    ]
  },
  {
    "namespace": "border",
    "tokens": [
      {
        "name": "border/base/neutral",
        "light": "#73737329",
        "dark": "#73737329",
        "lightPrimitive": "neutral/alpha/16",
        "darkPrimitive": "neutral/alpha/16"
      },
      {
        "name": "border/base/neutral-hover",
        "light": "#73737352",
        "dark": "#73737352",
        "lightPrimitive": "neutral/alpha/32",
        "darkPrimitive": "neutral/alpha/32"
      },
      {
        "name": "border/base/neutral-strong",
        "light": "#7373737a",
        "dark": "#7373737a",
        "lightPrimitive": "neutral/alpha/48",
        "darkPrimitive": "neutral/alpha/48"
      },
      {
        "name": "border/static/white",
        "light": "#ffffff",
        "dark": "#ffffff",
        "lightPrimitive": "alpha/white/100",
        "darkPrimitive": "alpha/white/100"
      },
      {
        "name": "border/static/white-subtle",
        "light": "#ffffff29",
        "dark": "#ffffff29",
        "lightPrimitive": "alpha/white/16",
        "darkPrimitive": "alpha/white/16"
      },
      {
        "name": "border/sentiment/informative",
        "light": "#3b82f6",
        "dark": "#3b82f6",
        "lightPrimitive": "blue/solid/500",
        "darkPrimitive": "blue/solid/500"
      },
      {
        "name": "border/sentiment/informative-subtle",
        "light": "#3b82f67a",
        "dark": "#3b82f67a",
        "lightPrimitive": "blue/alpha/48",
        "darkPrimitive": "blue/alpha/48"
      },
      {
        "name": "border/sentiment/positive",
        "light": "#22c55e",
        "dark": "#22c55e",
        "lightPrimitive": "green/solid/500",
        "darkPrimitive": "green/solid/500"
      },
      {
        "name": "border/sentiment/positive-subtle",
        "light": "#22c55e7a",
        "dark": "#22c55e7a",
        "lightPrimitive": "green/alpha/48",
        "darkPrimitive": "green/alpha/48"
      },
      {
        "name": "border/sentiment/warning",
        "light": "#f59e0b",
        "dark": "#f59e0b",
        "lightPrimitive": "amber/solid/500",
        "darkPrimitive": "amber/solid/500"
      },
      {
        "name": "border/sentiment/warning-subtle",
        "light": "#f59e0b7a",
        "dark": "#f59e0b7a",
        "lightPrimitive": "amber/alpha/48",
        "darkPrimitive": "amber/alpha/48"
      },
      {
        "name": "border/sentiment/negative",
        "light": "#ef4444",
        "dark": "#ef4444",
        "lightPrimitive": "red/solid/500",
        "darkPrimitive": "red/solid/500"
      },
      {
        "name": "border/sentiment/negative-subtle",
        "light": "#ef44447a",
        "dark": "#ef44447a",
        "lightPrimitive": "red/alpha/48",
        "darkPrimitive": "red/alpha/48"
      },
      {
        "name": "border/focus/base",
        "light": "#3b82f67a",
        "dark": "#3b82f67a",
        "lightPrimitive": "blue/alpha/48",
        "darkPrimitive": "blue/alpha/48"
      },
      {
        "name": "border/focus/static",
        "light": "#ffffff7a",
        "dark": "#ffffff7a",
        "lightPrimitive": "alpha/white/48",
        "darkPrimitive": "alpha/white/48"
      },
      {
        "name": "border/focus/neutral",
        "light": "#73737329",
        "dark": "#73737329",
        "lightPrimitive": "neutral/alpha/16",
        "darkPrimitive": "neutral/alpha/16"
      }
    ]
  },
  {
    "namespace": "control",
    "tokens": [
      {
        "name": "control/primary/base",
        "light": "#3b82f6",
        "dark": "#3b82f6",
        "lightPrimitive": "blue/solid/500",
        "darkPrimitive": "blue/solid/500"
      },
      {
        "name": "control/primary/hover",
        "light": "#60a5fa",
        "dark": "#60a5fa",
        "lightPrimitive": "blue/solid/400",
        "darkPrimitive": "blue/solid/400"
      },
      {
        "name": "control/primary/subtle",
        "light": "#3b82f614",
        "dark": "#3b82f629",
        "lightPrimitive": "blue/alpha/8",
        "darkPrimitive": "blue/alpha/16"
      },
      {
        "name": "control/primary/subtle-hover",
        "light": "#3b82f629",
        "dark": "#3b82f629",
        "lightPrimitive": "blue/alpha/16",
        "darkPrimitive": "blue/alpha/16"
      },
      {
        "name": "control/neutral/primary",
        "light": "#73737329",
        "dark": "#7373733d",
        "lightPrimitive": "neutral/alpha/16",
        "darkPrimitive": "neutral/alpha/24"
      },
      {
        "name": "control/neutral/primary-hover",
        "light": "#7373733d",
        "dark": "#73737352",
        "lightPrimitive": "neutral/alpha/24",
        "darkPrimitive": "neutral/alpha/32"
      },
      {
        "name": "control/neutral/secondary",
        "light": "#73737314",
        "dark": "#73737329",
        "lightPrimitive": "neutral/alpha/8",
        "darkPrimitive": "neutral/alpha/16"
      },
      {
        "name": "control/neutral/secondary-hover",
        "light": "#73737329",
        "dark": "#7373733d",
        "lightPrimitive": "neutral/alpha/16",
        "darkPrimitive": "neutral/alpha/24"
      },
      {
        "name": "control/static/primary",
        "light": "#ffffff",
        "dark": "#ffffff",
        "lightPrimitive": "alpha/white/100",
        "darkPrimitive": "alpha/white/100"
      },
      {
        "name": "control/static/primary-hover",
        "light": "#ffffffe0",
        "dark": "#ffffffe0",
        "lightPrimitive": "alpha/white/88",
        "darkPrimitive": "alpha/white/88"
      },
      {
        "name": "control/static/secondary",
        "light": "#ffffff3d",
        "dark": "#ffffff3d",
        "lightPrimitive": "alpha/white/24",
        "darkPrimitive": "alpha/white/24"
      },
      {
        "name": "control/static/secondary-hover",
        "light": "#ffffff52",
        "dark": "#ffffff52",
        "lightPrimitive": "alpha/white/32",
        "darkPrimitive": "alpha/white/32"
      }
    ]
  },
  {
    "namespace": "interactive",
    "tokens": [
      {
        "name": "interactive/disabled",
        "light": "#73737329",
        "dark": "#73737329",
        "lightPrimitive": "neutral/alpha/16",
        "darkPrimitive": "neutral/alpha/16"
      },
      {
        "name": "interactive/disabled-content",
        "light": "#73737352",
        "dark": "#73737352",
        "lightPrimitive": "neutral/alpha/32",
        "darkPrimitive": "neutral/alpha/32"
      },
      {
        "name": "interactive/selected",
        "light": "#3b82f614",
        "dark": "#3b82f629",
        "lightPrimitive": "blue/alpha/8",
        "darkPrimitive": "blue/alpha/16"
      },
      {
        "name": "interactive/highlight",
        "light": "#3b82f614",
        "dark": "#3b82f614",
        "lightPrimitive": "blue/alpha/8",
        "darkPrimitive": "blue/alpha/8"
      }
    ]
  }
]
