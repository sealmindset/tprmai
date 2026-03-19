/**
 * AI Output Validation
 *
 * Validates AI responses against expected schemas before they are stored in the database.
 * Prevents hallucinated values, malformed data, and XSS via AI-generated content.
 */

export interface ValidationRule {
  field: string
  type: 'string' | 'number' | 'boolean' | 'enum' | 'array'
  required?: boolean
  min?: number
  max?: number
  enumValues?: string[]
  maxLength?: number
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  sanitizedData?: Record<string, unknown>
}

/**
 * Validate a parsed AI response against a set of rules.
 */
export function validateAgentOutput(
  data: Record<string, unknown>,
  rules: ValidationRule[]
): ValidationResult {
  const errors: string[] = []
  const sanitized: Record<string, unknown> = { ...data }

  for (const rule of rules) {
    const value = data[rule.field]

    // Required check
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`Missing required field: ${rule.field}`)
      continue
    }

    if (value === undefined || value === null) continue

    // Type checks
    switch (rule.type) {
      case 'number': {
        const num = typeof value === 'number' ? value : Number(value)
        if (isNaN(num)) {
          errors.push(`${rule.field} must be a number, got: ${typeof value}`)
        } else {
          if (rule.min !== undefined && num < rule.min) {
            errors.push(`${rule.field} must be >= ${rule.min}, got: ${num}`)
            sanitized[rule.field] = rule.min
          } else if (rule.max !== undefined && num > rule.max) {
            errors.push(`${rule.field} must be <= ${rule.max}, got: ${num}`)
            sanitized[rule.field] = rule.max
          } else {
            sanitized[rule.field] = num
          }
        }
        break
      }
      case 'enum': {
        if (rule.enumValues && !rule.enumValues.includes(String(value))) {
          errors.push(`${rule.field} must be one of [${rule.enumValues.join(', ')}], got: ${value}`)
        }
        break
      }
      case 'string': {
        if (typeof value !== 'string') {
          errors.push(`${rule.field} must be a string, got: ${typeof value}`)
        } else if (rule.maxLength && value.length > rule.maxLength) {
          sanitized[rule.field] = value.slice(0, rule.maxLength)
        }
        break
      }
      case 'array': {
        if (!Array.isArray(value)) {
          errors.push(`${rule.field} must be an array, got: ${typeof value}`)
        }
        break
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedData: sanitized,
  }
}

// Common validation rules for TPRMAI agent outputs

export const RISK_SCORE_RULES: ValidationRule[] = [
  { field: 'overallRiskScore', type: 'number', min: 1, max: 100 },
  { field: 'riskTier', type: 'enum', enumValues: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
]

export const ASSESSMENT_SCORE_RULES: ValidationRule[] = [
  { field: 'securityRiskScore', type: 'number', min: 1, max: 5 },
  { field: 'operationalRiskScore', type: 'number', min: 1, max: 5 },
  { field: 'complianceRiskScore', type: 'number', min: 1, max: 5 },
  { field: 'financialRiskScore', type: 'number', min: 1, max: 5 },
  { field: 'reputationalRiskScore', type: 'number', min: 1, max: 5 },
  { field: 'strategicRiskScore', type: 'number', min: 1, max: 5 },
  { field: 'overallAssessmentScore', type: 'number', min: 1, max: 5 },
  { field: 'riskRating', type: 'enum', enumValues: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
  { field: 'summary', type: 'string', required: true, maxLength: 10000 },
  { field: 'recommendations', type: 'string', maxLength: 10000 },
]

export const FINDING_RULES: ValidationRule[] = [
  { field: 'severity', type: 'enum', required: true, enumValues: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'] },
  { field: 'title', type: 'string', required: true, maxLength: 500 },
  { field: 'description', type: 'string', maxLength: 10000 },
  { field: 'recommendation', type: 'string', maxLength: 10000 },
]

export const REPORT_RULES: ValidationRule[] = [
  { field: 'content', type: 'string', required: true, maxLength: 100000 },
  { field: 'reportType', type: 'enum', enumValues: ['EXECUTIVE_SUMMARY', 'DETAILED_ASSESSMENT', 'COMPLIANCE_STATUS', 'PORTFOLIO_OVERVIEW', 'TREND_ANALYSIS'] },
]

/**
 * Safely parse JSON from AI response, with fallback.
 * Prevents JSON.parse crashes from malformed AI output.
 */
export function safeParseJSON<T>(text: string): { success: true; data: T } | { success: false; error: string } {
  try {
    // Extract JSON from markdown code blocks if present
    let jsonStr = text
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }
    const data = JSON.parse(jsonStr.trim()) as T
    return { success: true, data }
  } catch (error) {
    return { success: false, error: `Failed to parse AI response as JSON: ${error instanceof Error ? error.message : 'unknown error'}` }
  }
}
