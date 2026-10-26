import { parseDay, weekdayShort } from './dates'
import { fold } from './db'

// Reminders go to the phone's own Calendar as an event with an alarm: a web
// app can't schedule a notification by itself without a push server.

const ON_KEY = 'bujo:reminders'
const LEAD_KEY = 'bujo:reminderLead'
const HOUR_KEY = 'bujo:reminderHour'

export const LEADS = [
  { minutes: 0, label: 'W chwili' },
  { minutes: 15, label: '15 min' },
  { minutes: 60, label: '1 godz.' },
  { minutes: 24 * 60, label: '1 dzień' },
]
export const HOURS = [8, 9, 12, 18]

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Blocked storage: settings last until the app closes.
  }
}

export const remindersOn = () => read(ON_KEY) === '1'
export const setRemindersOn = (on: boolean) => write(ON_KEY, on ? '1' : null)
export const reminderLead = () => Number(read(LEAD_KEY) ?? 15)
export const setReminderLead = (minutes: number) => write(LEAD_KEY, String(minutes))
export const reminderHour = () => Number(read(HOUR_KEY) ?? 9)
export const setReminderHour = (hour: number) => write(HOUR_KEY, String(hour))

// "o 15", "o 20:45", "o 7.30" in the text sets the time; otherwise the
// default hour from settings.
export function timeIn(text: string): { h: number; m: number } | undefined {
  const m = fold(text).match(/(?:^|[^\p{L}\d])o\s+(\d{1,2})(?:[:.](\d{2}))?(?!\d)/u)
  if (!m) return undefined
  const h = Number(m[1])
  const min = Number(m[2] ?? 0)
  return h < 24 && min < 60 ? { h, m: min } : undefined
}

export interface Reminder {
  title: string
  start: Date
  alarm: Date
  // e.g. "wt 27.10, 8:45" — when the phone will ring.
  label: string
}

export function reminderFor(text: string, day: string): Reminder {
  const t = timeIn(text) ?? { h: reminderHour(), m: 0 }
  const start = parseDay(day)
  start.setHours(t.h, t.m, 0, 0)
  const alarm = new Date(start.getTime() - reminderLead() * 60_000)
  return { title: text.trim() || 'Bujo', start, alarm, label: alarmLabel(alarm.getTime()) }
}

// "wt 27.10, 8:45", or just "8:45" when it rings on the entry's own day.
export function alarmLabel(ms: number, day?: string): string {
  const d = new Date(ms)
  const time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  const key = dayKeyOf(d)
  return key === day ? time : `${weekdayShort(key)} ${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}, ${time}`
}

function dayKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const pad = (n: number) => String(n).padStart(2, '0')
// Floating local time: the event stays at 9:00 wherever the phone is.
const icsTime = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

export function buildIcs(r: Reminder): string {
  const end = new Date(r.start.getTime() + 30 * 60_000)
  const lead = Math.round((r.start.getTime() - r.alarm.getTime()) / 60_000)
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bujo//PL',
    'BEGIN:VEVENT',
    `UID:${crypto.randomUUID?.() ?? Date.now()}@bujo`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${icsTime(r.start)}`,
    `DTEND:${icsTime(end)}`,
    `SUMMARY:${icsText(r.title)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(r.title)}`,
    `TRIGGER:-PT${lead}M`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}

const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

// iPhone shows its "Add to Calendar" sheet for a calendar file it opens from
// a real address, so the service worker answers reminder.ics with the event
// (public/reminder-sw.js). Elsewhere the file is downloaded and opened by
// the calendar app.
export function openInCalendar(r: Reminder) {
  const ics = buildIcs(r)
  if (isIos()) {
    location.href = navigator.serviceWorker?.controller
      ? `${import.meta.env.BASE_URL}reminder.ics?d=${encodeURIComponent(ics)}`
      : `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`
    return
  }
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'przypomnienie.ics'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
