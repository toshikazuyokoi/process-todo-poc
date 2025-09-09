import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  AIClientInterface,
  AIContext,
  AIResponse,
  TemplateContext,
  TemplateRecommendation,
  Entity,
  Intent,
} from './ai-client.interface';

@Injectable()
export class OpenAIService implements AIClientInterface {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly openai: OpenAI | null;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly temperature: number;
  private rateLimitMap: Map<number, { count: number; resetTime: Date }> = new Map();

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    // APIキーがない場合はログ出力のみ（エラーは投げない）
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured. OpenAI features will be disabled.');
      this.openai = null; // 明示的にnull設定
    } else {
      this.openai = new OpenAI({
        apiKey,
      });
    }

    this.model = this.configService.get<string>('OPENAI_MODEL', 'gpt-4-turbo-preview');
    this.maxTokens = this.configService.get<number>('OPENAI_MAX_TOKENS', 2000);
    this.temperature = this.configService.get<number>('OPENAI_TEMPERATURE', 0.7);
  }

  async generateResponse(prompt: string, context: AIContext, overrideSystemPrompt?: string): Promise<AIResponse> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Please configure OPENAI_API_KEY.');
    }
    
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: overrideSystemPrompt ?? this.buildSystemPrompt(context),
        },
      ];

      if (context.previousMessages) {
        messages.push(...context.previousMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })));
      }

      messages.push({
        role: 'user',
        content: prompt,
      });

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      });

      const response = completion.choices[0];
      const usage = completion.usage;

      return {
        content: response.message?.content || '',
        confidence: this.calculateConfidence(response),
        metadata: {
          model: completion.model,
          tokensUsed: usage?.total_tokens,
          finishReason: response.finish_reason,
        },
      };
    } catch (error) {
      this.logger.error('Failed to generate response', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async generateTemplate(
    requirements: any[],
    context: TemplateContext,
  ): Promise<TemplateRecommendation> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Please configure OPENAI_API_KEY.');
    }
    
    try {
      const prompt = this.buildTemplateGenerationPrompt(requirements, context);
      
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert in process template creation. Generate structured templates based on requirements.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: this.maxTokens * 2,
        response_format: { type: 'json_object' },
      });

      const response = completion.choices[0].message?.content;
      if (!response) {
        throw new Error('No template generated');
      }

      const template = JSON.parse(response);
      
      return {
        name: template.name,
        description: template.description,
        steps: template.steps,
        confidence: template.confidence || 0.8,
        reasoning: template.reasoning || 'Generated based on provided requirements',
        metadata: {
          model: completion.model,
          tokensUsed: completion.usage?.total_tokens,
        },
      };
    } catch (error) {
      this.logger.error('Failed to generate template', error);
      throw new Error('Failed to generate template');
    }
  }

  async extractEntities(text: string): Promise<Entity[]> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Please configure OPENAI_API_KEY.');
    }
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Extract entities from the text. Return as JSON array with type, value, and confidence.',
          },
          {
            role: 'user',
            content: `Extract entities from: "${text}"`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });

      const response = completion.choices[0].message?.content;
      if (!response) {
        return [];
      }

      const result = JSON.parse(response);
      return result.entities || [];
    } catch (error) {
      this.logger.error('Failed to extract entities', error);
      return [];
    }
  }

  async classifyIntent(message: string): Promise<Intent> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Please configure OPENAI_API_KEY.');
    }
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Classify the intent of the message. Return JSON with type and confidence.
            Types: create_template, modify_template, ask_question, provide_information, clarify, other`,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const response = completion.choices[0].message?.content;
      if (!response) {
        return { type: 'other', confidence: 0 };
      }

      const result = JSON.parse(response);
      return {
        type: result.type || 'other',
        confidence: result.confidence || 0,
        entities: result.entities,
      };
    } catch (error) {
      this.logger.error('Failed to classify intent', error);
      return { type: 'other', confidence: 0 };
    }
  }

  async summarizeText(text: string, maxLength: number = 500): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Please configure OPENAI_API_KEY.');
    }
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Summarize the following text in ${maxLength} characters or less.`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.5,
        max_tokens: Math.min(maxLength, this.maxTokens),
      });

      return completion.choices[0].message?.content || '';
    } catch (error) {
      this.logger.error('Failed to summarize text', error);
      throw new Error('Failed to summarize text');
    }
  }

  async validateResponse(response: string): Promise<boolean> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Please configure OPENAI_API_KEY.');
    }
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Check if the response is appropriate, safe, and relevant. Return JSON with valid (boolean) and reason.',
          },
          {
            role: 'user',
            content: response,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0].message?.content || '{}');
      return result.valid === true;
    } catch (error) {
      this.logger.error('Failed to validate response', error);
      return false;
    }
  }

  estimateTokens(text: string): number {
    // Simple estimation: ~4 characters per token for English
    // This is a rough estimate; actual tokenization is more complex
    return Math.ceil(text.length / 4);
  }

  async checkRateLimit(userId: number): Promise<boolean> {
    const now = new Date();
    const userLimit = this.rateLimitMap.get(userId);

    if (!userLimit || userLimit.resetTime < now) {
      // Reset or initialize rate limit
      this.rateLimitMap.set(userId, {
        count: 1,
        resetTime: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour window
      });
      return true;
    }

    const maxRequests = this.configService.get<number>('OPENAI_RATE_LIMIT_PER_USER', 100);
    if (userLimit.count >= maxRequests) {
      return false;
    }

    userLimit.count++;
    return true;
  }

  private buildSystemPrompt(context: AIContext): string {
    let prompt = 'You are an AI assistant helping with process template creation.';

    if (context.industry) {
      prompt += ` The user works in the ${context.industry} industry.`;
    }

    if (context.processType) {
      prompt += ` They are creating a template for ${context.processType}.`;
    }

    prompt += ' Provide helpful, accurate, and contextual responses.';
    return prompt;
  }

  private buildTemplateGenerationPrompt(requirements: any[], context: TemplateContext): string {
    return JSON.stringify({
      instruction: 'Generate a process template based on the following requirements and context.',
      requirements: requirements,
      context: {
        industry: context.industry,
        processType: context.processType,
        complexity: context.complexity,
        constraints: context.constraints,
        preferences: context.preferences,
      },
      format: {
        name: 'Template name',
        description: 'Template description',
        steps: [
          {
            name: 'Step name',
            description: 'Step description',
            duration: 'Duration in days',
            dependencies: ['Array of dependency step names'],
            requiredArtifacts: ['Array of required artifacts'],
          },
        ],
        confidence: 'Confidence score 0-1',
        reasoning: 'Explanation of the template generation',
      },
    });
  }

  private calculateConfidence(response: OpenAI.Chat.ChatCompletion.Choice): number {
    // Calculate confidence based on finish reason and other factors
    if (response.finish_reason === 'stop') {
      return 0.9;
    } else if (response.finish_reason === 'length') {
      return 0.7;
    } else {
      return 0.5;
    }
  }
}