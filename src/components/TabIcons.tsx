import type { ComponentChildren } from 'preact'

function Icon({ children }: { children: ComponentChildren }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

// A tear-off calendar page showing today's date, like a desk calendar.
export function DayIcon() {
  return (
    <Icon>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 9.5h16M8.5 3v4M15.5 3v4" />
      <text x="12" y="17.6" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor" stroke="none" font-family="system-ui, sans-serif">
        {new Date().getDate()}
      </text>
    </Icon>
  )
}

// A whole month: a calendar of day dots.
export function MonthIcon() {
  return (
    <Icon>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 9.5h16M8.5 3v4M15.5 3v4" />
      <g fill="currentColor" stroke="none">
        {[8, 12, 16].flatMap((x) => [13, 16.5].map((y) => <circle cx={x} cy={y} r="1.1" />))}
      </g>
    </Icon>
  )
}

// Months ahead: a calendar with an arrow pointing forward.
export function FutureIcon() {
  return (
    <Icon>
      <path d="M13 20H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5" />
      <path d="M4 9.5h16M8.5 3v4M15.5 3v4" />
      <path d="M15 18h6M18.5 15.5 21 18l-2.5 2.5" />
    </Icon>
  )
}

// Index and search: a list under a magnifying glass.
export function IndexIcon() {
  return (
    <Icon>
      <path d="M4 6h9M4 11h5M4 16h4" />
      <circle cx="15.5" cy="14" r="4" />
      <path d="m18.5 17 2.5 2.5" />
    </Icon>
  )
}

// A box with an arrow into it: saving everything for safekeeping.
export function BackupIcon() {
  return (
    <Icon>
      <path d="M4 13v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6" />
      <path d="M12 3v11" />
      <path d="m7.5 9.5 4.5 4.5 4.5-4.5" />
    </Icon>
  )
}
