import { useRef, useState } from 'react'
import { Button, Modal, Spinner } from '@/components/ui'
import { AppIcon } from '@/components/AppIcon'
import { cn } from '@/lib/cn'
import type { FigmaSyncProgress } from '@/types'
import { relativeTime } from './utils'

const PHASE_LABEL: Record<FigmaSyncProgress['phase'], string> = {
  projects: 'Папки',
  files: 'Файлы',
  history: 'История',
  done: 'Готово',
}

/** Подсказка у метки «обновлено …»: когда данные обновятся сами. Без неё
 * непонятно, ждать ли, и кнопку жмут вручную просто на всякий случай. */
export function autoSyncHint(nextAt: number | null): string {
  if (!nextAt) return 'Автообновление выключено — включается в настройках раздела'
  const minutes = Math.round((nextAt - Date.now()) / 60_000)
  if (minutes <= 0) return 'Следующее автообновление — вот-вот'
  if (minutes < 60) return `Следующее автообновление через ${minutes} мин`
  const hours = Math.round(minutes / 60)
  return `Следующее автообновление примерно через ${hours} ч`
}

/**
 * Состояние синхронизации одной строкой в шапке.
 *
 * Раньше оно было размазано: ошибка, счётчик событий и метка «обновлено» стояли
 * в ряд в шапке, а прогресс подменял собой всю панель фильтров. Пока синк
 * запускали кнопкой, это ещё читалось как ответ на нажатие; с фоновым
 * обновлением раз в час панель фильтров исчезала бы сама по себе, посреди
 * работы. Поэтому прогресс живёт здесь, рядом с кнопкой, которая его запускает.
 */
export function SyncStatus({
  syncing,
  auto,
  progress,
  error,
  errorDetails,
  lastSyncAt,
  nextAutoSyncAt,
  onSync,
  onStop,
}: {
  syncing: boolean
  /** Синк начал планировщик, а не пользователь. */
  auto: boolean
  progress: FigmaSyncProgress | null
  error: string | null
  errorDetails: string | null
  lastSyncAt: number | null
  nextAutoSyncAt: number | null
  onSync: () => void
  onStop: () => void
}) {
  const percent = progress && progress.total > 0 ? (progress.done / progress.total) * 100 : 0
  const waiting = progress ? Math.ceil(progress.rateLimitMs / 1000) : 0
  const left = useTimeLeft(progress)
  const [detailsOpen, setDetailsOpen] = useState(false)

  return (
    <div className="flex min-w-0 items-center gap-2">
      {syncing ? (
        <div className="flex min-w-0 items-center gap-2 rounded-control bg-[var(--sunken)] py-1 pl-2.5 pr-1">
          <Spinner className="h-3.5 w-3.5 shrink-0" />
          <div className="hidden h-1 w-16 shrink-0 overflow-hidden rounded-full bg-[var(--line)] sm:block">
            <div
              className="h-full rounded-full bg-[var(--grass)] transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span
            className="min-w-0 truncate text-[12px] text-muted [font-variant-numeric:tabular-nums]"
            title={progress?.current || undefined}
          >
            {waiting > 0
              ? `Лимит Figma — ${waiting} с`
              : progress
                ? `${PHASE_LABEL[progress.phase]} ${progress.done}/${progress.total}` +
                  (left ? ` · ${left}` : '')
                : auto
                  ? 'Фоновое обновление'
                  : 'Синхронизация'}
          </span>
          <Button variant="ghost" size="sm" onClick={onStop} className="h-7 px-2 text-[12px]">
            Стоп
          </Button>
        </div>
      ) : error ? (
        // Разбор по файлам не влезает в строку, а прятать его в нативную
        // подсказку — значит прятать совсем: по ней не понять, что там список.
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          disabled={!errorDetails}
          className={cn(
            'max-w-[280px] truncate rounded-control px-2 py-1 text-[12px] text-[var(--danger)]',
            errorDetails && 'hover:bg-[var(--sunken)]',
          )}
        >
          {error}
          {errorDetails ? ' ›' : ''}
        </button>
      ) : lastSyncAt ? (
        <span
          className="cursor-help truncate text-[12px] text-faint"
          title={autoSyncHint(nextAutoSyncAt)}
        >
          обновлено {relativeTime(new Date(lastSyncAt).toISOString())}
        </span>
      ) : null}

      <Button
        variant="soft"
        size="sm"
        onClick={onSync}
        disabled={syncing}
        title={
          syncing
            ? auto
              ? 'Данные обновляются по расписанию'
              : 'Синхронизация уже идёт'
            : 'Обойти пространство и обновить данные'
        }
        className={cn(syncing && 'opacity-60')}
      >
        <AppIcon name="RefreshCw" size={16} />
        <span className="hidden xl:inline">Синхронизировать</span>
      </Button>

      <Modal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="Что не прочиталось"
        width={560}
        footer={
          <Button variant="ghost" onClick={() => setDetailsOpen(false)}>
            Закрыть
          </Button>
        }
      >
        <p className="mb-3 text-[14px] leading-relaxed text-muted">{error}</p>
        <div className="scroll-thin max-h-[320px] overflow-y-auto rounded-control bg-[var(--sunken)] p-3">
          {(errorDetails ?? '').split('\n').map((line, index) => (
            <p key={index} className="text-[14px] leading-relaxed text-ink">
              {line}
            </p>
          ))}
        </div>
      </Modal>
    </div>
  )
}

/** Остаток по темпу текущей фазы, а не всего синка: фазы идут очень по-разному,
 * и общий средний темп даёт заведомо неверную оценку. */
function useTimeLeft(progress: FigmaSyncProgress | null): string | null {
  const mark = useRef<{ phase: string; at: number; done: number } | null>(null)
  if (!progress) {
    mark.current = null
    return null
  }
  if (!mark.current || mark.current.phase !== progress.phase) {
    mark.current = { phase: progress.phase, at: Date.now(), done: progress.done }
  }

  const passed = progress.done - mark.current.done
  if (passed <= 0 || progress.total <= progress.done) return null

  const elapsed = Date.now() - mark.current.at
  const seconds = Math.round(((elapsed / passed) * (progress.total - progress.done)) / 1000)
  if (seconds <= 2) return null
  return seconds < 60 ? `~${seconds} с` : `~${Math.round(seconds / 60)} мин`
}
