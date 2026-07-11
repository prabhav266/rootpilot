import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

const handler = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token
      }

      if (profile) {
        const githubProfile = profile as { id?: number | string; login?: string }
        token.githubId = githubProfile.id ? String(githubProfile.id) : token.sub
        token.githubLogin = githubProfile.login
      }

      return token
    },

    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken,
        user: {
          ...session.user,
          id: token.githubId ?? token.sub,
          login: token.githubLogin,
        },
      }
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }
