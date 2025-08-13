import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from '../use-undo-redo';

describe('useUndoRedo', () => {
  it('初期状態を正しく設定する', () => {
    const initialState = { count: 0 };
    const { result } = renderHook(() => useUndoRedo(initialState));

    expect(result.current.state).toEqual(initialState);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('状態を更新して履歴に追加する', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));

    act(() => {
      result.current.setState((draft) => {
        draft.count = 1;
      });
    });

    expect(result.current.state.count).toBe(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('アンドゥが正しく動作する', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));

    // 状態を更新
    act(() => {
      result.current.setState((draft) => {
        draft.count = 1;
      });
    });

    act(() => {
      result.current.setState((draft) => {
        draft.count = 2;
      });
    });

    expect(result.current.state.count).toBe(2);

    // アンドゥ
    act(() => {
      result.current.undo();
    });

    expect(result.current.state.count).toBe(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);

    // もう一度アンドゥ
    act(() => {
      result.current.undo();
    });

    expect(result.current.state.count).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('リドゥが正しく動作する', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));

    // 状態を更新
    act(() => {
      result.current.setState((draft) => {
        draft.count = 1;
      });
    });

    act(() => {
      result.current.setState((draft) => {
        draft.count = 2;
      });
    });

    // アンドゥ
    act(() => {
      result.current.undo();
      result.current.undo();
    });

    expect(result.current.state.count).toBe(0);

    // リドゥ
    act(() => {
      result.current.redo();
    });

    expect(result.current.state.count).toBe(1);

    // もう一度リドゥ
    act(() => {
      result.current.redo();
    });

    expect(result.current.state.count).toBe(2);
    expect(result.current.canRedo).toBe(false);
  });

  it('新しい操作後、未来の履歴がクリアされる', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));

    // 履歴を作成
    act(() => {
      result.current.setState((draft) => {
        draft.count = 1;
      });
    });

    act(() => {
      result.current.setState((draft) => {
        draft.count = 2;
      });
    });

    act(() => {
      result.current.setState((draft) => {
        draft.count = 3;
      });
    });

    // アンドゥ2回
    act(() => {
      result.current.undo();
    });
    
    act(() => {
      result.current.undo();
    });

    expect(result.current.state.count).toBe(1);
    expect(result.current.canRedo).toBe(true);

    // 新しい操作
    act(() => {
      result.current.setState((draft) => {
        draft.count = 10;
      });
    });

    expect(result.current.state.count).toBe(10);
    expect(result.current.canRedo).toBe(false); // 未来の履歴がクリアされた
  });

  it('最大履歴サイズを超えると古い履歴が削除される', () => {
    const { result } = renderHook(() => 
      useUndoRedo({ count: 0 }, { maxHistorySize: 3 })
    );

    // 履歴サイズを超える操作（各操作を個別に実行）
    act(() => {
      result.current.setState((draft) => { draft.count = 1; });
    });
    
    act(() => {
      result.current.setState((draft) => { draft.count = 2; });
    });
    
    expect(result.current.historySize).toBe(3); // ここまでは最大サイズ内
    
    act(() => {
      result.current.setState((draft) => { draft.count = 3; });
    });

    expect(result.current.historySize).toBe(3); // 最大サイズに制限される
    expect(result.current.state.count).toBe(3);

    // 最古の履歴が削除されているか確認
    act(() => {
      result.current.undo();
    });
    
    act(() => {
      result.current.undo();
    });

    expect(result.current.state.count).toBe(1); // 0が削除されて1が最古
    expect(result.current.canUndo).toBe(false);
  });

  it('clearHistoryで履歴をクリアできる', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));

    // 履歴を作成
    act(() => {
      result.current.setState((draft) => { draft.count = 1; });
    });
    
    act(() => {
      result.current.setState((draft) => { draft.count = 2; });
    });

    expect(result.current.historySize).toBe(3);

    // 履歴をクリア
    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.historySize).toBe(1);
    expect(result.current.state.count).toBe(2); // 現在の状態は保持
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('getHistoryで履歴の詳細を取得できる', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));

    // 履歴を作成
    act(() => {
      result.current.setState((draft) => { draft.count = 1; });
    });
    
    act(() => {
      result.current.setState((draft) => { draft.count = 2; });
    });
    
    act(() => {
      result.current.setState((draft) => { draft.count = 3; });
    });

    // アンドゥ1回
    act(() => {
      result.current.undo();
    });

    const history = result.current.getHistory();
    
    expect(history.past).toHaveLength(2);
    expect(history.past[0].count).toBe(0);
    expect(history.past[1].count).toBe(1);
    expect(history.present.count).toBe(2);
    expect(history.future).toHaveLength(1);
    expect(history.future[0].count).toBe(3);
  });

  it('複雑なオブジェクトの状態も正しく管理できる', () => {
    interface ComplexState {
      user: {
        name: string;
        age: number;
      };
      items: Array<{ id: number; name: string }>;
    }

    const initialState: ComplexState = {
      user: { name: 'Alice', age: 30 },
      items: [{ id: 1, name: 'Item 1' }],
    };

    const { result } = renderHook(() => useUndoRedo(initialState));

    // ユーザー名を更新
    act(() => {
      result.current.setState((draft) => {
        draft.user.name = 'Bob';
      });
    });

    // アイテムを追加
    act(() => {
      result.current.setState((draft) => {
        draft.items.push({ id: 2, name: 'Item 2' });
      });
    });

    expect(result.current.state.user.name).toBe('Bob');
    expect(result.current.state.items).toHaveLength(2);

    // アンドゥ
    act(() => {
      result.current.undo();
    });

    expect(result.current.state.user.name).toBe('Bob');
    expect(result.current.state.items).toHaveLength(1);

    // もう一度アンドゥ
    act(() => {
      result.current.undo();
    });

    expect(result.current.state.user.name).toBe('Alice');
    expect(result.current.state.items).toHaveLength(1);
  });
});