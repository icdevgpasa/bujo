const FULL_SIZE = 1600
const THUMB_SIZE = 320

async function resize(bitmap: ImageBitmap, max: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Nie udało się zapisać zdjęcia'))), 'image/jpeg', quality),
  )
}

// Phone photos are several MB each; shrink them before storing on the device.
export async function compressPhoto(file: Blob): Promise<{ blob: Blob; thumb: Blob }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const [blob, thumb] = await Promise.all([resize(bitmap, FULL_SIZE, 0.82), resize(bitmap, THUMB_SIZE, 0.7)])
    return { blob, thumb }
  } finally {
    bitmap.close()
  }
}
