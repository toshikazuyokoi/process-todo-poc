'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  CheckSquare, 
  Square, 
  MinusSquare, 
  Trash2, 
  Edit2, 
  Users,
  CheckCircle,
  XCircle,
  Download,
  Upload
} from 'lucide-react';
import { Button } from './button';

interface BulkSelectTableProps<T> {
  items: T[];
  columns: {
    key: string;
    label: string;
    render?: (item: T) => React.ReactNode;
    sortable?: boolean;
  }[];
  idKey: string;
  onBulkAction?: (action: string, selectedIds: any[]) => void;
  bulkActions?: {
    key: string;
    label: string;
    icon?: React.ElementType;
    variant?: 'default' | 'danger' | 'outline';
    confirmMessage?: string;
  }[];
  onRowClick?: (item: T) => void;
  selectable?: boolean;
}

export function BulkSelectTable<T extends Record<string, any>>({
  items,
  columns,
  idKey,
  onBulkAction,
  bulkActions = [],
  onRowClick,
  selectable = true,
}: BulkSelectTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<any>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // 全選択の状態
  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  // ソート処理
  const sortedItems = [...items].sort((a, b) => {
    if (!sortConfig) return 0;
    
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    if (aValue === bValue) return 0;
    
    const comparison = aValue < bValue ? -1 : 1;
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  // 全選択/全解除
  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item[idKey])));
    }
  };

  // 個別選択
  const handleSelectItem = (id: any, index: number, event: React.MouseEvent) => {
    const newSelectedIds = new Set(selectedIds);
    
    if (event.shiftKey && lastSelectedIndex !== null) {
      // Shift+クリックで範囲選択
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      
      for (let i = start; i <= end; i++) {
        newSelectedIds.add(sortedItems[i][idKey]);
      }
    } else if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd+クリックで個別追加/削除
      if (newSelectedIds.has(id)) {
        newSelectedIds.delete(id);
      } else {
        newSelectedIds.add(id);
      }
    } else {
      // 通常クリック
      if (newSelectedIds.has(id)) {
        newSelectedIds.delete(id);
      } else {
        newSelectedIds.clear();
        newSelectedIds.add(id);
      }
    }
    
    setSelectedIds(newSelectedIds);
    setLastSelectedIndex(index);
  };

  // 一括アクション実行
  const handleBulkAction = (action: string, confirmMessage?: string) => {
    if (selectedIds.size === 0) {
      alert('項目を選択してください');
      return;
    }

    if (confirmMessage && !confirm(confirmMessage)) {
      return;
    }

    onBulkAction?.(action, Array.from(selectedIds));
    setSelectedIds(new Set()); // 実行後は選択解除
  };

  // ソート処理
  const handleSort = (key: string) => {
    if (!columns.find((col) => col.key === key)?.sortable) return;

    setSortConfig((prev) => {
      if (prev?.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + A で全選択
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && selectable) {
        e.preventDefault();
        handleSelectAll();
      }
      
      // Escape で選択解除
      if (e.key === 'Escape' && selectedIds.size > 0) {
        setSelectedIds(new Set());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, items, selectable]);

  return (
    <div className="space-y-4">
      {/* 一括アクションバー */}
      {selectable && selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-900">
                {selectedIds.size}件選択中
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                選択解除
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              {bulkActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.key}
                    variant={action.variant || 'default'}
                    size="sm"
                    onClick={() => handleBulkAction(action.key, action.confirmMessage)}
                  >
                    {Icon && <Icon className="h-4 w-4 mr-1" />}
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* テーブル */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <button
                    onClick={handleSelectAll}
                    className="hover:bg-gray-200 rounded p-1 transition-colors"
                    aria-label={allSelected ? '全選択解除' : '全選択'}
                  >
                    {allSelected ? (
                      <CheckSquare className="h-5 w-5 text-blue-600" />
                    ) : someSelected ? (
                      <MinusSquare className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    px-4 py-3 text-left text-sm font-medium text-gray-700
                    ${column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}
                  `}
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && sortConfig?.key === column.key && (
                      <span className="text-xs">
                        {sortConfig.direction === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="divide-y">
            {sortedItems.map((item, index) => {
              const isSelected = selectedIds.has(item[idKey]);
              
              return (
                <tr
                  key={item[idKey]}
                  className={`
                    hover:bg-gray-50 transition-colors
                    ${isSelected ? 'bg-blue-50' : 'bg-white'}
                    ${onRowClick ? 'cursor-pointer' : ''}
                  `}
                  onClick={(e) => {
                    if (!selectable && onRowClick) {
                      onRowClick(item);
                    }
                  }}
                >
                  {selectable && (
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectItem(item[idKey], index, e);
                        }}
                        className="hover:bg-gray-200 rounded p-1 transition-colors"
                        aria-label={isSelected ? '選択解除' : '選択'}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-4 py-3 text-sm text-gray-900"
                      onClick={(e) => {
                        if (selectable) {
                          e.stopPropagation();
                          handleSelectItem(item[idKey], index, e);
                        } else if (onRowClick) {
                          onRowClick(item);
                        }
                      }}
                    >
                      {column.render ? column.render(item) : item[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {sortedItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            データがありません
          </div>
        )}
      </div>

      {/* フッター情報 */}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>全{items.length}件</span>
        {selectable && (
          <span className="text-xs">
            Shift+クリックで範囲選択 | Ctrl/Cmd+クリックで複数選択
          </span>
        )}
      </div>
    </div>
  );
}