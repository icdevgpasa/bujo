// A minimal ZIP (store only, no compression). Photos, films and recordings are
// already compressed, and storing lets the archive be a Blob made of the
// original Blobs, so a backup with films never sits in memory all at once.
// Reading slices the picked file the same way.

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

async function crc32(blob: Blob): Promise<number> {
  let crc = 0xffffffff
  const reader = blob.stream().getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    for (let i = 0; i < value.length; i++) crc = CRC_TABLE[(crc ^ value[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function header(size: number, fill: (v: DataView) => void, name?: Uint8Array): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(size + (name?.length ?? 0))
  fill(new DataView(bytes.buffer))
  if (name) bytes.set(name, size)
  return bytes
}

export async function zipBlobs(files: { name: string; data: Blob }[], type = 'application/zip'): Promise<Blob> {
  const now = new Date()
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  const parts: BlobPart[] = []
  const central: Uint8Array<ArrayBuffer>[] = []
  let offset = 0
  for (const { name, data } of files) {
    const nameBytes = new TextEncoder().encode(name)
    const crc = await crc32(data)
    const size = data.size
    const local = header(30, (v) => {
      v.setUint32(0, 0x04034b50, true)
      v.setUint16(4, 20, true)
      v.setUint16(6, 0x0800, true) // UTF-8 names
      v.setUint16(8, 0, true) // stored
      v.setUint16(10, time, true)
      v.setUint16(12, date, true)
      v.setUint32(14, crc, true)
      v.setUint32(18, size, true)
      v.setUint32(22, size, true)
      v.setUint16(26, nameBytes.length, true)
    }, nameBytes)
    central.push(
      header(46, (v) => {
        v.setUint32(0, 0x02014b50, true)
        v.setUint16(4, 20, true)
        v.setUint16(6, 20, true)
        v.setUint16(8, 0x0800, true)
        v.setUint16(10, 0, true)
        v.setUint16(12, time, true)
        v.setUint16(14, date, true)
        v.setUint32(16, crc, true)
        v.setUint32(20, size, true)
        v.setUint32(24, size, true)
        v.setUint16(28, nameBytes.length, true)
        v.setUint32(42, offset, true)
      }, nameBytes),
    )
    parts.push(local, data)
    offset += local.length + size
  }
  const centralSize = central.reduce((n, c) => n + c.length, 0)
  if (offset + centralSize > 0xffffffff) throw new Error('Kopia jest za duża (ponad 4 GB).')
  const end = header(22, (v) => {
    v.setUint32(0, 0x06054b50, true)
    v.setUint16(8, files.length, true)
    v.setUint16(10, files.length, true)
    v.setUint32(12, centralSize, true)
    v.setUint32(16, offset, true)
  })
  return new Blob([...parts, ...central, end], { type })
}

async function view(blob: Blob, start: number, end: number): Promise<DataView> {
  return new DataView(await blob.slice(start, end).arrayBuffer())
}

export async function isZip(file: Blob): Promise<boolean> {
  return file.size >= 4 && (await view(file, 0, 4)).getUint32(0, true) === 0x04034b50
}

// Name → Blob (a slice of the file, nothing is read yet). Throws on anything
// this app did not write: compressed entries, ZIP64, a damaged directory.
export async function unzipBlobs(file: Blob): Promise<Map<string, Blob>> {
  const tailStart = Math.max(0, file.size - 22 - 0xffff)
  const tail = await view(file, tailStart, file.size)
  let eocd = -1
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('zip')
  const count = tail.getUint16(eocd + 10, true)
  const cdSize = tail.getUint32(eocd + 12, true)
  const cdOffset = tail.getUint32(eocd + 16, true)
  const cd = await view(file, cdOffset, cdOffset + cdSize)
  const decoder = new TextDecoder()
  const out = new Map<string, Blob>()
  let p = 0
  for (let n = 0; n < count; n++) {
    if (cd.getUint32(p, true) !== 0x02014b50) throw new Error('zip')
    const method = cd.getUint16(p + 10, true)
    const size = cd.getUint32(p + 20, true)
    const nameLen = cd.getUint16(p + 28, true)
    const extraLen = cd.getUint16(p + 30, true)
    const commentLen = cd.getUint16(p + 32, true)
    const local = cd.getUint32(p + 42, true)
    const name = decoder.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLen))
    p += 46 + nameLen + extraLen + commentLen
    if (name.endsWith('/')) continue
    if (method !== 0) throw new Error('zip')
    const lh = await view(file, local, local + 30)
    if (lh.getUint32(0, true) !== 0x04034b50) throw new Error('zip')
    const start = local + 30 + lh.getUint16(26, true) + lh.getUint16(28, true)
    out.set(name, file.slice(start, start + size))
  }
  return out
}
