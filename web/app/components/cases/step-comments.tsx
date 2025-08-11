'use client'

import { useState, useEffect } from 'react'
import { api } from '@/app/lib/api-client'
import { Button } from '@/app/components/ui/button'
import { Textarea } from '@/app/components/ui/textarea'
import { MessageCircle, Send, Reply, User, Clock, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface Comment {
  id: number
  stepId: number
  parentId: number | null
  userId: number
  userName?: string
  content: string
  createdAt: string
  updatedAt: string
  replies?: Comment[]
}

interface StepCommentsProps {
  stepId: number
  onCommentAdded?: () => void
}

export function StepComments({ stepId, onCommentAdded }: StepCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    if (expanded) {
      fetchComments()
      fetchUsers()
    }
  }, [stepId, expanded])

  const fetchUsers = async () => {
    try {
      const response = await api.getUsers()
      setUsers(response.data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const fetchComments = async () => {
    setLoading(true)
    try {
      const response = await api.getStepComments(stepId)
      const commentsData = response.data || []
      
      // Build comment tree
      const commentMap = new Map<number, Comment>()
      const rootComments: Comment[] = []
      
      // First pass: create all comments
      commentsData.forEach((comment: Comment) => {
        commentMap.set(comment.id, { ...comment, replies: [] })
      })
      
      // Second pass: build tree structure
      commentsData.forEach((comment: Comment) => {
        const mappedComment = commentMap.get(comment.id)!
        if (comment.parentId && commentMap.has(comment.parentId)) {
          const parent = commentMap.get(comment.parentId)!
          parent.replies!.push(mappedComment)
        } else if (!comment.parentId) {
          rootComments.push(mappedComment)
        }
      })
      
      // Add user names
      rootComments.forEach(comment => {
        addUserNames(comment)
      })
      
      setComments(rootComments)
    } catch (error) {
      console.error('Failed to fetch comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const addUserNames = (comment: Comment) => {
    const user = users.find(u => u.id === comment.userId)
    comment.userName = user?.name || `ユーザー${comment.userId}`
    if (comment.replies) {
      comment.replies.forEach(reply => addUserNames(reply))
    }
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return
    
    setSubmitting(true)
    try {
      await api.createComment({
        stepId,
        content: newComment,
        userId: 1, // TODO: Get actual logged-in user ID
      })
      setNewComment('')
      fetchComments()
      if (onCommentAdded) onCommentAdded()
    } catch (error) {
      console.error('Failed to submit comment:', error)
      alert('コメントの投稿に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitReply = async (parentId: number) => {
    if (!replyContent.trim()) return
    
    setSubmitting(true)
    try {
      await api.replyToComment(parentId, {
        stepId,
        content: replyContent,
        userId: 1, // TODO: Get actual logged-in user ID
      })
      setReplyContent('')
      setReplyTo(null)
      fetchComments()
      if (onCommentAdded) onCommentAdded()
    } catch (error) {
      console.error('Failed to submit reply:', error)
      alert('返信の投稿に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('このコメントを削除してもよろしいですか？')) return
    
    try {
      await api.deleteComment(commentId)
      fetchComments()
    } catch (error) {
      console.error('Failed to delete comment:', error)
      alert('コメントの削除に失敗しました')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffMins < 1) return 'たった今'
    if (diffMins < 60) return `${diffMins}分前`
    if (diffHours < 24) return `${diffHours}時間前`
    if (diffDays < 7) return `${diffDays}日前`
    
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })
  }

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={`${isReply ? 'ml-8 mt-3' : 'mt-4'}`}>
      <div className={`${isReply ? 'border-l-2 border-gray-200 pl-4' : ''}`}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{comment.userName}</span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(comment.createdAt)}
              </span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
            <div className="flex items-center gap-2 mt-2">
              {!isReply && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    setReplyTo(comment.id)
                    setReplyContent('')
                  }}
                >
                  <Reply className="w-3 h-3 mr-1" />
                  返信
                </Button>
              )}
              <Button
                size="xs"
                variant="ghost"
                onClick={() => handleDeleteComment(comment.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
            
            {replyTo === comment.id && (
              <div className="mt-3 flex gap-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="返信を入力..."
                  className="flex-1 text-sm"
                  rows={2}
                />
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    onClick={() => handleSubmitReply(comment.id)}
                    disabled={submitting || !replyContent.trim()}
                  >
                    送信
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReplyTo(null)}
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            )}
            
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-2">
                {comment.replies.map((reply) => (
                  <CommentItem key={reply.id} comment={reply} isReply />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const totalComments = comments.reduce((total, comment) => {
    return total + 1 + (comment.replies?.length || 0)
  }, 0)

  return (
    <div className="mt-4 border-t pt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <MessageCircle className="w-4 h-4" />
        <span>コメント ({totalComments})</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      
      {expanded && (
        <div className="mt-4">
          {loading ? (
            <div className="text-center py-4 text-gray-500">
              コメントを読み込み中...
            </div>
          ) : (
            <>
              {comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
              
              {comments.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  まだコメントがありません
                </div>
              )}
              
              <div className="mt-4 flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="コメントを入力..."
                  className="flex-1 text-sm"
                  rows={3}
                />
                <Button
                  onClick={handleSubmitComment}
                  disabled={submitting || !newComment.trim()}
                >
                  <Send className="w-4 h-4 mr-1" />
                  投稿
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}