import { useId } from 'react'

/** Логотип Figma — обычное состояние наследует цвет через currentColor
 * (управляется классом text-* снаружи, как и остальные иконки рейла),
 * активное показывает оригинальные фирменные цвета Figma. */
export function FigmaIcon({
  active = false,
  size = 20,
  className,
}: {
  active?: boolean
  size?: number
  className?: string
}) {
  const clipId = useId()
  const fills = active
    ? ['#0ACF83', '#A259FF', '#F24E1E', '#FF7262', '#1ABCFE']
    : ['currentColor', 'currentColor', 'currentColor', 'currentColor', 'currentColor']

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
        <path
          d="M8.5007 23C10.4323 23 12 21.3573 12 19.3333V15.6667H8.5007C6.56909 15.6667 5.0014 17.3093 5.0014 19.3333C5.0014 21.3573 6.56909 23 8.5007 23Z"
          fill={fills[0]}
        />
        <path
          d="M5.0014 12C5.0014 9.976 6.56909 8.33333 8.5007 8.33333H12V15.6667H8.5007C6.56909 15.6667 5.0014 14.024 5.0014 12Z"
          fill={fills[1]}
        />
        <path
          d="M5.00142 4.66667C5.00142 2.64267 6.5691 1 8.50072 1H12V8.33333H8.50072C6.5691 8.33333 5.00142 6.69067 5.00142 4.66667Z"
          fill={fills[2]}
        />
        <path
          d="M12 1H15.4993C17.4309 1 18.9986 2.64267 18.9986 4.66667C18.9986 6.69067 17.4309 8.33333 15.4993 8.33333H12V1Z"
          fill={fills[3]}
        />
        <path
          d="M18.9986 12C18.9986 14.024 17.4309 15.6667 15.4993 15.6667C13.5677 15.6667 12 14.024 12 12C12 9.976 13.5677 8.33333 15.4993 8.33333C17.4309 8.33333 18.9986 9.976 18.9986 12Z"
          fill={fills[4]}
        />
      </g>
      <defs>
        <clipPath id={clipId}>
          <rect width="14" height="22" fill="white" transform="translate(5 1)" />
        </clipPath>
      </defs>
    </svg>
  )
}
