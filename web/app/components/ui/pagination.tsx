'use client'

import { Button } from './button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange,
  className = ''
}: PaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const getPageNumbers = () => {
    const pages: number[] = []
    const maxVisible = 5
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      let start = Math.max(1, currentPage - 2)
      let end = Math.min(totalPages, start + maxVisible - 1)
      
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1)
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
    }
    
    return pages
  }

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`} aria-label="ページネーション">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="hidden sm:flex"
        aria-label="最初のページ"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        aria-label="前のページ"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline ml-1">前へ</span>
      </Button>
      
      <div className="flex items-center gap-1">
        {getPageNumbers().map(page => (
          <Button
            key={page}
            variant={page === currentPage ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onPageChange(page)}
            className="min-w-[2rem]"
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </Button>
        ))}
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        aria-label="次のページ"
      >
        <span className="hidden sm:inline mr-1">次へ</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="hidden sm:flex"
        aria-label="最後のページ"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  )
}