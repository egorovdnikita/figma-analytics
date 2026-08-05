import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  BumpChart,
  ChartCard,
  CohortGrid,
  ComparisonBars,
  Donut,
  ForecastChart,
  HBars,
  HealthRing,
  Heatmap,
  Histogram,
  Legend,
  LineChart,
  NetworkGraph,
  ScatterPlot,
  SmallMultiples,
  Sparkline,
  StackedBars,
  StageFunnel,
  StatTile,
  YearMonthGrid,
} from './charts'

/** Все графики раздела Figma рисуются собственным SVG: строгая CSP в Electron
 * не пропускает внешние библиотеки. Палитра прогнана через валидатор контраста
 * и различимости при дальтонизме против обеих поверхностей приложения. */
const meta = {
  title: 'Figma/Графики',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Примитивы визуализации раздела Figma. У каждого графика есть легенда и таблица значений — цвет никогда не единственный канал передачи величины.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="viz" style={{ maxWidth: 720 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const WEEKS = ['1 июн', '8 июн', '15 июн', '22 июн', '29 июн', '6 июл', '13 июл', '20 июл']
const SERIES = [
  { name: 'Сохранения', color: 'var(--viz-1)', values: [12, 18, 9, 22, 15, 27, 19, 24] },
  { name: 'Комментарии', color: 'var(--viz-2)', values: [6, 9, 4, 11, 8, 14, 10, 12] },
  { name: 'Ответы', color: 'var(--viz-3)', values: [3, 5, 2, 7, 4, 9, 6, 8] },
  { name: 'Решения', color: 'var(--viz-4)', values: [2, 4, 1, 5, 3, 7, 4, 6] },
  { name: 'Реакции', color: 'var(--viz-5)', values: [4, 7, 3, 9, 6, 11, 8, 10] },
]

export const ПлиткаПоказателя: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-3">
      <StatTile
        label="Событий за период"
        value="1 284"
        delta={18}
        deltaLabel="К прошлым 7 дням"
        spark={[8, 12, 9, 15, 11, 19, 16, 22]}
      />
      <StatTile
        label="Среднее время закрытия"
        value="5 дней"
        delta={24}
        deltaLabel="К прошлым 7 дням"
        invertDelta
        hint="Меньше — лучше"
      />
      <StatTile label="Участников" value="14" delta={null} />
    </div>
  ),
}

export const КарточкаСТаблицей: Story = {
  render: () => (
    <ChartCard
      title="Активность по типам событий"
      subtitle="Переключатель «Таблица» — обязательная опора для цвета"
      legend={<Legend items={SERIES.map((item) => ({ label: item.name, color: item.color }))} />}
      table={
        <table className="w-full text-[12px]">
          <tbody>
            {WEEKS.map((week, index) => (
              <tr key={week} className="border-t border-line">
                <td className="py-1.5 text-ink">{week}</td>
                <td className="py-1.5 pl-2 text-right text-muted">
                  {SERIES.reduce((sum, item) => sum + item.values[index], 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <StackedBars buckets={WEEKS.map((label) => ({ key: label, label }))} series={SERIES} />
    </ChartCard>
  ),
}

export const Линия: Story = {
  render: () => (
    <LineChart
      series={[
        { name: 'Факт', color: 'var(--viz-1)', points: WEEKS.map((label, i) => ({ label, value: SERIES[0].values[i] })) },
        { name: 'Среднее', color: 'var(--viz-2)', points: WEEKS.map((label, i) => ({ label, value: 10 + i })) },
      ]}
    />
  ),
}

export const Площадь: Story = {
  render: () => (
    <LineChart
      area
      series={[
        { name: 'Участников', color: 'var(--viz-1)', points: WEEKS.map((label, i) => ({ label, value: 4 + (i % 5) })) },
      ]}
    />
  ),
}

export const ГоризонтальныйРейтинг: Story = {
  render: () => (
    <HBars
      items={[
        { label: '💎 Profile', value: 132 },
        { label: 'Design System Core', value: 98 },
        { label: 'Onboarding v2', value: 74 },
        { label: 'Marketing Landing', value: 41 },
      ]}
    />
  ),
}

export const Кольцевая: Story = {
  render: () => (
    <Donut
      centerValue="284"
      centerLabel="событий"
      segments={SERIES.map((item) => ({
        label: item.name,
        value: item.values.reduce((a, b) => a + b, 0),
        color: item.color,
      }))}
    />
  ),
}

export const Теплокарта: Story = {
  render: () => {
    const grid = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((_, row) =>
      Array.from({ length: 24 }, (_, hour) => (hour > 7 && hour < 20 && row < 5 ? (hour * (row + 2)) % 14 : 0)),
    )
    return <Heatmap rows={['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']} grid={grid} max={14} />
  },
}

export const СравнениеПериодов: Story = {
  render: () => (
    <ComparisonBars
      currentLabel="Текущий период"
      previousLabel="Предыдущий период"
      items={SERIES.map((item) => ({
        label: item.name,
        current: item.values[7],
        previous: item.values[3],
      }))}
    />
  ),
}

export const ИндексЗдоровья: Story = {
  render: () => (
    <HealthRing
      score={72}
      factors={[
        { key: 'momentum', label: 'Динамика', score: 84, detail: '284 события против 240 в прошлом периоде' },
        { key: 'closure', label: 'Закрытие обсуждений', score: 65, detail: '14 открыто из 40' },
        { key: 'responsiveness', label: 'Отзывчивость', score: 78, detail: '5 обсуждений без ответа' },
        { key: 'spread', label: 'Распределение нагрузки', score: 52, detail: 'на топ-1 приходится 42% работы' },
        { key: 'freshness', label: 'Свежесть файлов', score: 80, detail: '3 файла давно не менялись из 18' },
      ]}
    />
  ),
}

export const Гистограмма: Story = {
  render: () => (
    <Histogram
      values={[0.5, 1, 1.2, 2, 2.4, 3, 3.5, 4, 5, 6, 8, 12, 18, 24, 30, 48, 72, 2, 3, 1.5, 4.5, 6.5]}
      formatBin={(value) => (value >= 24 ? `${Math.round(value / 24)}д` : `${Math.round(value)}ч`)}
      color="var(--viz-3)"
    />
  ),
}

export const Прогноз: Story = {
  render: () => (
    <ForecastChart
      points={[
        ...WEEKS.map((label, i) => ({
          label,
          value: SERIES[0].values[i],
          predicted: i === WEEKS.length - 1 ? SERIES[0].values[i] : null,
          low: i === WEEKS.length - 1 ? SERIES[0].values[i] : null,
          high: i === WEEKS.length - 1 ? SERIES[0].values[i] : null,
        })),
        { label: '+1', value: null, predicted: 25, low: 18, high: 32 },
        { label: '+2', value: null, predicted: 27, low: 19, high: 35 },
        { label: '+3', value: null, predicted: 29, low: 20, high: 38 },
        { label: '+4', value: null, predicted: 31, low: 21, high: 41 },
      ]}
    />
  ),
}

export const ДвижениеВРейтинге: Story = {
  render: () => (
    <BumpChart
      buckets={WEEKS}
      depth={5}
      colors={['var(--viz-1)', 'var(--viz-2)', 'var(--viz-3)', 'var(--viz-4)']}
      series={[
        { handle: 'tugai', points: WEEKS.map((label, i) => ({ label, rank: 1 + (i % 3), value: 20 - i })) },
        { handle: 'Elena', points: WEEKS.map((label, i) => ({ label, rank: 2 + ((i + 1) % 3), value: 15 - i })) },
        { handle: 'IvankoDS', points: WEEKS.map((label, i) => ({ label, rank: 3 - (i % 2), value: 12 })) },
      ]}
    />
  ),
}

export const Рассеяние: Story = {
  render: () => (
    <ScatterPlot
      xLabel="всего обсуждений"
      yLabel="открытых"
      points={[
        { label: '💎 Profile', x: 42, y: 6, size: 9 },
        { label: 'Design System Core', x: 28, y: 3, size: 7 },
        { label: 'Onboarding v2', x: 16, y: 9, size: 6 },
        { label: 'Marketing Landing', x: 8, y: 1, size: 5 },
      ]}
    />
  ),
}

export const ГрафСвязей: Story = {
  render: () => (
    <NetworkGraph
      nodes={[
        { handle: 'tugai', value: 120 },
        { handle: 'Elena', value: 96 },
        { handle: 'IvankoDS', value: 84 },
        { handle: 'maria.k', value: 60 },
        { handle: 'dmitry.s', value: 44 },
        { handle: 'anna.v', value: 30 },
      ]}
      edges={[
        { source: 'Elena', target: 'tugai', weight: 5 },
        { source: 'IvankoDS', target: 'tugai', weight: 4 },
        { source: 'Elena', target: 'maria.k', weight: 3 },
        { source: 'anna.v', target: 'dmitry.s', weight: 2 },
      ]}
    />
  ),
}

export const КогортыУдержания: Story = {
  render: () => (
    <CohortGrid
      rows={[
        { cohort: '2026-06', size: 4, cells: [100, 75, null, null, null, null, null, null, null, null, null, null] },
        { cohort: '2026-05', size: 6, cells: [100, 83, 67, null, null, null, null, null, null, null, null, null] },
        { cohort: '2026-04', size: 3, cells: [100, 67, 67, 33, null, null, null, null, null, null, null, null] },
      ]}
    />
  ),
}

export const СезонностьПоМесяцам: Story = {
  render: () => (
    <YearMonthGrid
      rows={[
        { year: 2026, months: [42, 51, 38, 62, 71, 44, 29, 0, 0, 0, 0, 0] },
        { year: 2025, months: [30, 34, 41, 55, 60, 48, 22, 18, 39, 44, 51, 27] },
      ]}
      max={71}
    />
  ),
}

export const ВоронкаСтадий: Story = {
  render: () => (
    <StageFunnel
      stages={[
        { label: 'Активные', value: 12, color: 'var(--viz-good)' },
        { label: 'Замедляются', value: 5, color: 'var(--viz-4)' },
        { label: 'Заморожены', value: 3, color: 'var(--viz-2)' },
        { label: 'Мёртвые', value: 2, color: 'var(--viz-bad)' },
      ]}
    />
  ),
}

export const МалыеМножители: Story = {
  render: () => (
    <SmallMultiples
      items={SERIES.map((item) => ({
        label: item.name,
        values: item.values,
        total: item.values.reduce((a, b) => a + b, 0),
      }))}
    />
  ),
}

export const Спарклайн: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Sparkline values={[4, 8, 6, 12, 9, 15, 11, 18]} />
      <Sparkline values={[18, 11, 15, 9, 12, 6, 8, 4]} color="var(--viz-2)" />
      <Sparkline values={[7, 7, 7, 7, 7, 7, 7, 7]} color="var(--viz-3)" />
    </div>
  ),
}
