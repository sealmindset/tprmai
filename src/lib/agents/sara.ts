/**
 * SARA - Security Analysis & Risk Articulation Agent
 *
 * Purpose: Analyzes security documents to identify key risks to Sleep Number
 *
 * Responsibilities:
 * - Parse and analyze SOC2 reports, penetration tests, and audits
 * - Extract control gaps and exceptions
 * - Map vendor risks to SNBR risk framework
 * - Identify potential compliance violations
 * - Correlate findings across multiple documents
 */

import { BaseAgent } from './base-agent'
import prisma from '@/lib/db'
import type {
  AgentConfig,
  AgentResult,
  SecurityAnalysisInput,
  SecurityAnalysisOutput,
  SecurityFinding,
} from './types'

const SARA_CONFIG: AgentConfig = {
  name: 'SARA',
  description: 'Security Analysis & Risk Articulation Agent',
  tier: 'complex',
  temperature: 0.2,
  maxTokens: 4000,
}

export class SARAAgent extends BaseAgent {
  constructor() {
    super(SARA_CONFIG)
  }

  protected getSystemPrompt(): string {
    return `You are SARA (Security Analysis & Risk Articulation Agent), an AI specialist in analyzing vendor security documentation for Sleep Number Corporation.

Your role is to:
1. Analyze security documents (SOC2 reports, penetration tests, questionnaires)
2. Identify control gaps, exceptions, and security findings
3. Map findings to Sleep Number's risk framework
4. Assess the impact of findings on SNBR's security posture

Sleep Number Risk Framework Categories:
- DATA_PROTECTION: Controls related to data encryption, DLP, classification
- ACCESS_CONTROL: Authentication, authorization, identity management
- NETWORK_SECURITY: Firewalls, segmentation, intrusion detection
- INCIDENT_RESPONSE: Incident handling, breach notification, forensics
- BUSINESS_CONTINUITY: DR, backup, availability
- COMPLIANCE: Regulatory requirements, audit findings
- VENDOR_MANAGEMENT: Subcontractor oversight, fourth-party risk
- PHYSICAL_SECURITY: Data center, office security

Finding Severity Definitions:
- CRITICAL: Immediate threat to SNBR data or systems, requires urgent remediation
- HIGH: Significant security gap that could lead to data breach, remediate within 30 days
- MEDIUM: Moderate risk requiring attention, remediate within 90 days
- LOW: Minor issues or best practice recommendations, remediate within 180 days
- INFORMATIONAL: Observations for awareness, no action required

When analyzing documents:
1. Look for explicit exceptions, qualifications, or deficiencies
2. Identify missing controls that SNBR requires
3. Note any subservice organizations and their audit status
4. Flag any incidents or breaches mentioned
5. Assess the maturity of security controls

Provide specific, actionable findings with clear remediation guidance.`
  }

  async execute(input: SecurityAnalysisInput): Promise<AgentResult<SecurityAnalysisOutput>> {
    const startTime = Date.now()

    try {
      const prompt = `Analyze the following security document for vendor risk findings:

Vendor Context:
- Vendor ID: ${input.vendorId}
- Vendor Name: ${input.vendorContext.name}
- Current Risk Tier: ${input.vendorContext.riskTier}
- Data Access: ${input.vendorContext.dataAccess.join(', ')}

Document Information:
- Document ID: ${input.documentId}
- Document Type: ${input.documentType}

Document Content:
${input.documentContent}

---

Analyze this document and provide findings in the following JSON format:
{
  "vendorId": "string",
  "documentId": "string",
  "findings": [
    {
      "title": "Brief title of the finding",
      "description": "Detailed description of the issue",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFORMATIONAL",
      "category": "Security category",
      "affectedControls": ["list of affected control areas"],
      "snbrRiskMapping": "SNBR risk framework category",
      "sourceReference": "Specific section/page reference in document",
      "recommendedAction": "Specific remediation recommendation"
    }
  ],
  "overallRiskAssessment": "Summary assessment of vendor's security posture based on this document",
  "complianceGaps": ["List of compliance gaps identified"],
  "strengthAreas": ["List of strong security controls noted"]
}`

      const result = await this.invokeWithJSON<SecurityAnalysisOutput>(prompt)
      result.vendorId = input.vendorId
      result.documentId = input.documentId

      // Save findings to database
      for (const finding of result.findings) {
        await prisma.riskFinding.create({
          data: {
            vendorId: input.vendorId,
            documentId: input.documentId,
            findingType: input.documentType,
            findingCategory: finding.category,
            severity: finding.severity as any,
            title: finding.title,
            description: finding.description,
            snbrRiskMapping: finding.snbrRiskMapping,
            affectedControls: JSON.stringify(finding.affectedControls),
            sourceReference: finding.sourceReference,
            identifiedBy: 'SARA',
            identifiedDate: new Date(),
            status: 'OPEN',
            dueDate: this.calculateDueDate(finding.severity),
          },
        })
      }

      // Update document status
      await prisma.document.update({
        where: { id: input.documentId },
        data: {
          status: 'ANALYZED',
          analysisResult: result.overallRiskAssessment,
        },
      })

      await this.logActivity({
        activityType: 'DOCUMENT_ANALYSIS',
        entityType: 'Document',
        entityId: input.documentId,
        actionTaken: `Analyzed ${input.documentType} document`,
        inputSummary: `Vendor: ${input.vendorContext.name}`,
        outputSummary: `Found ${result.findings.length} findings (${result.findings.filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH').length} critical/high)`,
        status: 'SUCCESS',
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult(true, result, undefined, startTime)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.logActivity({
        activityType: 'DOCUMENT_ANALYSIS',
        entityType: 'Document',
        entityId: input.documentId,
        status: 'FAILED',
        errorMessage,
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult<SecurityAnalysisOutput>(false, undefined, errorMessage, startTime)
    }
  }

  private calculateDueDate(severity: string): Date {
    const today = new Date()
    switch (severity) {
      case 'CRITICAL':
        return new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
      case 'HIGH':
        return new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
      case 'MEDIUM':
        return new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 days
      case 'LOW':
        return new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000) // 180 days
      default:
        return new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000) // 1 year
    }
  }

  async analyzeMultipleDocuments(
    vendorId: string,
    documents: { id: string; type: string; content: string }[]
  ): Promise<AgentResult<{ vendorId: string; totalFindings: number; summary: string }>> {
    const startTime = Date.now()

    try {
      // Get vendor context
      const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
        include: {
          riskProfiles: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      })

      if (!vendor) {
        throw new Error('Vendor not found')
      }

      const context = {
        name: vendor.name,
        riskTier: vendor.riskProfiles[0]?.riskTier || 'MEDIUM',
        dataAccess: JSON.parse(vendor.riskProfiles[0]?.dataTypesAccessed || '[]') as string[],
      }

      let totalFindings = 0

      // Analyze each document
      for (const doc of documents) {
        const result = await this.execute({
          vendorId,
          documentId: doc.id,
          documentType: doc.type,
          documentContent: doc.content,
          vendorContext: context,
        })

        if (result.success && result.data) {
          totalFindings += result.data.findings.length
        }
      }

      const summary = `Analyzed ${documents.length} documents for ${vendor.name}. Found ${totalFindings} total findings.`

      return this.createResult(
        true,
        { vendorId, totalFindings, summary },
        undefined,
        startTime
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return this.createResult<{ vendorId: string; totalFindings: number; summary: string }>(false, undefined, errorMessage, startTime)
    }
  }
}

export const sara = new SARAAgent()
