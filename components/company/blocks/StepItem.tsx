import type { TranslationMap } from '@/lib/company/types'

interface Props {
  number: number
  titleKey: string
  bodyKey: string
  isLast?: boolean
  t: TranslationMap
}

export default function StepItem({ number, titleKey, bodyKey, isLast = false, t }: Props) {
  return (
    <div className="flex flex-col items-center text-center relative">
      <div className="flex items-center w-full mb-6">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm z-10">
          {number}
        </div>
        {!isLast && (
          <div className="flex-1 border-t-2 border-dashed border-blue-200 hidden md:block ml-2" />
        )}
      </div>
      <div className="text-left w-full">
        <h3 className="text-blue-900 font-semibold text-base mb-2">{t[titleKey]}</h3>
        <p className="text-gray-700 text-sm leading-relaxed">{t[bodyKey]}</p>
      </div>
    </div>
  )
}
