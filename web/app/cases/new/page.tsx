'use client'

import { CaseForm } from '@/app/components/cases/case-form'
import { useSearchParams } from 'next/navigation'

export default function NewCasePage() {
  const searchParams = useSearchParams()
  const templateId = searchParams.get('templateId')
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <CaseForm templateId={templateId ? parseInt(templateId) : undefined} />
      </div>
    </div>
  )
}