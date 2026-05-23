import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.password) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.plan = (user as { plan?: string }).plan
      }

      // Sempre busca plano atualizado do banco (captura upgrades sem re-login)
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { plan: true, trialEndsAt: true, subscription: { select: { status: true } } },
        })

        if (dbUser) {
          // Se trial expirou e não tem assinatura paga ativa → rebaixa para FREE
          const trialExpired = dbUser.trialEndsAt && dbUser.trialEndsAt < new Date()
          const hasPaidSub = dbUser.subscription?.status === "ACTIVE"

          if (trialExpired && !hasPaidSub && dbUser.plan !== "FREE") {
            await prisma.user.update({
              where: { id: token.id as string },
              data: { plan: "FREE" },
            })
            token.plan = "FREE"
            token.trialEndsAt = null
          } else {
            token.plan = dbUser.plan
            token.trialEndsAt = dbUser.trialEndsAt?.toISOString() ?? null
          }
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.plan = token.plan as string
        session.user.trialEndsAt = (token.trialEndsAt as string | null) ?? null
      }
      return session
    },
  },
})
