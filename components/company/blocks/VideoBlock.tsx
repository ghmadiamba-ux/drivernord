import type { VideoBlock as VideoBlockType } from '@/lib/company/types'

interface Props {
  block: VideoBlockType
}

export default function VideoBlock({ block }: Props) {
  const { video, caption } = block
  const { src } = video

  if (src.type === 'embed') {
    const embedUrl =
      src.platform === 'youtube'
        ? `https://www.youtube.com/embed/${src.id}`
        : `https://player.vimeo.com/video/${src.id}`

    return (
      <figure className="w-full">
        <div className="aspect-video w-full rounded-xl overflow-hidden bg-blue-50">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video"
          />
        </div>
        {caption && <figcaption className="text-xs text-blue-400 mt-2 text-center">{caption}</figcaption>}
      </figure>
    )
  }

  const videoSrc = src.type === 'local' ? src.path : src.url

  return (
    <figure className="w-full">
      <div className="aspect-video w-full rounded-xl overflow-hidden bg-blue-50">
        <video
          src={videoSrc}
          className="w-full h-full object-cover"
          autoPlay={video.autoplay}
          muted={video.muted}
          loop={video.loop}
          controls={!video.autoplay}
          playsInline
        />
      </div>
      {caption && <figcaption className="text-xs text-blue-400 mt-2 text-center">{caption}</figcaption>}
    </figure>
  )
}
