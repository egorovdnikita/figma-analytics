# figma-analytics

Десктопное приложение на Electron для macOS и Windows: аналитика рабочего пространства Figma по истории сохранений и комментариям. Своего сервера нет — данные выкачиваются через Figma REST API по personal access token и лежат в локальном кэше. Вход через Google — только профиль (`openid`, `email`, `profile`).

## Стек

Electron 31 · React 18 · TypeScript · Vite · Tailwind CSS v3 · Box UI · Storybook 10. Графики — свои, на SVG, без chart-библиотек.

## Запуск

Нужны Node.js 20+ и npm.

```bash
npm install
npm run dev                 # Vite + окно Electron с hot reload
npm run build               # проверка типов и сборка
npm run storybook           # http://localhost:6006
npm run storybook:coverage  # у каждого компонента ui/ есть история
npm run update:mac          # собрать и поставить поверх /Applications
```

Регрессионные проверки аудита — `npm test`; типы и сборка — `npm run build`, покрытие историями — `npm run storybook:coverage`. Google OAuth берёт `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` из `.env` при сборке (шаблон — `.env.example`); без них приложение спросит их при первом запуске.

## Структура

```
electron/             main-процесс: окно, IPC, OAuth, клиент Figma, кэш и синк, хранилище токенов
src/components/figma/ разделы аналитики, расчёты (analytics.ts), графики (charts.tsx)
src/components/ui/    компоненты дизайн-системы + *.stories.tsx
src/design-system/    токены и обзорные страницы Storybook (генерируются из box-ui)
src/state/, src/lib/  глобальное состояние, IPC-клиент, иконки, утилиты
scripts/              синк токенов, проверка покрытия Storybook, иконка, установка на macOS
docs/                 документация, журнал аудитов
```

CI: `.github/workflows/storybook.yml` — проверка покрытия и деплой Storybook на GitHub Pages при пуше в `main`; `build.yml` — установщики по тегу `v*`.

## Правила для агентов

- Renderer не видит токены: все обращения к Figma и Google — через IPC в main-процессе. Не обходи это.
- Токены, цвета и иконки — из box-ui через `npm run tokens:sync`; страницы токенов руками не правь. Рантайм-значения — в `src/index.css`.
- Новый компонент в `src/components/ui/` — сразу с историей `*.stories.tsx`, иначе упадёт `storybook:coverage` в CI.
- Иконки только размеров `size/base/*` (16–48), это проверяет тип `IconSize`.
- Не добавляй сервер и chart-библиотеки без прямой просьбы.
- Перед «готово»: `npm run build`, для desktop-правок — `npm run update:mac` и проверка в установленном приложении.
- Аудиты — по `docs/AUDIT_LOG.md`.
- Тексты интерфейса и документации — по-русски. Данные в примерах — вымышленные.
- Коммиты — от `Никита Егоров <egorov.d.nikita@mail.ru>`, по-русски, затем push в `main`.
- Обложки нет и сами её не рисуем.
