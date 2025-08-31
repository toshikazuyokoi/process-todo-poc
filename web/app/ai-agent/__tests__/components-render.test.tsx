/**
 * Component Rendering Tests
 * Basic tests to verify all components can render without errors
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import all components
import { ChatInterface } from '../components/chat-interface';
import { MessageList } from '../components/message-list';
import { MessageInput } from '../components/message-input';
import { TypingIndicator } from '../components/typing-indicator';
import { ProgressIndicator } from '../components/progress-indicator';
import { SuggestionButtons, SuggestionChips } from '../components/suggestion-buttons';
import { TemplatePreview } from '../components/template-preview';
import { StepRecommendationCard } from '../components/step-recommendation-card';
import { RequirementsSummary } from '../components/requirements-summary';
import { ConfidenceDisplay } from '../components/confidence-display';
import { TemplateEditor } from '../components/template-editor';

// Mock dependencies
jest.mock('../hooks/use-session-management', () => ({
  useSessionManagement: () => ({
    currentSession: null,
    sessionStatus: 'idle',
    isLoading: false,
    createSession: jest.fn(),
    endSession: jest.fn(),
    getSession: jest.fn(),
    updateSessionStatus: jest.fn(),
  }),
}));

jest.mock('../hooks/use-ai-chat', () => ({
  useAIChat: () => ({
    messages: [],
    isLoadingMessages: false,
    sendMessage: jest.fn(),
    isSending: false,
    isAITyping: false,
    aiTypingStage: null,
    estimatedTime: null,
    handleUserTyping: jest.fn(),
    isConnected: true,
  }),
}));

jest.mock('../hooks/use-template-generation', () => ({
  useTemplateGeneration: () => ({
    isGenerating: false,
    stage: null,
    progress: 0,
    message: null,
    estimatedTimeRemaining: null,
    stepsCompleted: 0,
    totalSteps: 0,
    currentStep: null,
    error: null,
    preview: null,
    startGeneration: jest.fn(),
    cancelGeneration: jest.fn(),
    retryGeneration: jest.fn(),
    isStarting: false,
  }),
}));

jest.mock('../hooks/use-websocket', () => ({
  useAIWebSocket: () => ({
    isConnected: true,
    connectionError: null,
    joinSession: jest.fn(),
    leaveSession: jest.fn(),
    sendMessage: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({ data: null, isLoading: false })),
  useMutation: jest.fn(() => ({ mutate: jest.fn(), isLoading: false })),
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }: any) => children,
}));

describe('Component Rendering Tests', () => {
  const mockTemplate = {
    id: 'test-template',
    sessionId: 'test-session',
    name: 'Test Template',
    description: 'Test Description',
    steps: [],
    metadata: {
      generatedAt: new Date().toISOString(),
      generationTime: 1000,
      confidence: 0.8,
      sources: [],
      version: 1,
      isActive: true,
    },
  };

  it('renders MessageInput without crashing', () => {
    const { container } = render(
      <MessageInput 
        onSendMessage={jest.fn()} 
        onTyping={jest.fn()}
        disabled={false}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders MessageList without crashing', () => {
    const { container } = render(
      <MessageList messages={[]} isLoading={false} />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders TypingIndicator without crashing', () => {
    const { container } = render(<TypingIndicator />);
    expect(container).toBeInTheDocument();
  });

  it('renders ProgressIndicator without crashing', () => {
    const { container } = render(
      <ProgressIndicator isGenerating={false} />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders SuggestionButtons without crashing', () => {
    const { container } = render(
      <SuggestionButtons 
        suggestions={['Test 1', 'Test 2']} 
        onSelect={jest.fn()} 
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders SuggestionChips without crashing', () => {
    const { container } = render(
      <SuggestionChips 
        suggestions={['Test 1', 'Test 2']} 
        onSelect={jest.fn()} 
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders ConfidenceDisplay without crashing', () => {
    const { container } = render(
      <ConfidenceDisplay confidence={0.8} />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders TemplatePreview without crashing', () => {
    const { container } = render(
      <TemplatePreview template={mockTemplate} />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders StepRecommendationCard without crashing', () => {
    const { container } = render(
      <StepRecommendationCard 
        step={{ id: '1', name: 'Test', description: 'Test', duration: 1, dependencies: [] }}
        index={0}
        allSteps={[]}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders RequirementsSummary without crashing', () => {
    const { container } = render(
      <RequirementsSummary requirements={[]} />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders TemplateEditor without crashing', () => {
    const { container } = render(
      <TemplateEditor generatedTemplate={mockTemplate} />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders ChatInterface without crashing', () => {
    const { container } = render(<ChatInterface />);
    expect(container).toBeInTheDocument();
  });
});