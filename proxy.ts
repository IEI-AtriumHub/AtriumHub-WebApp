// ============================================================================
// PROXY (Next.js "Middleware-to-Proxy") - SUBDOMAIN ROUTING & AUTH
// - Uses Supabase session refresh + auth gating
// - Adds x-tenant-slug header for server components
// - Validates tenant subdomain exists in Supabase organizations table
// ============================================================================

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ROOT_DOMAIN = 'atriumhub.org'

const PUBLIC_FILE = /\.(.*)$/

function normalizeHost(host: string) {
  // Remove port if present (e.g., localhost:3000)
  return host.toLowerCase().split(':')[0]
}

function isLocalhost(host: string) {
  return host.includes('localhost') || host.startsWith('127.0.0.1')
}

function isVercelDomain(host: string) {
  return host.endsWith('.vercel.app')
}

function isRootDomain(host: string) {
  return host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`
}

function isSubdomainOfRoot(host: string) {
  return host.endsWith(`.${ROOT_DOMAIN}`)
}

function extractSubdomain(host: string) {
  if (!isSubdomainOfRoot(host)) return null
  const suffix = `.${ROOT_DOMAIN}`
  const sub = host.slice(0, -suffix.length)
  return sub || null
}

function redirectToRoot(request: NextRequest) {
  const url = request.nextUrl.clone()
  url.hostname = ROOT_DOMAIN
  return NextResponse.redirect(url)
}

/**
 * Checks whether a tenant slug exists in your Supabase `organizations` table.
 *
 * Because we don't know your exact column name, this tries common options:
 * - slug
 * - subdomain
 * - org_slug
 *
 * Whichever column exists + matches will return true.
 */
async function tenantExists(slug: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) return false

  const candidateColumns = ['slug', 'subdomain', 'org_slug']

  for (const col of candidateColumns) {
    const url = new URL(`${supabaseUrl}/rest/v1/organizations`)
    url.searchParams.set('select', 'id')
    url.searchParams.set(col, `eq.${slug}`)
    url.searchParams.set('limit', '1')

    const res = await fetch(url.toString(), {
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
      },
      cache: 'no-store',
    })

    // If the column doesn't exist, Supabase often returns 400 — try the next column.
    if (!res.ok) continue

    const data = (await res.json()) as Array<{ id: string }>
    if (Array.isArray(data) && data.length > 0) return true
  }

  return false
}

export default async function proxy(request: NextRequest) {
  const hostHeader = request.headers.get('host') || ''
  const host = normalizeHost(hostHeader)
  const pathname = request.nextUrl.pathname

  // Skip next internals/static
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next()
  }

  // Dev + Vercel preview domains: allow
  if (isLocalhost(host) || isVercelDomain(host)) {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req: request, res })
    await supabase.auth.getSession()
    return res
  }

  // Root domain (atriumhub.org / www): allow (no tenant header)
  if (isRootDomain(host)) {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req: request, res })

    // Refresh session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Public routes that don't require auth
    const publicRoutes = ['/auth/login', '/auth/signup', '/auth/forgot-password']
    const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

    // If no session and not public route, redirect to login
    if (!session && !isPublicRoute) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // If has session and on auth page, redirect to home
    if (session && isPublicRoute) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    return res
  }

  // If it's not our root domain or a subdomain of it, bounce to root
  if (!isSubdomainOfRoot(host)) {
    return redirectToRoot(request)
  }

  // Subdomain flow: validate tenant exists
  const subdomain = extractSubdomain(host)

  // If we couldn't extract, bounce to root
  if (!subdomain) {
    return redirectToRoot(request)
  }

  // Optional: you can reserve/allow certain subdomains without DB lookup
  // const RESERVED = new Set(['www'])
  // if (RESERVED.has(subdomain)) return NextResponse.next()

  const exists = await tenantExists(subdomain)
  if (!exists) {
    return redirectToRoot(request)
  }

  // Tenant exists → proceed with your existing auth gating + header
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })

  // Refresh session if expired
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Public routes that don't require auth
  const publicRoutes = ['/auth/login', '/auth/signup', '/auth/forgot-password']
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // If no session and not public route, redirect to login
  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // If has session and on auth page, redirect to home
  if (session && isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Add tenant header for server components
  res.headers.set('x-tenant-slug', subdomain)

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - common public image files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
