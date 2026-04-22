import { NextResponse, type NextRequest } from 'next/server'

// Let client-side handle auth - Appwrite sets cookies client-side
export async function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
