import { createPortal } from 'preact/compat'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { updateEntry, type Entry } from '../db'
import { focusOn } from '../focus'
import { playNow } from '../sound'
import { Celebrate, HORSE_GIF } from './Celebrate'
import { FocusTimer, primeSound, TIMER_MINUTES } from './FocusTimer'

// One open task on the whole screen: nothing else to look at until it is
// done or put aside. Starred tasks come first.
export function OneThing({ entries, onClose }: { entries: Entry[]; onClose: () => void }) {
  const [skipped, setSkipped] = useState<number[]>([])
  const [timer, setTimer] = useState<{ minutes: number; audio?: HTMLAudioElement }>()
  const [party, setParty] = useState(false)
  const endParty = useCallback(() => setParty(false), [])

  // The tap on Zrobione is what lets the phone play the fanfare.
  const finish = (id: number) => {
    playNow('fanfare')
    setParty(true)
    return updateEntry(id, { status: 'done' })
  }
  const open = entries.filter((e) => e.type === 'task' && e.status === 'open')
  const queue = [...open.filter((e) => e.star), ...open.filter((e) => !e.star)].filter((e) => !skipped.includes(e.id))
  // Which task is showing; swiping or the arrows pick another.
  const [pos, setPos] = useState(0)
  const index = queue.length ? ((pos % queue.length) + queue.length) % queue.length : 0
  const task = queue[index]
  const go = (step: number) => setPos(index + step)
  const touch = useRef<{ x: number; y: number }>()

  // Fetch the gif early, so it is ready the moment a task is done.
  useEffect(() => {
    new Image().src = HORSE_GIF
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])

  if (timer && task)
    return (
      <FocusTimer
        entry={task}
        minutes={timer.minutes}
        audio={timer.audio}
        onClose={() => setTimer(undefined)}
        onDone={() => {
          setTimer(undefined)
          finish(task.id)
        }}
      />
    )

  return createPortal(
    <div
      class="one-thing"
      role="dialog"
      aria-modal="true"
      aria-label="Jedna rzecz"
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const start = touch.current
        touch.current = undefined
        if (!start || queue.length < 2) return
        const dx = e.changedTouches[0].clientX - start.x
        const dy = e.changedTouches[0].clientY - start.y
        if (Math.abs(dx) > 50 && Math.abs(dy) < Math.abs(dx) * 0.6) go(dx < 0 ? 1 : -1)
      }}
    >
      <button type="button" class="one-close" onClick={onClose}>Zamknij</button>
      {party && <Celebrate onDone={endParty} />}
      {task ? (
        <>
          <p class="one-count">{queue.length === 1 ? 'Ostatnia na dziś' : `${index + 1} z ${queue.length} · przesuń, żeby wybrać inną`}</p>
          <div class="one-pick">
            {queue.length > 1 && <button type="button" class="one-arrow" aria-label="Poprzednie zadanie" onClick={() => go(-1)}>‹</button>}
            <p class="one-task" key={task.id}>{task.star && '⭐ '}{task.text}</p>
            {queue.length > 1 && <button type="button" class="one-arrow" aria-label="Następne zadanie" onClick={() => go(1)}>›</button>}
          </div>
          {queue.length > 1 && (
            <div class="one-dots" aria-hidden="true">
              {queue.map((q, i) => <i key={q.id} class={i === index ? 'on' : ''} />)}
            </div>
          )}
          <div class="one-actions">
            <button type="button" class="primary" onClick={() => finish(task.id)}>× Zrobione</button>
            <button type="button" onClick={() => setSkipped((s) => [...s, task.id])}>Nie teraz</button>
            {focusOn('bujo:timer') && (
              <div class="one-timers">
                {TIMER_MINUTES.map((m) => (
                  <button type="button" onClick={() => setTimer({ minutes: m, audio: primeSound('chime') })}>⏱ {m} min</button>
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
