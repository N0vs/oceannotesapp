import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode('sua_chave_secreta_super_segura');

export async function middleware(req) {
  const token = req.cookies.get('token')?.value;
  const { pathname } = req.nextUrl;

  // Se não há token e o usuário tenta acessar uma rota protegida
  if (!token) {
    if (pathname.startsWith('/api/auth') || pathname === '/' || pathname === '/registo') {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Se há um token, verifica se é válido
  try {
    await jwtVerify(token, secret);
    
    if (pathname === '/' || pathname === '/registo') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();

  } catch (err) {
    const response = NextResponse.redirect(new URL('/', req.url));
    response.cookies.delete('token');
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
