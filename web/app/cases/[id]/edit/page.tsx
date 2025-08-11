import { CaseForm } from '@/app/components/cases/case-form'

export default function EditCasePage({ params }: { params: { id: string } }) {
  const caseId = parseInt(params.id)
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <CaseForm caseId={caseId} />
      </div>
    </div>
  )
}