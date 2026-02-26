export { default as proxy } from 'next-auth/middleware';

export const config = {
  matcher: ['/((?!api/auth|api/bootstrap|api/v1/scales|login|setup|_next/static|_next/image|favicon.ico).*)'],
};

