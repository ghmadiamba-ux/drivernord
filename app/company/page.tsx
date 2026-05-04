'use client'

import { useState } from 'react'
import type { Lang } from '@/lib/company/types'
import { translations } from '@/lib/company/translations'
import { companyPageContent } from '@/lib/company/content'
import CompanyNavBar from '@/components/company/layout/CompanyNavBar'
import CompanySiteFooter from '@/components/company/layout/CompanySiteFooter'
import SectionRenderer from '@/components/company/SectionRenderer'

export default function CompanyPage() {
  const [lang, setLang] = useState<Lang>('sv')
  const t = translations[lang]

  return (
    <div id="top" className="min-h-screen flex flex-col">
      <CompanyNavBar
        nav={companyPageContent.nav}
        lang={lang}
        setLang={setLang}
        t={t}
      />

      <main className="flex-1">
        {companyPageContent.sections.map((section) => (
          <SectionRenderer key={section.id} section={section} t={t} />
        ))}
      </main>

      <CompanySiteFooter footer={companyPageContent.footer} t={t} />
    </div>
  )
}
