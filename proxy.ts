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

function redirectToRoot(request: NextRequest, withError?: string) {
  const url = request.nextUrl.clone()
  url.hostname = ROOT_DOMAIN
  if (withError) url.searchParams.set('error', withError)
  return NextResponse.redirect(url)
}

/**
 * Checks whether a tenant slug exists in your Supabase `organizations` table.
 *
 * IMPORTANT:
 * - We do NOT reference `subdomain` because your DB confirmed it doesn't exist.
 * - We try common slug column names safely.
 * - If you set SUPABASE_SERVICE_ROLE_KEY (recommended), this lookup will work even with RLS.
 */
async function tenantExists(slug: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) return false

  // Prefer service role to avoid RLS blocking tenant discovery
  const keyToUse = serviceRoleKey || anonKey
  if (!keyToUse) return false

  // Try likely column names. (We already know `subdomain` is NOT one of them.)
  const candidateColumns = ['slug', 'org_slug', 'tenant_slug', 'handle', 'code']

  for (const col of candidateColumns) {
    const url = new URL(`${supabaseUrl}/rest/v1/organizations`)
    url.searchParams.set('select', 'id')
    url.searchParams.set(col, `eq.${slug}`)
    url.searchParams.set('limit', '1')

    const res = await fetch(url.toString(), {
      headers: {
        apikey: keyToUse,
        authorization: `Bearer ${keyToUse}`,
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      // If the column doesn't exist, PostgREST returns 400 w/ code 42703.
      // Try the next candidate column.
      try {
        const body = await res.json()
        if (body?.code === '42703') continue
      } catch {
        // ignore parse errors
      }
      // Any other failure (403/401 etc.) means we can't confirm.
      // If this happens with anon key, you almost certainly need service role.
      continue
    }

    const data = (await res.json()) as Array<{ id: string }>
    if (Array.isArray(data) && data.length > 0) return true
  }

  return false
}

export default async function proxy(request: NextRequest) {
  const hostHeader = request.headers.get('host') || ''
  const host = normalizeHost(hostHeader)
  const pathname = request.nextUrl.pathname

  // Skip internals/static
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
  // but do auth gating for protected routes
  if (isRootDomain(host)) {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req: request, res })

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const publicRoutes = ['/auth/login', '/auth/signup', '/auth/forgot-password']
    const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

    if (!session && !isPublicRoute) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    if (session && isPublicRoute) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    return res
  }

  // Not root and not a subdomain of it -> bounce to root
  if (!isSubdomainOfRoot(host)) {
    return redirectToRoot(request)
  }

  // Subdomain flow: validate tenant exists
  const subdomain = extractSubdomain(host)
  if (!subdomain) {
    return redirectToRoot(request)
  }

  const exists = await tenantExists(subdomain)
  if (!exists) {
    // send user to root login w/ an error marker
    // TEMP DEBUG: add headers so we can confirm what the proxy decided
    const dbg = redirectToRoot(request, 'organization_not_found')
    dbg.headers.set('x-debug-tenant', subdomain)
    dbg.headers.set('x-debug-tenant-exists', 'false')
    return dbg
  }

  // Tenant exists -> proceed with auth gating + header
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const publicRoutes = ['/auth/login', '/auth/signup', '/auth/forgot-password']
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (session && isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  res.headers.set('x-tenant-slug', subdomain)
  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
