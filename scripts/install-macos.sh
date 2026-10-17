#!/bin/bash
# Обновление установленного приложения.
#
# Не «удалить и скопировать заново»: для macOS новый бандл на том же месте —
# другое приложение. Dock теряет связь со старой записью, LaunchServices копит
# регистрации, иконка остаётся из кэша прежней сборки — отсюда дубликаты в
# Launchpad и поиске и «слетевшая» иконка после каждого обновления.
#
# Поэтому содержимое синхронизируется поверх существующего бандла, а из базы
# LaunchServices убираются промежуточные копии из папки сборки.
#
#   npm run install:mac     # поставить то, что уже собрано
#   npm run update:mac      # собрать и поставить
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="Figma Analytics"
TARGET="/Applications/$APP_NAME.app"
OUT="$ROOT/release.noindex"
LSREGISTER=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister

case "$(uname -m)" in
  arm64) SOURCE="$OUT/mac-arm64/$APP_NAME.app" ;;
  *)     SOURCE="$OUT/mac/$APP_NAME.app" ;;
esac

if [ ! -d "$SOURCE" ]; then
  echo "Нет собранного приложения: $SOURCE" >&2
  echo "Сначала: npm run dist:mac" >&2
  exit 1
fi

echo "→ закрываю приложение"
osascript -e "quit app \"$APP_NAME\"" 2>/dev/null || true
for _ in $(seq 1 20); do
  pgrep -f "$TARGET/Contents/MacOS/" >/dev/null || break
  sleep 0.5
done
pkill -f "$TARGET/Contents/MacOS/" 2>/dev/null || true

echo "→ обновляю содержимое на месте"
mkdir -p "$TARGET"
# --delete убирает файлы, которых в новой сборке больше нет; сам каталог
# бандла при этом остаётся прежним, и Dock с LaunchServices не замечают подмены.
rsync -a --delete "$SOURCE/" "$TARGET/"

echo "→ снимаю карантин и подписываю ad-hoc"
xattr -cr "$TARGET"
codesign --force --deep --sign - "$TARGET" 2>/dev/null

echo "→ чищу лишние регистрации"
# Промежуточные бандлы из папки сборки — те же «Figma Analytics», и пока они
# числятся в базе, система показывает их наравне с установленным.
for stale in "$OUT/mac-arm64/$APP_NAME.app" "$OUT/mac/$APP_NAME.app"; do
  [ -d "$stale" ] && "$LSREGISTER" -u "$stale" 2>/dev/null || true
done
"$LSREGISTER" -f "$TARGET" 2>/dev/null || true

echo "→ обновляю иконку"
# Без touch и перезапуска Dock иконка берётся из кэша и остаётся прежней.
touch "$TARGET"
killall Dock 2>/dev/null || true

echo "→ запускаю"
open "$TARGET"
echo "Готово: $TARGET"
