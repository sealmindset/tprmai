/**
 * CARA - Critical Assessment & Risk Analyzer Agent
 *
 * Purpose: Performs deep-dive assessments on Critical and High-risk vendors
 *
 * Responsibilities:
 * - Execute detailed risk assessments for high-risk vendors
 * - Evaluate business continuity and disaster recovery capabilities
 * - Assess financial stability indicators
 * - Review geographic and geopolitical risks
 * - Analyze concentration risk and vendor dependencies
 */

import { BaseAgent } from './base-agent'
import prisma from '@/lib/db'
import type { AgentConfig, AgentResult, AssessmentInput, AssessmentOutput } from './types'

const CARA_CONFIG: AgentConfig = {
  name: 'CARA',
  description: 'Critical Assessment & Risk Analyzer Agent',
  tier: 'complex',
  temperature: 0.3,
  maxTokens: 3000,
}

export class CARAAgent extends BaseAgent {
  constructor() {
    super(CARA_CONFIG)
  }

  protected getSystemPrompt(): string {
    return `You are CARA (Critical Assessment & Risk Analyzer Agent), an AI specialist in conducting detailed vendor risk assessments for Sleep Number Corporation.

Your role is to perform comprehensive risk assessments across multiple dimensions:

1. Security Risk (1-5 scale)
   - Information security posture
   - Data protection capabilities
   - Incident response readiness
   - Access control mechanisms

2. Operational Risk (1-5 scale)
   - Service delivery reliability
   - Business continuity planning
   - Disaster recovery capabilities
   - Change management processes

3. Compliance Risk (1-5 scale)
   - Regulatory compliance status
   - Audit findings and remediation
   - Policy and procedure maturity
   - Industry certifications

4. Financial Risk (1-5 scale)
   - Financial stability
   - Insurance coverage
   - Contractual protections
   - Market position

5. Reputational Risk (1-5 scale)
   - Public perception
   - Past incidents
   - Media coverage
   - Industry reputation

6. Strategic Risk (1-5 scale)
   - Vendor viability
   - Technology roadmap alignment
   - Concentration risk
   - Dependency analysis

Overall Risk Rating Calculation:
- Average of all scores, weighted by data sensitivity
- Map to tier: 4-5 = CRITICAL, 3-4 = HIGH, 2-3 = MEDIUM, 1-2 = LOW

Provide detailed, actionable assessments with specific recommendations.`
  }

  async execute(input: AssessmentInput): Promise<AgentResult<AssessmentOutput>> {
    const startTime = Date.now()

    try {
      const prompt = `Conduct a comprehensive risk assessment for the following vendor:

Vendor Information:
- Vendor ID: ${input.vendorId}
- Name: ${input.vendorInfo.name}
- Industry: ${input.vendorInfo.industry}
- Country: ${input.vendorInfo.country}
- Annual Spend: $${input.vendorInfo.annualSpend.toLocaleString()}

Assessment Type: ${input.assessmentType}
Risk Profile ID: ${input.riskProfileId}

${input.existingFindings?.length ? `Existing Findings from Previous Assessments:\n${input.existingFindings.join('\n')}` : ''}

Provide a detailed assessment in the following JSON format:
{
  "vendorId": "string",
  "securityRiskScore": number (1-5),
  "operationalRiskScore": number (1-5),
  "complianceRiskScore": number (1-5),
  "financialRiskScore": number (1-5),
  "reputationalRiskScore": number (1-5),
  "strategicRiskScore": number (1-5),
  "overallScore": number (1-5),
  "riskRating": "CRITICAL|HIGH|MEDIUM|LOW",
  "summary": "Executive summary of the assessment",
  "recommendations": ["array of specific recommendations"],
  "requiredDocuments": ["array of documents needed for full assessment"]
}`

      const result = await this.invokeWithJSON<AssessmentOutput>(prompt)
      result.vendorId = input.vendorId

      // Convert 1-5 scale to percentage for storage
      const overallPercentage = Math.round((result.overallScore / 5) * 100)

      // Save assessment to database
      const assessment = await prisma.riskAssessment.create({
        data: {
          vendorId: input.vendorId,
          riskProfileId: input.riskProfileId,
          assessmentType: input.assessmentType,
          assessmentStatus: 'COMPLETE',
          assessedBy: 'CARA',
          assessmentDate: new Date(),
          securityRiskScore: result.securityRiskScore,
          operationalRiskScore: result.operationalRiskScore,
          complianceRiskScore: result.complianceRiskScore,
          financialRiskScore: result.financialRiskScore,
          reputationalRiskScore: result.reputationalRiskScore,
          strategicRiskScore: result.strategicRiskScore,
          overallAssessmentScore: overallPercentage,
          riskRating: result.riskRating,
          summary: result.summary,
          recommendations: result.recommendations.join('\n\n'),
        },
      })

      // Log activity
      await this.logActivity({
        activityType: 'RISK_ASSESSMENT',
        entityType: 'Vendor',
        entityId: input.vendorId,
        actionTaken: `Completed ${input.assessmentType} assessment`,
        inputSummary: `Vendor: ${input.vendorInfo.name}, Type: ${input.assessmentType}`,
        outputSummary: `Rating: ${result.riskRating}, Overall Score: ${result.overallScore}/5`,
        status: 'SUCCESS',
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult(true, result, undefined, startTime)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.logActivity({
        activityType: 'RISK_ASSESSMENT',
        entityType: 'Vendor',
        entityId: input.vendorId,
        actionTaken: 'Failed to complete assessment',
        status: 'FAILED',
        errorMessage,
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult<AssessmentOutput>(false, undefined, errorMessage, startTime)
    }
  }
}

export const cara = new CARAAgent()
