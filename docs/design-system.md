# Дизайн-система

Токены берутся из дизайн-системы [box-ui](https://github.com/egorovdnikita/box-ui): бренд — мода **Deep**, скругления — мода **Medium**, иконки — набор Solar оттуда же. Страницы токенов в Storybook генерируются из дампов переменных Figma в box-ui, руками не правятся:

```bash
npm run tokens:sync                          # из main box-ui
npm run tokens:sync -- --ref <коммит>        # из конкретного коммита
```

Рантайм-значения живут в `src/index.css`, у каждой переменной в комментарии путь в Figma, по которому её сверять; страница «Обзор» читает их прямо оттуда. Иконки — только размеров `size/base/*` (16 · 20 · 24 · 28 · 32 · 36 · 40 · 44 · 48): другой размер не соберётся, это проверяет тип `IconSize`.

## Storybook

Токены и компоненты интерфейса документированы в Storybook.

```bash
npm run storybook           # локально, http://localhost:6006
npm run build-storybook     # статическая сборка в storybook-static/
npm run storybook:coverage  # проверка, что у каждого компонента ui/ есть история
```

Актуальная версия — на **https://egorovdnikita.github.io/figma-analytics/**. Деплоится автоматически при пуше в `main` через [`.github/workflows/storybook.yml`](../.github/workflows/storybook.yml), там же в CI работает проверка покрытия историями.

- Токены (цвет, скругления, тени, типографика): `src/index.css`, `tailwind.config.ts`, описаны для документации в [`src/design-system/tokens.ts`](../src/design-system/tokens.ts).
- Компоненты: [`src/components/ui`](../src/components/ui) — по файлу на компонент, рядом лежит `*.stories.tsx`.
- Подробности и принципы — на странице **Введение** в самом Storybook.

Значения токенов сверены с Figma-библиотеками «Figma Analytics | Tokens» и «Figma Analytics | Primitives», но источник истины — код: CSS-переменные и Tailwind, а Storybook документирует то, что уже есть в приложении.
