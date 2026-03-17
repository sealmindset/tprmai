import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { chat } from '@/lib/ai/provider'
import type { ChatMessage } from '@/lib/ai/provider'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'

// Force dynamic to prevent static generation issues with pdf-parse
export const dynamic = 'force-dynamic'

// Lazy import pdf-parse to avoid build-time file loading issues
const pdfParse = async (buffer: Buffer) => {
  const pdf = await import('pdf-parse')
  return pdf.default(buffer)
}

const ANALYSIS_PROMPT = `You are an expert Third Party Risk Management (TPRM) analyst.
Analyze the provided vendor document and extract:
1. Key security controls and certifications
2. Risk findings and gaps
3. Compliance status (SOC 2, ISO 27001, etc.)
4. Data handling practices
5. Business continuity capabilities
6. Recommended risk rating (CRITICAL, HIGH, MEDIUM, LOW)

Format your response as JSON with the following structure:
{
  "documentType": "SOC2_TYPE2 | ISO27001 | PENTEST | CAIQ | BCP | ARCHITECTURE | BRIDGE_LETTER | SOA | EXECUTIVE_SUMMARY | OTHER",
  "summary": "Brief summary of the document",
  "keyFindings": ["finding1", "finding2"],
  "riskFactors": ["risk1", "risk2"],
  "strengths": ["strength1", "strength2"],
  "recommendedRating": "MEDIUM",
  "controlsCovered": ["control1", "control2"],
  "expirationDate": "2025-12-31 or null",
  "recommendations": ["recommendation1", "recommendation2"]
}`

// Extract text from PDF using pdf-parse (dynamically imported)
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer)
    return (data as { text: string }).text
  } catch (error) {
    console.error('PDF extraction error:', error)
    throw new Error('Failed to extract PDF content')
  }
}

// Extract text from DOCX using JSZip
async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(buffer)
    const documentXml = await zip.file('word/document.xml')?.async('string')

    if (!documentXml) {
      throw new Error('No document.xml found in DOCX')
    }

    // Extract text from XML, removing tags
    const text = documentXml
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return text
  } catch (error) {
    console.error('DOCX extraction error:', error)
    throw new Error('Failed to extract DOCX content')
  }
}

// Extract text from XLSX using ExcelJS
async function extractXlsxText(buffer: Buffer): Promise<string> {
  try {
    const workbook = new ExcelJS.Workbook()
    // Use stream-based loading for ExcelJS compatibility
    const { Readable } = await import('stream')
    const stream = Readable.from(buffer)
    await workbook.xlsx.read(stream)
    const texts: string[] = []

    workbook.eachSheet((worksheet) => {
      const rows: string[] = []
      worksheet.eachRow((row) => {
        const values = row.values as (string | number | boolean | Date | null | undefined)[]
        // row.values is 1-indexed, first element is undefined
        const rowData = values.slice(1).map(v => v?.toString() ?? '').join(',')
        rows.push(rowData)
      })
      texts.push(`=== Sheet: ${worksheet.name} ===\n${rows.join('\n')}`)
    })

    return texts.join('\n\n')
  } catch (error) {
    console.error('XLSX extraction error:', error)
    throw new Error('Failed to extract XLSX content')
  }
}

// Detect file type from extension and MIME
function getFileType(filename: string, mimeType: string): 'pdf' | 'docx' | 'xlsx' | 'image' | 'text' {
  const ext = filename.toLowerCase().split('.').pop() || ''

  if (ext === 'pdf' || mimeType === 'application/pdf') return 'pdf'
  if (ext === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx'
  if (ext === 'doc' || mimeType === 'application/msword') return 'docx'
  if (ext === 'xlsx' || ext === 'xls' || mimeType.includes('spreadsheet')) return 'xlsx'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext) || mimeType.startsWith('image/')) return 'image'

  return 'text'
}

// Get proper MIME type for images
function getImageMimeType(filename: string, originalMime: string): string {
  const ext = filename.toLowerCase().split('.').pop() || ''
  const mimeMap: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
  }
  return mimeMap[ext] || originalMime || 'image/png'
}

export async function POST(request: Request) {
  const denied = await requirePermission('documents', 'edit')
  if (denied) return denied

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const vendorId = formData.get('vendorId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const fileType = getFileType(file.name, file.type)

    let content: string = ''
    let isImage = false
    let imageBase64: string | null = null
    let imageMime: string | null = null

    // Extract content based on file type
    switch (fileType) {
      case 'pdf':
        content = await extractPdfText(buffer)
        break
      case 'docx':
        content = await extractDocxText(buffer)
        break
      case 'xlsx':
        content = await extractXlsxText(buffer)
        break
      case 'image':
        isImage = true
        imageMime = getImageMimeType(file.name, file.type)
        imageBase64 = buffer.toString('base64')
        break
      case 'text':
      default:
        content = buffer.toString('utf-8')
        break
    }

    // Analyze with AI provider
    let messages: ChatMessage[]

    if (isImage && imageBase64 && imageMime) {
      messages = [
        { role: 'system', content: ANALYSIS_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${imageMime};base64,${imageBase64}` },
            },
            {
              type: 'text',
              text: 'Analyze this vendor document image (likely an architecture diagram, certificate, or similar):',
            },
          ],
        },
      ]
    } else {
      const truncatedContent = content.slice(0, 100000)
      messages = [
        { role: 'system', content: ANALYSIS_PROMPT },
        { role: 'user', content: `Analyze this vendor document:\n\n${truncatedContent}` },
      ]
    }

    const response = await chat(messages, {
      temperature: 0.3,
      maxTokens: 4096,
      tier: 'complex',
    })

    let analysis
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Failed to parse', summary: response.content }
    } catch {
      analysis = { summary: response.content, error: 'JSON parse failed' }
    }

    // Store document in database
    if (vendorId) {
      const document = await prisma.document.create({
        data: {
          vendorId,
          documentName: file.name,
          documentType: analysis.documentType || 'OTHER',
          mimeType: file.type,
          fileSize: file.size,
          status: 'ANALYZED',
          analysisResult: JSON.stringify(analysis),
          retrievedBy: 'DORA',
        },
      })

      // Create findings
      if (analysis.riskFactors?.length > 0) {
        for (const risk of analysis.riskFactors) {
          await prisma.riskFinding.create({
            data: {
              vendorId,
              documentId: document.id,
              title: risk,
              severity: analysis.recommendedRating === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
              identifiedBy: 'SARA',
              status: 'OPEN',
            },
          })
        }
      }

      return NextResponse.json({ document, analysis })
    }

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Document analysis error:', error)
    return NextResponse.json(
      { error: 'Analysis failed', details: String(error) },
      { status: 500 }
    )
  }
}
