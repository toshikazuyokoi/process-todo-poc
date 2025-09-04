import { Injectable } from '@nestjs/common';

@Injectable()
export class HistoryAssembler {
  async build(sessionId: string, options: { windowSize: number; maxTokensBudget?: number }): Promise<any[]> {
    // Stub implementation per PR1 (no logic yet)
    return [];
  }
}

