import type { ComparisonTableBlock, TranslationMap } from '@/lib/company/types'

interface Props {
  block: ComparisonTableBlock
  t: TranslationMap
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export default function ComparisonTable({ block, t }: Props) {
  return (
    <div className="flex flex-col md:flex-row gap-4 w-full">
      {/* Left panel — Traditional */}
      <div className="flex-1 rounded-xl overflow-hidden">
        <div className="bg-blue-800 px-4 py-3">
          <span className="text-blue-300 text-xs font-semibold uppercase tracking-widest">
            {t[block.leftHeaderKey]}
          </span>
        </div>
        <div className="bg-blue-800 divide-y divide-blue-700">
          {block.rows.map((row) => (
            <div key={row.labelKey} className="px-4 py-3 flex items-start gap-3">
              <XIcon />
              <div>
                <p className="text-blue-400 text-xs mb-0.5">{t[row.labelKey]}</p>
                <p className="text-blue-200 text-sm">{t[row.leftKey]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — DriverNord */}
      <div className="flex-1 rounded-xl overflow-hidden">
        <div className="bg-blue-600 px-4 py-3">
          <span className="text-white text-xs font-semibold uppercase tracking-widest">
            {t[block.rightHeaderKey]}
          </span>
        </div>
        <div className="bg-blue-700 divide-y divide-blue-600">
          {block.rows.map((row) => (
            <div key={row.labelKey} className="px-4 py-3 flex items-start gap-3">
              <CheckIcon />
              <div>
                <p className="text-blue-300 text-xs mb-0.5">{t[row.labelKey]}</p>
                <p className="text-white text-sm">{t[row.rightKey]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
