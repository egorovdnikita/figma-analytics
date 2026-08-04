const { execFileSync } = require('node:child_process')
const path = require('node:path')

// Без Apple Developer ID сборка не подписывается электрон-билдером (mac.identity: null),
// но неподписанный .app на Apple Silicon macOS отказывается запускаться с ошибкой
// «App is damaged and can't be opened». Ad-hoc подпись снимает это ограничение —
// Gatekeeper всё ещё предупредит о неизвестном разработчике, но окно «повреждено» больше не появится.
module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' })
}
