import { NextResponse, type NextRequest } from 'next/server'

// Appwrite uses client-side auth, so middleware just handles route protection
// based on checking for appwrite session cookie
export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Check for Appwrite session cookie
  const hasSession = request.cookies.has('a_session_' + process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID) ||
                     request.cookies.getAll().some(cookie => cookie.name.startsWith('a_session'))

  // Protected routes - redirect to login if not authenticated
  const exactProtectedRoutes = ['/']
  const prefixProtectedRoutes = ['/dashboard', '/courses', '/calendar', '/settings']
  
  const isExactProtected = exactProtectedRoutes.includes(request.nextUrl.pathname)
  const isPrefixProtected = prefixProtectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  const isProtectedRoute = isExactProtected || isPrefixProtected

  if (isProtectedRoute && !hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  const authRoutes = ['/login', '/signup']
  const isAuthRoute = authRoutes.some(route => 
    request.nextUrl.pathname === route
  )

  if (isAuthRoute && hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (except auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
