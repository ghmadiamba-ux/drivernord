import type { TranslationMap } from '@/lib/company/types'

interface Props {
  value: string
  labelKey: string
  t: TranslationMap
}

export default function StatCard({ value, labelKey, t }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 px-8">
      <span className="text-3xl font-bold text-blue-700">{value}</span>
      <span className="text-xs font-semibold uppercase tracking-widest text-blue-900 text-center">
        {t[labelKey]}
      </span>
    </div>
  )
}
