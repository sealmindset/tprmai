import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { z } from 'zod'

const vendorSchema = z.object({
  name: z.string().min(1),
  legalName: z.string().optional(),
  dunsNumber: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  industry: z.string().optional(),
  country: z.string().optional(),
  stateProvince: z.string().optional(),
  primaryContactName: z.string().optional(),
  primaryContactEmail: z.string().email().optional().or(z.literal('')),
  primaryContactPhone: z.string().optional(),
  businessOwner: z.string().optional(),
  itOwner: z.string().optional(),
  contractStartDate: z.string().optional(),
  contractEndDate: z.string().optional(),
  annualSpend: z.number().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const riskTier = searchParams.get('riskTier')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        include: {
          riskProfiles: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              riskFindings: { where: { status: { not: 'CLOSED' } } },
              documents: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.vendor.count({ where }),
    ])

    // Filter by risk tier if specified (post-query filter due to relation)
    let filteredVendors = vendors
    if (riskTier) {
      filteredVendors = vendors.filter(
        (v) => v.riskProfiles[0]?.riskTier === riskTier
      )
    }

    return NextResponse.json({
      vendors: filteredVendors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching vendors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = vendorSchema.parse(body)

    const vendor = await prisma.vendor.create({
      data: {
        name: validated.name,
        legalName: validated.legalName,
        dunsNumber: validated.dunsNumber,
        website: validated.website || null,
        industry: validated.industry,
        country: validated.country,
        stateProvince: validated.stateProvince,
        primaryContactName: validated.primaryContactName,
        primaryContactEmail: validated.primaryContactEmail || null,
        primaryContactPhone: validated.primaryContactPhone,
        businessOwner: validated.businessOwner,
        itOwner: validated.itOwner,
        contractStartDate: validated.contractStartDate
          ? new Date(validated.contractStartDate)
          : null,
        contractEndDate: validated.contractEndDate
          ? new Date(validated.contractEndDate)
          : null,
        annualSpend: validated.annualSpend,
        status: 'PENDING',
      },
    })

    // Create audit trail
    await prisma.auditTrail.create({
      data: {
        action: 'CREATE',
        entityType: 'Vendor',
        entityId: vendor.id,
        newValues: JSON.stringify(validated),
      },
    })

    return NextResponse.json(vendor, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating vendor:', error)
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    )
  }
}
