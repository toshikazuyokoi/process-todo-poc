# 29 UI/UX詳細設計書（v1.1）

## 概要
本ドキュメントは、プロセス指向ToDoアプリケーションのUI/UX詳細設計を記述します。
ダッシュボード、検索機能、可視化機能（ガント・カレンダー・カンバン）、リアルタイム機能などの実装されたUI/UX機能を詳述します。

## デザインシステム

### カラーパレット
```css
/* プライマリカラー */
--primary-50: #eff6ff;
--primary-100: #dbeafe;
--primary-500: #3b82f6;
--primary-600: #2563eb;
--primary-700: #1d4ed8;

/* セカンダリカラー */
--secondary-50: #f8fafc;
--secondary-100: #f1f5f9;
--secondary-500: #64748b;
--secondary-600: #475569;

/* ステータスカラー */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #06b6d4;

/* グレースケール */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;
```

### タイポグラフィ
```css
/* フォントファミリー */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* フォントサイズ */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */

/* 行間 */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
```

### スペーシング
```css
/* スペーシングスケール */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

## レイアウト設計

### グリッドシステム
```css
/* コンテナ */
.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* グリッド */
.grid {
  display: grid;
  gap: 1rem;
}

.grid-cols-12 {
  grid-template-columns: repeat(12, minmax(0, 1fr));
}

/* レスポンシブブレークポイント */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

### レイアウト構造
```
┌─────────────────────────────────────────────────────────┐
│ Header (固定ヘッダー)                                      │
├─────────────────────────────────────────────────────────┤
│ Sidebar │ Main Content Area                             │
│ (固定)   │                                              │
│         │ ┌─────────────────────────────────────────┐   │
│         │ │ Page Header                             │   │
│         │ ├─────────────────────────────────────────┤   │
│         │ │ Content                                 │   │
│         │ │                                         │   │
│         │ │                                         │   │
│         │ └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## ダッシュボード設計

### ホーム画面レイアウト
```typescript
interface DashboardLayout {
  quickActions: QuickActionCard[];
  summaryCards: SummaryCard[];
  activeCases: CaseCard[];
  processTemplates: TemplateCard[];
  recentActivity: ActivityItem[];
}

interface QuickActionCard {
  title: string;
  description: string;
  icon: string;
  action: () => void;
  color: 'primary' | 'secondary' | 'success' | 'warning';
}
```

### サマリーカード
```tsx
const SummaryCard: React.FC<SummaryCardProps> = ({ 
  title, 
  value, 
  change, 
  trend, 
  icon 
}) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {change && (
          <p className={`text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? '↗' : '↘'} {change}
          </p>
        )}
      </div>
      <div className="text-3xl text-gray-400">
        {icon}
      </div>
    </div>
  </div>
);
```

### クイックアクション
```tsx
const quickActions = [
  {
    title: '新規案件作成',
    description: '新しいプロジェクト案件を作成',
    icon: '📋',
    action: () => router.push('/cases/new'),
    color: 'primary'
  },
  {
    title: 'テンプレート作成',
    description: '新しいプロセステンプレートを作成',
    icon: '📝',
    action: () => router.push('/templates/new'),
    color: 'secondary'
  },
  {
    title: 'ガントチャート',
    description: 'プロジェクトの進捗を可視化',
    icon: '📊',
    action: () => router.push('/gantt'),
    color: 'success'
  },
  {
    title: '検索',
    description: '案件・ステップ・テンプレートを検索',
    icon: '🔍',
    action: () => router.push('/search'),
    color: 'warning'
  }
];
```

## 検索機能設計

### 検索インターフェース
```tsx
interface SearchInterface {
  searchBar: SearchBar;
  filters: SearchFilters;
  results: SearchResults;
  savedSearches: SavedSearch[];
}

const SearchBar: React.FC = () => (
  <div className="relative">
    <input
      type="text"
      placeholder="案件、ステップ、テンプレートを検索..."
      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
    <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
  </div>
);
```

### 検索フィルター
```tsx
interface SearchFilters {
  type: 'all' | 'cases' | 'steps' | 'templates';
  status: string[];
  assignee: number[];
  dateRange: {
    start: Date;
    end: Date;
  };
  tags: string[];
}

const SearchFilters: React.FC<SearchFiltersProps> = ({ filters, onChange }) => (
  <div className="bg-white rounded-lg shadow p-4 space-y-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        検索対象
      </label>
      <select
        value={filters.type}
        onChange={(e) => onChange({ ...filters, type: e.target.value })}
        className="w-full border border-gray-300 rounded-md px-3 py-2"
      >
        <option value="all">すべて</option>
        <option value="cases">案件</option>
        <option value="steps">ステップ</option>
        <option value="templates">テンプレート</option>
      </select>
    </div>
    
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        ステータス
      </label>
      <div className="space-y-2">
        {statusOptions.map(status => (
          <label key={status.value} className="flex items-center">
            <input
              type="checkbox"
              checked={filters.status.includes(status.value)}
              onChange={(e) => handleStatusChange(status.value, e.target.checked)}
              className="mr-2"
            />
            {status.label}
          </label>
        ))}
      </div>
    </div>
  </div>
);
```

### 検索結果表示
```tsx
const SearchResults: React.FC<SearchResultsProps> = ({ results, loading }) => {
  if (loading) {
    return <SearchResultsSkeleton />;
  }

  return (
    <div className="space-y-4">
      {results.map(result => (
        <SearchResultItem
          key={`${result.type}-${result.id}`}
          result={result}
          onSelect={handleResultSelect}
        />
      ))}
      
      {results.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          検索結果が見つかりませんでした
        </div>
      )}
    </div>
  );
};
```

## 可視化機能設計

### ガントチャート
```tsx
interface GanttChartProps {
  data: GanttData;
  viewMode: 'case' | 'personal' | 'team';
  timeRange: {
    start: Date;
    end: Date;
  };
  onTaskUpdate: (taskId: number, updates: TaskUpdate) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({ 
  data, 
  viewMode, 
  timeRange, 
  onTaskUpdate 
}) => {
  return (
    <div className="gantt-container">
      <div className="gantt-header">
        <GanttTimeline timeRange={timeRange} />
      </div>
      <div className="gantt-body">
        {data.tasks.map(task => (
          <GanttBar
            key={task.id}
            task={task}
            timeRange={timeRange}
            onUpdate={onTaskUpdate}
            isDraggable={task.editable}
          />
        ))}
      </div>
    </div>
  );
};
```

### カンバンボード
```tsx
interface KanbanBoardProps {
  columns: KanbanColumn[];
  cards: KanbanCard[];
  onCardMove: (cardId: number, newColumnId: string, newPosition: number) => void;
  onCardUpdate: (cardId: number, updates: CardUpdate) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
  columns, 
  cards, 
  onCardMove, 
  onCardUpdate 
}) => {
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex space-x-4 overflow-x-auto pb-4">
        {columns.map(column => (
          <KanbanColumn
            key={column.id}
            column={column}
            cards={cards.filter(card => card.columnId === column.id)}
            onCardUpdate={onCardUpdate}
          />
        ))}
      </div>
    </DragDropContext>
  );
};

const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, cards, onCardUpdate }) => (
  <Droppable droppableId={column.id}>
    {(provided, snapshot) => (
      <div
        ref={provided.innerRef}
        {...provided.droppableProps}
        className={`
          min-w-80 bg-gray-50 rounded-lg p-4
          ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}
        `}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{column.title}</h3>
          <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-sm">
            {cards.length}
          </span>
        </div>
        
        <div className="space-y-3">
          {cards.map((card, index) => (
            <KanbanCard
              key={card.id}
              card={card}
              index={index}
              onUpdate={onCardUpdate}
            />
          ))}
        </div>
        
        {provided.placeholder}
      </div>
    )}
  </Droppable>
);
```

### カレンダー
```tsx
interface CalendarProps {
  events: CalendarEvent[];
  view: 'month' | 'week' | 'day';
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
  onEventDrop: (eventId: number, newDate: Date) => void;
}

const Calendar: React.FC<CalendarProps> = ({ 
  events, 
  view, 
  currentDate, 
  onEventClick, 
  onDateClick, 
  onEventDrop 
}) => {
  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-1">
      {/* 曜日ヘッダー */}
      {weekdays.map(day => (
        <div key={day} className="p-2 text-center font-semibold text-gray-600">
          {day}
        </div>
      ))}
      
      {/* 日付セル */}
      {monthDays.map(date => (
        <CalendarDay
          key={date.toISOString()}
          date={date}
          events={getEventsForDate(events, date)}
          onClick={onDateClick}
          onEventClick={onEventClick}
        />
      ))}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow">
      <CalendarHeader
        currentDate={currentDate}
        view={view}
        onViewChange={setView}
        onNavigate={handleNavigate}
      />
      
      <div className="p-4">
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
      </div>
    </div>
  );
};
```

## リアルタイム機能設計

### WebSocket接続管理
```tsx
const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_WS_URL, {
      auth: {
        token: getAccessToken()
      }
    });

    newSocket.on('connect', () => {
      setConnectionStatus('connected');
      console.log('WebSocket connected');
    });

    newSocket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      console.log('WebSocket disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ socket, connectionStatus }}>
      {children}
    </WebSocketContext.Provider>
  );
};
```

### リアルタイム通知
```tsx
const NotificationSystem: React.FC = () => {
  const { socket } = useWebSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!socket) return;

    socket.on('notification', (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      
      // トースト通知表示
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.type === 'error' ? 'destructive' : 'default'
      });
      
      // 音声通知（重要度に応じて）
      if (notification.priority === 'high') {
        playNotificationSound();
      }
    });

    socket.on('case_updated', (data: CaseUpdateData) => {
      // 案件更新の即座反映
      queryClient.invalidateQueries(['case', data.caseId]);
    });

    socket.on('step_status_changed', (data: StepStatusChangeData) => {
      // ステップステータス変更の即座反映
      queryClient.invalidateQueries(['case', data.caseId]);
      queryClient.invalidateQueries(['step', data.stepId]);
    });

    return () => {
      socket.off('notification');
      socket.off('case_updated');
      socket.off('step_status_changed');
    };
  }, [socket]);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.slice(0, 5).map(notification => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onDismiss={() => dismissNotification(notification.id)}
        />
      ))}
    </div>
  );
};
```

## モバイル対応設計

### レスポンシブナビゲーション
```tsx
const MobileNavigation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* モバイルメニューボタン */}
      <button
        className="md:hidden p-2"
        onClick={() => setIsOpen(true)}
      >
        <Bars3Icon className="h-6 w-6" />
      </button>

      {/* モバイルメニュー */}
      <Transition show={isOpen} as={Fragment}>
        <Dialog onClose={setIsOpen} className="relative z-50 md:hidden">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-lg bg-white text-left align-middle shadow-xl transition-all">
                  <MobileMenuContent onClose={() => setIsOpen(false)} />
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};
```

### タッチ操作対応
```tsx
const TouchGestures: React.FC = () => {
  const handleSwipe = useSwipeable({
    onSwipedLeft: () => {
      // 左スワイプでサイドバー閉じる
      setSidebarOpen(false);
    },
    onSwipedRight: () => {
      // 右スワイプでサイドバー開く
      setSidebarOpen(true);
    },
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
  });

  return (
    <div {...handleSwipe} className="touch-pan-y">
      {/* コンテンツ */}
    </div>
  );
};
```

## アクセシビリティ設計

### キーボードナビゲーション
```tsx
const KeyboardShortcuts: React.FC = () => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + K: 検索
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        openSearchModal();
      }
      
      // Ctrl/Cmd + N: 新規案件作成
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        router.push('/cases/new');
      }
      
      // Ctrl/Cmd + G: ガントチャート
      if ((event.ctrlKey || event.metaKey) && event.key === 'g') {
        event.preventDefault();
        router.push('/gantt');
      }
      
      // Escape: モーダル・ドロワー閉じる
      if (event.key === 'Escape') {
        closeAllModals();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null;
};
```

### ARIA属性・セマンティックHTML
```tsx
const AccessibleButton: React.FC<AccessibleButtonProps> = ({ 
  children, 
  onClick, 
  disabled, 
  ariaLabel,
  ariaDescribedBy 
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    aria-describedby={ariaDescribedBy}
    className="focus:ring-2 focus:ring-blue-500 focus:outline-none"
  >
    {children}
  </button>
);

const AccessibleForm: React.FC = () => (
  <form role="form" aria-labelledby="form-title">
    <h2 id="form-title">案件作成フォーム</h2>
    
    <div className="form-group">
      <label htmlFor="case-title" className="required">
        案件タイトル
      </label>
      <input
        id="case-title"
        type="text"
        required
        aria-required="true"
        aria-describedby="title-help"
      />
      <div id="title-help" className="help-text">
        案件の名前を入力してください
      </div>
    </div>
  </form>
);
```

## パフォーマンス最適化

### 遅延読み込み・仮想化
```tsx
// 大量データの仮想化
const VirtualizedList: React.FC<VirtualizedListProps> = ({ items }) => {
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={80}
      itemData={items}
    >
      {({ index, style, data }) => (
        <div style={style}>
          <ListItem item={data[index]} />
        </div>
      )}
    </FixedSizeList>
  );
};

// 画像の遅延読み込み
const LazyImage: React.FC<LazyImageProps> = ({ src, alt, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} {...props}>
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
};
```

## 変更履歴

### v1.1での実装内容

1. **ダッシュボード機能の完全実装**
   - ホーム画面・サマリーカード
   - クイックアクション・アクティビティフィード

2. **検索機能の実装**
   - 統合検索インターフェース
   - 高度なフィルタリング・保存検索

3. **可視化機能の実装**
   - ガントチャート・カンバンボード・カレンダー
   - インタラクティブ操作・ドラッグ&ドロップ

4. **リアルタイム機能の実装**
   - WebSocket通信・リアルタイム通知
   - 協調編集・同期機能

5. **モバイル・アクセシビリティ対応**
   - レスポンシブデザイン・タッチ操作
   - キーボードナビゲーション・ARIA対応
