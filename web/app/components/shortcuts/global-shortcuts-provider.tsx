'use client';

import { useKeyboardShortcuts } from '@/app/hooks/use-keyboard-shortcuts';
import { ShortcutHelpModal } from './shortcut-help-modal';
import { QuickSearchModal } from './quick-search-modal';

export function GlobalShortcutsProvider({ children }: { children: React.ReactNode }) {
  const {
    shortcuts,
    isHelpModalOpen,
    setIsHelpModalOpen,
    isSearchOpen,
    setIsSearchOpen,
    isNewCaseModalOpen,
    setIsNewCaseModalOpen,
  } = useKeyboardShortcuts();

  return (
    <>
      {children}
      
      <ShortcutHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        shortcuts={shortcuts}
      />
      
      <QuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
      
      {/* 新規作成モーダル */}
      {isNewCaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setIsNewCaseModalOpen(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">新規作成</h2>
            <div className="space-y-2">
              <button
                onClick={() => {
                  window.location.href = '/cases/new';
                  setIsNewCaseModalOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-md"
              >
                📋 新規ケース
              </button>
              <button
                onClick={() => {
                  window.location.href = '/templates/new';
                  setIsNewCaseModalOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-md"
              >
                📑 新規テンプレート
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setIsNewCaseModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}