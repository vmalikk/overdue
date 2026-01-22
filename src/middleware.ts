import { NextResponse, type NextRequest } from 'next/server'

// Simplified middleware - let client-side handle auth state
// Appwrite manages sessions via cookies automatically
export async function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
