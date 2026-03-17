/**
 * DORA - Documentation & Outreach Retrieval Agent
 *
 * Purpose: Obtains security documentation from vendors and external sources
 *
 * Responsibilities:
 * - Send automated documentation requests to vendors
 * - Track documentation status and follow-ups
 * - Retrieve external data (SecurityScorecard, BitSight, etc.)
 * - Collect certifications, attestations, and audit reports
 * - Manage document versioning and expiration tracking
 */

import { BaseAgent } from './base-agent'
import prisma from '@/lib/db'
import type { AgentConfig, AgentResult, DocumentRequestInput } from './types'

const DORA_CONFIG: AgentConfig = {
  name: 'DORA',
  description: 'Documentation & Outreach Retrieval Agent',
  tier: 'simple',
  temperature: 0.2,
  maxTokens: 2000,
}

interface DocumentRequestOutput {
  vendorId: string
  requestedDocuments: {
    type: string
    priority: string
    dueDate: string
    status: string
  }[]
  emailSubject: string
  emailBody: string
  followUpSchedule: string[]
}

interface DocumentInventory {
  vendorId: string
  documents: {
    type: string
    status: string
    expirationDate?: string
    completenessScore: number
  }[]
  overallCompletenessScore: number
  missingDocuments: string[]
  expiringDocuments: string[]
}

export class DORAAgent extends BaseAgent {
  constructor() {
    super(DORA_CONFIG)
  }

  protected getSystemPrompt(): string {
    return `You are DORA (Documentation & Outreach Retrieval Agent), an AI specialist in managing vendor security documentation for Sleep Number Corporation.

Your role is to:
1. Generate professional documentation request emails
2. Track document collection progress
3. Identify missing or expiring documents
4. Prioritize document requests based on risk tier

Required Documents by Risk Tier:
CRITICAL:
- SOC 2 Type II Report (annual)
- Penetration Test Report (annual)
- ISO 27001 Certificate
- Business Continuity Plan
- Cyber Insurance Certificate
- SIG Questionnaire

HIGH:
- SOC 2 Type I or II Report
- Vulnerability Assessment
- Security Questionnaire (SIG/CAIQ)
- Insurance Certificate

MEDIUM:
- Security Questionnaire
- Privacy Policy
- Basic Insurance Certificate

LOW:
- Self-attestation
- Privacy Policy

Document Status:
- PENDING: Requested but not received
- RECEIVED: Document received, pending analysis
- ANALYZED: Document has been reviewed
- EXPIRED: Document past expiration date
- REJECTED: Document not accepted (wrong type, incomplete, etc.)

Always be professional and clear in communications.`
  }

  async createDocumentRequest(
    input: DocumentRequestInput
  ): Promise<AgentResult<DocumentRequestOutput>> {
    const startTime = Date.now()

    try {
      const prompt = `Create a documentation request for the following vendor:

Vendor ID: ${input.vendorId}
Vendor Name: ${input.vendorName}
Vendor Email: ${input.vendorEmail}
Required Documents: ${input.requiredDocuments.join(', ')}
Due Date: ${input.dueDate.toISOString().split('T')[0]}

Generate:
1. A professional email requesting these documents
2. Priority level for each document
3. Follow-up schedule

Provide the response in the following JSON format:
{
  "vendorId": "string",
  "requestedDocuments": [
    {
      "type": "document type",
      "priority": "HIGH|MEDIUM|LOW",
      "dueDate": "YYYY-MM-DD",
      "status": "PENDING"
    }
  ],
  "emailSubject": "Subject line for the email",
  "emailBody": "Professional email body requesting documents",
  "followUpSchedule": ["dates for follow-up reminders"]
}`

      const result = await this.invokeWithJSON<DocumentRequestOutput>(prompt)
      result.vendorId = input.vendorId

      // Create document records in database
      for (const doc of result.requestedDocuments) {
        await prisma.document.create({
          data: {
            vendorId: input.vendorId,
            documentType: this.mapDocumentType(doc.type),
            documentName: `${doc.type} - Requested`,
            status: 'PENDING',
            retrievedBy: 'DORA',
            source: 'Vendor Request',
          },
        })
      }

      // Create notification for tracking
      await prisma.notification.create({
        data: {
          recipientType: 'VENDOR',
          recipientId: input.vendorId,
          notificationType: 'DOCUMENT_REQUEST',
          title: result.emailSubject,
          message: result.emailBody,
          sentBy: 'DORA',
          status: 'PENDING',
        },
      })

      await this.logActivity({
        activityType: 'DOCUMENT_REQUEST',
        entityType: 'Vendor',
        entityId: input.vendorId,
        actionTaken: `Created document request for ${input.requiredDocuments.length} documents`,
        inputSummary: `Vendor: ${input.vendorName}`,
        outputSummary: `Requested: ${input.requiredDocuments.join(', ')}`,
        status: 'SUCCESS',
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult(true, result, undefined, startTime)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.logActivity({
        activityType: 'DOCUMENT_REQUEST',
        entityType: 'Vendor',
        entityId: input.vendorId,
        status: 'FAILED',
        errorMessage,
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult<DocumentRequestOutput>(false, undefined, errorMessage, startTime)
    }
  }

  async checkDocumentInventory(vendorId: string): Promise<AgentResult<DocumentInventory>> {
    const startTime = Date.now()

    try {
      // Get all documents for vendor
      const documents = await prisma.document.findMany({
        where: { vendorId },
        orderBy: { uploadDate: 'desc' },
      })

      // Get vendor risk profile for required documents
      const riskProfile = await prisma.riskProfile.findFirst({
        where: { vendorId },
        orderBy: { createdAt: 'desc' },
      })

      const requiredDocs = this.getRequiredDocuments(riskProfile?.riskTier || 'MEDIUM')

      const documentStatus = documents.map((doc) => ({
        type: doc.documentType,
        status: doc.status,
        expirationDate: doc.expirationDate?.toISOString(),
        completenessScore: doc.status === 'ANALYZED' ? 100 : doc.status === 'RECEIVED' ? 50 : 0,
      }))

      const receivedTypes = documents.map((d) => d.documentType)
      const missingDocuments = requiredDocs.filter((req) => !receivedTypes.includes(req))

      const today = new Date()
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      const expiringDocuments = documents
        .filter((d) => d.expirationDate && d.expirationDate <= thirtyDaysFromNow)
        .map((d) => d.documentType)

      const overallScore = requiredDocs.length > 0
        ? Math.round((receivedTypes.length / requiredDocs.length) * 100)
        : 100

      const result: DocumentInventory = {
        vendorId,
        documents: documentStatus,
        overallCompletenessScore: overallScore,
        missingDocuments,
        expiringDocuments,
      }

      await this.logActivity({
        activityType: 'INVENTORY_CHECK',
        entityType: 'Vendor',
        entityId: vendorId,
        actionTaken: 'Checked document inventory',
        outputSummary: `Completeness: ${overallScore}%, Missing: ${missingDocuments.length}`,
        status: 'SUCCESS',
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult(true, result, undefined, startTime)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return this.createResult<DocumentInventory>(false, undefined, errorMessage, startTime)
    }
  }

  private getRequiredDocuments(riskTier: string): string[] {
    switch (riskTier) {
      case 'CRITICAL':
        return [
          'SOC2_TYPE2',
          'PENTEST',
          'ISO27001',
          'BUSINESS_CONTINUITY',
          'INSURANCE_CERTIFICATE',
          'SIG_QUESTIONNAIRE',
        ]
      case 'HIGH':
        return ['SOC2_TYPE2', 'VULNERABILITY_SCAN', 'SIG_QUESTIONNAIRE', 'INSURANCE_CERTIFICATE']
      case 'MEDIUM':
        return ['CUSTOM_QUESTIONNAIRE', 'PRIVACY_POLICY', 'INSURANCE_CERTIFICATE']
      default:
        return ['CUSTOM_QUESTIONNAIRE', 'PRIVACY_POLICY']
    }
  }

  private mapDocumentType(type: string): any {
    const typeMap: Record<string, string> = {
      'SOC 2 Type II': 'SOC2_TYPE2',
      'SOC 2 Type I': 'SOC2_TYPE1',
      'Penetration Test': 'PENTEST',
      'ISO 27001': 'ISO27001',
      'Vulnerability Assessment': 'VULNERABILITY_SCAN',
      'SIG Questionnaire': 'SIG_QUESTIONNAIRE',
      'CAIQ': 'CAIQ',
      'Business Continuity Plan': 'BUSINESS_CONTINUITY',
      'Insurance Certificate': 'INSURANCE_CERTIFICATE',
      'Privacy Policy': 'PRIVACY_POLICY',
    }
    return typeMap[type] || 'OTHER'
  }

  async execute(input: DocumentRequestInput): Promise<AgentResult<DocumentRequestOutput>> {
    return this.createDocumentRequest(input)
  }
}

export const dora = new DORAAgent()
