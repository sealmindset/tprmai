import { AzureChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity'
import prisma from '@/lib/db'
import type { AgentConfig, AgentResult, AgentLogEntry } from './types'

// Azure AI Foundry cognitive services scope for token authentication
const AZURE_COGNITIVE_SERVICES_SCOPE = 'https://cognitiveservices.azure.com/.default'

export abstract class BaseAgent {
  protected config: AgentConfig
  private _primaryLLM: AzureChatOpenAI | null = null
  private _fallbackLLM: AzureChatOpenAI | null = null
  private _credential: DefaultAzureCredential | null = null

  constructor(config: AgentConfig) {
    this.config = config
    // Lazy initialization - don't create LLM instances in constructor
    // This allows the build to succeed without being logged into Azure
  }

  private get credential(): DefaultAzureCredential {
    if (!this._credential) {
      // Uses az login, managed identity, or other Azure auth methods
      this._credential = new DefaultAzureCredential()
    }
    return this._credential
  }

  protected get primaryLLM(): AzureChatOpenAI {
    if (!this._primaryLLM) {
      this._primaryLLM = this.initializePrimaryLLM()
    }
    return this._primaryLLM
  }

  protected get fallbackLLM(): AzureChatOpenAI {
    if (!this._fallbackLLM) {
      this._fallbackLLM = this.initializeFallbackLLM()
    }
    return this._fallbackLLM
  }

  private initializePrimaryLLM(): AzureChatOpenAI {
    // Primary: Azure AI Foundry with Claude Opus 4.6
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'claude-opus-4-6'

    console.log(`[${this.config.name}] Initializing primary LLM: endpoint=${endpoint}, deployment=${deploymentName}`)

    if (!endpoint) {
      throw new Error('Azure AI Foundry configuration missing. Please set AZURE_OPENAI_ENDPOINT environment variable and ensure you are logged in via "az login".')
    }

    // Use token provider for Entra ID authentication
    const azureADTokenProvider = getBearerTokenProvider(
      this.credential,
      AZURE_COGNITIVE_SERVICES_SCOPE
    )

    return new AzureChatOpenAI({
      azureADTokenProvider,
      azureOpenAIEndpoint: endpoint,
      azureOpenAIApiDeploymentName: deploymentName,
      azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview',
      // Set model to deployment name to avoid LangChain sending wrong model name
      model: deploymentName,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    })
  }

  private initializeFallbackLLM(): AzureChatOpenAI {
    // Fallback: Azure AI Foundry with Claude Opus 4.5
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT
    const deploymentName = process.env.AZURE_OPENAI_FALLBACK_DEPLOYMENT_NAME || 'claude-opus-4-5'

    console.log(`[${this.config.name}] Initializing fallback LLM: endpoint=${endpoint}, deployment=${deploymentName}`)

    if (!endpoint) {
      throw new Error('Azure AI Foundry configuration missing. Please set AZURE_OPENAI_ENDPOINT environment variable and ensure you are logged in via "az login".')
    }

    // Use token provider for Entra ID authentication
    const azureADTokenProvider = getBearerTokenProvider(
      this.credential,
      AZURE_COGNITIVE_SERVICES_SCOPE
    )

    return new AzureChatOpenAI({
      azureADTokenProvider,
      azureOpenAIEndpoint: endpoint,
      azureOpenAIApiDeploymentName: deploymentName,
      azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview',
      // Set model to deployment name to avoid LangChain sending wrong model name
      model: deploymentName,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    })
  }

  protected abstract getSystemPrompt(): string

  protected async invoke(userPrompt: string): Promise<string> {
    const messages = [
      new SystemMessage(this.getSystemPrompt()),
      new HumanMessage(userPrompt),
    ]

    // Try primary LLM (Claude Opus 4.6) first
    try {
      console.log(`[${this.config.name}] Attempting request with Claude Opus 4.6`)
      const response = await this.primaryLLM.invoke(messages)
      return response.content as string
    } catch (primaryError) {
      console.warn(`[${this.config.name}] Primary LLM (Opus 4.6) failed, falling back to Opus 4.5:`, primaryError)

      // Fallback to Claude Opus 4.5
      try {
        console.log(`[${this.config.name}] Attempting request with Claude Opus 4.5 fallback`)
        const response = await this.fallbackLLM.invoke(messages)
        return response.content as string
      } catch (fallbackError) {
        console.error(`[${this.config.name}] Both primary and fallback LLMs failed`)
        throw fallbackError
      }
    }
  }

  protected async invokeWithJSON<T>(userPrompt: string): Promise<T> {
    const jsonPrompt = `${userPrompt}

IMPORTANT: Respond ONLY with valid JSON. Do not include any text before or after the JSON object.`

    const response = await this.invoke(jsonPrompt)

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }

    return JSON.parse(jsonStr.trim()) as T
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
