'use client'

import { useState, useEffect } from 'react'
import { api } from '@/app/lib/api-client'
import { User } from '@/app/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { Loader2 } from 'lucide-react'

interface AssigneeSelectorProps {
  stepId: number
  currentAssigneeId: number | null
  onAssign?: () => void
}

export function AssigneeSelector({ stepId, currentAssigneeId, onAssign }: AssigneeSelectorProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await api.getUsers()
      setUsers(response.data || [])
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async (value: string) => {
    if (updating) return
    
    const userId = value === 'unassigned' ? null : parseInt(value)
    
    // Skip if no change
    if (userId === currentAssigneeId) return
    
    setUpdating(true)
    try {
      await api.updateStepAssignee(stepId, userId as number)
      if (onAssign) {
        onAssign()
      }
    } catch (error) {
      console.error('Failed to assign user:', error)
      alert('担当者の割当に失敗しました')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>読み込み中...</span>
      </div>
    )
  }

  return (
    <Select
      value={currentAssigneeId?.toString() || 'unassigned'}
      onValueChange={handleAssign}
      disabled={updating}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="担当者を選択" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">未割当</SelectItem>
        {users.map((user) => (
          <SelectItem key={user.id} value={user.id.toString()}>
            {user.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}