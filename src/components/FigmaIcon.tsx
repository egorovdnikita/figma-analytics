import { useId } from 'react'

/** Логотип Figma — всегда в фирменных цветах; неактивное состояние
 * управляется прозрачностью контейнера снаружи (см. IconRail), как и
 * остальные брендовые иконки рейла. */
export function FigmaIcon({ size = 20, className }: { size?: number; className?: string }) {
  const clipId = useId()

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clipPath={`url(#${clipId})`}>
        <path d="M8.0008 24C10.2084 24 12 22.208 12 20V16H8.0008C5.79324 16 4.0016 17.792 4.0016 20C4.0016 22.208 5.79324 24 8.0008 24Z" fill="#0ACF83" />
        <path d="M4.0016 12C4.0016 9.792 5.79324 8 8.0008 8H12V16H8.0008C5.79324 16 4.0016 14.208 4.0016 12Z" fill="#A259FF" />
        <path d="M4.00141 4C4.00141 1.792 5.79306 4.27246e-07 8.00061 4.27246e-07H11.9998V8H8.00061C5.79306 8 4.00141 6.208 4.00141 4Z" fill="#F24E1E" />
        <path d="M12 4.57764e-07H15.9992C18.2068 4.57764e-07 19.9984 1.792 19.9984 4C19.9984 6.208 18.2068 8 15.9992 8H12V4.57764e-07Z" fill="#FF7262" />
        <path d="M19.9984 12C19.9984 14.208 18.2068 16 15.9992 16C13.7916 16 12 14.208 12 12C12 9.792 13.7916 8 15.9992 8C18.2068 8 19.9984 9.792 19.9984 12Z" fill="#1ABCFE" />
      </g>
      <defs>
        <clipPath id={clipId}>
          <rect width="16" height="24" fill="white" transform="translate(4)" />
        </clipPath>
      </defs>
    </svg>
  )
}
