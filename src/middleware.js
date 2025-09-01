import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode('sua_chave_secreta_super_segura');

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  console.log('Middleware executando para:', pathname);

  // Lista de rotas que não precisam de autenticação
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/registo',
    '/api/auth/login',
    '/api/utilizadores'
  ];

  // Se a rota é pública, permite o acesso
  if (publicRoutes.includes(pathname)) {
    console.log('Rota pública, permitindo acesso');
    return NextResponse.next();
  }

  // Verifica se há um token JWT nos cookies
  const token = request.cookies.get('token')?.value;
  console.log('Token encontrado no middleware:', !!token);

  if (!token) {
    console.log('Sem token, redirecionando para login');
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    // Verifica se o token é válido
    await jwtVerify(token, secret);
    console.log('Token válido, permitindo acesso');
    
    // Se o token é válido, permite o acesso
    if (pathname === '/' || pathname === '/register') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.log('Token inválido:', error.message);
    // Se o token é inválido, remove o cookie e redireciona para login
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('token');
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
