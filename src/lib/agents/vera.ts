/**
 * VERA - Vendor Evaluation & Risk Assessment Agent
 *
 * Purpose: Collects and processes vendor information to determine initial risk profile
 *
 * Responsibilities:
 * - Gather vendor demographic and business information
 * - Collect data access and integration details
 * - Assess vendor criticality to business operations
 * - Calculate initial risk tier (Critical, High, Medium, Low)
 * - Identify regulatory compliance requirements
 */

import { BaseAgent } from './base-agent'
import prisma from '@/lib/db'
import type {
  AgentConfig,
  AgentResult,
  VendorProfileInput,
  VendorProfileOutput,
} from './types'

const VERA_CONFIG: AgentConfig = {
  name: 'VERA',
  description: 'Vendor Evaluation & Risk Assessment Agent',
  tier: 'standard',
  temperature: 0.3,
  maxTokens: 2000,
}

export class VERAAgent extends BaseAgent {
  constructor() {
    super(VERA_CONFIG)
  }

  protected getDefaultSystemPrompt(): string {
    return `You are VERA (Vendor Evaluation & Risk Assessment Agent), an AI specialist in third-party vendor risk profiling for Sleep Number Corporation.

Your role is to analyze vendor information and determine their risk profile based on:
1. Data sensitivity - What types of data will the vendor access (PII, PHI, PCI, proprietary)
2. System integration depth - How deeply integrated will the vendor be with SNBR systems
3. Business criticality - How critical is this vendor to business operations
4. Regulatory requirements - What compliance frameworks apply (SOC2, HIPAA, PCI-DSS, etc.)
5. Financial exposure - Annual spend and contract value

Risk Tier Definitions:
- CRITICAL (80-100): Mission-critical vendors with access to highly sensitive data
- HIGH (60-79): Important vendors with significant data access or system integration
- MEDIUM (40-59): Standard vendors with moderate risk factors
- LOW (0-39): Low-risk vendors with minimal data access

Assessment Frequency by Tier:
- CRITICAL: Quarterly review
- HIGH: Semi-annual review
- MEDIUM: Annual review
- LOW: Biennial review

Always provide specific, actionable recommendations for risk management.`
  }

  async execute(input: VendorProfileInput): Promise<AgentResult<VendorProfileOutput>> {
    const startTime = Date.now()

    try {
      const prompt = `Analyze the following vendor and create a risk profile:

Vendor Information:
- Vendor ID: ${input.vendorId}
- Name: ${input.vendorName}
- Industry: ${input.industry || 'Not specified'}
- Annual Spend: $${input.annualSpend?.toLocaleString() || 'Not specified'}

Data Access:
- Data Types Accessed: ${input.dataTypesAccessed.join(', ') || 'None specified'}
- System Integrations: ${input.systemIntegrations.join(', ') || 'None specified'}
- Has PII Access: ${input.hasPiiAccess}
- Has PHI Access: ${input.hasPhiAccess}
- Has PCI Access: ${input.hasPciAccess}

Business Context:
- Business Criticality: ${input.businessCriticality}
${input.additionalContext ? `- Additional Context: ${input.additionalContext}` : ''}

Provide a risk assessment in the following JSON format:
{
  "vendorId": "string",
  "riskTier": "CRITICAL|HIGH|MEDIUM|LOW",
  "overallRiskScore": number (0-100),
  "dataSensitivityLevel": "string",
  "assessmentFrequency": "Quarterly|Semi-Annual|Annual|Biennial",
  "nextAssessmentDate": "YYYY-MM-DD",
  "riskFactors": ["array of identified risk factors"],
  "recommendations": ["array of specific recommendations"]
}`

      const result = await this.invokeWithJSON<VendorProfileOutput>(prompt)

      // Calculate next assessment date based on frequency
      const today = new Date()
      let nextDate = new Date(today)
      switch (result.assessmentFrequency) {
        case 'Quarterly':
          nextDate.setMonth(today.getMonth() + 3)
          break
        case 'Semi-Annual':
          nextDate.setMonth(today.getMonth() + 6)
          break
        case 'Annual':
          nextDate.setFullYear(today.getFullYear() + 1)
          break
        default:
          nextDate.setFullYear(today.getFullYear() + 2)
      }
      result.nextAssessmentDate = nextDate
      result.vendorId = input.vendorId

      // Save risk profile to database
      await prisma.riskProfile.create({
        data: {
          vendorId: input.vendorId,
          riskTier: result.riskTier,
          overallRiskScore: result.overallRiskScore,
          dataSensitivityLevel: result.dataSensitivityLevel,
          dataTypesAccessed: JSON.stringify(input.dataTypesAccessed),
          systemIntegrations: JSON.stringify(input.systemIntegrations),
          hasPiiAccess: input.hasPiiAccess,
          hasPhiAccess: input.hasPhiAccess,
          hasPciAccess: input.hasPciAccess,
          businessCriticality: input.businessCriticality as any,
          assessmentFrequency: result.assessmentFrequency,
          nextAssessmentDate: result.nextAssessmentDate,
          calculatedBy: 'VERA',
        },
      })

      // Log activity
      await this.logActivity({
        activityType: 'RISK_PROFILING',
        entityType: 'Vendor',
        entityId: input.vendorId,
        actionTaken: `Created risk profile with tier: ${result.riskTier}`,
        inputSummary: `Vendor: ${input.vendorName}`,
        outputSummary: `Risk Score: ${result.overallRiskScore}, Tier: ${result.riskTier}`,
        status: 'SUCCESS',
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult(true, result, undefined, startTime)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.logActivity({
        activityType: 'RISK_PROFILING',
        entityType: 'Vendor',
        entityId: input.vendorId,
        actionTaken: 'Failed to create risk profile',
        inputSummary: `Vendor: ${input.vendorName}`,
        status: 'FAILED',
        errorMessage,
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult<VendorProfileOutput>(false, undefined, errorMessage, startTime)
    }
  }
}

export const vera = new VERAAgent()
