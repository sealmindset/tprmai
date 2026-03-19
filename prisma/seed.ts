import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ============================================
// Resources and their CRUD permissions
// ============================================

const APP_RESOURCES = [
  'dashboard',
  'vendors',
  'assessments',
  'documents',
  'findings',
  'reports',
  'agents',
  'settings',
  'prompts',
]

const SYSTEM_RESOURCES = ['users', 'roles']

const ACTIONS = ['view', 'create', 'edit', 'delete']

// ============================================
// System Roles and their permission levels
// ============================================

interface RoleDef {
  name: string
  description: string
  permissions: (resource: string, action: string) => boolean
}

const SYSTEM_ROLES: RoleDef[] = [
  {
    name: 'ADMIN',
    description: 'Full system access including user and role management',
    permissions: () => true,
  },
  {
    name: 'ANALYST',
    description: 'Can manage vendors, assessments, findings, and reports',
    permissions: (resource) => {
      if (['users', 'roles', 'prompts'].includes(resource)) return false
      return true
    },
  },
  {
    name: 'VIEWER',
    description: 'Read-only access to dashboards and reports',
    permissions: (_resource, action) => {
      if (['users', 'roles', 'prompts'].includes(_resource)) return false
      return action === 'view'
    },
  },
  {
    name: 'VENDOR',
    description: 'Limited access for external vendor contacts',
    permissions: (resource, action) => {
      if (['dashboard', 'documents'].includes(resource)) return true
      if (['vendors', 'assessments', 'findings'].includes(resource))
        return action === 'view'
      return false
    },
  },
]

// ============================================
// Seed Users (match mock-oidc subjects)
// ============================================

const SEED_USERS = [
  {
    email: 'admin@tprmai.local',
    name: 'TPRM Administrator',
    oidcSubject: 'admin-001',
    roleName: 'ADMIN',
    department: 'Information Security',
  },
  {
    email: 'analyst@tprmai.local',
    name: 'Risk Analyst',
    oidcSubject: 'analyst-001',
    roleName: 'ANALYST',
    department: 'Third Party Risk Management',
  },
  {
    email: 'viewer@tprmai.local',
    name: 'Compliance Viewer',
    oidcSubject: 'viewer-001',
    roleName: 'VIEWER',
    department: 'Compliance',
  },
  {
    email: 'vendor@tprmai.local',
    name: 'Vendor Contact',
    oidcSubject: 'vendor-001',
    roleName: 'VENDOR',
    department: 'External',
  },
]

// ============================================
// Sample Vendors with realistic TPRM data
// ============================================

interface VendorSeed {
  name: string
  legalName: string
  website: string
  industry: string
  country: string
  stateProvince: string
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone: string
  businessOwner: string
  itOwner: string
  annualSpend: number
  status: string
}

const VENDORS: VendorSeed[] = [
  {
    name: 'Snowflake',
    legalName: 'Snowflake Inc.',
    website: 'https://www.snowflake.com',
    industry: 'Cloud Data Platform',
    country: 'United States',
    stateProvince: 'Montana',
    primaryContactName: 'Alex Chen',
    primaryContactEmail: 'security@snowflake.example.com',
    primaryContactPhone: '555-0101',
    businessOwner: 'VP Data Engineering',
    itOwner: 'Director Cloud Infrastructure',
    annualSpend: 2400000,
    status: 'ACTIVE',
  },
  {
    name: 'Salesforce',
    legalName: 'Salesforce, Inc.',
    website: 'https://www.salesforce.com',
    industry: 'CRM / SaaS',
    country: 'United States',
    stateProvince: 'California',
    primaryContactName: 'Maria Gonzalez',
    primaryContactEmail: 'trust@salesforce.example.com',
    primaryContactPhone: '555-0102',
    businessOwner: 'VP Sales Operations',
    itOwner: 'Director Enterprise Applications',
    annualSpend: 1800000,
    status: 'ACTIVE',
  },
  {
    name: 'CrowdStrike',
    legalName: 'CrowdStrike Holdings, Inc.',
    website: 'https://www.crowdstrike.com',
    industry: 'Cybersecurity',
    country: 'United States',
    stateProvince: 'Texas',
    primaryContactName: 'James Kim',
    primaryContactEmail: 'security@crowdstrike.example.com',
    primaryContactPhone: '555-0103',
    businessOwner: 'CISO',
    itOwner: 'Director Security Operations',
    annualSpend: 950000,
    status: 'ACTIVE',
  },
  {
    name: 'Workday',
    legalName: 'Workday, Inc.',
    website: 'https://www.workday.com',
    industry: 'HR / Finance SaaS',
    country: 'United States',
    stateProvince: 'California',
    primaryContactName: 'Sarah Mitchell',
    primaryContactEmail: 'security@workday.example.com',
    primaryContactPhone: '555-0104',
    businessOwner: 'VP Human Resources',
    itOwner: 'Director HR Systems',
    annualSpend: 1200000,
    status: 'ACTIVE',
  },
  {
    name: 'Stripe',
    legalName: 'Stripe, Inc.',
    website: 'https://www.stripe.com',
    industry: 'Payment Processing',
    country: 'United States',
    stateProvince: 'California',
    primaryContactName: 'David Park',
    primaryContactEmail: 'security@stripe.example.com',
    primaryContactPhone: '555-0105',
    businessOwner: 'VP E-Commerce',
    itOwner: 'Director Payment Systems',
    annualSpend: 320000,
    status: 'ACTIVE',
  },
  {
    name: 'Acme Logistics',
    legalName: 'Acme Logistics LLC',
    website: 'https://www.acmelogistics.example.com',
    industry: 'Supply Chain / Logistics',
    country: 'United States',
    stateProvince: 'Illinois',
    primaryContactName: 'Tom Johnson',
    primaryContactEmail: 'it@acmelogistics.example.com',
    primaryContactPhone: '555-0106',
    businessOwner: 'VP Supply Chain',
    itOwner: 'IT Manager',
    annualSpend: 85000,
    status: 'ACTIVE',
  },
  {
    name: 'CloudSecure Analytics',
    legalName: 'CloudSecure Analytics Corp.',
    website: 'https://www.cloudsecure.example.com',
    industry: 'Security Analytics',
    country: 'United Kingdom',
    stateProvince: 'London',
    primaryContactName: 'Emma Wilson',
    primaryContactEmail: 'compliance@cloudsecure.example.com',
    primaryContactPhone: '555-0107',
    businessOwner: 'Director Security Architecture',
    itOwner: 'Security Engineering Lead',
    annualSpend: 150000,
    status: 'PENDING',
  },
]

// ============================================
// Risk profiles by vendor
// ============================================

interface RiskProfileSeed {
  vendorName: string
  riskTier: string
  overallRiskScore: number
  hasPiiAccess: boolean
  hasPhiAccess: boolean
  hasPciAccess: boolean
  businessCriticality: string
  assessmentFrequency: string
  dataTypesAccessed: string[]
}

const RISK_PROFILES: RiskProfileSeed[] = [
  {
    vendorName: 'Snowflake',
    riskTier: 'CRITICAL',
    overallRiskScore: 78,
    hasPiiAccess: true,
    hasPhiAccess: false,
    hasPciAccess: true,
    businessCriticality: 'MISSION_CRITICAL',
    assessmentFrequency: 'QUARTERLY',
    dataTypesAccessed: ['Customer PII', 'Transaction Data', 'Marketing Analytics'],
  },
  {
    vendorName: 'Salesforce',
    riskTier: 'HIGH',
    overallRiskScore: 62,
    hasPiiAccess: true,
    hasPhiAccess: false,
    hasPciAccess: false,
    businessCriticality: 'BUSINESS_CRITICAL',
    assessmentFrequency: 'SEMI_ANNUAL',
    dataTypesAccessed: ['Customer PII', 'Sales Data', 'Contact Information'],
  },
  {
    vendorName: 'CrowdStrike',
    riskTier: 'HIGH',
    overallRiskScore: 45,
    hasPiiAccess: false,
    hasPhiAccess: false,
    hasPciAccess: false,
    businessCriticality: 'MISSION_CRITICAL',
    assessmentFrequency: 'ANNUAL',
    dataTypesAccessed: ['Endpoint Telemetry', 'Security Logs', 'Threat Intelligence'],
  },
  {
    vendorName: 'Workday',
    riskTier: 'HIGH',
    overallRiskScore: 55,
    hasPiiAccess: true,
    hasPhiAccess: true,
    hasPciAccess: false,
    businessCriticality: 'BUSINESS_CRITICAL',
    assessmentFrequency: 'ANNUAL',
    dataTypesAccessed: ['Employee PII', 'PHI (Benefits)', 'Payroll Data', 'SSN'],
  },
  {
    vendorName: 'Stripe',
    riskTier: 'CRITICAL',
    overallRiskScore: 72,
    hasPiiAccess: true,
    hasPhiAccess: false,
    hasPciAccess: true,
    businessCriticality: 'BUSINESS_CRITICAL',
    assessmentFrequency: 'QUARTERLY',
    dataTypesAccessed: ['Cardholder Data', 'Transaction PII', 'Payment Tokens'],
  },
  {
    vendorName: 'Acme Logistics',
    riskTier: 'LOW',
    overallRiskScore: 22,
    hasPiiAccess: false,
    hasPhiAccess: false,
    hasPciAccess: false,
    businessCriticality: 'STANDARD',
    assessmentFrequency: 'ANNUAL',
    dataTypesAccessed: ['Shipping Addresses', 'Order Numbers'],
  },
  {
    vendorName: 'CloudSecure Analytics',
    riskTier: 'MEDIUM',
    overallRiskScore: 38,
    hasPiiAccess: false,
    hasPhiAccess: false,
    hasPciAccess: false,
    businessCriticality: 'IMPORTANT',
    assessmentFrequency: 'ANNUAL',
    dataTypesAccessed: ['Security Event Logs', 'Network Metadata'],
  },
]

// ============================================
// Sample documents
// ============================================

interface DocSeed {
  vendorName: string
  documentType: string
  documentName: string
  status: string
  retrievedBy: string
  expiresInDays: number | null
  analysisResult: string | null
}

const DOCUMENTS: DocSeed[] = [
  { vendorName: 'Snowflake', documentType: 'SOC2_TYPE2', documentName: 'Snowflake SOC 2 Type II Report 2025', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: 180, analysisResult: 'Clean opinion with no exceptions noted.' },
  { vendorName: 'Snowflake', documentType: 'PENTEST', documentName: 'Snowflake Annual Penetration Test 2025', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: 270, analysisResult: '3 medium findings remediated. No critical or high issues.' },
  { vendorName: 'Snowflake', documentType: 'ISO27001', documentName: 'Snowflake ISO 27001 Certificate', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: 365, analysisResult: 'Valid ISO 27001:2022 certification.' },
  { vendorName: 'Salesforce', documentType: 'SOC2_TYPE2', documentName: 'Salesforce SOC 2 Type II 2025', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: 150, analysisResult: '1 exception noted in change management. Compensating controls in place.' },
  { vendorName: 'Salesforce', documentType: 'ISO27001', documentName: 'Salesforce ISO 27001 Certificate', status: 'RECEIVED', retrievedBy: 'DORA', expiresInDays: 300, analysisResult: null },
  { vendorName: 'CrowdStrike', documentType: 'SOC2_TYPE2', documentName: 'CrowdStrike SOC 2 Type II 2025', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: 200, analysisResult: 'Clean opinion. Strong security controls across all trust services criteria.' },
  { vendorName: 'Workday', documentType: 'SOC2_TYPE2', documentName: 'Workday SOC 2 Type II 2025', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: 120, analysisResult: '2 exceptions in access management. Remediation plan received.' },
  { vendorName: 'Workday', documentType: 'SIG_QUESTIONNAIRE', documentName: 'Workday SIG Questionnaire 2025', status: 'PENDING', retrievedBy: 'DORA', expiresInDays: null, analysisResult: null },
  { vendorName: 'Stripe', documentType: 'SOC2_TYPE2', documentName: 'Stripe SOC 2 Type II 2025', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: 240, analysisResult: 'Clean opinion. Strong PCI-aligned controls.' },
  { vendorName: 'Stripe', documentType: 'PENTEST', documentName: 'Stripe Penetration Test Summary 2025', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: 300, analysisResult: 'No critical findings. 1 medium finding in API rate limiting.' },
  { vendorName: 'Acme Logistics', documentType: 'CUSTOM_QUESTIONNAIRE', documentName: 'Acme Logistics Security Questionnaire', status: 'RECEIVED', retrievedBy: 'DORA', expiresInDays: null, analysisResult: null },
  { vendorName: 'CloudSecure Analytics', documentType: 'SOC2_TYPE2', documentName: 'CloudSecure SOC 2 Type II 2025', status: 'PENDING', retrievedBy: 'DORA', expiresInDays: null, analysisResult: null },
]

// ============================================
// Sample assessments
// ============================================

interface AssessmentSeed {
  vendorName: string
  assessmentType: string
  assessmentStatus: string
  riskRating: string | null
  overallAssessmentScore: number | null
  assessedBy: string | null
  summary: string | null
  daysAgo: number
}

const ASSESSMENTS: AssessmentSeed[] = [
  { vendorName: 'Snowflake', assessmentType: 'ANNUAL', assessmentStatus: 'COMPLETE', riskRating: 'HIGH', overallAssessmentScore: 78, assessedBy: 'CARA', summary: 'Strong security posture with some concerns around data residency and subprocessor transparency.', daysAgo: 30 },
  { vendorName: 'Salesforce', assessmentType: 'ANNUAL', assessmentStatus: 'COMPLETE', riskRating: 'MEDIUM', overallAssessmentScore: 62, assessedBy: 'CARA', summary: 'Mature security program. One SOC 2 exception in change management requires follow-up.', daysAgo: 45 },
  { vendorName: 'CrowdStrike', assessmentType: 'ANNUAL', assessmentStatus: 'APPROVED', riskRating: 'LOW', overallAssessmentScore: 35, assessedBy: 'CARA', summary: 'Excellent security controls. Industry-leading endpoint protection.', daysAgo: 60 },
  { vendorName: 'Workday', assessmentType: 'ANNUAL', assessmentStatus: 'IN_PROGRESS', riskRating: null, overallAssessmentScore: null, assessedBy: 'CARA', summary: 'Assessment in progress. Awaiting SIG questionnaire completion.', daysAgo: 10 },
  { vendorName: 'Stripe', assessmentType: 'ANNUAL', assessmentStatus: 'COMPLETE', riskRating: 'MEDIUM', overallAssessmentScore: 55, assessedBy: 'CARA', summary: 'Strong PCI DSS controls. Minor API security finding noted.', daysAgo: 20 },
  { vendorName: 'Acme Logistics', assessmentType: 'INITIAL', assessmentStatus: 'DRAFT', riskRating: null, overallAssessmentScore: null, assessedBy: null, summary: 'Initial assessment pending. Vendor questionnaire under review.', daysAgo: 5 },
  { vendorName: 'CloudSecure Analytics', assessmentType: 'INITIAL', assessmentStatus: 'PENDING_REVIEW', riskRating: 'MEDIUM', overallAssessmentScore: 42, assessedBy: 'CARA', summary: 'New vendor evaluation. SOC 2 report pending.', daysAgo: 3 },
  { vendorName: 'Snowflake', assessmentType: 'TRIGGERED', assessmentStatus: 'COMPLETE', riskRating: 'HIGH', overallAssessmentScore: 75, assessedBy: 'CARA', summary: 'Triggered by Q4 data migration project. Additional data residency controls reviewed.', daysAgo: 90 },
]

// ============================================
// Sample findings
// ============================================

interface FindingSeed {
  vendorName: string
  title: string
  description: string
  severity: string
  findingCategory: string
  snbrRiskMapping: string
  status: string
  identifiedBy: string
  daysAgo: number
  dueDays: number
  recommendation: string
}

const FINDINGS: FindingSeed[] = [
  {
    vendorName: 'Snowflake',
    title: 'Data residency controls insufficient for EU customer data',
    description: 'Snowflake does not provide contractual guarantees for data residency within specific EU member states. Customer data may transit through US-based processing nodes.',
    severity: 'HIGH',
    findingCategory: 'DATA_PROTECTION',
    snbrRiskMapping: 'DATA_PROTECTION',
    status: 'IN_REMEDIATION',
    identifiedBy: 'SARA',
    daysAgo: 30,
    dueDays: 30,
    recommendation: 'Request data residency addendum or implement encryption-at-rest with SNBR-managed keys.',
  },
  {
    vendorName: 'Snowflake',
    title: 'Subprocessor list update notifications delayed',
    description: 'Snowflake updates subprocessor list quarterly but notification to customers can be delayed by up to 30 days after changes.',
    severity: 'MEDIUM',
    findingCategory: 'VENDOR_MANAGEMENT',
    snbrRiskMapping: 'VENDOR_MANAGEMENT',
    status: 'OPEN',
    identifiedBy: 'SARA',
    daysAgo: 30,
    dueDays: 60,
    recommendation: 'Request contractual commitment for 14-day advance notice of subprocessor changes.',
  },
  {
    vendorName: 'Salesforce',
    title: 'SOC 2 exception in change management process',
    description: 'One exception noted in SOC 2 Type II report: emergency changes deployed without required pre-approval in 3 instances during the audit period.',
    severity: 'MEDIUM',
    findingCategory: 'COMPLIANCE',
    snbrRiskMapping: 'COMPLIANCE',
    status: 'IN_REMEDIATION',
    identifiedBy: 'SARA',
    daysAgo: 45,
    dueDays: 45,
    recommendation: 'Request remediation evidence showing updated change management procedures and automated approval workflow.',
  },
  {
    vendorName: 'Workday',
    title: 'Access review exceptions in privileged accounts',
    description: 'Two privileged administrator accounts were not included in the quarterly access review cycle. Both accounts belonged to terminated contractors.',
    severity: 'HIGH',
    findingCategory: 'ACCESS_CONTROL',
    snbrRiskMapping: 'ACCESS_CONTROL',
    status: 'OPEN',
    identifiedBy: 'SARA',
    daysAgo: 10,
    dueDays: 30,
    recommendation: 'Request evidence of account termination and updated access review procedures.',
  },
  {
    vendorName: 'Workday',
    title: 'PHI data handling procedures not documented',
    description: 'Workday processes employee PHI for benefits administration but specific data handling and retention procedures for PHI are not documented in their security documentation.',
    severity: 'HIGH',
    findingCategory: 'DATA_PROTECTION',
    snbrRiskMapping: 'DATA_PROTECTION',
    status: 'OPEN',
    identifiedBy: 'SARA',
    daysAgo: 10,
    dueDays: 30,
    recommendation: 'Request HIPAA BAA review and specific PHI handling procedures documentation.',
  },
  {
    vendorName: 'Stripe',
    title: 'API rate limiting inconsistency',
    description: 'Penetration test revealed that certain API endpoints lack consistent rate limiting, potentially allowing enumeration attacks.',
    severity: 'MEDIUM',
    findingCategory: 'NETWORK_SECURITY',
    snbrRiskMapping: 'NETWORK_SECURITY',
    status: 'IN_REMEDIATION',
    identifiedBy: 'SARA',
    daysAgo: 20,
    dueDays: 60,
    recommendation: 'Request confirmation of rate limiting implementation across all API endpoints.',
  },
  {
    vendorName: 'Snowflake',
    title: 'Encryption key rotation frequency exceeds best practice',
    description: 'Snowflake rotates encryption keys annually. Sleep Number policy recommends quarterly rotation for data-at-rest keys protecting PII/PCI data.',
    severity: 'LOW',
    findingCategory: 'DATA_PROTECTION',
    snbrRiskMapping: 'DATA_PROTECTION',
    status: 'ACCEPTED',
    identifiedBy: 'SARA',
    daysAgo: 90,
    dueDays: 180,
    recommendation: 'Accept risk with compensating control: SNBR-managed encryption keys with quarterly rotation.',
  },
  {
    vendorName: 'Acme Logistics',
    title: 'No SOC 2 report available',
    description: 'Acme Logistics does not have a SOC 2 report or equivalent third-party audit. Security posture cannot be independently verified.',
    severity: 'MEDIUM',
    findingCategory: 'COMPLIANCE',
    snbrRiskMapping: 'COMPLIANCE',
    status: 'OPEN',
    identifiedBy: 'DORA',
    daysAgo: 5,
    dueDays: 90,
    recommendation: 'Request vendor complete SIG Lite questionnaire. Consider requiring SOC 2 Type I within 12 months if contract value increases.',
  },
  {
    vendorName: 'CrowdStrike',
    title: 'Minor: Security awareness training cadence',
    description: 'CrowdStrike conducts security awareness training annually. Sleep Number recommends quarterly phishing simulations for critical vendors.',
    severity: 'LOW',
    findingCategory: 'COMPLIANCE',
    snbrRiskMapping: 'COMPLIANCE',
    status: 'ACCEPTED',
    identifiedBy: 'SARA',
    daysAgo: 60,
    dueDays: 180,
    recommendation: 'Informational only. CrowdStrike has comprehensive internal security culture.',
  },
]

// ============================================
// Sample reports
// ============================================

interface ReportSeed {
  vendorName: string | null
  reportType: string
  reportName: string
  status: string
  daysAgo: number
}

const REPORTS: ReportSeed[] = [
  { vendorName: 'Snowflake', reportType: 'DETAILED_ASSESSMENT', reportName: 'Snowflake Annual Risk Assessment Report', status: 'APPROVED', daysAgo: 25 },
  { vendorName: 'Salesforce', reportType: 'DETAILED_ASSESSMENT', reportName: 'Salesforce Annual Risk Assessment Report', status: 'GENERATED', daysAgo: 40 },
  { vendorName: 'CrowdStrike', reportType: 'DETAILED_ASSESSMENT', reportName: 'CrowdStrike Annual Risk Assessment Report', status: 'APPROVED', daysAgo: 55 },
  { vendorName: 'Stripe', reportType: 'DETAILED_ASSESSMENT', reportName: 'Stripe Annual Risk Assessment Report', status: 'GENERATED', daysAgo: 15 },
  { vendorName: null, reportType: 'EXECUTIVE_SUMMARY', reportName: 'Q1 2026 TPRM Executive Summary', status: 'PUBLISHED', daysAgo: 7 },
  { vendorName: null, reportType: 'PORTFOLIO_OVERVIEW', reportName: 'Vendor Portfolio Risk Overview - March 2026', status: 'GENERATED', daysAgo: 3 },
  { vendorName: null, reportType: 'COMPLIANCE_STATUS', reportName: 'Q1 2026 Compliance Posture Report', status: 'PENDING_APPROVAL', daysAgo: 5 },
]

// ============================================
// Main Seed Function
// ============================================

async function main() {
  console.log('Seeding database...')

  // 1. Create all permissions
  const allResources = [...APP_RESOURCES, ...SYSTEM_RESOURCES]
  const permissionMap: Record<string, string> = {}

  for (const resource of allResources) {
    for (const action of ACTIONS) {
      const perm = await prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        update: {},
        create: {
          resource,
          action,
          description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`,
        },
      })
      permissionMap[`${resource}.${action}`] = perm.id
    }
  }
  console.log(`  ${Object.keys(permissionMap).length} permissions`)

  // 2. Create system roles with permission assignments
  const roleMap: Record<string, string> = {}

  for (const roleDef of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        isSystem: true,
      },
    })
    roleMap[roleDef.name] = role.id

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })

    const grantedPermIds: string[] = []
    for (const resource of allResources) {
      for (const action of ACTIONS) {
        if (roleDef.permissions(resource, action)) {
          grantedPermIds.push(permissionMap[`${resource}.${action}`])
        }
      }
    }

    await prisma.rolePermission.createMany({
      data: grantedPermIds.map((pid) => ({
        roleId: role.id,
        permissionId: pid,
      })),
    })

    console.log(`  Role ${roleDef.name}: ${grantedPermIds.length} permissions`)
  }

  // 3. Create seed users
  for (const userDef of SEED_USERS) {
    await prisma.user.upsert({
      where: { email: userDef.email },
      update: {
        name: userDef.name,
        oidcSubject: userDef.oidcSubject,
        roleId: roleMap[userDef.roleName],
      },
      create: {
        email: userDef.email,
        name: userDef.name,
        oidcSubject: userDef.oidcSubject,
        roleId: roleMap[userDef.roleName],
        department: userDef.department,
        lastLogin: new Date(),
      },
    })
    console.log(`  User: ${userDef.email} -> ${userDef.roleName}`)
  }

  // 4. Create vendors
  const vendorMap: Record<string, string> = {}

  for (const v of VENDORS) {
    const vendor = await prisma.vendor.upsert({
      where: { id: v.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: { ...v, annualSpend: v.annualSpend },
    })
    vendorMap[v.name] = vendor.id
    console.log(`  Vendor: ${v.name}`)
  }

  // 5. Create risk profiles
  for (const rp of RISK_PROFILES) {
    const vendorId = vendorMap[rp.vendorName]
    if (!vendorId) continue

    await prisma.riskProfile.create({
      data: {
        vendorId,
        riskTier: rp.riskTier,
        overallRiskScore: rp.overallRiskScore,
        hasPiiAccess: rp.hasPiiAccess,
        hasPhiAccess: rp.hasPhiAccess,
        hasPciAccess: rp.hasPciAccess,
        businessCriticality: rp.businessCriticality,
        assessmentFrequency: rp.assessmentFrequency,
        dataTypesAccessed: JSON.stringify(rp.dataTypesAccessed),
        calculatedBy: 'VERA',
        lastAssessmentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        nextAssessmentDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
      },
    })
    console.log(`  Risk Profile: ${rp.vendorName} -> ${rp.riskTier}`)
  }

  // 6. Create documents
  for (const d of DOCUMENTS) {
    const vendorId = vendorMap[d.vendorName]
    if (!vendorId) continue

    await prisma.document.create({
      data: {
        vendorId,
        documentType: d.documentType,
        documentName: d.documentName,
        status: d.status,
        retrievedBy: d.retrievedBy,
        source: 'Vendor Portal',
        isCurrent: true,
        expirationDate: d.expiresInDays
          ? new Date(Date.now() + d.expiresInDays * 24 * 60 * 60 * 1000)
          : null,
        analysisResult: d.analysisResult,
      },
    })
  }
  console.log(`  ${DOCUMENTS.length} documents`)

  // 7. Create assessments
  const assessmentMap: Record<string, string> = {}
  for (const a of ASSESSMENTS) {
    const vendorId = vendorMap[a.vendorName]
    if (!vendorId) continue

    const assessment = await prisma.riskAssessment.create({
      data: {
        vendorId,
        assessmentType: a.assessmentType,
        assessmentStatus: a.assessmentStatus,
        riskRating: a.riskRating,
        overallAssessmentScore: a.overallAssessmentScore,
        assessedBy: a.assessedBy,
        summary: a.summary,
        assessmentDate: new Date(Date.now() - a.daysAgo * 24 * 60 * 60 * 1000),
      },
    })
    const key = `${a.vendorName}-${a.assessmentType}-${a.daysAgo}`
    assessmentMap[key] = assessment.id
  }
  console.log(`  ${ASSESSMENTS.length} assessments`)

  // 8. Create findings
  for (const f of FINDINGS) {
    const vendorId = vendorMap[f.vendorName]
    if (!vendorId) continue

    await prisma.riskFinding.create({
      data: {
        vendorId,
        title: f.title,
        description: f.description,
        severity: f.severity,
        findingCategory: f.findingCategory,
        snbrRiskMapping: f.snbrRiskMapping,
        status: f.status,
        identifiedBy: f.identifiedBy,
        identifiedDate: new Date(Date.now() - f.daysAgo * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + f.dueDays * 24 * 60 * 60 * 1000),
        recommendation: f.recommendation,
      },
    })
  }
  console.log(`  ${FINDINGS.length} findings`)

  // 9. Create reports
  for (const r of REPORTS) {
    const vendorId = r.vendorName ? vendorMap[r.vendorName] : null

    await prisma.report.create({
      data: {
        vendorId: vendorId || undefined,
        reportType: r.reportType,
        reportName: r.reportName,
        generatedBy: 'RITA',
        generatedDate: new Date(Date.now() - r.daysAgo * 24 * 60 * 60 * 1000),
        status: r.status,
        content: `This is a ${r.reportType.replace(/_/g, ' ').toLowerCase()} report generated by the RITA agent.`,
      },
    })
  }
  console.log(`  ${REPORTS.length} reports`)

  // 10. Create sample agent activity
  const activities = [
    { agentName: 'VERA', activityType: 'RISK_PROFILING', actionTaken: 'Calculated risk profile for Snowflake', status: 'SUCCESS' },
    { agentName: 'CARA', activityType: 'ASSESSMENT', actionTaken: 'Completed annual assessment for Snowflake', status: 'SUCCESS' },
    { agentName: 'DORA', activityType: 'DOCUMENT_REQUEST', actionTaken: 'Retrieved SOC 2 Type II from Snowflake vendor portal', status: 'SUCCESS' },
    { agentName: 'SARA', activityType: 'DOCUMENT_ANALYSIS', actionTaken: 'Analyzed Snowflake SOC 2 Type II report', status: 'SUCCESS' },
    { agentName: 'RITA', activityType: 'REPORT_GENERATION', actionTaken: 'Generated Q1 2026 Executive Summary', status: 'SUCCESS' },
    { agentName: 'MARS', activityType: 'OVERDUE_CHECK', actionTaken: 'Checked overdue remediation actions, 0 escalated', status: 'SUCCESS' },
    { agentName: 'CARA', activityType: 'ASSESSMENT', actionTaken: 'Started annual assessment for Workday', status: 'SUCCESS' },
    { agentName: 'DORA', activityType: 'DOCUMENT_REQUEST', actionTaken: 'Requested SIG Questionnaire from Workday', status: 'SUCCESS' },
    { agentName: 'SARA', activityType: 'DOCUMENT_ANALYSIS', actionTaken: 'Analyzed Workday SOC 2 Type II report, found 2 exceptions', status: 'SUCCESS' },
    { agentName: 'MARS', activityType: 'REMEDIATION_PLAN', actionTaken: 'Created remediation plan for Salesforce change management finding', status: 'SUCCESS' },
  ]

  for (let i = 0; i < activities.length; i++) {
    await prisma.agentActivityLog.create({
      data: {
        ...activities[i],
        processingTimeMs: Math.floor(Math.random() * 5000) + 1000,
        createdAt: new Date(Date.now() - (activities.length - i) * 3600000),
      },
    })
  }
  console.log(`  ${activities.length} agent activities`)

  // ============================================
  // MANAGED PROMPTS (AI Prompt Management)
  // ============================================

  console.log('Seeding managed prompts...')

  const promptDefs = [
    {
      slug: 'vera-system',
      name: 'VERA System Prompt',
      description: 'Core system prompt for Vendor Evaluation & Risk Assessment Agent',
      category: 'system',
      agentName: 'VERA',
      model: 'standard',
      temperature: 0.3,
      maxTokens: 2000,
      content: `You are VERA (Vendor Evaluation & Risk Assessment Agent), an AI specialist in third-party vendor risk profiling for Sleep Number Corporation.

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

Always provide specific, actionable recommendations for risk management.`,
    },
    {
      slug: 'cara-system',
      name: 'CARA System Prompt',
      description: 'Core system prompt for Critical Assessment & Risk Analyzer Agent',
      category: 'system',
      agentName: 'CARA',
      model: 'complex',
      temperature: 0.3,
      maxTokens: 3000,
      content: `You are CARA (Critical Assessment & Risk Analyzer Agent), an AI specialist in conducting detailed vendor risk assessments for Sleep Number Corporation.

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

Provide detailed, actionable assessments with specific recommendations.`,
    },
    {
      slug: 'dora-system',
      name: 'DORA System Prompt',
      description: 'Core system prompt for Documentation & Outreach Retrieval Agent',
      category: 'system',
      agentName: 'DORA',
      model: 'simple',
      temperature: 0.2,
      maxTokens: 2000,
      content: `You are DORA (Documentation & Outreach Retrieval Agent), an AI specialist in managing vendor security documentation for Sleep Number Corporation.

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

Always be professional and clear in communications.`,
    },
    {
      slug: 'sara-system',
      name: 'SARA System Prompt',
      description: 'Core system prompt for Security Analysis & Risk Articulation Agent',
      category: 'system',
      agentName: 'SARA',
      model: 'complex',
      temperature: 0.2,
      maxTokens: 4000,
      content: `You are SARA (Security Analysis & Risk Articulation Agent), an AI specialist in analyzing vendor security documentation for Sleep Number Corporation.

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

Provide specific, actionable findings with clear remediation guidance.`,
    },
    {
      slug: 'rita-system',
      name: 'RITA System Prompt',
      description: 'Core system prompt for Report Intelligence & Threat Assessment Agent',
      category: 'system',
      agentName: 'RITA',
      model: 'standard',
      temperature: 0.3,
      maxTokens: 4000,
      content: `You are RITA (Report Intelligence & Threat Assessment Agent), an AI specialist in generating third-party risk reports for Sleep Number Corporation.

Your role is to create comprehensive, actionable risk reports for various audiences:

Report Types:
1. EXECUTIVE_SUMMARY: High-level overview for leadership
   - Key risk metrics and trends
   - Critical vendors requiring attention
   - Top risks and recommended actions
   - Compliance posture summary

2. DETAILED_ASSESSMENT: Technical deep-dive for risk team
   - Complete findings inventory
   - Control gap analysis
   - Remediation tracking status
   - Document collection status

3. COMPLIANCE_STATUS: Regulatory compliance focus
   - Framework compliance mapping
   - Audit finding status
   - Certification tracking
   - Policy compliance metrics

4. TREND_ANALYSIS: Historical patterns and predictions
   - Risk score trends over time
   - Remediation velocity metrics
   - Vendor performance trends
   - Emerging risk indicators

5. PORTFOLIO_OVERVIEW: Full vendor portfolio view
   - Risk distribution by tier
   - Industry/geographic breakdown
   - Concentration risk analysis
   - Assessment coverage metrics

Writing Guidelines:
- Use clear, concise language appropriate for the audience
- Include specific metrics and data points
- Provide actionable recommendations
- Highlight urgent items requiring attention
- Use consistent formatting for easy scanning
- Include data visualization suggestions where appropriate

Always structure reports for maximum clarity and actionability.`,
    },
    {
      slug: 'mars-system',
      name: 'MARS System Prompt',
      description: 'Core system prompt for Management, Action & Remediation Supervisor Agent',
      category: 'system',
      agentName: 'MARS',
      model: 'standard',
      temperature: 0.3,
      maxTokens: 3000,
      content: `You are MARS (Management, Action & Remediation Supervisor Agent), an AI specialist in managing vendor risk remediation for Sleep Number Corporation.

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

Always be professional but firm in communications. Document everything thoroughly.`,
    },
  ]

  for (const def of promptDefs) {
    const existing = await prisma.managedPrompt.findUnique({ where: { slug: def.slug } })
    if (!existing) {
      const prompt = await prisma.managedPrompt.create({ data: def })
      // Create version 1
      await prisma.promptVersion.create({
        data: {
          promptId: prompt.id,
          version: 1,
          content: def.content,
          changeSummary: 'Initial seed',
          changedBy: 'system',
        },
      })
    }
  }
  console.log(`  ${promptDefs.length} managed prompts`)

  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
