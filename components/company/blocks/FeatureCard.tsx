import type { TranslationMap } from '@/lib/company/types'
import Icon from './Icon'

interface Props {
  icon: string
  titleKey: string
  bodyKey: string
  t: TranslationMap
}

export default function FeatureCard({ icon, titleKey, bodyKey, t }: Props) {
  return (
    <div className="bg-white border border-blue-100 rounded-xl p-6 shadow-sm flex flex-col gap-4">
      <div className="text-blue-400">
        <Icon name={icon} className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-blue-900 font-semibold text-base mb-1">{t[titleKey]}</h3>
        <p className="text-gray-700 text-sm leading-relaxed">{t[bodyKey]}</p>
      </div>
    </div>
  )
}
