import { shell } from 'electron'
import crypto from 'node:crypto'
import http from 'node:http'
import { AddressInfo } from 'node:net'
import {
  clearTokens,
  getCredentials,
  getTokens,
  OAuthTokens,
  saveTokens,
} from './store'

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke'
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo'

export const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
]

export class AuthError extends Error {
  code: string
  constructor(code: string, message?: string) {
    super(message ?? code)
    this.code = code
  }
}

const base64url = (buf: Buffer) =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const RESULT_PAGE = (title: string, text: string) => `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>Box UI</title>
<style>
  body{margin:0;height:100vh;display:grid;place-items:center;background:#f0f0ee;
       font:16px/1.5 -apple-system,Segoe UI,system-ui,sans-serif;color:#16171a}
  .card{background:#fff;border-radius:20px;padding:40px 48px;text-align:center;max-width:420px}
  h1{margin:0 0 8px;font-size:22px;font-weight:700}
  p{margin:0;color:#8a8a85}
</style></head>
<body><div class="card"><h1>${title}</h1><p>${text}</p></div></body></html>`

/**
 * Полный цикл входа: поднимаем loopback-сервер, открываем системный браузер,
 * ждём code, меняем его на токены.
 */
export async function signIn(): Promise<OAuthTokens> {
  const { clientId, clientSecret } = getCredentials()
  if (!clientId) throw new AuthError('NO_CREDENTIALS', 'Не заданы Client ID и Client Secret')

  const verifier = base64url(crypto.randomBytes(32))
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest())
  const state = base64url(crypto.randomBytes(16))

  // Сначала поднимаем сервер, чтобы узнать порт для redirect_uri.
  const { port, waiter } = await startServer(state)
  const redirectUri = `http://127.0.0.1:${port}/callback`

  const authUrl = new URL(AUTH_ENDPOINT)
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', SCOPES.join(' '))
  authUrl.searchParams.set('code_challenge', challenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')

  await shell.openExternal(authUrl.toString())
  const code = await waiter

  const body = new URLSearchParams({
    client_id: clientId,
    code,
    code_verifier: verifier,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  })
  if (clientSecret) body.set('client_secret', clientSecret)

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = (await res.json()) as Record<string, unknown>
  if (!res.ok) {
    throw new AuthError(String(data.error ?? 'TOKEN_EXCHANGE_FAILED'), String(data.error_description ?? ''))
  }

  const tokens: OAuthTokens = {
    access_token: String(data.access_token),
    refresh_token: data.refresh_token ? String(data.refresh_token) : undefined,
    expires_at: Date.now() + Number(data.expires_in ?? 3600) * 1000,
    scope: data.scope ? String(data.scope) : undefined,
    token_type: data.token_type ? String(data.token_type) : 'Bearer',
    id_token: data.id_token ? String(data.id_token) : undefined,
  }
  saveTokens(tokens)
  return tokens
}

function startServer(expectedState: string): Promise<{ port: number; waiter: Promise<string> }> {
  return new Promise((resolvePort, rejectPort) => {
    let resolveCode: (code: string) => void
    let rejectCode: (err: Error) => void
    const waiter = new Promise<string>((res, rej) => {
      resolveCode = res
      rejectCode = rej
    })

    const server = http.createServer((req, res) => {
      if (!req.url) return
      const url = new URL(req.url, 'http://127.0.0.1')
      if (url.pathname !== '/callback') {
        res.writeHead(404).end()
        return
      }
      const error = url.searchParams.get('error')
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      if (error || !code || state !== expectedState) {
        res.end(RESULT_PAGE('Не удалось войти', 'Вернитесь в Box UI и попробуйте ещё раз.'))
        finish()
        rejectCode(new AuthError(error ?? 'INVALID_STATE', 'Некорректный ответ Google'))
        return
      }
      res.end(RESULT_PAGE('Готово', 'Аккаунт подключён. Можно вернуться в Box UI.'))
      finish()
      resolveCode(code)
    })

    const timeout = setTimeout(
      () => {
        finish()
        rejectCode(new AuthError('TIMEOUT', 'Время ожидания входа истекло'))
      },
      5 * 60 * 1000,
    )

    function finish() {
      clearTimeout(timeout)
      server.close()
    }

    server.on('error', rejectPort)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo
      resolvePort({ port, waiter })
    })
  })
}

export async function getAccessToken(force = false): Promise<string> {
  const tokens = getTokens()
  if (!tokens) throw new AuthError('NOT_AUTHENTICATED', 'Нет активной сессии')
  if (!force && tokens.expires_at - 60_000 > Date.now()) return tokens.access_token
  if (!tokens.refresh_token) {
    clearTokens()
    throw new AuthError('REAUTH_REQUIRED', 'Требуется повторный вход')
  }

  const { clientId, clientSecret } = getCredentials()
  const body = new URLSearchParams({
    client_id: clientId,
    refresh_token: tokens.refresh_token,
    grant_type: 'refresh_token',
  })
  if (clientSecret) body.set('client_secret', clientSecret)

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = (await res.json()) as Record<string, unknown>
  if (!res.ok) {
    clearTokens()
    throw new AuthError('REAUTH_REQUIRED', String(data.error_description ?? data.error ?? ''))
  }

  const next: OAuthTokens = {
    ...tokens,
    access_token: String(data.access_token),
    expires_at: Date.now() + Number(data.expires_in ?? 3600) * 1000,
    scope: data.scope ? String(data.scope) : tokens.scope,
  }
  saveTokens(next)
  return next.access_token
}

export async function getProfile() {
  const token = await getAccessToken()
  const res = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new AuthError('PROFILE_FAILED', await res.text())
  return (await res.json()) as {
    sub: string
    name?: string
    given_name?: string
    family_name?: string
    picture?: string
    email?: string
    email_verified?: boolean
    locale?: string
    hd?: string
  }
}

export function isAuthenticated() {
  return Boolean(getTokens())
}

export function sessionInfo() {
  const tokens = getTokens()
  if (!tokens) return null
  return {
    scopes: (tokens.scope ?? '').split(' ').filter(Boolean),
    expiresAt: tokens.expires_at,
    hasRefreshToken: Boolean(tokens.refresh_token),
  }
}

export async function signOut() {
  clearTokens()
}

export async function revokeAccess() {
  const tokens = getTokens()
  const token = tokens?.refresh_token ?? tokens?.access_token
  if (token) {
    await fetch(REVOKE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }),
    }).catch(() => undefined)
  }
  clearTokens()
}
