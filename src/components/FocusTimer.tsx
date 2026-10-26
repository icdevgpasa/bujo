import { createPortal } from 'preact/compat'
import { useEffect, useState } from 'preact/hooks'
import { updateEntry, type Entry } from '../db'

export const TIMER_MINUTES = [10, 25]

// iPhone only lets a page make sound after a tap, so the audio is unlocked
// in the tap that starts the timer and kept for the chime at the end.
export function unlockAudio(): AudioContext | undefined {
  try {
    const ctx = new AudioContext()
    const silent = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = silent
    src.connect(ctx.destination)
    src.start()
    return ctx
  } catch {
    return undefined
  }
}

function chime(ctx?: AudioContext) {
  if (!ctx) return
  ctx.resume?.()
  // Three soft rising notes.
  ;[0, 0.35, 0.7].forEach((at, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = [660, 880, 1046][i]
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + at)
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.6)
    osc.connect(gain).connect(ctx.destination)
    osc.start(ctx.currentTime + at)
    osc.stop(ctx.currentTime + at + 0.65)
  })
}

const R = 88
const C = 2 * Math.PI * R

// A full-screen countdown for one task. Time is kept as an end moment, so it
// stays right after the phone was locked or the app was in the background.
export function FocusTimer({
  entry,
  minutes,
  audio,
  onClose,
  onDone,
}: {
  entry: Entry
  minutes: number
  audio?: AudioContext
  onClose: () => void
  // Marks the task done; defaults to doing it here and closing.
  onDone?: () => void
}) {
  const [end, setEnd] = useState(() => Date.now() + minutes * 60_000)
  const [total, setTotal] = useState(minutes * 60_000)
  const [now, setNow] = useState(Date.now())
  const left = Math.max(0, end - now)
  const finished = left === 0

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (finished) chime(audio)
  }, [finished])

  // Keep the screen on while counting, where the phone allows it.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | undefined
    navigator.wakeLock?.request('screen').then((l) => (lock = l), () => {})
    return () => void lock?.release()
  }, [])

  const extend = () => {
    const base = Math.max(end, Date.now())
    setEnd(base + 5 * 60_000)
    setTotal((t) => (finished ? 5 * 60_000 : t + 5 * 60_000))
  }

  const secs = Math.ceil(left / 1000)
  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`

  return createPortal(
    <div class="one-thing focus-timer" role="dialog" aria-modal="true" aria-label="Timer skupienia">
      {!finished && (
        <p class="screen-note" role="note">
          <b>📱 Nie blokuj telefonu</b>
          Zostaw ekran włączony i aplikację otwartą, inaczej dźwięk zagra dopiero po powrocie.
        </p>
      )}
      <p class="one-task">{entry.text}</p>
      <div class="timer-ring" role="timer" aria-label={finished ? 'Koniec' : `Zostało ${clock}`}>
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r={R} class="timer-track" />
          <circle cx="100" cy="100" r={R} class="timer-left" stroke-dasharray={C} stroke-dashoffset={C * (1 - left / total)} />
        </svg>
        <span class="timer-clock">{finished ? 'Koniec!' : clock}</span>
      </div>
      <div class="one-actions">
        {finished && entry.type === 'task' && entry.status === 'open' && (
          <button type="button" class="primary" onClick={() => (onDone ? onDone() : updateEntry(entry.id, { status: 'done' }).then(onClose))}>× Zrobione</button>
        )}
        <button type="button" onClick={extend}>+5 min</button>
        <button type="button" onClick={onClose}>{finished ? 'Zamknij' : 'Przerwij'}</button>
      </div>
    </div>,
    document.body,
  )
}
