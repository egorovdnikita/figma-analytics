# Подключение Google: получить Client ID и Client Secret

Box UI работает напрямую с вашим аккаунтом Google, без промежуточного сервера. Поэтому нужен
собственный OAuth-клиент — это бесплатно и занимает 5–7 минут.

## 1. Проект в Google Cloud

1. Откройте [console.cloud.google.com](https://console.cloud.google.com/).
2. Вверху нажмите на переключатель проектов → **New project**. Название любое, например `box-ui`.
3. Дождитесь создания и выберите проект.

## 2. Включить Google Calendar API

1. Меню → **APIs & Services → Library**.
2. Найдите **Google Calendar API** → **Enable**.

## 3. Настроить экран согласия

1. **APIs & Services → OAuth consent screen**.
2. User Type: **External** (если у вас личный Gmail) → **Create**.
3. Заполните обязательные поля: название приложения (`Box UI`), почта поддержки, контактная почта.
4. На шаге **Scopes** ничего добавлять не нужно — приложение запросит доступ при входе.
5. На шаге **Test users** добавьте свой Gmail-адрес. Пока приложение в статусе Testing, входить
   могут только пользователи из этого списка.
6. Сохраните. Публиковать приложение (**Publish app**) не требуется.

> В режиме Testing refresh-токен живёт 7 дней, после чего Box UI попросит войти заново.
> Если хочется без этого — нажмите **Publish app**; для скоупов календаря Google может запросить
> верификацию, но личное использование это не блокирует.

## 4. Создать OAuth-клиент

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Desktop app**.
3. Название любое → **Create**.
4. Скопируйте **Client ID** и **Client Secret**.

Redirect URI вручную указывать не нужно: для типа Desktop app Google разрешает loopback-адреса
(`http://127.0.0.1:<порт>`), а Box UI поднимает локальный сервер на свободном порту.

## 5. Передать ключи в приложение

Есть два способа — любой на выбор.

**Через интерфейс.** Запустите Box UI, вставьте Client ID и Client Secret на первом экране.
Значения сохранятся в файл `credentials.json` в папке пользовательских данных приложения.

**Через `.env` при сборке.** В корне репозитория:

```bash
cp .env.example .env
```

```
GOOGLE_CLIENT_ID=1234567890-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

Значения вшиваются в сборку, и экран ввода ключей не показывается.

## Что запрашивает приложение

| Разрешение | Зачем |
| --- | --- |
| `openid`, `email`, `profile` | Имя, почта и аватар для профиля |
| `.../auth/calendar` | Список календарей, их настройки и цвета |
| `.../auth/calendar.events` | Чтение, создание, изменение и удаление событий |

Access- и refresh-токены хранятся локально и шифруются через `safeStorage` Electron
(Keychain на macOS, DPAPI на Windows). Отозвать доступ можно в приложении на экране профиля
или на [myaccount.google.com/permissions](https://myaccount.google.com/permissions).
