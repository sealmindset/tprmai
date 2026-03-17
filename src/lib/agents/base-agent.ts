import { complete, completeJSON } from '@/lib/ai/provider'
import prisma from '@/lib/db'
import type { AgentConfig, AgentResult, AgentLogEntry } from './types'

export abstract class BaseAgent {
  protected config: AgentConfig

  constructor(config: AgentConfig) {
    this.config = config
  }

  protected abstract getSystemPrompt(): string

  protected async invoke(userPrompt: string): Promise<string> {
    console.log(`[${this.config.name}] Sending request (tier: ${this.config.tier})`)

    const result = await complete(this.getSystemPrompt(), userPrompt, {
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      tier: this.config.tier,
    })

    return result
  }

  protected async invokeWithJSON<T>(userPrompt: string): Promise<T> {
    console.log(`[${this.config.name}] Sending JSON request (tier: ${this.config.tier})`)

    return completeJSON<T>(this.getSystemPrompt(), userPrompt, {
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      tier: this.config.tier,
    })
  }

  protected async logActivity(entry: Omit<AgentLogEntry, 'agentName'>): Promise<void> {
    try {
      await prisma.agentActivityLog.create({
        data: {
          agentName: this.config.name,
          activityType: entry.activityType,
          entityType: entry.entityType,
          entityId: entry.entityId,
          actionTaken: entry.actionTaken,
          inputSummary: entry.inputSummary,
          outputSummary: entry.outputSummary,
          status: entry.status,
          errorMessage: entry.errorMessage,
          processingTimeMs: entry.processingTimeMs,
        },
      })
    } catch (error) {
      console.error(`Failed to log agent activity for ${this.config.name}:`, error)
    }
  }

  protected createResult<T>(
    success: boolean,
    data: T | undefined,
    error: string | undefined,
    startTime: number
  ): AgentResult<T> {
    return {
      success,
      data,
      error,
      agentName: this.config.name,
      processingTimeMs: Date.now() - startTime,
      timestamp: new Date(),
    }
  }

  abstract execute(input: unknown): Promise<AgentResult>
}
