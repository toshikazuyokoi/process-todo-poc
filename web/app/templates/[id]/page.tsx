'use client'

import { ProcessTemplateForm } from '@/app/components/templates/process-template-form'

export default function EditTemplatePage({ params }: { params: { id: string } }) {
  const templateId = parseInt(params.id)
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <ProcessTemplateForm templateId={templateId} />
      </div>
    </div>
  )
}