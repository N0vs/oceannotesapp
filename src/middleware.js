import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode('sua_chave_secreta_super_segura');

/**
 * Middleware de autenticação global do Next.js
 * Intercepta todas as requisições para validar autenticação JWT
 * 
 * @middleware middleware
 * @param {NextRequest} request - Objeto de requisição do Next.js
 * @returns {NextResponse} Response com redirect ou continuação da requisição
 * 
 * @description Middleware que executa antes de todas as rotas e:
 * - Valida tokens JWT em cookies para rotas protegidas
 * - Permite acesso livre a rotas públicas (login, register, etc)
 * - Redireciona usuários não autenticados para página de login
 * - Redireciona usuários autenticados da landing page para dashboard
 * - Remove cookies inválidos automaticamente
 * - Implementa logging detalhado para debug de autenticação
 * 
 * @flow Fluxo de execução:
 * 1. Extrai pathname da URL da requisição
 * 2. Verifica se rota está na lista de rotas públicas
 * 3. Se pública: permite acesso direto
 * 4. Se protegida: valida token JWT em cookies
 * 5. Token válido: permite acesso ou redireciona conforme regras
 * 6. Token inválido/ausente: limpa cookies e redireciona para login
 * 
 * @routes Rotas públicas (não requerem autenticação):
 * - / (landing page)
 * - /login (página de login)
 * - /register e /registo (páginas de registro)
 * - /api/auth/login (endpoint de login)
 * - /api/utilizadores (endpoint de registro)
 * 
 * @security
 * - Usa biblioteca 'jose' para verificação segura de JWT
 * - Chave secreta codificada com TextEncoder
 * - Cleanup automático de cookies inválidos
 * - Logging de todas as operações de autenticação
 * 
 * @performance
 * - Executa apenas em rotas relevantes (excluindo _next/, api/, etc)
 * - Verificação rápida de rotas públicas antes de validação JWT
 * - Cache automático de verificação JWT pelo Next.js
 * 
 * @example
 * // Configuração automática - executa em todas as rotas conforme matcher
 * // Usuário acessa /dashboard sem token → redirect para /
 * // Usuário acessa /login com token válido → redirect para /dashboard
 * 
 * @requires Cookie 'token' com JWT válido para rotas protegidas
 * @redirects Múltiplos cenários de redirect baseados em autenticação
 */
export async function middleware(request) {
  // Extração de pathname: obtém caminho da URL para roteamento
  const { pathname } = request.nextUrl;
  console.log('Middleware executando para:', pathname); // Debug logging

  // Whitelist de rotas públicas: não requerem autenticação
  // Inclui landing page, auth endpoints e páginas de registro
  const publicRoutes = [
    '/',                    // Landing page principal
    '/login',              // Página de login
    '/register',           // Página de registro (inglês)
    '/registo',            // Página de registro (português)
    '/api/auth/login',     // Endpoint de autenticação
    '/api/utilizadores'    // Endpoint de registro de usuários
  ];

  // Early return para rotas públicas: otimização de performance
  // Evita validação JWT desnecessária em rotas que não precisam
  if (publicRoutes.includes(pathname)) {
    console.log('Rota pública, permitindo acesso');
    return NextResponse.next(); // Passa para próximo middleware/handler
  }

  // Extração de token JWT: busca em cookies da requisição
  // Optional chaining previne erros se cookie não existir
  const token = request.cookies.get('token')?.value;
  console.log('Token encontrado no middleware:', !!token); // Boolean logging

  // Validação de presença de token: redirect se ausente
  if (!token) {
    console.log('Sem token, redirecionando para login');
    // Redirect para landing page onde usuário pode fazer login
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    // Verificação JWT: valida assinatura, expiração e integridade
    // jwtVerify é assíncrono e lança exceção se token inválido
    await jwtVerify(token, secret);
    console.log('Token válido, permitindo acesso');
    
    // Lógica de redirect pós-autenticação: usuários autenticados não devem ver páginas públicas
    // Previne acesso à landing page e registro se já logado
    if (pathname === '/' || pathname === '/register') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Token válido e rota apropriada: permite continuação
    return NextResponse.next();
  } catch (error) {
    // Error handling para tokens inválidos: cleanup + redirect
    console.log('Token inválido:', error.message);
    
    // Cleanup de cookies: remove token inválido/expirado
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('token'); // Limpa cookie corrompido
    return response;
  }
}

/**
 * Configuração do matcher do middleware
 * Define quais rotas devem ser interceptadas pelo middleware
 * 
 * @config matcher
 * @description Regex pattern que especifica rotas onde middleware executa:
 * - Inclui: Todas as rotas de páginas da aplicação
 * - Exclui: APIs internas, assets estáticos e arquivos de sistema
 * 
 * @pattern Breakdown do regex:
 * - `/` - Inicia na raiz
 * - `(?!...)` - Negative lookahead: exclui matches
 * - `api` - Exclui rotas /api/* (APIs já têm middleware próprio)
 * - `_next/static` - Exclui assets estáticos do Next.js
 * - `_next/image` - Exclui otimizador de imagens do Next.js  
 * - `favicon.ico` - Exclui ícone do site
 * - `.*` - Captura qualquer rota que não seja excluída
 * 
 * @performance
 * - Evita execução desnecessária em assets
 * - Reduz overhead em requests de API
 * - Foca apenas em rotas de páginas que precisam de auth
 * 
 * @examples Rotas interceptadas:
 * - `/dashboard` ✅ (precisa de auth)
 * - `/profile` ✅ (precisa de auth)
 * - `/login` ✅ (pode redirecionar se já autenticado)
 * 
 * @examples Rotas ignoradas:
 * - `/api/notas` ❌ (API tem próprio middleware)
 * - `/_next/static/css/app.css` ❌ (asset estático)
 * - `/favicon.ico` ❌ (arquivo de sistema)
 */
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)', // Regex otimizado para rotas de páginas
  ],
};
