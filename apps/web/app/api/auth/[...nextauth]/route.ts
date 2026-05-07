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
  async jwt({ token, account }) {

    console.log("JWT CALLBACK")
    console.log("ACCOUNT:", account)
    console.log("TOKEN BEFORE:", token)

    if (account) {
      token.accessToken = account.access_token
    }

    console.log("TOKEN AFTER:", token)

    return token
  },

  async session({ session, token }) {

    console.log("SESSION CALLBACK")
    console.log("SESSION:", session)
    console.log("TOKEN:", token)

    return {
      ...session,
      accessToken: token.accessToken,
    }
  },
},

  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }