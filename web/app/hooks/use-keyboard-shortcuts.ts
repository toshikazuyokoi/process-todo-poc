'use client';

import { useHotkeys } from 'react-hotkeys-hook';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

interface ShortcutDefinition {
  key: string;
  description: string;
  category: 'navigation' | 'action' | 'edit';
  handler?: () => void;
}

export function useKeyboardShortcuts() {
  const router = useRouter();
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);

  // ショートカットキーの定義
  const shortcuts: ShortcutDefinition[] = [
    // ナビゲーション
    { key: 'g h', description: 'ホームへ移動', category: 'navigation' },
    { key: 'g c', description: 'ケース一覧へ移動', category: 'navigation' },
    { key: 'g t', description: 'テンプレート一覧へ移動', category: 'navigation' },
    { key: 'g g', description: 'ガントチャートへ移動', category: 'navigation' },
    
    // アクション
    { key: 'ctrl+n,cmd+n', description: '新規作成', category: 'action' },
    { key: 'ctrl+s,cmd+s', description: '保存', category: 'action' },
    { key: 'ctrl+k,cmd+k', description: 'クイック検索', category: 'action' },
    { key: 'escape', description: 'モーダルを閉じる', category: 'action' },
    { key: '?', description: 'ヘルプを表示', category: 'action' },
    
    // 編集
    { key: 'ctrl+z,cmd+z', description: 'アンドゥ', category: 'edit' },
    { key: 'ctrl+shift+z,cmd+shift+z', description: 'リドゥ', category: 'edit' },
    { key: 'ctrl+a,cmd+a', description: '全選択', category: 'edit' },
    { key: 'ctrl+c,cmd+c', description: 'コピー', category: 'edit' },
    { key: 'ctrl+v,cmd+v', description: 'ペースト', category: 'edit' },
  ];

  // ナビゲーション系ショートカット
  useHotkeys('g h', () => router.push('/'), {
    preventDefault: true,
    enableOnFormTags: false,
  });

  useHotkeys('g c', () => router.push('/cases'), {
    preventDefault: true,
    enableOnFormTags: false,
  });

  useHotkeys('g t', () => router.push('/templates'), {
    preventDefault: true,
    enableOnFormTags: false,
  });

  useHotkeys('g g', () => router.push('/gantt'), {
    preventDefault: true,
    enableOnFormTags: false,
  });

  // アクション系ショートカット
  useHotkeys('ctrl+n,cmd+n', (e) => {
    e.preventDefault();
    setIsNewCaseModalOpen(true);
  }, {
    enableOnFormTags: false,
  });

  useHotkeys('ctrl+k,cmd+k', (e) => {
    e.preventDefault();
    setIsSearchOpen(true);
  }, {
    enableOnFormTags: false,
  });

  useHotkeys('escape', () => {
    setIsHelpModalOpen(false);
    setIsSearchOpen(false);
    setIsNewCaseModalOpen(false);
  }, {
    enableOnFormTags: true,
  });

  useHotkeys('shift+?', () => {
    setIsHelpModalOpen(!isHelpModalOpen);
  }, {
    enableOnFormTags: false,
  });

  // 保存ショートカット（コンテキストに応じて動作を変える）
  const handleSave = useCallback(() => {
    // 現在のパスに応じて保存処理を実行
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('/edit') || currentPath.includes('/new')) {
      // 編集画面の場合、保存ボタンをクリック
      const saveButton = document.querySelector('[data-testid="save-button"]') as HTMLButtonElement;
      if (saveButton) {
        saveButton.click();
      }
    }
  }, []);

  useHotkeys('ctrl+s,cmd+s', (e) => {
    e.preventDefault();
    handleSave();
  }, {
    enableOnFormTags: true,
  });

  return {
    shortcuts,
    isHelpModalOpen,
    setIsHelpModalOpen,
    isSearchOpen,
    setIsSearchOpen,
    isNewCaseModalOpen,
    setIsNewCaseModalOpen,
  };
}