import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CaseForm } from './case-form';
import { api } from '../../lib/api-client';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock API client
jest.mock('../../lib/api-client', () => ({
  api: {
    getProcessTemplates: jest.fn(),
    getProcessTemplate: jest.fn(),
    getCase: jest.fn(),
    createCase: jest.fn(),
    updateCase: jest.fn(),
  },
}));

describe('CaseForm', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  };

  const mockTemplates = [
    {
      id: 1,
      name: 'Template 1',
      version: 1,
      isActive: true,
      stepTemplates: [],
    },
    {
      id: 2,
      name: 'Template 2',
      version: 1,
      isActive: true,
      stepTemplates: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (api.getProcessTemplates as jest.Mock).mockResolvedValue({
      data: mockTemplates,
    });
    (api.getProcessTemplate as jest.Mock).mockResolvedValue({
      data: mockTemplates[0],
    });
  });

  describe('新規案件作成', () => {
    it('フォームが正しくレンダリングされる', async () => {
      render(<CaseForm />);

      await waitFor(() => {
        expect(screen.getByText('新規案件作成')).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/案件名/)).toBeInTheDocument();
      expect(screen.getByLabelText(/プロセステンプレート/)).toBeInTheDocument();
      expect(screen.getByLabelText(/ゴール日付/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /保存/ })).toBeInTheDocument();
    });

    it('テンプレートが読み込まれて表示される', async () => {
      render(<CaseForm />);

      await waitFor(() => {
        expect(api.getProcessTemplates).toHaveBeenCalled();
      });

      const select = screen.getByLabelText(/プロセステンプレート/);
      expect(select).toBeInTheDocument();
      
      // オプションが表示されることを確認
      fireEvent.click(select);
      await waitFor(() => {
        expect(screen.getByText('Template 1')).toBeInTheDocument();
        expect(screen.getByText('Template 2')).toBeInTheDocument();
      });
    });

    it('必須項目が未入力の場合エラーメッセージが表示される', async () => {
      render(<CaseForm />);

      const saveButton = await screen.findByRole('button', { name: /保存/ });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('案件名は必須です')).toBeInTheDocument();
        expect(screen.getByText('プロセステンプレートを選択してください')).toBeInTheDocument();
      });
    });

    it('正しい入力で案件が作成される', async () => {
      const mockCreateResponse = {
        data: {
          id: 1,
          title: 'Test Case',
          processId: 1,
          goalDateUtc: '2024-12-31',
          status: 'OPEN',
        },
      };
      (api.createCase as jest.Mock).mockResolvedValue(mockCreateResponse);

      render(<CaseForm />);

      // フォームに入力
      const titleInput = await screen.findByLabelText(/案件名/);
      await userEvent.type(titleInput, 'Test Case');

      const templateSelect = screen.getByLabelText(/プロセステンプレート/);
      await userEvent.selectOptions(templateSelect, '1');

      const dateInput = screen.getByLabelText(/ゴール日付/);
      await userEvent.clear(dateInput);
      await userEvent.type(dateInput, '2024-12-31');

      // 保存ボタンをクリック
      const saveButton = screen.getByRole('button', { name: /保存/ });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(api.createCase).toHaveBeenCalledWith({
          title: 'Test Case',
          processId: 1,
          goalDateUtc: expect.any(String),
        });
        expect(mockRouter.push).toHaveBeenCalledWith('/cases/1');
      });
    });

    it('過去の日付を選択した場合エラーメッセージが表示される', async () => {
      render(<CaseForm />);

      const titleInput = await screen.findByLabelText(/案件名/);
      await userEvent.type(titleInput, 'Test Case');

      const templateSelect = screen.getByLabelText(/プロセステンプレート/);
      await userEvent.selectOptions(templateSelect, '1');

      const dateInput = screen.getByLabelText(/ゴール日付/);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      await userEvent.clear(dateInput);
      await userEvent.type(dateInput, yesterdayStr);

      const saveButton = screen.getByRole('button', { name: /保存/ });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('ゴール日付は今日以降の日付を選択してください')).toBeInTheDocument();
      });
    });

    it('テンプレートIDが渡された場合、自動選択される', async () => {
      render(<CaseForm templateId={2} />);

      await waitFor(() => {
        const templateSelect = screen.getByLabelText(/プロセステンプレート/) as HTMLSelectElement;
        expect(templateSelect.value).toBe('2');
      });
    });
  });

  describe('案件編集', () => {
    const mockCase = {
      id: 1,
      title: 'Existing Case',
      processId: 1,
      goalDateUtc: '2024-12-31',
      status: 'OPEN',
      stepInstances: [],
    };

    beforeEach(() => {
      (api.getCase as jest.Mock).mockResolvedValue({ data: mockCase });
    });

    it('既存の案件データが読み込まれて表示される', async () => {
      render(<CaseForm caseId={1} />);

      await waitFor(() => {
        expect(api.getCase).toHaveBeenCalledWith(1);
      });

      await waitFor(() => {
        expect(screen.getByText('案件編集')).toBeInTheDocument();
        const titleInput = screen.getByLabelText(/案件名/) as HTMLInputElement;
        expect(titleInput.value).toBe('Existing Case');
      });
    });

    it('案件が正しく更新される', async () => {
      const mockUpdateResponse = {
        data: {
          ...mockCase,
          title: 'Updated Case',
        },
      };
      (api.updateCase as jest.Mock).mockResolvedValue(mockUpdateResponse);

      render(<CaseForm caseId={1} />);

      await waitFor(() => {
        expect(api.getCase).toHaveBeenCalledWith(1);
      });

      const titleInput = await screen.findByLabelText(/案件名/) as HTMLInputElement;
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, 'Updated Case');

      const saveButton = screen.getByRole('button', { name: /保存/ });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(api.updateCase).toHaveBeenCalledWith(1, expect.objectContaining({
          title: 'Updated Case',
        }));
        expect(mockRouter.push).toHaveBeenCalledWith('/cases/1');
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('API エラーが適切に処理される', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

      (api.createCase as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      render(<CaseForm />);

      const titleInput = await screen.findByLabelText(/案件名/);
      await userEvent.type(titleInput, 'Test Case');

      const templateSelect = screen.getByLabelText(/プロセステンプレート/);
      await userEvent.selectOptions(templateSelect, '1');

      const saveButton = screen.getByRole('button', { name: /保存/ });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('保存に失敗しました'));
      });

      consoleErrorSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it('テンプレート読み込みエラーが処理される', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      (api.getProcessTemplates as jest.Mock).mockRejectedValue(
        new Error('Failed to fetch templates')
      );

      render(<CaseForm />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to fetch templates:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('ナビゲーション', () => {
    it('戻るボタンでナビゲーションが実行される', async () => {
      render(<CaseForm />);

      const backButton = await screen.findByRole('button', { name: /戻る/ });
      await userEvent.click(backButton);

      expect(mockRouter.back).toHaveBeenCalled();
    });

    it('保存中は保存ボタンが無効化される', async () => {
      // 保存処理を遅延させる
      (api.createCase as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<CaseForm />);

      const titleInput = await screen.findByLabelText(/案件名/);
      await userEvent.type(titleInput, 'Test Case');

      const templateSelect = screen.getByLabelText(/プロセステンプレート/);
      await userEvent.selectOptions(templateSelect, '1');

      const saveButton = screen.getByRole('button', { name: /保存/ });
      await userEvent.click(saveButton);

      // 保存中の状態を確認
      await waitFor(() => {
        expect(screen.getByText(/保存中/)).toBeInTheDocument();
        expect(saveButton).toBeDisabled();
      });
    });
  });
});