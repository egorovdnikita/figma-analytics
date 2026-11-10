/* Подмена IPC-моста `window.figmaAnalytics` для записи промо.
 *
 * Renderer остаётся настоящим (dist/ после `npm run build`), а main-процесс
 * заменён генератором вымышленного пространства: команды, люди, файлы,
 * история версий и обсуждения. Всё строится детерминированно от seed, имена
 * придуманы, почты — на example.com, сетевых запросов нет.
 *
 * Управление из сценария записи — `window.__promo`:
 *   progress(phase, done, total, current) — событие прогресса синхронизации;
 *   finishSync() — завершить синк, как это делает main-процесс.
 */
;(() => {
  const DAY = 86400000
  const NOW = Date.now()

  let seed = 20261110
  const rnd = () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const pick = (list) => list[Math.floor(rnd() * list.length)]
  const weighted = (list) => {
    const total = list.reduce((sum, item) => sum + item.w, 0)
    let r = rnd() * total
    for (const item of list) {
      r -= item.w
      if (r <= 0) return item
    }
    return list[list.length - 1]
  }

  const PEOPLE = [
    ['Анна Королёва', 9], ['Илья Смирнов', 7], ['Мария Ветрова', 8], ['Олег Данилов', 4],
    ['Софья Ким', 6], ['Дмитрий Орлов', 5], ['Ева Лебедева', 3], ['Артём Зуев', 4],
    ['Полина Гусева', 2], ['Кирилл Белов', 3], ['Вера Миронова', 2], ['Тимур Исаев', 1],
  ].map(([handle, w], index) => ({ id: String(7100 + index), handle, img_url: '', w }))

  const TEAMS = [
    { id: '1180001', label: 'Студия «Север»', kind: 'team' },
    { id: '1180002', label: 'Маркетинг', kind: 'team' },
  ]

  const PROJECTS = [
    { id: '50101', name: 'Мобильное приложение', team: TEAMS[0] },
    { id: '50102', name: 'Веб-кабинет', team: TEAMS[0] },
    { id: '50103', name: 'Дизайн-система', team: TEAMS[0] },
    { id: '50201', name: 'Сайт', team: TEAMS[1] },
    { id: '50202', name: 'Промо', team: TEAMS[1] },
  ]

  const FILE_NAMES = {
    50101: ['Онбординг 2.0', 'Главный экран', 'Профиль и настройки', 'Оплата', 'Push-уведомления', 'Поиск'],
    50102: ['Личный кабинет', 'Тарифы и счета', 'Отчёты', 'Роли и доступы', 'Импорт данных'],
    50103: ['Компоненты', 'Иконки', 'Токены и темы', 'Документация'],
    50201: ['Лендинг тарифов', 'Блог', 'Страница вакансий', 'Главная 2026'],
    50202: ['Баннеры осень', 'Рассылки', 'Соцсети: шаблоны'],
  }

  const LABELS = ['Ready for dev', 'Ревью с продуктом', 'Итерация 2', 'Финал', 'Правки после теста', 'Ready for dev']
  const COMMENTS = [
    'Можно увеличить отступ между карточками?',
    'Здесь нужен пустой стейт',
    'Проверьте контраст текста на тёмной теме',
    'Кнопку лучше вынести вниз экрана',
    'А как это выглядит на маленьком экране?',
    'Согласовали с разработкой, можно забирать',
    'Иконка не из библиотеки — замените, пожалуйста',
    'Тексты ошибок уточнить у редактора',
    'Добавьте состояние загрузки',
    'Этот блок дублирует фильтры сверху',
  ]
  const REPLIES = ['Поправила', 'Готово, посмотрите', 'Согласен', 'Обсудим на синке', 'Сделал вариант рядом', 'Да, так лучше']
  const EMOJI = ['👍', '🔥', '✅', '👀', '🙌']

  const hourWeights = [0, 0, 0, 0, 0, 0, 0.1, 0.3, 1, 3, 5, 6, 5, 3, 5, 6, 6, 5, 3, 1.5, 0.8, 0.5, 0.3, 0.1]
  const randomHour = () => {
    let r = rnd() * hourWeights.reduce((a, b) => a + b, 0)
    for (let h = 0; h < 24; h++) {
      r -= hourWeights[h]
      if (r <= 0) return h
    }
    return 12
  }
  /** Время в прошлом: чаще в будни и в рабочие часы, к сегодняшнему дню плотнее. */
  const randomTs = (spanDays, bias = 1.6) => {
    for (;;) {
      const back = Math.floor(Math.pow(rnd(), bias) * spanDays)
      const date = new Date(NOW - back * DAY)
      const weekend = date.getDay() === 0 || date.getDay() === 6
      if (weekend && rnd() > 0.12) continue
      date.setHours(randomHour(), Math.floor(rnd() * 60), Math.floor(rnd() * 60), 0)
      if (date.getTime() > NOW - 60000) continue
      return date.getTime()
    }
  }
  const iso = (ms) => new Date(ms).toISOString()
  const userRef = (person) => ({ id: person.id, handle: person.handle, img_url: '' })

  /* ---------- пространство ---------- */

  const files = []
  let keyIndex = 0
  for (const project of PROJECTS) {
    for (const name of FILE_NAMES[project.id]) {
      keyIndex += 1
      const key = `promo${String(keyIndex).padStart(3, '0')}Fa`
      const heat = 0.25 + rnd() * 1.4
      // Пара файлов давно спит — для инсайтов о заброшенных файлах.
      const sleeping = name === 'Страница вакансий' || name === 'Импорт данных'
      const owners = [weighted(PEOPLE), weighted(PEOPLE), weighted(PEOPLE)]
      const versions = []
      const versionCount = Math.round((sleeping ? 18 : 60) * heat)
      for (let i = 0; i < versionCount; i++) {
        const author = rnd() < 0.7 ? owners[0] : rnd() < 0.6 ? owners[1] : owners[2]
        let ts = randomTs(sleeping ? 360 : 330)
        if (sleeping) ts -= 70 * DAY
        const labelled = rnd() < 0.12
        versions.push({
          id: `${key}-v${i}`,
          created_at: iso(ts),
          label: labelled ? pick(LABELS) : null,
          description: labelled && rnd() < 0.5 ? 'Собрали состояния и отдали на ревью' : null,
          user: userRef(author),
        })
      }
      versions.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

      const comments = []
      const threadCount = Math.round((sleeping ? 4 : 16) * heat)
      for (let i = 0; i < threadCount; i++) {
        const author = weighted(PEOPLE)
        let ts = randomTs(sleeping ? 300 : 300)
        if (sleeping) ts -= 70 * DAY
        const id = `${key}-c${i}`
        const resolved = rnd() < 0.62
        const root = {
          id,
          parent_id: '',
          user: userRef(author),
          created_at: iso(ts),
          resolved_at: null,
          message: pick(COMMENTS),
          order_id: String(i + 1),
          reactions: [],
        }
        comments.push(root)
        let last = ts
        const replies = rnd() < 0.7 ? 1 + Math.floor(rnd() * 3) : 0
        for (let r = 0; r < replies; r++) {
          last = Math.min(NOW - 60000, last + (0.2 + rnd() * 30) * 3600000)
          comments.push({
            id: `${id}-r${r}`,
            parent_id: id,
            user: userRef(r % 2 === 0 ? owners[0] : author),
            created_at: iso(last),
            resolved_at: null,
            message: pick(REPLIES),
            order_id: null,
            reactions: [],
          })
        }
        if (rnd() < 0.45) {
          root.reactions.push({ emoji: pick(EMOJI), created_at: iso(Math.min(NOW - 60000, ts + 3600000)), user: userRef(weighted(PEOPLE)) })
        }
        if (resolved) root.resolved_at = iso(Math.min(NOW - 60000, last + (1 + rnd() * 48) * 3600000))
      }
      comments.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

      files.push({
        key,
        name,
        project,
        team: project.team,
        versions,
        comments,
        lastModified: versions[0]?.created_at ?? iso(NOW - 100 * DAY),
      })
    }
  }

  const events = []
  for (const file of files) {
    const base = {
      fileKey: file.key,
      fileName: file.name,
      projectId: file.project.id,
      projectName: file.project.name,
      teamId: file.team.id,
      teamName: file.team.label,
    }
    for (const v of file.versions) {
      events.push({ ...base, kind: 'version', ts: v.created_at, userId: v.user.id, handle: v.user.handle, img: '', label: v.label ?? undefined, message: v.description ?? undefined })
    }
    for (const c of file.comments) {
      events.push({ ...base, kind: c.parent_id ? 'reply' : 'comment', ts: c.created_at, userId: c.user.id, handle: c.user.handle, img: '', message: c.message, threadId: c.parent_id || c.id, nodeId: `${10 + (Number(c.order_id) || 1)}:2` })
      if (c.resolved_at) events.push({ ...base, kind: 'resolve', ts: c.resolved_at, userId: '', handle: '', img: '', message: c.message, threadId: c.parent_id || c.id })
      for (const r of c.reactions) events.push({ ...base, kind: 'reaction', ts: r.created_at, userId: r.user.id, handle: r.user.handle, img: '', emoji: r.emoji, threadId: c.parent_id || c.id })
    }
  }
  events.sort((a, b) => (a.ts < b.ts ? 1 : -1))

  const fileIndex = files.map((file) => ({
    fileKey: file.key,
    name: file.name,
    projectId: file.project.id,
    projectName: file.project.name,
    teamId: file.team.id,
    teamName: file.team.label,
    lastModified: file.lastModified,
    thumbnailUrl: null,
    versions: file.versions.length,
    comments: file.comments.length,
    openComments: file.comments.filter((c) => !c.parent_id && !c.resolved_at).length,
    versionsComplete: true,
    fetchedAt: NOW - 2 * 3600000,
  }))

  const COMPONENTS = ['Button', 'Input', 'Select', 'Modal', 'Tabs', 'Card', 'Avatar', 'Chip', 'Tooltip', 'Toast', 'Table', 'Switch']
  const library = (teamId) => {
    const own = teamId === TEAMS[0].id
    const recent = Array.from({ length: own ? 8 : 3 }, (_, i) => {
      const person = own ? PEOPLE[i % 3] : PEOPLE[4 + (i % 2)]
      return {
        key: `${teamId}-lib-${i}`,
        name: own ? COMPONENTS[i] : ['Banner', 'Social post', 'Email header'][i],
        kind: i % 4 === 3 ? 'style' : i % 3 === 0 ? 'component_set' : 'component',
        updatedAt: iso(NOW - (i * 3 + 1) * DAY - i * 3600000),
        user: { handle: person.handle, img_url: '' },
      }
    })
    const byAuthor = new Map()
    for (const item of recent) byAuthor.set(item.user.handle, (byAuthor.get(item.user.handle) ?? 0) + 1)
    return {
      componentsCount: own ? 184 : 26,
      componentSetsCount: own ? 47 : 6,
      stylesCount: own ? 96 : 18,
      lastPublished: recent[0].updatedAt,
      recent,
      byAuthor: [...byAuthor].map(([handle, count]) => ({ handle, img_url: '', count })),
    }
  }

  /* ---------- состояние «main-процесса» ---------- */

  let prefs = {
    workdayStart: 9, workdayEnd: 19, nightStart: 22, nightEnd: 7, weekendDays: [0, 6],
    timelineBuckets: { day: 30, week: 12, month: 12, year: 5 },
    syncDepthPages: 400, syncConcurrency: 4, autoSyncMinutes: 60, commentsRotation: 40,
    density: 'comfortable', defaultSection: 'insights', tablesByDefault: false,
    insightThresholds: { staleDays: 45, unansweredDays: 7, concentrationPercent: 55, dropPercent: 25, nightSharePercent: 25 },
    filterPresets: [],
    pinnedFiles: [{ key: files[0].key, name: files[0].name }, { key: files[6].key, name: files[6].name }],
  }
  let settings = { theme: 'dark', iconStyle: 'linear', iconStyleArrows: 'linear', fontFamily: 'inter-variable' }
  let hidden = []
  // «Обновлено меньше минуты назад» и до, и после синка — первый и последний кадры петли совпадают.
  let lastSyncAt = NOW
  let syncResolve = null
  let syncStartedAt = null
  const listeners = { started: new Set(), progress: new Set(), done: new Set() }

  const ok = (data) => Promise.resolve({ ok: true, data: JSON.parse(JSON.stringify(data ?? null)) })
  const on = (set) => (listener) => {
    set.add(listener)
    return () => set.delete(listener)
  }
  const fileByKey = (key) => files.find((file) => file.key === key) ?? files[0]
  const page = (list, offset, limit) => ({ items: list.slice(offset, offset + limit), hasMore: offset + limit < list.length, total: list.length })

  const lastResult = () => ({
    stopped: false, files: files.length, skipped: 0, staleFolders: 0,
    versions: events.filter((e) => e.kind === 'version').length,
    comments: events.filter((e) => e.kind === 'comment' || e.kind === 'reply').length,
    errors: [], finishedAt: Date.now(), startedAt: syncStartedAt ?? lastSyncAt, auto: false,
  })

  window.figmaAnalytics = {
    auth: {
      state: () => ok({ hasCredentials: true, authenticated: true, session: { scopes: ['openid', 'email', 'profile'], expiresAt: NOW + 3600000, hasRefreshToken: true } }),
      signIn: () => ok(null),
      signOut: () => ok(undefined),
      revoke: () => ok(undefined),
      profile: () => ok({ sub: 'promo', name: 'Алекс Морозов', given_name: 'Алекс', family_name: 'Морозов', email: 'alex@example.com', email_verified: true, locale: 'ru' }),
    },
    credentials: {
      get: () => ok({ clientId: 'promo.apps.example.com', hasSecret: true }),
      set: () => ok(true),
      clear: () => ok(true),
    },
    settings: {
      get: () => ok(settings),
      set: (patch) => ok((settings = { ...settings, ...patch })),
    },
    app: {
      info: () => ok({ version: '0.1.0', electron: '31.7.7', chrome: '126.0', node: '20.16', platform: 'darwin', arch: 'arm64', locale: 'ru-RU', timeZone: 'Europe/Moscow', storage: { directory: '~/Library/Application Support/Figma Analytics', encrypted: true } }),
      openExternal: () => ok(true),
    },
    figma: {
      status: () => ok({ connected: true, user: { id: 'promo', email: 'alex@example.com', handle: 'Алекс Морозов', img_url: '' } }),
      setToken: () => ok({ id: 'promo', email: 'alex@example.com', handle: 'Алекс Морозов', img_url: '' }),
      clearToken: () => ok(true),
      teamsList: () => ok(TEAMS),
      teamsAdd: () => ok(TEAMS),
      teamsRemove: () => ok(TEAMS),
      projects: (teamId) => ok(PROJECTS.filter((p) => p.team.id === teamId).map(({ id, name }) => ({ id, name }))),
      files: (projectId) => ok(files.filter((f) => f.project.id === projectId).map((f) => ({ key: f.key, name: f.name, last_modified: f.lastModified }))),
      file: (key) => {
        const file = fileByKey(key)
        return ok({ name: file.name, lastModified: file.lastModified, version: file.versions[0]?.id ?? '1', role: 'editor', editorType: 'figma' })
      },
      versions: (key, offset, limit) => ok(page(fileByKey(key).versions, offset, limit)),
      comments: (key, offset, limit) => {
        const list = fileByKey(key).comments
        const roots = list.filter((c) => !c.parent_id)
        return ok({ ...page(list, offset, limit), open: roots.filter((c) => !c.resolved_at).length, resolved: roots.filter((c) => c.resolved_at).length })
      },
      overview: () => ok(files.map((f) => ({ fileKey: f.key, meta: { name: f.name, lastModified: f.lastModified }, versions: f.versions.slice(0, 20), comments: f.comments.slice(0, 20), fetchedAt: NOW }))),
      teamLibrary: (teamId) => ok(library(teamId)),
      events: () => ok(events.filter((e) => !hidden.includes(e.handle))),
      fileIndex: () => ok(fileIndex),
      peopleDirectory: () => {
        const counts = new Map()
        for (const e of events) if (e.handle) counts.set(e.handle, (counts.get(e.handle) ?? 0) + 1)
        return ok([...counts].map(([handle, count]) => ({ handle, img: '', events: count, hidden: hidden.includes(handle) })).sort((a, b) => b.events - a.events))
      },
      prefs: () => ok(prefs),
      setPrefs: (patch) => ok((prefs = { ...prefs, ...patch })),
      cacheStats: () => ok({ files: files.length, versions: events.filter((e) => e.kind === 'version').length, comments: events.filter((e) => e.kind === 'comment' || e.kind === 'reply').length, reactions: events.filter((e) => e.kind === 'reaction').length, incompleteFiles: 0, oldestEvent: events[events.length - 1].ts, newestEvent: events[0].ts, bytes: 4_812_000, directory: '~/Library/Application Support/Figma Analytics/cache', lastFetchedAt: lastSyncAt }),
      clearCache: () => ok(true),
      exportCsv: () => ok({ saved: false, path: null }),
      hiddenUsers: () => ok(hidden),
      setHiddenUsers: (handles) => ok((hidden = handles)),
      sync: () => {
        syncStartedAt = Date.now()
        for (const listener of listeners.started) listener({ startedAt: syncStartedAt, auto: false })
        return new Promise((resolve) => {
          syncResolve = () => resolve({ ok: true, data: lastResult() })
        })
      },
      syncState: () => ok({ running: Boolean(syncResolve), auto: false, progress: null, startedAt: syncStartedAt, lastSyncAt, nextAutoSyncAt: lastSyncAt + 3600000 * 3, lastResult: null }),
      syncStop: () => ok(true),
      onSyncStarted: on(listeners.started),
      onSyncProgress: on(listeners.progress),
      onSyncDone: on(listeners.done),
    },
  }

  window.__promo = {
    files: files.map((f) => ({ key: f.key, name: f.name, project: f.project.name })),
    progress(phase, done, total, current) {
      for (const listener of listeners.progress) listener({ phase, done, total, current, rateLimitMs: 0 })
    },
    finishSync() {
      lastSyncAt = Date.now()
      const result = lastResult()
      const resolve = syncResolve
      syncResolve = null
      for (const listener of listeners.done) listener(result)
      resolve?.()
    },
  }
})()
