import type { ImageBlock as ImageBlockType, SectionDefinition, TranslationMap, VideoBlock as VideoBlockType } from '@/lib/company/types'
import ImageBlock from '../blocks/ImageBlock'
import VideoBlock from '../blocks/VideoBlock'

interface Props {
  section: SectionDefinition
  t: TranslationMap
}

export default function MediaSection({ section, t: _t }: Props) {
  const imageBlock = section.blocks.find(
    (b): b is ImageBlockType => b.blockType === 'image',
  )
  const videoBlock = section.blocks.find(
    (b): b is VideoBlockType => b.blockType === 'video',
  )

  if (!imageBlock && !videoBlock) return null

  return (
    <section id={section.id} className="bg-white">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        {imageBlock && <ImageBlock block={imageBlock} />}
        {videoBlock && <VideoBlock block={videoBlock} />}
      </div>
    </section>
  )
}
