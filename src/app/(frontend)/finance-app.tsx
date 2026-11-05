'use client'

import { useMemo, useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { Account, Category, CreditCard, IncomeSchedule, Installment, Obligation, Reminder, Transaction, User } from '@/payload-types'
import {
  createAccountAction,
  createCardAction,
  createCategoryAction,
  createIncomeScheduleAction,
  createObligationAction,
  createReminderAction,
  createTransactionAction,
  deleteRecordAction,
  logoutAction,
  type ActionResult,
} from './actions'

type FinanceData = {
  accounts: Account[]
  categories: Category[]
  cards: CreditCard[]
  obligations: Obligation[]
  transactions: Transaction[]
  installments: Installment[]
  schedules: IncomeSchedule[]
  reminders: Reminder[]
}

type Tab = 'dashboard' | 'movements' | 'accounts' | 'cards' | 'debts' | 'calendar' | 'reports'
type Modal = 'transaction' | 'account' | 'category' | 'card' | 'obligation' | 'incomeSchedule' | 'reminder' | null

const nav: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Inicio', icon: 'home' },
  { id: 'movements', label: 'Movimientos', icon: 'swap' },
  { id: 'accounts', label: 'Cuentas', icon: 'wallet' },
  { id: 'cards', label: 'Tarjetas', icon: 'card' },
  { id: 'debts', label: 'Deudas', icon: 'layers' },
  { id: 'calendar', label: 'Calendario', icon: 'calendar' },
  { id: 'reports', label: 'Informes', icon: 'chart' },
]

const iconPaths: Record<string, ReactNode> = {
  home: <><path d="M3 10.8 12 3l9 7.8" /><path d="M5.5 9.5V21h13V9.5M9 21v-7h6v7" /></>,
  swap: <><path d="M4 7h14l-3-3M20 17H6l3 3" /></>,
  wallet: <><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H19v16H5.5A2.5 2.5 0 0 1 3 17.5v-11Z" /><path d="M3 7h16M15 12h6v4h-6a2 2 0 0 1 0-4Z" /></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  trash: <><path d="M4 7h16M9 3h6l1 4H8l1-4ZM7 7l1 14h8l1-14" /></>,
  dots: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
}

function Icon({ name, className = 'size-5' }: { name: string; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{iconPaths[name]}</svg>
}

const money = (value: number) => `${new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(Math.round(value))} Gs.`
const shortMoney = (value: number) => `${new Intl.NumberFormat('es-PY', { notation: 'compact', maximumFractionDigits: 1 }).format(value)} Gs.`
const dateLabel = (value: string) => new Intl.DateTimeFormat('es-PY', { day: '2-digit', month: 'short' }).format(new Date(value))
const relationId = (value: unknown) => typeof value === 'object' && value && 'id' in value ? String(value.id) : value ? String(value) : ''
const relationName = (value: unknown, fallback = 'Sin categoría') => typeof value === 'object' && value && 'name' in value ? String(value.name) : fallback

export function FinanceApp({ user, data }: { user: User; data: FinanceData }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [modal, setModal] = useState<Modal>(null)
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7))
  const [message, setMessage] = useState<ActionResult | null>(null)
  const [pending, startTransition] = useTransition()

  const current = useMemo(() => data.transactions.filter((t) => t.date.slice(0, 7) === period), [data.transactions, period])
  const incomes = current.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const expenses = current.filter((t) => t.type === 'expense' || t.type === 'credit-purchase').reduce((sum, t) => sum + t.amount, 0)
  const accountBalance = data.accounts.reduce((sum, account) => {
    const changes = data.transactions.reduce((value, transaction) => {
      const source = relationId(transaction.account) === account.id
      const destination = relationId(transaction.destinationAccount) === account.id
      if (transaction.type === 'income' && source) return value + transaction.amount
      if (transaction.type === 'transfer') return value + (destination ? transaction.amount : 0) - (source ? transaction.amount : 0)
      if (['expense', 'credit-payment', 'debt-payment', 'education-payment'].includes(transaction.type) && source) return value - transaction.amount
      return value
    }, 0)
    return sum + account.initialBalance + changes
  }, 0)
  const cardDebt = data.cards.reduce((sum, card) => {
    const movements = data.transactions.reduce((value, t) => {
      if (relationId(t.creditCard) !== card.id) return value
      if (t.type === 'credit-purchase') return value + t.amount
      if (t.type === 'credit-payment') return value - t.amount
      return value
    }, 0)
    return sum + Math.max(0, card.openingUsedBalance + movements)
  }, 0)
  const obligationDebt = data.obligations.reduce((sum, item) => {
    const payments = data.transactions
      .filter((t) => relationId(t.obligation) === item.id && ['debt-payment', 'education-payment'].includes(t.type))
      .reduce((total, t) => total + t.amount, 0)
    return sum + Math.max(0, item.originalAmount - (item.openingPaidAmount ?? 0) - payments)
  }, 0)
  const totalDebt = cardDebt + obligationDebt
  const commitment = accountBalance > 0 ? Math.min(100, (totalDebt / accountBalance) * 100) : totalDebt > 0 ? 100 : 0
  const remaining = incomes - expenses

  const expenseGroups = useMemo(() => {
    const groups = new Map<string, number>()
    current.filter((t) => t.type === 'expense' || t.type === 'credit-purchase').forEach((t) => {
      const name = relationName(t.category)
      groups.set(name, (groups.get(name) ?? 0) + t.amount)
    })
    return [...groups].sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [current])

  const filteredTransactions = data.transactions.filter((t) =>
    `${t.description} ${relationName(t.category, '')}`.toLowerCase().includes(search.toLowerCase()),
  )

  const submit = (action: (formData: FormData) => Promise<ActionResult>) => (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = await action(form)
      setMessage(result)
      if (result.ok) {
        setModal(null)
        router.refresh()
      }
    })
  }

  const remove = (collection: string, id: string) => {
    startTransition(async () => {
      const result = await deleteRecordAction(collection, id)
      setMessage(result)
      if (result.ok) router.refresh()
    })
  }

  const download = (name: string, contents: string, type: string) => {
    const url = URL.createObjectURL(new Blob([contents], { type }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = name
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const exportCsv = () => {
    const rows = [
      ['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Importe'],
      ...data.transactions.map((item) => [
        item.date.slice(0, 10),
        transactionTypeLabel[item.type],
        item.description,
        relationName(item.category, ''),
        String(item.amount),
      ]),
    ]
    download('movimientos.csv', rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\n'), 'text/csv;charset=utf-8')
  }

  const backup = () => download('respaldo-finanzas.json', JSON.stringify(data, null, 2), 'application/json')

  const today = new Date()
  const upcoming = [
    ...data.installments.filter((item) => item.status !== 'paid').map((item) => ({
      id: item.id,
      title: item.label,
      subtitle: item.creditCard ? 'Tarjeta' : 'Cuota',
      amount: item.amount,
      date: item.dueDate,
      color: item.creditCard ? 'blue' : 'orange',
    })),
    ...data.reminders.filter((item) => !item.completed).map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: 'Recordatorio',
      amount: item.amount ?? 0,
      date: item.dueDate,
      color: 'orange',
    })),
    ...data.schedules.filter((item) => item.active).map((item) => ({
      id: item.id,
      title: item.name,
      subtitle: 'Ingreso programado',
      amount: item.amount,
      date: item.nextDate,
      color: 'blue',
    })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4)

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#242421]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] border-r border-black/[.07] bg-[#f1f1ef] p-3 lg:flex lg:flex-col">
        <div className="flex h-14 items-center gap-3 px-2">
          <span className="grid size-8 place-items-center rounded-lg bg-[#20201e] text-sm font-semibold text-white">F</span>
          <div><p className="text-sm font-semibold leading-4">Mis finanzas</p><p className="text-[11px] text-[#8a8a84]">Espacio personal</p></div>
        </div>
        <nav className="mt-4 space-y-0.5">
          {nav.map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`nav-item ${tab === item.id ? 'nav-active' : ''}`}>
              <Icon name={item.icon} className="size-[18px]" /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-5 border-t border-black/[.06] pt-4">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#999992]">Accesos rápidos</p>
          <button className="nav-item mt-2" onClick={() => setModal('category')}><Icon name="plus" className="size-4" /> Nueva categoría</button>
          <button className="nav-item" onClick={() => setModal('account')}><Icon name="plus" className="size-4" /> Nueva cuenta</button>
        </div>
        <div className="mt-auto rounded-xl border border-black/[.06] bg-white/70 p-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-full bg-[#dce9df] text-xs font-semibold text-[#315f3d]">{user.name.slice(0, 2).toUpperCase()}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{user.name}</p><p className="truncate text-[10px] text-[#888881]">{user.email}</p></div>
            <button title="Cerrar sesión" onClick={() => startTransition(async () => { await logoutAction(); router.refresh() })}><Icon name="chevron" className="size-4 text-[#8b8b84]" /></button>
          </div>
        </div>
      </aside>

      <main className="pb-24 lg:ml-[244px] lg:pb-8">
        <header className="sticky top-0 z-20 flex h-16 items-center border-b border-black/[.06] bg-[#f7f7f5]/90 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
          <div className="flex items-center gap-3 lg:hidden"><span className="grid size-8 place-items-center rounded-lg bg-[#20201e] text-sm font-semibold text-white">F</span></div>
          <div className="relative ml-auto w-full max-w-[360px] lg:ml-0">
            <Icon name="search" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#a0a099]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full rounded-lg border border-black/[.07] bg-white/70 pl-9 pr-3 text-xs outline-none transition focus:border-black/20" placeholder="Buscar movimientos…" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="icon-button relative"><Icon name="bell" className="size-[18px]" />{upcoming.length > 0 && <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#e56b57]" />}</button>
            <button className="hidden h-9 items-center gap-2 rounded-lg bg-[#242421] px-3.5 text-xs font-semibold text-white sm:flex" onClick={() => setModal('transaction')}><Icon name="plus" className="size-4" /> Movimiento</button>
          </div>
        </header>

        <div className="mx-auto max-w-[1450px] px-4 py-6 sm:px-7 lg:px-10 lg:py-9">
          {message && <div className={`mb-5 flex items-center justify-between rounded-xl px-4 py-3 text-sm ${message.ok ? 'bg-[#e5f2e8] text-[#2f6b3d]' : 'bg-[#fae8e5] text-[#a94335]'}`}><span>{message.message}</span><button onClick={() => setMessage(null)}><Icon name="close" className="size-4" /></button></div>}
          {tab === 'dashboard' && (
            <>
              <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
                <div><p className="text-xs font-medium text-[#8c8c85]">Resumen financiero</p><h1 className="mt-1 text-2xl font-semibold tracking-[-.035em] sm:text-[30px]">Hola, {user.name.split(' ')[0]}</h1><p className="mt-1 text-sm text-[#777770]">Esta es tu situación al día de hoy.</p></div>
                <input aria-label="Período" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="h-9 rounded-lg border border-black/[.08] bg-white px-3 text-xs" />
              </div>
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Saldo disponible" value={money(accountBalance)} hint={`${data.accounts.length} cuentas activas`} tone="dark" />
                <MetricCard label="Ingresos del mes" value={money(incomes)} hint={current.filter((t) => t.type === 'income').length ? `${current.filter((t) => t.type === 'income').length} movimientos` : 'Sin ingresos aún'} tone="green" />
                <MetricCard label="Gastos del mes" value={money(expenses)} hint={incomes > 0 ? `${Math.round((expenses / incomes) * 100)}% de tus ingresos` : 'Sin base de ingresos'} tone="red" />
                <MetricCard label="Deuda pendiente" value={money(totalDebt)} hint={`${Math.round(commitment)}% comprometido`} tone="orange" />
              </section>
              <section className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_.85fr]">
                <div className="panel min-h-[360px]">
                  <div className="panel-head"><div><p className="panel-title">Flujo mensual</p><p className="panel-subtitle">Ingresos y egresos del período</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${remaining >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{remaining >= 0 ? '+' : ''}{shortMoney(remaining)}</span></div>
                  <div className="mt-8 grid h-[210px] grid-cols-2 items-end gap-5 px-5 sm:gap-10 sm:px-16">
                    <Bar label="Ingresos" value={incomes} max={Math.max(incomes, expenses, 1)} tone="bg-[#8fbaa0]" />
                    <Bar label="Gastos" value={expenses} max={Math.max(incomes, expenses, 1)} tone="bg-[#dfa09a]" />
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-head"><div><p className="panel-title">Dinero comprometido</p><p className="panel-subtitle">Deudas frente a tu saldo</p></div></div>
                  <div className="mx-auto mt-8 grid size-44 place-items-center rounded-full" style={{ background: `conic-gradient(#df9b63 ${commitment}%, #ecece8 0)` }}>
                    <div className="grid size-32 place-items-center rounded-full bg-white text-center"><div><p className="text-3xl font-semibold tracking-tight">{Math.round(commitment)}%</p><p className="mt-1 text-[11px] text-[#888881]">comprometido</p></div></div>
                  </div>
                  <div className="mt-7 flex justify-between border-t border-black/[.06] pt-4 text-xs"><span className="text-[#85857e]">Restante del mes</span><strong className={remaining >= 0 ? 'text-[#39734a]' : 'text-[#ae4c42]'}>{money(remaining)}</strong></div>
                </div>
              </section>
              <section className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
                <div className="panel">
                  <div className="panel-head"><div><p className="panel-title">Movimientos recientes</p><p className="panel-subtitle">Última actividad registrada</p></div><button onClick={() => setTab('movements')} className="text-xs font-medium text-[#73736d]">Ver todos</button></div>
                  <TransactionList items={data.transactions.slice(0, 6)} empty="Todavía no registraste movimientos." />
                </div>
                <div className="panel">
                  <div className="panel-head"><div><p className="panel-title">Próximos vencimientos</p><p className="panel-subtitle">Pagos y recordatorios</p></div><button onClick={() => setTab('calendar')}><Icon name="calendar" className="size-4 text-[#85857e]" /></button></div>
                  <div className="mt-3 divide-y divide-black/[.05]">
                    {upcoming.length ? upcoming.map((item) => <div key={`${item.subtitle}-${item.id}`} className="flex items-center gap-3 py-3"><div className={`date-tile ${item.color === 'blue' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}><span>{new Date(item.date).getDate()}</span><small>{new Intl.DateTimeFormat('es', { month: 'short' }).format(new Date(item.date)).replace('.', '')}</small></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{item.title}</p><p className="mt-0.5 text-[10px] text-[#92928b]">{item.subtitle}</p></div><p className="text-xs font-semibold">{item.amount ? money(item.amount) : 'Pendiente'}</p></div>) : <EmptyState title="Todo al día" text="Agregá una deuda o recordatorio para verlo aquí." />}
                  </div>
                </div>
              </section>
            </>
          )}

          {tab === 'movements' && <Section title="Movimientos" subtitle="Ingresos, gastos, pagos y transferencias sin duplicaciones." action="Nuevo movimiento" onAction={() => setModal('transaction')}><div className="panel"><div className="mb-4 flex items-center justify-between"><p className="text-sm font-semibold">Historial</p><span className="text-xs text-[#888881]">{filteredTransactions.length} registros</span></div><TransactionList items={filteredTransactions} empty="No hay movimientos para mostrar." onDelete={(id) => remove('transactions', id)} /></div></Section>}

          {tab === 'accounts' && <Section title="Cuentas" subtitle="Saldos derivados automáticamente de cada movimiento." action="Nueva cuenta" onAction={() => setModal('account')}><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.accounts.map((account) => { const balance = account.initialBalance + data.transactions.reduce((value, t) => { const source = relationId(t.account) === account.id; const destination = relationId(t.destinationAccount) === account.id; if (t.type === 'income' && source) return value + t.amount; if (t.type === 'transfer') return value + (destination ? t.amount : 0) - (source ? t.amount : 0); if (['expense', 'credit-payment', 'debt-payment', 'education-payment'].includes(t.type) && source) return value - t.amount; return value }, 0); return <EntityCard key={account.id} title={account.name} eyebrow={account.type} value={money(balance)} meta={`Saldo inicial ${money(account.initialBalance)}`} onDelete={() => remove('accounts', account.id)} /> })}{!data.accounts.length && <EmptyCard title="No hay cuentas" text="Agregá efectivo, una cuenta bancaria o una billetera." onClick={() => setModal('account')} />}</div></Section>}

          {tab === 'cards' && <Section title="Tarjetas de crédito" subtitle="Compras y pagos separados para no duplicar gastos." action="Agregar tarjeta" onAction={() => setModal('card')}><div className="grid gap-4 lg:grid-cols-2">{data.cards.map((card) => { const used = Math.max(0, card.openingUsedBalance + data.transactions.reduce((sum, t) => relationId(t.creditCard) === card.id ? sum + (t.type === 'credit-purchase' ? t.amount : t.type === 'credit-payment' ? -t.amount : 0) : sum, 0)); const available = Math.max(0, card.creditLimit - used); return <div key={card.id} className="overflow-hidden rounded-2xl border border-black/[.07] bg-[#20211f] p-5 text-white shadow-sm"><div className="flex justify-between"><div><p className="text-[10px] uppercase tracking-[.14em] text-white/45">{card.bank}</p><h3 className="mt-1 text-base font-semibold">{card.name}</h3></div><button onClick={() => remove('credit-cards', card.id)} className="text-white/35 hover:text-white"><Icon name="trash" className="size-4" /></button></div><p className="mt-8 text-[10px] text-white/45">Disponible</p><p className="mt-1 text-2xl font-semibold tracking-tight">{money(available)}</p><div className="mt-5 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-[#9bc2a5]" style={{ width: `${Math.min(100, card.creditLimit ? (used / card.creditLimit) * 100 : 0)}%` }} /></div><div className="mt-4 flex justify-between text-[10px] text-white/55"><span>Usado {money(used)}</span><span>Cierre {card.closingDay} · Vence {card.dueDay}</span></div></div>})}{!data.cards.length && <EmptyCard title="Sin tarjetas" text="Agregá una tarjeta para controlar límite, compras y pagos." onClick={() => setModal('card')} />}</div></Section>}

          {tab === 'debts' && <Section title="Préstamos y facultad" subtitle="Progreso, cuotas y saldos pendientes en un mismo lugar." action="Nueva obligación" onAction={() => setModal('obligation')}><div className="space-y-3">{data.obligations.map((item) => { const paid = (item.openingPaidAmount ?? 0) + data.transactions.filter((t) => relationId(t.obligation) === item.id && ['debt-payment', 'education-payment'].includes(t.type)).reduce((sum, t) => sum + t.amount, 0); const progress = Math.min(100, (paid / item.originalAmount) * 100); return <div key={item.id} className="panel flex flex-col gap-5 sm:flex-row sm:items-center"><div className={`grid size-11 shrink-0 place-items-center rounded-xl ${item.type === 'education' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}><Icon name={item.type === 'education' ? 'layers' : 'wallet'} className="size-5" /></div><div className="min-w-0 flex-1"><div className="flex justify-between gap-4"><div><p className="font-semibold">{item.name}</p><p className="mt-1 text-xs text-[#898982]">{item.creditor} · {item.totalInstallments} cuotas</p></div><div className="text-right"><p className="font-semibold">{money(Math.max(0, item.originalAmount - paid))}</p><p className="mt-1 text-[10px] text-[#92928b]">pendiente</p></div></div><div className="mt-4 h-1.5 rounded-full bg-[#ecece8]"><div className="h-full rounded-full bg-[#86ad91]" style={{ width: `${progress}%` }} /></div><div className="mt-2 flex justify-between text-[10px] text-[#92928b]"><span>{Math.round(progress)}% cancelado</span><span>Próxima: {dateLabel(item.dueDate)}</span></div></div><button onClick={() => remove('obligations', item.id)} className="self-end text-[#aaa9a2] hover:text-red-600 sm:self-center"><Icon name="trash" className="size-4" /></button></div>})}{!data.obligations.length && <EmptyCard title="Sin obligaciones" text="Registrá préstamos, matrícula o cuotas universitarias." onClick={() => setModal('obligation')} />}</div></Section>}

          {tab === 'calendar' && <Section title="Calendario financiero" subtitle="Cobros, pagos y vencimientos organizados por fecha."><div className="mb-4 flex flex-wrap gap-2"><button onClick={() => setModal('incomeSchedule')} className="h-9 rounded-lg bg-[#242421] px-3.5 text-xs font-semibold text-white">Programar ingreso</button><button onClick={() => setModal('reminder')} className="h-9 rounded-lg border border-black/[.08] bg-white px-3.5 text-xs font-semibold">Nuevo recordatorio</button></div><div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]"><Calendar month={today} items={upcoming} /><div className="panel"><p className="panel-title">Agenda próxima</p><p className="panel-subtitle">Obligaciones registradas</p><div className="mt-4 divide-y divide-black/[.05]">{upcoming.map((item) => <div key={`${item.id}-${item.subtitle}-agenda`} className="flex items-center gap-3 py-3"><span className={`size-2 rounded-full ${item.subtitle === 'Ingreso programado' ? 'bg-emerald-500' : 'bg-[#db8d53]'}`} /><div className="flex-1"><p className="text-xs font-semibold">{item.title}</p><p className="text-[10px] text-[#92928b]">{item.subtitle} · {dateLabel(item.date)}</p></div><strong className="text-xs">{item.amount ? money(item.amount) : ''}</strong></div>)}{!upcoming.length && <EmptyState title="Sin eventos próximos" text="Tus vencimientos aparecerán aquí." />}</div></div></div></Section>}

          {tab === 'reports' && <Section title="Informes" subtitle="Distribución y evolución de tu dinero."><div className="mb-4 flex flex-wrap gap-2"><button onClick={exportCsv} className="h-9 rounded-lg bg-[#242421] px-3.5 text-xs font-semibold text-white">Exportar Excel (CSV)</button><button onClick={backup} className="h-9 rounded-lg border border-black/[.08] bg-white px-3.5 text-xs font-semibold">Descargar respaldo</button></div><div className="grid gap-4 lg:grid-cols-2"><div className="panel"><p className="panel-title">Gastos por categoría</p><p className="panel-subtitle">Período seleccionado en el inicio</p><div className="mt-6 space-y-4">{expenseGroups.map(([name, value], index) => <div key={name}><div className="mb-2 flex justify-between text-xs"><span>{name}</span><strong>{money(value)}</strong></div><div className="h-2 rounded-full bg-[#efefec]"><div className="h-full rounded-full bg-[#9eaaa1]" style={{ width: `${expenses ? (value / expenses) * 100 : 0}%`, opacity: 1 - index * .1 }} /></div></div>)}{!expenseGroups.length && <EmptyState title="Sin datos para analizar" text="Registrá gastos para ver su distribución." />}</div></div><div className="panel"><p className="panel-title">Distribución financiera</p><p className="panel-subtitle">Vista general actual</p><div className="mt-6 space-y-5"><ReportLine label="Saldo disponible" value={accountBalance} total={Math.max(accountBalance + totalDebt, 1)} tone="bg-[#89ae93]" /><ReportLine label="Tarjetas" value={cardDebt} total={Math.max(accountBalance + totalDebt, 1)} tone="bg-[#d99a91]" /><ReportLine label="Préstamos y educación" value={obligationDebt} total={Math.max(accountBalance + totalDebt, 1)} tone="bg-[#dca16f]" /></div><button onClick={() => window.print()} className="mt-8 h-10 w-full rounded-lg border border-black/[.08] bg-white text-xs font-semibold">Exportar informe a PDF</button></div></div></Section>}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid h-[72px] grid-cols-5 border-t border-black/[.08] bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        {nav.slice(0, 4).map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`flex flex-col items-center justify-center gap-1 text-[9px] ${tab === item.id ? 'text-[#222220]' : 'text-[#92928b]'}`}><Icon name={item.icon} className="size-5" /><span>{item.label}</span></button>)}
        <button onClick={() => setTab(tab === 'reports' ? 'dashboard' : 'reports')} className={`flex flex-col items-center justify-center gap-1 text-[9px] ${['reports', 'calendar', 'debts'].includes(tab) ? 'text-[#222220]' : 'text-[#92928b]'}`}><Icon name="dots" className="size-5" /><span>Más</span></button>
      </nav>
      <button aria-label="Agregar movimiento" onClick={() => setModal('transaction')} className="fixed bottom-[86px] right-4 z-20 grid size-12 place-items-center rounded-full bg-[#242421] text-white shadow-xl lg:hidden"><Icon name="plus" className="size-5" /></button>

      {modal && <ModalShell title={modalTitles[modal]} onClose={() => setModal(null)}>
        {modal === 'transaction' && <TransactionForm data={data} submit={submit(createTransactionAction)} pending={pending} />}
        {modal === 'account' && <AccountForm submit={submit(createAccountAction)} pending={pending} />}
        {modal === 'category' && <CategoryForm submit={submit(createCategoryAction)} pending={pending} />}
        {modal === 'card' && <CardForm submit={submit(createCardAction)} pending={pending} />}
        {modal === 'obligation' && <ObligationForm submit={submit(createObligationAction)} pending={pending} />}
        {modal === 'incomeSchedule' && <IncomeScheduleForm data={data} submit={submit(createIncomeScheduleAction)} pending={pending} />}
        {modal === 'reminder' && <ReminderForm submit={submit(createReminderAction)} pending={pending} />}
      </ModalShell>}
    </div>
  )
}

const modalTitles = { transaction: 'Nuevo movimiento', account: 'Nueva cuenta', category: 'Nueva categoría', card: 'Agregar tarjeta', obligation: 'Nueva obligación', incomeSchedule: 'Programar ingreso', reminder: 'Nuevo recordatorio' }
function MetricCard({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: string }) { const colors: Record<string, string> = { dark: 'bg-[#222321] text-white', green: 'bg-[#edf4ee]', red: 'bg-[#f8eeee]', orange: 'bg-[#f8f0e8]' }; return <div className={`rounded-2xl border border-black/[.05] p-4 shadow-[0_1px_1px_rgba(0,0,0,.02)] ${colors[tone]}`}><p className={`text-[11px] font-medium ${tone === 'dark' ? 'text-white/55' : 'text-[#7f7f78]'}`}>{label}</p><p className="mt-4 truncate text-xl font-semibold tracking-[-.025em]">{value}</p><p className={`mt-2 text-[10px] ${tone === 'dark' ? 'text-white/40' : 'text-[#92928b]'}`}>{hint}</p></div> }
function Bar({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) { return <div className="flex h-full flex-col justify-end"><div className={`relative min-h-2 rounded-t-lg ${tone}`} style={{ height: `${Math.max(value ? 8 : 2, (value / max) * 85)}%` }}><span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold">{shortMoney(value)}</span></div><p className="mt-3 text-center text-[10px] text-[#888881]">{label}</p></div> }
function Section({ title, subtitle, action, onAction, children }: { title: string; subtitle: string; action?: string; onAction?: () => void; children: ReactNode }) { return <><div className="mb-7 flex items-end justify-between gap-4"><div><p className="text-xs font-medium text-[#8c8c85]">Centro financiero</p><h1 className="mt-1 text-2xl font-semibold tracking-[-.035em] sm:text-[30px]">{title}</h1><p className="mt-1 text-sm text-[#777770]">{subtitle}</p></div>{action && <button onClick={onAction} className="h-9 shrink-0 rounded-lg bg-[#242421] px-3.5 text-xs font-semibold text-white">{action}</button>}</div>{children}</> }
function TransactionList({ items, empty, onDelete }: { items: Transaction[]; empty: string; onDelete?: (id: string) => void }) { return <div className="mt-3 divide-y divide-black/[.05]">{items.length ? items.map((item) => { const positive = item.type === 'income'; const neutral = item.type === 'transfer'; return <div key={item.id} className="group flex items-center gap-3 py-3"><div className={`grid size-9 shrink-0 place-items-center rounded-xl ${positive ? 'bg-emerald-50 text-emerald-700' : neutral ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-600'}`}><Icon name={neutral ? 'swap' : positive ? 'plus' : 'wallet'} className="size-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{item.description}</p><p className="mt-0.5 text-[10px] text-[#92928b]">{relationName(item.category, transactionTypeLabel[item.type])} · {dateLabel(item.date)}</p></div><p className={`whitespace-nowrap text-xs font-semibold ${positive ? 'text-emerald-700' : neutral ? 'text-[#5f6f8c]' : 'text-[#343431]'}`}>{positive ? '+' : neutral ? '' : '-'}{money(item.amount)}</p>{onDelete && <button onClick={() => onDelete(item.id)} className="hidden text-[#aaa9a2] hover:text-red-600 sm:group-hover:block"><Icon name="trash" className="size-4" /></button>}</div> }) : <EmptyState title="Sin actividad" text={empty} />}</div> }
const transactionTypeLabel: Record<Transaction['type'], string> = { income: 'Ingreso', expense: 'Gasto', transfer: 'Transferencia', 'credit-purchase': 'Compra con tarjeta', 'credit-payment': 'Pago de tarjeta', 'debt-payment': 'Pago de préstamo', 'education-payment': 'Pago de facultad' }
function EmptyState({ title, text }: { title: string; text: string }) { return <div className="py-10 text-center"><p className="text-xs font-semibold">{title}</p><p className="mx-auto mt-1 max-w-xs text-[11px] leading-5 text-[#999992]">{text}</p></div> }
function EmptyCard({ title, text, onClick }: { title: string; text: string; onClick: () => void }) { return <button onClick={onClick} className="min-h-44 rounded-2xl border border-dashed border-black/15 bg-white/40 p-6 text-left transition hover:bg-white"><Icon name="plus" className="size-5 text-[#8b8b84]" /><p className="mt-6 text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-[#8b8b84]">{text}</p></button> }
function EntityCard({ title, eyebrow, value, meta, onDelete }: { title: string; eyebrow: string; value: string; meta: string; onDelete: () => void }) { return <div className="panel"><div className="flex justify-between"><p className="text-[10px] uppercase tracking-[.12em] text-[#92928b]">{eyebrow}</p><button onClick={onDelete} className="text-[#aaa9a2] hover:text-red-600"><Icon name="trash" className="size-4" /></button></div><h3 className="mt-2 text-sm font-semibold">{title}</h3><p className="mt-7 text-xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-[10px] text-[#92928b]">{meta}</p></div> }
function ReportLine({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) { return <div><div className="mb-2 flex justify-between text-xs"><span>{label}</span><strong>{money(value)}</strong></div><div className="h-2 rounded-full bg-[#efefec]"><div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, Math.max(0, (value / total) * 100))}%` }} /></div></div> }
function Calendar({ month, items }: { month: Date; items: { date: string }[] }) { const first = new Date(month.getFullYear(), month.getMonth(), 1); const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(); const blanks = (first.getDay() + 6) % 7; return <div className="panel"><div className="flex items-center justify-between"><div><p className="panel-title capitalize">{new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(month)}</p><p className="panel-subtitle">Vista mensual</p></div></div><div className="mt-6 grid grid-cols-7 text-center text-[10px] font-semibold text-[#999992]">{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => <span key={d} className="py-2">{d}</span>)}{Array.from({ length: blanks }).map((_, i) => <span key={`b${i}`} />)}{Array.from({ length: days }).map((_, i) => { const day = i + 1; const has = items.some((item) => { const d = new Date(item.date); return d.getMonth() === month.getMonth() && d.getDate() === day }); const isToday = day === month.getDate(); return <div key={day} className="grid min-h-12 place-items-center border-t border-black/[.04]"><span className={`relative grid size-8 place-items-center rounded-full text-xs ${isToday ? 'bg-[#252522] text-white' : ''}`}>{day}{has && <i className={`absolute bottom-0.5 size-1 rounded-full ${isToday ? 'bg-white' : 'bg-[#dc8c55]'}`} />}</span></div> })}</div></div> }
function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <div className="fixed inset-0 z-50 flex items-end bg-black/25 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-5" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-[#fafaf8] shadow-2xl sm:max-w-[560px] sm:rounded-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/[.06] bg-[#fafaf8]/95 px-5 py-4 backdrop-blur"><div><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-[10px] text-[#92928b]">Los datos se guardan en tu espacio privado.</p></div><button className="icon-button" onClick={onClose}><Icon name="close" className="size-4" /></button></div><div className="p-5">{children}</div></div></div> }
const Field = ({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) => <label className={`block ${wide ? 'sm:col-span-2' : ''}`}><span className="mb-1.5 block text-[11px] font-medium text-[#60605b]">{label}</span>{children}</label>
const Submit = ({ pending, label = 'Guardar' }: { pending: boolean; label?: string }) => <button disabled={pending} className="mt-3 h-11 w-full rounded-xl bg-[#242421] text-xs font-semibold text-white disabled:opacity-50 sm:col-span-2">{pending ? 'Guardando…' : label}</button>
function TransactionForm({ data, submit, pending }: { data: FinanceData; submit: (e: FormEvent<HTMLFormElement>) => void; pending: boolean }) { const [type, setType] = useState('expense'); return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><Field label="Tipo" wide><select className="form-input" name="type" value={type} onChange={(e) => setType(e.target.value)}>{Object.entries(transactionTypeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Descripción" wide><input className="form-input" name="description" placeholder="Ej. Supermercado" required /></Field><Field label="Importe (Gs.)"><input className="form-input" name="amount" inputMode="numeric" placeholder="0" required /></Field><Field label="Fecha"><input className="form-input" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Field>{!['credit-purchase'].includes(type) && <Field label={type === 'transfer' ? 'Cuenta origen' : 'Cuenta utilizada'}><select className="form-input" name="account"><option value="">Seleccionar</option>{data.accounts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>}{type === 'transfer' && <Field label="Cuenta destino"><select className="form-input" name="destinationAccount"><option value="">Seleccionar</option>{data.accounts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>}{['expense', 'income', 'credit-purchase'].includes(type) && <Field label="Categoría"><select className="form-input" name="category"><option value="">Sin categoría</option>{data.categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>}{['credit-purchase', 'credit-payment'].includes(type) && <Field label="Tarjeta"><select className="form-input" name="creditCard" required><option value="">Seleccionar</option>{data.cards.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>}{type === 'credit-purchase' && <Field label="Cantidad de cuotas"><input className="form-input" name="installmentCount" type="number" min="1" max="60" defaultValue="1" /></Field>}{['debt-payment', 'education-payment'].includes(type) && <Field label="Obligación"><select className="form-input" name="obligation" required><option value="">Seleccionar</option>{data.obligations.filter((x) => type === 'education-payment' ? x.type === 'education' : x.type !== 'education').map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>}<Field label="Observaciones" wide><textarea className="form-input min-h-20 resize-none" name="notes" placeholder="Opcional" /></Field><Submit pending={pending} label="Guardar movimiento" /></form> }
function AccountForm({ submit, pending }: { submit: (e: FormEvent<HTMLFormElement>) => void; pending: boolean }) { return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><Field label="Nombre" wide><input className="form-input" name="name" placeholder="Ej. Cuenta principal" required /></Field><Field label="Tipo"><select className="form-input" name="type"><option value="cash">Efectivo</option><option value="bank">Cuenta bancaria</option><option value="savings">Ahorro</option><option value="wallet">Billetera digital</option><option value="other">Otra</option></select></Field><Field label="Saldo inicial"><input className="form-input" name="initialBalance" inputMode="numeric" defaultValue="0" required /></Field><Field label="Descripción" wide><textarea className="form-input min-h-20 resize-none" name="description" /></Field><Submit pending={pending} label="Crear cuenta" /></form> }
function CategoryForm({ submit, pending }: { submit: (e: FormEvent<HTMLFormElement>) => void; pending: boolean }) { return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><Field label="Nombre" wide><input className="form-input" name="name" placeholder="Ej. Alimentación" required /></Field><Field label="Aplica a" wide><select className="form-input" name="kind"><option value="expense">Gastos</option><option value="income">Ingresos</option><option value="both">Ambos</option></select></Field><Submit pending={pending} label="Crear categoría" /></form> }
function CardForm({ submit, pending }: { submit: (e: FormEvent<HTMLFormElement>) => void; pending: boolean }) { return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><Field label="Nombre"><input className="form-input" name="name" placeholder="Ej. Visa principal" required /></Field><Field label="Banco"><input className="form-input" name="bank" placeholder="Entidad" required /></Field><Field label="Límite de crédito"><input className="form-input" name="creditLimit" inputMode="numeric" required /></Field><Field label="Saldo ya utilizado"><input className="form-input" name="openingUsedBalance" inputMode="numeric" defaultValue="0" /></Field><Field label="Día de cierre"><input className="form-input" name="closingDay" type="number" min="1" max="31" required /></Field><Field label="Día de vencimiento"><input className="form-input" name="dueDay" type="number" min="1" max="31" required /></Field><Submit pending={pending} label="Agregar tarjeta" /></form> }
function ObligationForm({ submit, pending }: { submit: (e: FormEvent<HTMLFormElement>) => void; pending: boolean }) { const [type, setType] = useState('loan'); return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><Field label="Tipo" wide><select className="form-input" name="type" value={type} onChange={(e) => setType(e.target.value)}><option value="loan">Préstamo</option><option value="education">Facultad</option><option value="other">Otra deuda</option></select></Field><Field label="Nombre"><input className="form-input" name="name" placeholder={type === 'education' ? 'Ej. Cuotas 2026' : 'Ej. Préstamo personal'} required /></Field><Field label="Entidad o persona"><input className="form-input" name="creditor" required /></Field><Field label="Monto original"><input className="form-input" name="originalAmount" inputMode="numeric" required /></Field><Field label="Monto ya pagado"><input className="form-input" name="openingPaidAmount" inputMode="numeric" defaultValue="0" /></Field><Field label="Cantidad de cuotas"><input className="form-input" name="totalInstallments" type="number" min="1" required /></Field><Field label="Valor por cuota"><input className="form-input" name="installmentAmount" inputMode="numeric" required /></Field><Field label="Fecha de inicio"><input className="form-input" name="startDate" type="date" required /></Field><Field label="Próximo vencimiento"><input className="form-input" name="dueDate" type="date" required /></Field>{type === 'education' && <Field label="Concepto" wide><select className="form-input" name="educationKind"><option value="tuition">Mensualidad</option><option value="enrollment">Matrícula</option><option value="exam">Examen</option><option value="other">Otro</option></select></Field>}<Field label="Tasa de interés (%)"><input className="form-input" name="interestRate" type="number" min="0" max="100" step="0.01" /></Field><Submit pending={pending} label="Guardar obligación" /></form> }
function IncomeScheduleForm({ data, submit, pending }: { data: FinanceData; submit: (e: FormEvent<HTMLFormElement>) => void; pending: boolean }) { return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><Field label="Nombre" wide><input className="form-input" name="name" placeholder="Ej. Sueldo" required /></Field><Field label="Importe"><input className="form-input" name="amount" inputMode="numeric" required /></Field><Field label="Frecuencia"><select className="form-input" name="frequency"><option value="monthly">Mensual</option><option value="biweekly">Quincenal</option><option value="daily">Diaria</option><option value="once">Extraordinario</option></select></Field><Field label="Próxima fecha"><input className="form-input" name="nextDate" type="date" required /></Field><Field label="Cuenta de destino"><select className="form-input" name="account"><option value="">Sin asignar</option>{data.accounts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><Field label="Categoría"><select className="form-input" name="category"><option value="">Sin categoría</option>{data.categories.filter((x) => x.kind !== 'expense').map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><Submit pending={pending} label="Programar ingreso" /></form> }
function ReminderForm({ submit, pending }: { submit: (e: FormEvent<HTMLFormElement>) => void; pending: boolean }) { return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><Field label="Título" wide><input className="form-input" name="title" placeholder="Ej. Pagar internet" required /></Field><Field label="Tipo"><select className="form-input" name="type"><option value="expense">Gasto</option><option value="card">Tarjeta</option><option value="loan">Préstamo</option><option value="education">Facultad</option><option value="income">Cobro</option><option value="other">Otro</option></select></Field><Field label="Fecha"><input className="form-input" name="dueDate" type="date" required /></Field><Field label="Importe opcional"><input className="form-input" name="amount" inputMode="numeric" /></Field><Field label="Avisar con anticipación"><select className="form-input" name="advanceDays" defaultValue="3"><option value="0">El mismo día</option><option value="1">1 día antes</option><option value="3">3 días antes</option><option value="7">1 semana antes</option></select></Field><Submit pending={pending} label="Crear recordatorio" /></form> }
