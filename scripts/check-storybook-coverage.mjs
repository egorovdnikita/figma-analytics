#!/usr/bin/env node
// Не даёт компоненту дизайн-системы попасть в src/components/ui без Storybook-истории рядом.
// Запускается вручную (npm run storybook:coverage) и в CI перед сборкой Storybook.

import { readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const uiDir = path.join(root, '..', 'src', 'components', 'ui')

const files = readdirSync(uiDir)
const componentFiles = files.filter(
  (file) => file.endsWith('.tsx') && !file.endsWith('.stories.tsx'),
)
const storyBaseNames = new Set(
  files.filter((file) => file.endsWith('.stories.tsx')).map((file) => file.replace('.stories.tsx', '')),
)

const missing = componentFiles.filter((file) => !storyBaseNames.has(file.replace('.tsx', '')))

if (missing.length > 0) {
  console.error('Нет Storybook-истории для компонентов дизайн-системы:\n')
  for (const file of missing) {
    const base = file.replace('.tsx', '')
    console.error(`  src/components/ui/${file}  →  ожидается src/components/ui/${base}.stories.tsx`)
  }
  console.error('\nДобавьте *.stories.tsx рядом с компонентом, чтобы он попал в дизайн-систему.')
  process.exit(1)
}

console.log(`OK: у всех ${componentFiles.length} компонентов в src/components/ui есть Storybook-истории.`)
