import { useEffect, useMemo } from 'preact/hooks'

export function BlobImage({ blob, alt = '', class: className }: { blob: Blob; alt?: string; class?: string }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return <img src={url} alt={alt} class={className} />
}
