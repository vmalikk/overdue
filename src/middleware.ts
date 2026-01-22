import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Check for any Appwrite session cookie
  const hasSession = request.cookies.getAll().some(cookie => cookie.name.startsWith('a_session'))

  // Protected routes
  const protectedRoutes = ['/', '/dashboard', '/courses', '/calendar', '/settings']
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route + '/')
  )

  // If trying to access protected route without session, redirect to login
  if (isProtectedRoute && !hasSession && request.nextUrl.pathname !== '/login' && request.nextUrl.pathname !== '/signup') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/courses/:path*', '/calendar/:path*', '/settings/:path*'],
}
