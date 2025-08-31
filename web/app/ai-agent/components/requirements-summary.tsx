'use client';

import { useState } from 'react';
import { 
  Target, 
  Users, 
  Zap, 
  Shield, 
  Package,
  Settings,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/app/components/ui/button';

interface Requirement {
  category: string;
  content: string;
  priority: string;
  confidence: number;
}

interface RequirementsSummaryProps {
  requirements: Requirement[];
  className?: string;
}

/**
 * Requirements Summary Component
 * Displays extracted requirements grouped by category
 */
export function RequirementsSummary({
  requirements,
  className = '',
}: RequirementsSummaryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Group requirements by category
  const groupedRequirements = groupRequirementsByCategory(requirements);
  
  // Get unique priorities
  const priorities = Array.from(new Set(requirements.map(r => r.priority)));

  // Filter requirements
  const filteredRequirements = requirements.filter(req => {
    if (selectedCategory && req.category !== selectedCategory) return false;
    if (selectedPriority && req.priority !== selectedPriority) return false;
    return true;
  });

  // Re-group filtered requirements
  const filteredGrouped = groupRequirementsByCategory(filteredRequirements);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedPriority(null);
  };

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-500" />
        
        {/* Category Filter */}
        <div className="flex gap-1">
          {Object.keys(groupedRequirements).map(category => (
            <Button
              key={category}
              size="sm"
              variant={selectedCategory === category ? 'primary' : 'outline'}
              onClick={() => setSelectedCategory(
                selectedCategory === category ? null : category
              )}
              className="text-xs"
            >
              {getCategoryIcon(category)}
              {category} ({groupedRequirements[category].length})
            </Button>
          ))}
        </div>

        {/* Priority Filter */}
        <div className="flex gap-1 ml-2">
          {priorities.map(priority => (
            <Button
              key={priority}
              size="sm"
              variant={selectedPriority === priority ? 'primary' : 'outline'}
              onClick={() => setSelectedPriority(
                selectedPriority === priority ? null : priority
              )}
              className="text-xs"
            >
              {getPriorityIcon(priority)}
              {priority}
            </Button>
          ))}
        </div>

        {/* Clear Filters */}
        {(selectedCategory || selectedPriority) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={clearFilters}
            className="text-xs text-gray-500"
          >
            クリア
          </Button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-700">
            {filteredRequirements.length}
          </div>
          <div className="text-xs text-blue-600">総要件数</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-700">
            {filteredRequirements.filter(r => r.priority === '高').length}
          </div>
          <div className="text-xs text-green-600">高優先度</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-yellow-700">
            {Object.keys(filteredGrouped).length}
          </div>
          <div className="text-xs text-yellow-600">カテゴリー数</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-purple-700">
            {Math.round(
              filteredRequirements.reduce((sum, r) => sum + r.confidence, 0) / 
              filteredRequirements.length * 100
            )}%
          </div>
          <div className="text-xs text-purple-600">平均信頼度</div>
        </div>
      </div>

      {/* Grouped Requirements */}
      <div className="space-y-3">
        {Object.entries(filteredGrouped).map(([category, reqs]) => (
          <div key={category} className="border rounded-lg">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {getCategoryIcon(category)}
                <span className="font-medium">{category}</span>
                <span className="text-sm text-gray-500">({reqs.length})</span>
              </div>
              {expandedCategories.has(category) ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {/* Requirements List */}
            {expandedCategories.has(category) && (
              <div className="px-4 pb-3 space-y-2">
                {reqs.map((req, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {/* Priority Badge */}
                    <div className={clsx(
                      'flex-shrink-0 px-2 py-1 rounded text-xs font-medium',
                      getPriorityColor(req.priority)
                    )}>
                      {req.priority}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">{req.content}</p>
                      
                      {/* Confidence */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <CheckCircle className="w-3 h-3" />
                          信頼度: {Math.round(req.confidence * 100)}%
                        </div>
                        <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={clsx(
                              'h-full transition-all',
                              req.confidence > 0.8 ? 'bg-green-500' :
                              req.confidence > 0.6 ? 'bg-yellow-500' :
                              'bg-red-500'
                            )}
                            style={{ width: `${req.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredRequirements.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>該当する要件が見つかりません</p>
          {(selectedCategory || selectedPriority) && (
            <Button
              size="sm"
              variant="link"
              onClick={clearFilters}
              className="mt-2"
            >
              フィルターをクリア
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Group requirements by category
 */
function groupRequirementsByCategory(requirements: Requirement[]): Record<string, Requirement[]> {
  return requirements.reduce((groups, req) => {
    const category = req.category || 'その他';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(req);
    return groups;
  }, {} as Record<string, Requirement[]>);
}

/**
 * Get icon for category
 */
function getCategoryIcon(category: string) {
  const iconClass = "w-4 h-4";
  switch (category.toLowerCase()) {
    case '機能':
    case 'functional':
      return <Target className={iconClass} />;
    case 'ユーザー':
    case 'user':
      return <Users className={iconClass} />;
    case 'パフォーマンス':
    case 'performance':
      return <Zap className={iconClass} />;
    case 'セキュリティ':
    case 'security':
      return <Shield className={iconClass} />;
    case 'インフラ':
    case 'infrastructure':
      return <Package className={iconClass} />;
    case '運用':
    case 'operational':
      return <Settings className={iconClass} />;
    default:
      return <Target className={iconClass} />;
  }
}

/**
 * Get icon for priority
 */
function getPriorityIcon(priority: string) {
  const iconClass = "w-3 h-3";
  switch (priority) {
    case '高':
    case 'high':
      return <AlertTriangle className={iconClass} />;
    default:
      return null;
  }
}

/**
 * Get color class for priority
 */
function getPriorityColor(priority: string): string {
  switch (priority) {
    case '高':
    case 'high':
      return 'bg-red-100 text-red-700';
    case '中':
    case 'medium':
      return 'bg-yellow-100 text-yellow-700';
    case '低':
    case 'low':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}