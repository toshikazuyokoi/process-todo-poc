'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RoleBasedButton } from '@/app/components/auth/RoleBasedButton';
import { ProtectedComponent } from '@/app/components/auth/ProtectedComponent';
import { useAuth } from '@/app/contexts/auth-context';
import { useRoles } from '@/app/hooks/useRoles';
import { usePermissions } from '@/app/hooks/usePermissions';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Template {
  id: number;
  name: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stepTemplates: any[];
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  const { canEdit } = useRoles();
  const { canCreate, canUpdate, canDelete } = usePermissions();

  useEffect(() => {
    if (isAuthenticated) {
      fetchTemplates();
    }
  }, [isAuthenticated]);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API_URL}/process-templates`);
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('テンプレートの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('このテンプレートを削除してもよろしいですか？')) return;

    try {
      await axios.delete(`${API_URL}/process-templates/${id}`);
      toast.success('テンプレートを削除しました');
      fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('テンプレートの削除に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">プロセステンプレート</h1>
        <RoleBasedButton
          permissions={['templates:create']}
          roles={['admin', 'editor']}
        >
          <Plus className="mr-2 h-4 w-4" />
          新規作成
        </RoleBasedButton>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">
              テンプレートがまだありません
            </p>
            <ProtectedComponent
              roles={['admin', 'editor']}
              permissions={['templates:create']}
            >
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                最初のテンプレートを作成
              </Button>
            </ProtectedComponent>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{template.name}</span>
                  <span className="text-sm text-gray-500">
                    v{template.version}
                  </span>
                </CardTitle>
                <CardDescription>
                  {template.stepTemplates.length} ステップ
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      template.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {template.isActive ? 'アクティブ' : '非アクティブ'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(template.updatedAt).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Copy className="mr-2 h-4 w-4" />
                    複製
                  </Button>
                  <RoleBasedButton
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    permissions={['templates:update']}
                    roles={['admin', 'editor']}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    編集
                  </RoleBasedButton>
                  <RoleBasedButton
                    variant="outline"
                    size="sm"
                    permissions={['templates:delete']}
                    roles={['admin']}
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </RoleBasedButton>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}