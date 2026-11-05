import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'
import { cookies } from 'next/headers'
import type { User } from '@/payload-types'

const SESSION_COOKIE = 'app-session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7

export async function setAppSession(token: string) {
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function clearAppSession() {
  const store = await cookies()
  store.set(SESSION_COOKIE, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null

  const payload = await getPayload({ config })
  const headers = new Headers({ Authorization: `JWT ${token}` })
  const { user } = await payload.auth({ headers })
  if (!user || user.collection !== 'users') return null
  return user as User
}
