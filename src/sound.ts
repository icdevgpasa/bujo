// Short sounds played through an <audio> element, not Web Audio: iPhone
// mutes Web Audio when the side switch is on silent, but plays media.
// The sounds are synthesised once into small WAV files.

interface Note {
  freq: number
  at: number
  len: number
}

const RATE = 22050

function wav(notes: Note[]): string {
  const total = Math.max(...notes.map((n) => n.at + n.len)) + 0.05
  const samples = new Float32Array(Math.ceil(total * RATE))
  for (const { freq, at, len } of notes) {
    const start = Math.floor(at * RATE)
    const count = Math.floor(len * RATE)
    for (let i = 0; i < count; i++) {
      const t = i / RATE
      // Quick attack, smooth decay; a touch of the octave makes it brighter.
      const env = Math.min(1, t / 0.015) * Math.exp((-4 * t) / len)
      const wave = Math.sin(2 * Math.PI * freq * t) + 0.3 * Math.sin(4 * Math.PI * freq * t)
      samples[start + i] += 0.32 * env * wave
    }
  }
  const data = new DataView(new ArrayBuffer(44 + samples.length * 2))
  const text = (offset: number, s: string) => [...s].forEach((c, i) => data.setUint8(offset + i, c.charCodeAt(0)))
  text(0, 'RIFF')
  data.setUint32(4, 36 + samples.length * 2, true)
  text(8, 'WAVEfmt ')
  data.setUint32(16, 16, true)
  data.setUint16(20, 1, true)
  data.setUint16(22, 1, true)
  data.setUint32(24, RATE, true)
  data.setUint32(28, RATE * 2, true)
  data.setUint16(32, 2, true)
  data.setUint16(34, 16, true)
  text(36, 'data')
  data.setUint32(40, samples.length * 2, true)
  samples.forEach((s, i) => data.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true))
  return URL.createObjectURL(new Blob([data], { type: 'audio/wav' }))
}

const cache: Partial<Record<Kind, string>> = {}
type Kind = 'fanfare' | 'chime'
const SOUNDS: Record<Kind, Note[]> = {
  // Ta-da: a quick rising C major arpeggio, the last note held.
  fanfare: [
    { freq: 523, at: 0, len: 0.18 },
    { freq: 659, at: 0.11, len: 0.18 },
    { freq: 784, at: 0.22, len: 0.18 },
    { freq: 1046, at: 0.33, len: 0.8 },
    { freq: 784, at: 0.33, len: 0.8 },
  ],
  // Three soft rising notes, twice, for the end of the timer.
  chime: [0, 0.35, 0.7, 1.4, 1.75, 2.1].map((at, i) => ({ freq: [660, 880, 1046][i % 3], at, len: 0.6 })),
}
const urlOf = (kind: Kind) => (cache[kind] ??= wav(SOUNDS[kind]))

// Plays straight away; call it inside a tap.
export function playNow(kind: Kind) {
  try {
    void new Audio(urlOf(kind)).play().catch(() => {})
  } catch {
    // No sound is better than a broken button.
  }
}

// Readies a sound to play later (when a timer ends). iPhone only lets an
// audio element play on its own after it was started once inside a tap, so
// this has to be called from one.
export function primeSound(kind: Kind): HTMLAudioElement | undefined {
  try {
    const el = new Audio(urlOf(kind))
    el.muted = true
    void el
      .play()
      .then(() => {
        el.pause()
        el.currentTime = 0
        el.muted = false
      })
      .catch(() => {})
    return el
  } catch {
    return undefined
  }
}
