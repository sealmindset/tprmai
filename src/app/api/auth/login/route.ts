import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizationUrl } from '@/lib/oidc'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    // Build the callback URL through the frontend (same-origin proxy)
    const frontendUrl =
      process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3020}`
    const redirectUri = `${frontendUrl}/api/auth/callback`

    // Generate state parameter for CSRF protection
    const state = crypto.randomBytes(16).toString('hex')

    const authUrl = await getAuthorizationUrl(redirectUri, state)

    // 302 redirect to OIDC provider
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Login error:', error)
    const errorRedirectUrl =
      process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3020}`
    return NextResponse.redirect(
      new URL('/login?error=oidc_unavailable', errorRedirectUrl)
    )
  }
}
