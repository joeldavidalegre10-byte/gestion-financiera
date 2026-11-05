import config from '@payload-config'
import { getPayload } from 'payload'
import { getCurrentUser } from '@/lib/app-auth'
import { AuthScreen } from './auth-screen'
import { FinanceApp } from './finance-app'

export default async function HomePage() {
  const user = await getCurrentUser()
  if (!user) return <AuthScreen />

  const payload = await getPayload({ config })
  const [accounts, categories, cards, obligations, transactions, installments, schedules, reminders] =
    await Promise.all([
      payload.find({ collection: 'accounts', limit: 200, sort: 'name', overrideAccess: false, user }),
      payload.find({ collection: 'categories', limit: 200, sort: 'name', overrideAccess: false, user }),
      payload.find({ collection: 'credit-cards', limit: 100, sort: 'name', overrideAccess: false, user }),
      payload.find({ collection: 'obligations', limit: 200, sort: 'dueDate', overrideAccess: false, user }),
      payload.find({ collection: 'transactions', limit: 500, sort: '-date', depth: 1, overrideAccess: false, user }),
      payload.find({ collection: 'installments', limit: 500, sort: 'dueDate', overrideAccess: false, user }),
      payload.find({ collection: 'income-schedules', limit: 100, sort: 'nextDate', overrideAccess: false, user }),
      payload.find({ collection: 'reminders', limit: 200, sort: 'dueDate', overrideAccess: false, user }),
    ])

  return (
    <FinanceApp
      user={user}
      data={{
        accounts: accounts.docs,
        categories: categories.docs,
        cards: cards.docs,
        obligations: obligations.docs,
        transactions: transactions.docs,
        installments: installments.docs,
        schedules: schedules.docs,
        reminders: reminders.docs,
      }}
    />
  )
}
