'use client'

import { Suspense } from 'react'
import { CaseForm } from '@/app/components/cases/case-form'
import { useSearchParams } from 'next/navigation'

// Inner component that uses useSearchParams
function NewCaseContent() {
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

// Main component with Suspense boundary
export default function NewCasePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    }>
      <NewCaseContent />
    </Suspense>
  )
}