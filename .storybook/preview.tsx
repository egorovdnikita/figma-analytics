import type { Preview, Decorator } from '@storybook/react-vite'
import React, { useEffect } from 'react'
import '@fontsource-variable/onest'
import '../src/index.css'

const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme ?? 'light'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div
      style={{
        minHeight: '100%',
        background: 'var(--canvas)',
        color: 'var(--ink)',
        padding: 24,
      }}
    >
      <Story />
    </div>
  )
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
    backgrounds: { disable: true },
    options: {
      storySort: {
        order: ['Введение', 'Токены', 'Компоненты'],
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Тема Box UI',
      toolbar: {
        title: 'Тема',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Светлая' },
          { value: 'dark', title: 'Тёмная' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [withTheme],
}

export default preview
