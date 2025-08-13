'use client';

import { X, Command } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface ShortcutDefinition {
  key: string;
  description: string;
  category: 'navigation' | 'action' | 'edit';
}

interface ShortcutHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: ShortcutDefinition[];
}

export function ShortcutHelpModal({ isOpen, onClose, shortcuts }: ShortcutHelpModalProps) {
  if (!isOpen) return null;

  const categorizedShortcuts = {
    navigation: shortcuts.filter(s => s.category === 'navigation'),
    action: shortcuts.filter(s => s.category === 'action'),
    edit: shortcuts.filter(s => s.category === 'edit'),
  };

  const formatKey = (key: string) => {
    // ctrl+n,cmd+n のような複数のキーバインディングを処理
    const keys = key.split(',');
    const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const primaryKey = isMac && keys.length > 1 ? keys[1] : keys[0];
    
    return primaryKey
      .split('+')
      .map(k => {
        const formatted = k.trim();
        if (formatted === 'cmd') return '⌘';
        if (formatted === 'ctrl') return 'Ctrl';
        if (formatted === 'shift') return '⇧';
        if (formatted === 'escape') return 'Esc';
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
      })
      .join(' + ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-auto"
        data-testid="shortcut-help"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Command className="h-5 w-5" />
            <h2 className="text-lg font-semibold">キーボードショートカット</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* ナビゲーション */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">ナビゲーション</h3>
            <div className="space-y-2">
              {categorizedShortcuts.navigation.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-600">{shortcut.description}</span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                    {formatKey(shortcut.key)}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* アクション */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">アクション</h3>
            <div className="space-y-2">
              {categorizedShortcuts.action.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-600">{shortcut.description}</span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                    {formatKey(shortcut.key)}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* 編集 */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">編集</h3>
            <div className="space-y-2">
              {categorizedShortcuts.edit.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-600">{shortcut.description}</span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                    {formatKey(shortcut.key)}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-3">
          <p className="text-xs text-gray-500">
            Tip: いつでも <kbd className="px-1 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">?</kbd> を押してこのヘルプを表示できます
          </p>
        </div>
      </div>
    </div>
  );
}