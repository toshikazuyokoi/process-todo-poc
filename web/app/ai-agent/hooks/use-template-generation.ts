'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/app/lib/api-client';
import { useToast } from '@/app/components/ui/toast';
import { useAIWebSocket } from './use-websocket';
import {
  TemplateGenerationStage,
  GeneratedTemplate,
  AITemplateStartedEvent,
  AITemplateProgressEvent,
  AITemplatePreviewEvent,
  AITemplateCompletedEvent,
  AITemplateFailedEvent,
  AIResearchCompleteEvent,
  TEMPLATE_EVENTS,
} from '../types';

interface TemplateGenerationState {
  isGenerating: boolean;
  stage: TemplateGenerationStage | null;
  progress: number;
  message: string;
  estimatedTimeRemaining?: number;
  stepsCompleted?: number;
  totalSteps?: number;
  currentStep?: string;
  preview?: {
    title: string;
    description: string;
    stepCount: number;
    estimatedDuration: number;
    confidence: number;
    highlights: string[];
  };
  researchResults?: Array<{
    source: string;
    type: string;
    relevance: number;
    summary: string;
    url?: string;
  }>;
  error?: {
    message: string;
    canRetry: boolean;
  };
}

/**
 * Template Generation Management Hook
 * Manages template generation process and real-time updates
 */
export function useTemplateGeneration(sessionId?: string) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const {
    isConnected,
    generateTemplate: wsGenerateTemplate,
    cancelTemplateGeneration: wsCancelTemplate,
    approveTemplate: wsApproveTemplate,
    on,
    off,
  } = useAIWebSocket();

  // Template generation state
  const [generationState, setGenerationState] = useState<TemplateGenerationState>({
    isGenerating: false,
    stage: null,
    progress: 0,
    message: '',
  });

  /**
   * Start template generation
   */
  const startGenerationMutation = useMutation({
    mutationFn: async (options?: {
      includeResearch?: boolean;
      maxSteps?: number;
      targetDuration?: number;
    }) => {
      if (!sessionId) {
        throw new Error('No active session');
      }

      // Send via WebSocket
      if (isConnected) {
        wsGenerateTemplate(sessionId, options);
      }

      // Also trigger via API for persistence
      const { data } = await apiClient.post(`/ai-agent/sessions/${sessionId}/generate-template`, options);
      return data;
    },
    onMutate: () => {
      // Reset state and start generation
      setGenerationState({
        isGenerating: true,
        stage: TemplateGenerationStage.INITIALIZING,
        progress: 0,
        message: 'Starting template generation...',
      });
    },
    onError: (error: any) => {
      setGenerationState(prev => ({
        ...prev,
        isGenerating: false,
        error: {
          message: error.response?.data?.message || 'Failed to start template generation',
          canRetry: true,
        },
      }));

      addToast({
        type: 'error',
        title: 'Template generation failed',
        message: error.response?.data?.message || 'Failed to start template generation',
      });
    },
  });

  /**
   * Cancel template generation
   */
  const cancelGenerationMutation = useMutation({
    mutationFn: async (reason?: string) => {
      if (!sessionId) {
        throw new Error('No active session');
      }

      // Send via WebSocket
      if (isConnected) {
        wsCancelTemplate(sessionId, reason);
      }

      // Also cancel via API
      const { data } = await apiClient.post(`/ai-agent/sessions/${sessionId}/cancel-template`, { reason });
      return data;
    },
    onSuccess: () => {
      setGenerationState({
        isGenerating: false,
        stage: null,
        progress: 0,
        message: '',
      });

      addToast({
        type: 'info',
        title: 'Template generation cancelled',
      });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Failed to cancel',
        message: error.response?.data?.message,
      });
    },
  });

  /**
   * Approve generated template
   */
  const approveTemplateMutation = useMutation({
    mutationFn: async ({ templateId, modifications }: { templateId: string; modifications?: any }) => {
      if (!sessionId) {
        throw new Error('No active session');
      }

      // Send via WebSocket
      if (isConnected) {
        wsApproveTemplate(sessionId, templateId, modifications);
      }

      // Also approve via API
      const { data } = await apiClient.post(`/ai-agent/sessions/${sessionId}/approve-template`, {
        templateId,
        modifications,
      });
      return data;
    },
    onSuccess: (template) => {
      // Cache the approved template
      queryClient.setQueryData(['ai-template', template.id], template);
      queryClient.invalidateQueries({ queryKey: ['ai-templates'] });

      setGenerationState({
        isGenerating: false,
        stage: null,
        progress: 0,
        message: '',
      });

      addToast({
        type: 'success',
        title: 'Template approved',
        message: 'The template has been saved and is ready to use',
      });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Failed to approve template',
        message: error.response?.data?.message,
      });
    },
  });

  /**
   * Handle WebSocket events
   */
  useEffect(() => {
    if (!sessionId) return;

    // Template started
    const handleTemplateStarted = (event: AITemplateStartedEvent) => {
      if (event.sessionId !== sessionId) return;

      setGenerationState(prev => ({
        ...prev,
        isGenerating: true,
        stage: TemplateGenerationStage.INITIALIZING,
        progress: 5,
        message: 'Template generation started',
        totalSteps: event.requirements.count,
      }));

      addToast({
        type: 'info',
        title: 'Template generation started',
        message: `Processing ${event.requirements.count} requirements`,
      });
    };

    // Progress update
    const handleProgress = (event: AITemplateProgressEvent) => {
      if (event.sessionId !== sessionId) return;

      setGenerationState(prev => ({
        ...prev,
        stage: event.stage,
        progress: event.progress,
        message: event.message,
        estimatedTimeRemaining: event.estimatedTimeRemaining,
        stepsCompleted: event.details?.stepsCompleted,
        totalSteps: event.details?.totalSteps,
        currentStep: event.details?.currentStep,
      }));
    };

    // Template preview
    const handlePreview = (event: AITemplatePreviewEvent) => {
      if (event.sessionId !== sessionId) return;

      setGenerationState(prev => ({
        ...prev,
        preview: event.preview,
      }));
    };

    // Template completed
    const handleCompleted = (event: AITemplateCompletedEvent) => {
      if (event.sessionId !== sessionId) return;

      // Cache the generated template
      queryClient.setQueryData(['ai-template', event.templateId], event.template);
      queryClient.invalidateQueries({ queryKey: ['ai-templates'] });

      setGenerationState({
        isGenerating: false,
        stage: null,
        progress: 100,
        message: 'Template generation completed!',
        preview: {
          title: event.template.name,
          description: event.template.description,
          stepCount: event.statistics.stepsGenerated,
          estimatedDuration: event.statistics.estimatedProjectDuration,
          confidence: event.template.metadata.confidence,
          highlights: event.template.metadata.sources,
        },
      });

      addToast({
        type: 'success',
        title: 'Template generated successfully',
        message: `Created ${event.statistics.stepsGenerated} steps based on ${event.statistics.requirementsIncorporated} requirements`,
      });
    };

    // Template failed
    const handleFailed = (event: AITemplateFailedEvent) => {
      if (event.sessionId !== sessionId) return;

      setGenerationState(prev => ({
        ...prev,
        isGenerating: false,
        stage: event.stage,
        error: {
          message: event.error.message,
          canRetry: event.canRetry,
        },
      }));

      addToast({
        type: 'error',
        title: 'Template generation failed',
        message: event.error.message,
      });
    };

    // Research complete
    const handleResearchComplete = (event: AIResearchCompleteEvent) => {
      if (event.sessionId !== sessionId) return;

      setGenerationState(prev => ({
        ...prev,
        researchResults: event.results,
      }));

      addToast({
        type: 'info',
        title: 'Research completed',
        message: `Found ${event.totalResults} relevant resources`,
      });
    };

    // Register event handlers
    on(TEMPLATE_EVENTS.STARTED, handleTemplateStarted);
    on(TEMPLATE_EVENTS.PROGRESS, handleProgress);
    on(TEMPLATE_EVENTS.PREVIEW, handlePreview);
    on(TEMPLATE_EVENTS.COMPLETED, handleCompleted);
    on(TEMPLATE_EVENTS.FAILED, handleFailed);
    on(TEMPLATE_EVENTS.RESEARCH_COMPLETE, handleResearchComplete);

    // Cleanup
    return () => {
      off(TEMPLATE_EVENTS.STARTED, handleTemplateStarted);
      off(TEMPLATE_EVENTS.PROGRESS, handleProgress);
      off(TEMPLATE_EVENTS.PREVIEW, handlePreview);
      off(TEMPLATE_EVENTS.COMPLETED, handleCompleted);
      off(TEMPLATE_EVENTS.FAILED, handleFailed);
      off(TEMPLATE_EVENTS.RESEARCH_COMPLETE, handleResearchComplete);
    };
  }, [sessionId, on, off, queryClient, addToast]);

  /**
   * Start template generation
   */
  const startGeneration = useCallback((options?: {
    includeResearch?: boolean;
    maxSteps?: number;
    targetDuration?: number;
  }) => {
    if (!sessionId) {
      addToast({
        type: 'error',
        title: 'No active session',
        message: 'Please start a session first',
      });
      return;
    }

    if (generationState.isGenerating) {
      addToast({
        type: 'warning',
        title: 'Generation in progress',
        message: 'Please wait for the current generation to complete',
      });
      return;
    }

    return startGenerationMutation.mutate(options);
  }, [sessionId, generationState.isGenerating, startGenerationMutation, addToast]);

  /**
   * Cancel generation
   */
  const cancelGeneration = useCallback((reason?: string) => {
    if (!generationState.isGenerating) return;
    return cancelGenerationMutation.mutate(reason);
  }, [generationState.isGenerating, cancelGenerationMutation]);

  /**
   * Approve template
   */
  const approveTemplate = useCallback((templateId: string, modifications?: any) => {
    return approveTemplateMutation.mutate({ templateId, modifications });
  }, [approveTemplateMutation]);

  /**
   * Retry failed generation
   */
  const retryGeneration = useCallback(() => {
    if (!generationState.error?.canRetry) return;
    
    // Clear error and retry
    setGenerationState(prev => ({ ...prev, error: undefined }));
    return startGeneration();
  }, [generationState.error, startGeneration]);

  return {
    // State
    ...generationState,

    // Actions
    startGeneration,
    cancelGeneration,
    approveTemplate,
    retryGeneration,

    // Loading states
    isStarting: startGenerationMutation.isPending,
    isCancelling: cancelGenerationMutation.isPending,
    isApproving: approveTemplateMutation.isPending,

    // Connection
    isConnected,
  };
}