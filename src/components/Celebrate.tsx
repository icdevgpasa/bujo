import { useEffect, useMemo, useState } from 'preact/hooks'

// A little party for a finished task: a rubber stamp from a grinning horse,
// confetti (the fanfare is played by whoever opens this). Tapping anywhere moves on straight away.

const STAMPS = ['APPROVED', 'SZACUNEK', 'PETARDA!', 'KOZAK!', 'BRAWO!', 'MISTRZ!']
// Funny animals from Tenor, one at random each time (Anrzej's horse first
// among them). They are cached by the service worker after the first view;
// if one can't load (offline before then), a horse emoji stands in.
export const GIFS = [
  'https://c.tenor.com/121RkGxcIOQAAAAC/tenor.gif', // the horse
  'https://media1.tenor.com/m/8yHL-uQtaMIAAAAC/monkey-thinking-monkey.gif', // monkey, thumbs up
  'https://media1.tenor.com/m/6xgziLBgq5IAAAAC/animated-cat.gif', // cartoon cat, thumbs up
  'https://media1.tenor.com/m/ERf9dVPah6wAAAAC/cat-thumbs-up.gif', // cat, thumbs up
  'https://media1.tenor.com/m/jGczPnb4EDMAAAAd/dancing-animal.gif', // dancing fox
  'https://media1.tenor.com/m/UosViw7iYckAAAAC/dancing-animal.gif', // hamster jumping in
]

let last = -1
// A different one from last time, so two finished tasks never look the same.
export function nextGif(): string {
  let i = Math.floor(Math.random() * GIFS.length)
  if (i === last) i = (i + 1) % GIFS.length
  last = i
  return GIFS[i]
}
const COLORS = ['#e3a24a', '#d0343a', '#12715f', '#3f6fd8', '#f2c94c', '#b05cc8']
const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]

export function Celebrate({ gif, onDone }: { gif: string; onDone: () => void }) {
  const stamp = useMemo(() => pick(STAMPS), [])
  const [gifFailed, setGifFailed] = useState(false)
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
    const timer = setTimeout(onDone, 3000)
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
      {gifFailed ? (
        <div class="hero" aria-hidden="true">🐴</div>
      ) : (
        <img class="hero-gif" src={gif} alt="" onError={() => setGifFailed(true)} />
      )}
      <div class="stamp">{stamp}</div>
    </div>
  )
}
