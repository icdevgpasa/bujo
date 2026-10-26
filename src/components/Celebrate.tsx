import { useEffect, useMemo } from 'preact/hooks'

// A little party for a finished task: a rubber stamp from a grinning horse,
// confetti and a short fanfare. Tapping anywhere moves on straight away.

const STAMPS = ['APPROVED', 'SZACUNEK', 'PETARDA!', 'KOZAK!', 'BRAWO!', 'MISTRZ!']
const HEROES = ['🐴', '🦄', '🐎']
const COLORS = ['#e3a24a', '#d0343a', '#12715f', '#3f6fd8', '#f2c94c', '#b05cc8']
const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]

export function fanfare(ctx?: AudioContext) {
  if (!ctx) return
  ctx.resume?.()
  // Ta-da: a quick rising C major arpeggio, the last note held.
  const notes = [523, 659, 784, 1046]
  notes.forEach((freq, i) => {
    const at = ctx.currentTime + i * 0.11
    const length = i === notes.length - 1 ? 0.7 : 0.16
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
    osc.connect(gain).connect(ctx.destination)
    osc.start(at)
    osc.stop(at + length + 0.05)
  })
}

export function Celebrate({ onDone }: { onDone: () => void }) {
  const stamp = useMemo(() => pick(STAMPS), [])
  const hero = useMemo(() => pick(HEROES), [])
  const confetti = useMemo(
    () =>
      Array.from({ length: 48 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.35,
        drift: (Math.random() - 0.5) * 160,
        spin: (Math.random() - 0.5) * 1080,
        color: pick(COLORS),
        wide: Math.random() > 0.5,
      })),
    [],
  )

  useEffect(() => {
    const timer = setTimeout(onDone, 2200)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div class="celebrate" role="status" aria-label={`Zrobione! ${stamp}`} onClick={onDone}>
      <div class="confetti" aria-hidden="true">
        {confetti.map((c) => (
          <i
            style={{
              left: `${c.left}%`,
              background: c.color,
              width: c.wide ? '10px' : '6px',
              animationDelay: `${c.delay}s`,
              '--drift': `${c.drift}px`,
              '--spin': `${c.spin}deg`,
            }}
          />
        ))}
      </div>
      <div class="hero" aria-hidden="true">{hero}</div>
      <div class="stamp">{stamp}</div>
    </div>
  )
}
