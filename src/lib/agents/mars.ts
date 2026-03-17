/**
 * MARS - Management, Action & Remediation Supervisor Agent
 *
 * Purpose: Manages ongoing risk treatment and remediation activities
 *
 * Responsibilities:
 * - Create and track remediation action items
 * - Monitor vendor response and progress
 * - Escalate overdue items and critical risks
 * - Manage risk acceptance workflows
 * - Coordinate vendor meetings and reviews
 * - Track SLA compliance
 */

import { BaseAgent } from './base-agent'
import prisma from '@/lib/db'
import type { AgentConfig, AgentResult, RemediationInput, RemediationPlan } from './types'

const MARS_CONFIG: AgentConfig = {
  name: 'MARS',
  description: 'Management, Action & Remediation Supervisor Agent',
  tier: 'standard',
  temperature: 0.3,
  maxTokens: 3000,
}

interface EscalationResult {
  findingId: string
  escalated: boolean
  escalationLevel: number
  notificationsSent: string[]
  nextAction: string
}

interface RemediationStatus {
  vendorId: string
  totalActions: number
  openActions: number
  overdueActions: number
  completedThisMonth: number
  averageRemediationDays: number
  slaCompliance: number
}

export class MARSAgent extends BaseAgent {
  constructor() {
    super(MARS_CONFIG)
  }

  protected getSystemPrompt(): string {
    return `You are MARS (Management, Action & Remediation Supervisor Agent), an AI specialist in managing vendor risk remediation for Sleep Number Corporation.

Your role is to:
1. Create appropriate remediation action plans for findings
2. Assign ownership (vendor vs internal)
3. Set realistic but firm due dates based on severity
4. Track progress and send reminders
5. Escalate overdue items appropriately
6. Manage risk acceptance workflows

Remediation SLAs by Severity:
- CRITICAL: 7 days (immediate escalation if overdue)
- HIGH: 30 days (escalate after 7 days overdue)
- MEDIUM: 90 days (escalate after 14 days overdue)
- LOW: 180 days (escalate after 30 days overdue)

Action Types:
- REMEDIATE: Vendor must fix the issue
- MITIGATE: Implement compensating controls
- ACCEPT: Document acceptance with justification
- TRANSFER: Transfer risk (insurance, contract)

Escalation Path:
Level 1: Automated reminder to vendor/owner
Level 2: Notification to SNBR risk analyst
Level 3: Notification to risk manager
Level 4: Notification to CISO/leadership

Always be professional but firm in communications. Document everything thoroughly.`
  }

  async execute(input: RemediationInput): Promise<AgentResult<RemediationPlan>> {
    const startTime = Date.now()

    try {
      const prompt = `Create a remediation plan for the following finding:

Finding Information:
- Finding ID: ${input.findingId}
- Title: ${input.finding.title}
- Severity: ${input.finding.severity}
- Description: ${input.finding.description}

Vendor Information:
- Vendor ID: ${input.vendorId}
- Contact Name: ${input.vendorContact.name}
- Contact Email: ${input.vendorContact.email}

Create a remediation plan in the following JSON format:
{
  "findingId": "string",
  "actions": [
    {
      "title": "Action title",
      "description": "Detailed description of required action",
      "actionType": "REMEDIATE|MITIGATE|ACCEPT|TRANSFER",
      "priority": "CRITICAL|HIGH|MEDIUM|LOW",
      "dueDate": "YYYY-MM-DD",
      "assignedTo": "Name/role of assignee",
      "ownerType": "VENDOR|INTERNAL"
    }
  ],
  "timeline": "Overall timeline description",
  "escalationPath": ["Level 1 contact", "Level 2 contact", "Level 3 contact"]
}`

      const result = await this.invokeWithJSON<RemediationPlan>(prompt)
      result.findingId = input.findingId

      // Save remediation actions to database
      for (const action of result.actions) {
        await prisma.remediationAction.create({
          data: {
            findingId: input.findingId,
            vendorId: input.vendorId,
            actionType: action.actionType as any,
            title: action.title,
            description: action.description,
            assignedTo: action.assignedTo,
            ownerType: action.ownerType as any,
            priority: action.priority as any,
            status: 'OPEN',
            dueDate: new Date(action.dueDate),
            managedBy: 'MARS',
          },
        })
      }

      // Update finding status
      await prisma.riskFinding.update({
        where: { id: input.findingId },
        data: { status: 'IN_REMEDIATION' },
      })

      // Create notification for vendor
      await prisma.notification.create({
        data: {
          recipientType: 'VENDOR',
          recipientId: input.vendorId,
          notificationType: 'REMEDIATION_REQUIRED',
          title: `Remediation Required: ${input.finding.title}`,
          message: `A ${input.finding.severity} severity finding requires your attention. Please review and address within the specified timeline.`,
          relatedEntityType: 'RiskFinding',
          relatedEntityId: input.findingId,
          sentBy: 'MARS',
          status: 'PENDING',
        },
      })

      await this.logActivity({
        activityType: 'REMEDIATION_PLAN',
        entityType: 'RiskFinding',
        entityId: input.findingId,
        actionTaken: `Created remediation plan with ${result.actions.length} actions`,
        inputSummary: `Finding: ${input.finding.title}`,
        outputSummary: `Actions: ${result.actions.map((a) => a.actionType).join(', ')}`,
        status: 'SUCCESS',
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult(true, result, undefined, startTime)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.logActivity({
        activityType: 'REMEDIATION_PLAN',
        entityType: 'RiskFinding',
        entityId: input.findingId,
        status: 'FAILED',
        errorMessage,
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult<RemediationPlan>(false, undefined, errorMessage, startTime)
    }
  }

  async checkOverdueActions(): Promise<AgentResult<EscalationResult[]>> {
    const startTime = Date.now()

    try {
      const overdueActions = await prisma.remediationAction.findMany({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          dueDate: { lt: new Date() },
        },
        include: {
          finding: true,
          vendor: true,
        },
      })

      const escalationResults: EscalationResult[] = []

      for (const action of overdueActions) {
        const daysOverdue = Math.floor(
          (Date.now() - action.dueDate!.getTime()) / (24 * 60 * 60 * 1000)
        )

        let escalationLevel = 1
        if (action.priority === 'CRITICAL' || daysOverdue > 30) {
          escalationLevel = 4
        } else if (action.priority === 'HIGH' || daysOverdue > 14) {
          escalationLevel = 3
        } else if (daysOverdue > 7) {
          escalationLevel = 2
        }

        // Update action status
        await prisma.remediationAction.update({
          where: { id: action.id },
          data: { status: 'OVERDUE' },
        })

        // Create escalation notification
        await prisma.notification.create({
          data: {
            recipientType: 'INTERNAL',
            notificationType: 'ESCALATION',
            title: `[ESCALATION L${escalationLevel}] Overdue Action: ${action.title}`,
            message: `Remediation action for ${action.vendor.name} is ${daysOverdue} days overdue. Priority: ${action.priority}`,
            relatedEntityType: 'RemediationAction',
            relatedEntityId: action.id,
            sentBy: 'MARS',
            status: 'PENDING',
          },
        })

        escalationResults.push({
          findingId: action.findingId,
          escalated: true,
          escalationLevel,
          notificationsSent: [`Level ${escalationLevel} escalation`],
          nextAction: `Review and follow up within ${24 / escalationLevel} hours`,
        })
      }

      await this.logActivity({
        activityType: 'OVERDUE_CHECK',
        actionTaken: `Checked overdue actions, escalated ${escalationResults.length}`,
        outputSummary: `Found ${overdueActions.length} overdue actions`,
        status: 'SUCCESS',
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult(true, escalationResults, undefined, startTime)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return this.createResult<EscalationResult[]>(false, undefined, errorMessage, startTime)
    }
  }

  async getVendorRemediationStatus(vendorId: string): Promise<AgentResult<RemediationStatus>> {
    const startTime = Date.now()

    try {
      const [actions, completedRecent] = await Promise.all([
        prisma.remediationAction.findMany({
          where: { vendorId },
        }),
        prisma.remediationAction.findMany({
          where: {
            vendorId,
            status: 'CLOSED',
            completionDate: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ])

      const openActions = actions.filter((a) =>
        ['OPEN', 'IN_PROGRESS', 'PENDING_VERIFICATION'].includes(a.status)
      )
      const overdueActions = actions.filter(
        (a) => a.dueDate && a.dueDate < new Date() && a.status !== 'CLOSED'
      )
      const closedActions = actions.filter((a) => a.status === 'CLOSED' && a.completionDate)

      // Calculate average remediation time
      let avgDays = 0
      if (closedActions.length > 0) {
        const totalDays = closedActions.reduce((sum, a) => {
          const days = Math.floor(
            (a.completionDate!.getTime() - a.createdAt.getTime()) / (24 * 60 * 60 * 1000)
          )
          return sum + days
        }, 0)
        avgDays = Math.round(totalDays / closedActions.length)
      }

      // Calculate SLA compliance
      const onTimeActions = closedActions.filter(
        (a) => a.completionDate! <= (a.dueDate || a.completionDate!)
      )
      const slaCompliance =
        closedActions.length > 0
          ? Math.round((onTimeActions.length / closedActions.length) * 100)
          : 100

      const result: RemediationStatus = {
        vendorId,
        totalActions: actions.length,
        openActions: openActions.length,
        overdueActions: overdueActions.length,
        completedThisMonth: completedRecent.length,
        averageRemediationDays: avgDays,
        slaCompliance,
      }

      return this.createResult(true, result, undefined, startTime)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return this.createResult<RemediationStatus>(false, undefined, errorMessage, startTime)
    }
  }

  async processRiskAcceptance(
    findingId: string,
    justification: string,
    approver: string
  ): Promise<AgentResult<{ accepted: boolean; expirationDate: Date }>> {
    const startTime = Date.now()

    try {
      // Update finding status
      await prisma.riskFinding.update({
        where: { id: findingId },
        data: { status: 'ACCEPTED' },
      })

      // Update any related remediation actions
      await prisma.remediationAction.updateMany({
        where: { findingId },
        data: {
          status: 'CLOSED',
          actionType: 'ACCEPT',
          completionDate: new Date(),
          verificationNotes: `Risk accepted by ${approver}. Justification: ${justification}`,
        },
      })

      // Set acceptance expiration (1 year)
      const expirationDate = new Date()
      expirationDate.setFullYear(expirationDate.getFullYear() + 1)

      // Create audit record
      await prisma.auditTrail.create({
        data: {
          agentName: 'MARS',
          action: 'RISK_ACCEPTANCE',
          entityType: 'RiskFinding',
          entityId: findingId,
          newValues: JSON.stringify({
            status: 'ACCEPTED',
            approver,
            justification,
            expirationDate: expirationDate.toISOString(),
          }),
        },
      })

      await this.logActivity({
        activityType: 'RISK_ACCEPTANCE',
        entityType: 'RiskFinding',
        entityId: findingId,
        actionTaken: `Processed risk acceptance, approved by ${approver}`,
        status: 'SUCCESS',
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult(
        true,
        { accepted: true, expirationDate },
        undefined,
        startTime
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return this.createResult<{ accepted: boolean; expirationDate: Date }>(false, undefined, errorMessage, startTime)
    }
  }
}

export const mars = new MARSAgent()
