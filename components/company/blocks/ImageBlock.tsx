import type { ImageBlock as ImageBlockType } from '@/lib/company/types'

interface Props {
  block: ImageBlockType
}

export default function ImageBlock({ block }: Props) {
  const { image, caption } = block
  const src = image.src.type === 'embed' ? '' : image.src.type === 'local' ? image.src.path : image.src.url

  if (!src) return null

  const aspectClass =
    image.aspectRatio === '16/9'
      ? 'aspect-video'
      : image.aspectRatio === '4/3'
      ? 'aspect-[4/3]'
      : image.aspectRatio === '1/1'
      ? 'aspect-square'
      : ''

  const fitClass = image.objectFit === 'contain' ? 'object-contain' : 'object-cover'

  return (
    <figure className="w-full">
      <div className={`w-full overflow-hidden rounded-xl bg-blue-50 ${aspectClass}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={image.alt} className={`w-full h-full ${fitClass}`} />
      </div>
      {caption && <figcaption className="text-xs text-blue-400 mt-2 text-center">{caption}</figcaption>}
    </figure>
  )
}
