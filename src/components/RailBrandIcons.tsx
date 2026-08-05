/** Фирменные многоцветные иконки рейла (Calendar/Mail/Drive/Tasks) — в отличие от
 * остального набора (AppIcon/Solar) эти не перекрашиваются через currentColor:
 * активное и неактивное состояние отличаются только прозрачностью контейнера
 * (см. IconRail — неактивные получают opacity-40). */

interface BrandIconProps {
  size?: number
  className?: string
}

export function CalendarBrandIcon({ size = 24, className }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M3.41464 4.86341C3.41464 2.72968 5.14432 1 7.27805 1H16.7219C18.8557 1 20.5854 2.72968 20.5854 4.86341V8.94146C20.5854 11.0752 18.8557 12.8049 16.7219 12.8049H7.27805C5.14432 12.8049 3.41464 11.0752 3.41464 8.94146V4.86341Z" fill="#BBE2FF" />
      <path d="M1.78704 6.55259C1.51217 4.46366 3.1383 2.60976 5.24506 2.60976H18.7549C20.8618 2.60976 22.4878 4.46366 22.213 6.55259L21.3902 12.8049L22.213 19.0572C22.4878 21.1461 20.8618 23 18.7549 23H5.24506C3.13816 23 1.51217 21.1461 1.78704 19.0572L2.60976 12.8049L1.78704 6.55259Z" fill="#3C90FF" />
      <mask id="cal-mask-0" style={{ maskType: 'alpha' } as React.CSSProperties} maskUnits="userSpaceOnUse" x="1" y="2" width="22" height="21">
        <path d="M1.78704 6.55259C1.51217 4.46366 3.1383 2.60976 5.24506 2.60976H18.7549C20.8618 2.60976 22.4878 4.46366 22.213 6.55259L21.3902 12.8049L22.213 19.0572C22.4878 21.1461 20.8618 23 18.7549 23H5.24506C3.13816 23 1.51217 21.1461 1.78704 19.0572L2.60976 12.8049L1.78704 6.55259Z" fill="#3C90FF" />
      </mask>
      <g mask="url(#cal-mask-0)">
        <path d="M0.865856 23H23.1341V12.8049H0.865856V23Z" fill="url(#cal-grad-0)" />
      </g>
      <mask id="cal-mask-1" style={{ maskType: 'alpha' } as React.CSSProperties} maskUnits="userSpaceOnUse" x="1" y="2" width="22" height="21">
        <path d="M1.78704 6.55259C1.51217 4.46366 3.1383 2.60976 5.24506 2.60976H18.7549C20.8618 2.60976 22.4878 4.46366 22.213 6.55259L21.3902 12.8049L22.213 19.0572C22.4878 21.1461 20.8618 23 18.7549 23H5.24506C3.13816 23 1.51217 21.1461 1.78704 19.0572L2.60976 12.8049L1.78704 6.55259Z" fill="#3186FF" />
      </mask>
      <g mask="url(#cal-mask-1)">
        <g filter="url(#cal-blur)">
          <path d="M3.41464 3.57561C3.41464 2.15313 4.56776 1 5.99025 1H18.0098C19.4322 1 20.5854 2.15313 20.5854 3.57561V12.8049H3.41464V3.57561Z" fill="url(#cal-grad-1)" />
        </g>
      </g>
      <path d="M9.23028 17.8134C8.66847 17.8134 8.18658 17.722 7.78458 17.5393C7.38259 17.3566 7.04231 17.1122 6.76373 16.8062C6.48963 16.4955 6.29547 16.1918 6.18127 15.8949C6.06707 15.5981 6.02141 15.4177 6.04431 15.3537C6.06921 15.2879 6.11816 15.234 6.18127 15.2029L6.94188 14.9015C7.00573 14.8695 7.06967 14.865 7.13371 14.8878C7.19756 14.906 7.27291 15.011 7.35974 15.2029C7.45114 15.3947 7.57903 15.598 7.7434 15.8127C7.90786 16.0191 8.11313 16.1894 8.34639 16.3128C8.57945 16.4316 8.86719 16.4909 9.20962 16.4909C9.7623 16.4909 10.2008 16.3311 10.5252 16.0114C10.854 15.6917 11.0184 15.2852 11.0184 14.7919C11.0184 14.2574 10.8449 13.8463 10.4977 13.5585C10.1506 13.2662 9.69156 13.12 9.12055 13.12H8.40126C8.33525 13.1211 8.27139 13.0966 8.22311 13.0516C8.1775 13.0013 8.15465 12.9442 8.15456 12.8803V12.1472C8.15456 12.0786 8.17737 12.0215 8.22298 11.9759C8.24598 11.9518 8.27367 11.9327 8.30432 11.9197C8.33498 11.9068 8.36797 11.9002 8.40126 11.9005H9.02463C9.53627 11.9005 9.94738 11.7611 10.258 11.4825C10.5686 11.2038 10.7239 10.8429 10.7239 10.3999C10.7239 9.96151 10.5845 9.60754 10.3059 9.338C10.0272 9.06846 9.64354 8.93368 9.15489 8.93368C8.88078 8.93368 8.64325 8.97938 8.4423 9.07078C8.24356 9.16043 8.06607 9.29119 7.92155 9.45444C7.7787 9.60994 7.65242 9.77988 7.54473 9.96151C7.43974 10.1351 7.35523 10.231 7.29119 10.2493C7.22734 10.2629 7.16568 10.2515 7.10621 10.215L6.38678 9.8656C6.3274 9.83358 6.28859 9.78332 6.27034 9.71482C6.2521 9.64631 6.30692 9.48646 6.4348 9.23524C6.56725 8.97947 6.7682 8.71909 7.03766 8.45411C7.30802 8.18686 7.62968 7.97709 7.98326 7.83744C8.34411 7.69122 8.76435 7.61815 9.24396 7.61824C10.1347 7.61824 10.8404 7.85345 11.3611 8.32385C11.8818 8.78979 12.1422 9.40646 12.1422 10.1739C12.1422 10.7037 12.0143 11.1628 11.7585 11.551C11.5072 11.9391 11.1509 12.2132 10.6897 12.3733V12.4007C11.2469 12.5651 11.6854 12.8665 12.0051 13.305C12.3295 13.739 12.4916 14.2574 12.4915 14.8603C12.4915 15.7236 12.19 16.4317 11.5871 16.9843C10.9843 17.537 10.1988 17.8134 9.23028 17.8134ZM16.1053 17.6557C16.0277 17.6557 15.9591 17.6261 15.8996 17.5667C15.8456 17.5093 15.8161 17.4331 15.8175 17.3543V9.73534L14.2759 10.8453C14.221 10.8864 14.157 10.9001 14.084 10.8865C14.0181 10.8744 13.9593 10.8376 13.9196 10.7837L13.4743 10.1532C13.4342 10.0978 13.417 10.0291 13.4262 9.96138C13.4399 9.8884 13.4765 9.83135 13.5358 9.79021L16.2696 7.83744C16.2925 7.8192 16.3176 7.80551 16.345 7.79639C16.3725 7.78271 16.4044 7.77587 16.4409 7.77587H17.0165C17.0942 7.77587 17.1558 7.80328 17.2015 7.8581C17.2518 7.90818 17.2769 7.97212 17.2769 8.04993V17.3543C17.2769 17.4366 17.2472 17.5074 17.1878 17.5667C17.162 17.5955 17.1303 17.6183 17.0948 17.6337C17.0593 17.6491 17.0209 17.6566 16.9822 17.6557H16.1053Z" fill="white" />
      <defs>
        <filter id="cal-blur" x="1.80488" y="-0.609752" width="20.3902" height="15.0244" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="0.804878" result="effect1_foregroundBlur" />
        </filter>
        <linearGradient id="cal-grad-0" x1="12" y1="12.8049" x2="12" y2="23" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4FA0FF" />
          <stop offset="1" stopColor="#3186FF" />
        </linearGradient>
        <linearGradient id="cal-grad-1" x1="11.069" y1="2.84452" x2="11.069" y2="12.8572" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A9A8FF" />
          <stop offset="0.8" stopColor="#3C90FF" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function MailBrandIcon({ size = 24, className }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <g clipPath="url(#mail-clip)">
        <path d="M18.25 5.07962H23V18.6612C23 19.4795 22.3283 20.1429 21.5 20.1429H19C18.5858 20.1429 18.25 19.8112 18.25 19.402V5.07962Z" fill="url(#mail-grad-0)" />
        <path d="M5.75001 5.07962H1.00002V18.6612C1.00002 19.4795 1.67165 20.1429 2.50002 20.1429H5.00001C5.41422 20.1429 5.75001 19.8112 5.75001 19.402V5.07962Z" fill="#FC413D" />
        <path d="M4.90326 3.40736C3.89914 2.5737 2.40102 2.70186 1.55702 3.69368C0.713024 4.68539 0.842774 6.16517 1.8469 6.99895L11.3566 14.8947C11.7286 15.2035 12.2715 15.2035 12.6435 14.8947L22.1532 6.99883C23.1572 6.16517 23.287 4.68539 22.443 3.69356C21.599 2.70186 20.1008 2.5737 19.0969 3.40736L12 9.2998L4.90326 3.40736Z" fill="url(#mail-grad-1)" />
      </g>
      <defs>
        <linearGradient id="mail-grad-0" x1="20.625" y1="5.07962" x2="20.625" y2="20.1429" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60D673" />
          <stop offset="0.17" stopColor="#42C868" />
          <stop offset="0.39" stopColor="#0EBC5F" />
          <stop offset="0.62" stopColor="#00A9BB" />
          <stop offset="0.86" stopColor="#3C90FF" />
          <stop offset="1" stopColor="#3186FF" />
        </linearGradient>
        <linearGradient id="mail-grad-1" x1="1" y1="8.99173" x2="23" y2="8.99173" gradientUnits="userSpaceOnUse">
          <stop offset="0.08" stopColor="#FF63A0" />
          <stop offset="0.3" stopColor="#FC413D" />
          <stop offset="0.5" stopColor="#FC413D" />
          <stop offset="0.65" stopColor="#FC413D" />
          <stop offset="0.72" stopColor="#FC5C30" />
          <stop offset="0.86" stopColor="#FEB10C" />
          <stop offset="0.91" stopColor="#FEC700" />
          <stop offset="0.96" stopColor="#FFDB0F" />
        </linearGradient>
        <clipPath id="mail-clip">
          <rect width="22" height="17.2857" fill="white" transform="translate(1 2.85715)" />
        </clipPath>
      </defs>
    </svg>
  )
}

export function DriveBrandIcon({ size = 24, className }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <mask id="drive-mask" style={{ maskType: 'luminance' } as React.CSSProperties} maskUnits="userSpaceOnUse" x="1" y="1" width="22" height="21">
        <path d="M7.64323 3.95509C9.57951 0.601341 14.4205 0.601209 16.3568 3.95509L22.3185 14.2812C24.2548 17.6351 21.8344 21.8274 17.9617 21.8274H6.03831C2.16561 21.8274 -0.254816 17.6351 1.68147 14.2812L7.64323 3.95509Z" fill="white" />
      </mask>
      <g mask="url(#drive-mask)">
        <path d="M26.7825 21.8273H14.5611L12.0321 17.4469L18.1428 6.86279L26.7825 21.8273Z" fill="url(#drive-grad-0)" />
        <path d="M-2.72079 21.8254L5.91896 6.86095V6.86121L3.39084 11.2405H8.44762L14.5589 21.8251L-2.72066 21.8253L-2.72079 21.8254Z" fill="url(#drive-grad-1)" />
        <path d="M12.0327 -3.72334L18.1438 6.86173L15.6153 11.2413H3.39297L12.0327 -3.72334Z" fill="url(#drive-grad-2)" />
      </g>
      <defs>
        <linearGradient id="drive-grad-0" x1="25.0129" y1="20.9734" x2="12.9748" y2="13.7393" gradientUnits="userSpaceOnUse">
          <stop offset="0.09" stopColor="#FFE921" />
          <stop offset="1" stopColor="#FEC700" />
        </linearGradient>
        <linearGradient id="drive-grad-1" x1="14.4791" y1="23.1028" x2="1.32902" y2="15.1478" gradientUnits="userSpaceOnUse">
          <stop offset="0.15" stopColor="#A9A8FF" />
          <stop offset="0.33" stopColor="#6D97FF" />
          <stop offset="0.48" stopColor="#3186FF" />
        </linearGradient>
        <linearGradient id="drive-grad-2" x1="16.4049" y1="3.9862" x2="3.08067" y2="10.2054" gradientUnits="userSpaceOnUse">
          <stop offset="0.55" stopColor="#0EBC5F" />
          <stop offset="0.85" stopColor="#78C9FF" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function TasksBrandIcon({ size = 24, className }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <g clipPath="url(#task-clip)">
        <mask id="task-mask-0" style={{ maskType: 'luminance' } as React.CSSProperties} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
          <path d="M0 0H24V24H0V0Z" fill="white" />
        </mask>
        <g mask="url(#task-mask-0)">
          <path d="M13.375 6.5H10.625C6.13769 6.5 2.5 10.1377 2.5 14.625C2.5 19.1123 6.13769 22.75 10.625 22.75H13.375C17.8623 22.75 21.5 19.1123 21.5 14.625C21.5 10.1377 17.8623 6.5 13.375 6.5Z" fill="#BBE2FF" />
          <path d="M13.5 1.75H10.5C5.39137 1.75 1.25 5.89137 1.25 11V11.5C1.25 16.6086 5.39137 20.75 10.5 20.75H13.5C18.6086 20.75 22.75 16.6086 22.75 11.5V11C22.75 5.89137 18.6086 1.75 13.5 1.75Z" fill="#3186FF" />
          <mask id="task-mask-1" style={{ maskType: 'alpha' } as React.CSSProperties} maskUnits="userSpaceOnUse" x="1" y="1" width="22" height="20">
            <path d="M13.5 1.75H10.5C5.39137 1.75 1.25 5.89137 1.25 11V11.5C1.25 16.6086 5.39137 20.75 10.5 20.75H13.5C18.6086 20.75 22.75 16.6086 22.75 11.5V11C22.75 5.89137 18.6086 1.75 13.5 1.75Z" fill="#3C90FF" />
          </mask>
          <g mask="url(#task-mask-1)">
            <g filter="url(#task-blur)">
              <path d="M13.375 6.5H10.625C6.13769 6.5 2.5 10.1377 2.5 14.625C2.5 19.1123 6.13769 22.75 10.625 22.75H13.375C17.8623 22.75 21.5 19.1123 21.5 14.625C21.5 10.1377 17.8623 6.5 13.375 6.5Z" fill="url(#task-grad-0)" />
            </g>
          </g>
          <mask id="task-mask-2" style={{ maskType: 'luminance' } as React.CSSProperties} maskUnits="userSpaceOnUse" x="5" y="4" width="14" height="14">
            <path d="M5.5 4.75001H18.5V17.75H5.5V4.75001Z" fill="white" />
          </mask>
          <g mask="url(#task-mask-2)">
            <path d="M7.625 11.25L10.3965 14.0215C10.4903 14.1152 10.6174 14.1679 10.75 14.1679C10.8826 14.1679 11.0097 14.1152 11.1035 14.0215L17.25 7.87501" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      </g>
      <defs>
        <filter id="task-blur" x="1" y="5" width="22" height="19.25" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="0.75" result="effect1_foregroundBlur" />
        </filter>
        <linearGradient id="task-grad-0" x1="12" y1="20.8625" x2="12.58" y2="8.40625" gradientUnits="userSpaceOnUse">
          <stop offset="0.01" stopColor="#A9A8FF" />
          <stop offset="0.79" stopColor="#A9A8FF" stopOpacity="0" />
        </linearGradient>
        <clipPath id="task-clip">
          <rect width="24" height="24" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}
