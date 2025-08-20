'use client';

import { useState, useCallback, useEffect } from 'react';
import { produce, Draft } from 'immer';

interface UndoRedoOptions {
  maxHistorySize?: number;
  enableKeyboardShortcuts?: boolean;
}

export function useUndoRedo<T>(
  initialState: T,
  options: UndoRedoOptions = {}
) {
  const { maxHistorySize = 50, enableKeyboardShortcuts = true } = options;
  
  const [history, setHistory] = useState<T[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 現在の状態
  const currentState = history[currentIndex];

  // 状態を更新（アンドゥ履歴に追加）
  const setState = useCallback((updater: (draft: Draft<T>) => void) => {
    const newState = produce(history[currentIndex], updater);
    
    // 現在の位置より後の履歴を削除して新しい状態を追加
    const newHistory = [...history.slice(0, currentIndex + 1), newState];
    
    // 最大履歴サイズを超えた場合、古い履歴を削除
    if (newHistory.length > maxHistorySize) {
      setHistory(newHistory.slice(1)); // 最初の要素を削除
      // currentIndexは変更しない（配列が左にシフトするため）
    } else {
      setHistory(newHistory);
      setCurrentIndex(currentIndex + 1);
    }
  }, [history, currentIndex, maxHistorySize]);

  // アンドゥ
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      return true;
    }
    return false;
  }, [currentIndex]);

  // リドゥ
  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return true;
    }
    return false;
  }, [currentIndex, history.length]);

  // アンドゥ可能か
  const canUndo = currentIndex > 0;
  
  // リドゥ可能か
  const canRedo = currentIndex < history.length - 1;

  // 履歴をクリア
  const clearHistory = useCallback(() => {
    setHistory([history[currentIndex]]);
    setCurrentIndex(0);
  }, [history, currentIndex]);

  // 履歴を取得
  const getHistory = useCallback(() => {
    return {
      past: history.slice(0, currentIndex),
      present: history[currentIndex],
      future: history.slice(currentIndex + 1),
    };
  }, [history, currentIndex]);

  // キーボードショートカット
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z: アンドゥ
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl/Cmd + Shift + Z: リドゥ
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
      }
      // Ctrl/Cmd + Y: リドゥ（Windows形式）
      else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, enableKeyboardShortcuts]);

  return {
    state: currentState,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    getHistory,
    historySize: history.length,
    currentIndex,
  };
}