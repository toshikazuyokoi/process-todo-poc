'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, FileText, Package, Calendar, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/app/components/ui/input';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  type: 'case' | 'template' | 'page';
  id?: number;
  title: string;
  url: string;
  description?: string;
}

export function QuickSearchModal({ isOpen, onClose }: QuickSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query) {
      // デフォルトの候補を表示
      setResults([
        { type: 'page', title: 'ホーム', url: '/' },
        { type: 'page', title: 'ケース一覧', url: '/cases' },
        { type: 'page', title: 'テンプレート一覧', url: '/templates' },
        { type: 'page', title: 'ガントチャート', url: '/gantt' },
        { type: 'page', title: '新規ケース作成', url: '/cases/new' },
        { type: 'page', title: '新規テンプレート作成', url: '/templates/new' },
      ]);
    } else {
      // 実際の検索を実行（APIコールをシミュレート）
      const mockSearch = async () => {
        // TODO: 実際のAPI検索を実装
        const searchResults: SearchResult[] = [];
        
        if (query.toLowerCase().includes('ケース')) {
          searchResults.push(
            { type: 'case', id: 1, title: 'マーケティングキャンペーン', url: '/cases/1', description: '2025年Q1キャンペーン' },
            { type: 'case', id: 2, title: '製品リリース準備', url: '/cases/2', description: 'バージョン2.0リリース' },
          );
        }
        
        if (query.toLowerCase().includes('テンプレート')) {
          searchResults.push(
            { type: 'template', id: 1, title: '標準プロジェクトテンプレート', url: '/templates/1', description: '10ステップ' },
            { type: 'template', id: 2, title: 'マーケティングテンプレート', url: '/templates/2', description: '8ステップ' },
          );
        }

        // ページ検索
        const pages = [
          { type: 'page' as const, title: 'ケース一覧', url: '/cases' },
          { type: 'page' as const, title: 'テンプレート一覧', url: '/templates' },
          { type: 'page' as const, title: 'ガントチャート', url: '/gantt' },
        ];
        
        const pageResults = pages.filter(p => 
          p.title.toLowerCase().includes(query.toLowerCase())
        );
        
        setResults([...searchResults, ...pageResults]);
      };
      
      mockSearch();
    }
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        router.push(results[selectedIndex].url);
        onClose();
        setQuery('');
      }
    } else if (e.key === 'Escape') {
      onClose();
      setQuery('');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'case':
        return <FileText className="h-4 w-4" />;
      case 'template':
        return <Package className="h-4 w-4" />;
      case 'page':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="h-5 w-5 text-gray-400" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="検索... (ケース、テンプレート、ページ)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 border-0 focus:ring-0 p-0"
          />
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-96 overflow-auto">
            {results.map((result, index) => (
              <button
                key={`${result.type}-${result.id || result.title}`}
                className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left ${
                  index === selectedIndex ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  router.push(result.url);
                  onClose();
                  setQuery('');
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="text-gray-400">
                  {getIcon(result.type)}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{result.title}</div>
                  {result.description && (
                    <div className="text-sm text-gray-500">{result.description}</div>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {result.type === 'case' ? 'ケース' : 
                   result.type === 'template' ? 'テンプレート' : 'ページ'}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No Results */}
        {query && results.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500">
            「{query}」に一致する結果が見つかりませんでした
          </div>
        )}

        {/* Footer */}
        <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span><kbd className="px-1 py-0.5 bg-gray-100 border rounded">↑↓</kbd> 選択</span>
            <span><kbd className="px-1 py-0.5 bg-gray-100 border rounded">Enter</kbd> 開く</span>
            <span><kbd className="px-1 py-0.5 bg-gray-100 border rounded">Esc</kbd> 閉じる</span>
          </div>
        </div>
      </div>
    </div>
  );
}