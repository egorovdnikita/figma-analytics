const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function load(file, mocks, globals = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(code, {
    exports, require: (id) => id in mocks ? mocks[id] : require(id),
    process, Buffer, URL, URLSearchParams, setTimeout, clearTimeout, ...globals,
  }, { filename: file })
  return exports
}

async function main() {
  const cache = { projectsByTeam: {}, filesByProject: { folder: [{ key: 'file' }] },
    files: { file: { teamId: 'folder' } }, libraryByTeam: {} }
  const cacheApi = load('electron/figmaCache.ts', {
    './figma': {}, './store': {
      getFigmaTeams: () => [{ id: 'folder', kind: 'project' }],
      readFigmaCache: () => cache, writeFigmaCache: () => {},
    },
  })
  cacheApi.pruneCache()
  assert.equal(cache.filesByProject.folder.length, 1, 'Состав отдельно подключённой папки сохраняется')
  assert.ok(cache.files.file, 'История файла сохраняется')

  for (const [status, error, shouldClear] of [[429, 'rate_limit_exceeded', false], [503, 'server_error', false], [400, 'invalid_grant', true]]) {
    let cleared = false
    const auth = load('electron/auth.ts', {
      electron: { shell: {} }, './store': {
        getTokens: () => ({ access_token: 'fake', refresh_token: 'fake', expires_at: 0 }),
        getCredentials: () => ({ clientId: 'fake' }),
        clearTokens: () => { cleared = true },
      },
    }, { fetch: async () => ({ ok: false, status, json: async () => ({ error }) }) })
    await assert.rejects(auth.getAccessToken(), (err) => err.code === (shouldClear ? 'REAUTH_REQUIRED' : 'TOKEN_REFRESH_FAILED'))
    assert.equal(cleared, shouldClear, `Сохранность сессии при HTTP ${status}`)
  }
  assert.match(fs.readFileSync('.github/workflows/build.yml', 'utf8'), /release\.noindex\/\*\.dmg/)
  console.log('Пройдено: кэш папки, Google 429/503/invalid_grant, путь артефактов CI')
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
