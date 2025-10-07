import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Публичные пути, которые не требуют авторизации
  const publicPaths = ['/api/auth']
  
  // Проверяем, является ли путь публичным
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))
  
  if (isPublicPath) {
    return NextResponse.next()
  }
  
  // Для всех остальных путей проверяем авторизацию
  // Получаем куки из запроса
  const cookies = request.cookies
  const authCookie = cookies.get('access_token') || cookies.get('auth-token') || cookies.get('session') || cookies.get('jwt')
  
  // Если нет токена авторизации, перенаправляем на главную страницу
  if (!authCookie) {
    const homeUrl = new URL('/', request.url)
    return NextResponse.redirect(homeUrl)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
