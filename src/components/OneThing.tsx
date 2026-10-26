import { createPortal } from 'preact/compat'
import { useEffect, useState } from 'preact/hooks'
import { updateEntry, type Entry } from '../db'
import { focusOn } from '../focus'
import { FocusTimer, TIMER_MINUTES, unlockAudio } from './FocusTimer'

// One open task on the whole screen: nothing else to look at until it is
// done or put aside. Starred tasks come first.
export function OneThing({ entries, onClose }: { entries: Entry[]; onClose: () => void }) {
  const [skipped, setSkipped] = useState<number[]>([])
  const [timer, setTimer] = useState<{ minutes: number; audio?: AudioContext }>()
  const open = entries.filter((e) => e.type === 'task' && e.status === 'open')
  const queue = [...open.filter((e) => e.star), ...open.filter((e) => !e.star)].filter((e) => !skipped.includes(e.id))
  const task = queue[0]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])

  if (timer && task) return <FocusTimer entry={task} minutes={timer.minutes} audio={timer.audio} onClose={() => setTimer(undefined)} />

  return createPortal(
    <div class="one-thing" role="dialog" aria-modal="true" aria-label="Jedna rzecz">
      <button type="button" class="one-close" onClick={onClose}>Zamknij</button>
      {task ? (
        <>
          <p class="one-count">{queue.length === 1 ? 'Ostatnia na dziś' : `Jeszcze ${queue.length - 1} po tej`}</p>
          <p class="one-task" key={task.id}>{task.star && '⭐ '}{task.text}</p>
          <div class="one-actions">
            <button type="button" class="primary" onClick={() => updateEntry(task.id, { status: 'done' })}>× Zrobione</button>
            <button type="button" onClick={() => setSkipped((s) => [...s, task.id])}>Nie teraz</button>
            {focusOn('bujo:timer') && (
              <div class="one-timers">
                {TIMER_MINUTES.map((m) => (
                  <button type="button" onClick={() => setTimer({ minutes: m, audio: unlockAudio() })}>⏱ {m} min</button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <p class="one-task">{open.length ? 'To wszystko na teraz.' : 'Wszystko zrobione na dziś 🎉'}</p>
          <div class="one-actions">
            {open.length > 0 && <button type="button" onClick={() => setSkipped([])}>Pokaż odłożone jeszcze raz</button>}
            <button type="button" class="primary" onClick={onClose}>Zamknij</button>
          </div>
        </>
      )}
    </div>,
    document.body,
  )
}
