import { withAuth } from 'next-auth/middleware'

export default withAuth({
  callbacks: {
    authorized: ({ token }) =>
      !!token &&
      typeof token.email === 'string' &&
      token.email.endsWith('@getmanfred.com'),
  },
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: ['/admin/:path*'],
}
