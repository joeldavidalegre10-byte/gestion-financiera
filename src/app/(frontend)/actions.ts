'use server'

import config from '@payload-config'
import { getPayload, type CollectionSlug } from 'payload'
import { clearAppSession, getCurrentUser, setAppSession } from '@/lib/app-auth'

export type ActionResult = { ok: boolean; message: string; field?: string }

const fail = (message: string, field?: string): ActionResult => ({ ok: false, message, field })
const success = (message: string): ActionResult => ({ ok: true, message })

function text(formData: FormData, key: string, max = 500) {
  const value = String(formData.get(key) ?? '').trim()
  return value.slice(0, max)
}

function amount(formData: FormData, key: string) {
  const value = Number(String(formData.get(key) ?? '').replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(value) && value >= 0 ? value : null
}

function dateValue(formData: FormData, key: string) {
  const value = text(formData, key, 30)
  const date = new Date(`${value}T12:00:00`)
  return value && !Number.isNaN(date.getTime()) ? date.toISOString() : null
}

function optionalId(formData: FormData, key: string) {
  const value = text(formData, key, 80)
  return value || undefined
}

export async function loginAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = text(formData, 'email', 160).toLowerCase()
  const password = text(formData, 'password', 128)
  if (!email || !email.includes('@')) return fail('Ingresá un correo válido.', 'email')
  if (!password) return fail('Ingresá tu contraseña.', 'password')

  try {
    const payload = await getPayload({ config })
    const result = await payload.login({
      collection: 'users',
      data: { email, password },
      overrideAccess: false,
    })
    if (!result.token) return fail('No fue posible iniciar sesión.')
    await setAppSession(result.token)
    return success('Sesión iniciada.')
  } catch {
    return fail('Correo o contraseña incorrectos.')
  }
}

export async function registerAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const name = text(formData, 'name', 80)
  const email = text(formData, 'email', 160).toLowerCase()
  const password = text(formData, 'password', 128)
  if (name.length < 2) return fail('Ingresá tu nombre.', 'name')
  if (!email || !email.includes('@')) return fail('Ingresá un correo válido.', 'email')
  if (password.length < 8) return fail('Usá al menos 8 caracteres.', 'password')

  try {
    const payload = await getPayload({ config })
    await payload.create({
      collection: 'users',
      data: { name, email, password, currency: 'PYG' },
      overrideAccess: false,
    })
    const result = await payload.login({
      collection: 'users',
      data: { email, password },
      overrideAccess: false,
    })
    if (!result.token) return fail('La cuenta fue creada. Iniciá sesión para continuar.')
    await setAppSession(result.token)
    return success('Cuenta creada correctamente.')
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : ''
    if (message.includes('unique') || message.includes('email')) {
      return fail('Ya existe una cuenta con ese correo.', 'email')
    }
    return fail('No fue posible crear la cuenta. Revisá los datos.')
  }
}

export async function logoutAction(): Promise<ActionResult> {
  await clearAppSession()
  return success('Sesión cerrada.')
}

async function context() {
  const user = await getCurrentUser()
  if (!user) return null
  const payload = await getPayload({ config })
  return { payload, user }
}

export async function createTransactionAction(formData: FormData): Promise<ActionResult> {
  const auth = await context()
  if (!auth) return fail('Tu sesión venció. Volvé a ingresar.')

  const allowedTypes = [
    'income',
    'expense',
    'transfer',
    'credit-purchase',
    'credit-payment',
    'debt-payment',
    'education-payment',
  ] as const
  const type = text(formData, 'type', 30) as (typeof allowedTypes)[number]
  const description = text(formData, 'description', 120)
  const value = amount(formData, 'amount')
  const date = dateValue(formData, 'date')
  if (!allowedTypes.includes(type)) return fail('Seleccioná un tipo válido.', 'type')
  if (description.length < 2) return fail('Ingresá una descripción.', 'description')
  if (value === null || value <= 0) return fail('El importe debe ser mayor a cero.', 'amount')
  if (!date) return fail('Ingresá una fecha válida.', 'date')

  const account = optionalId(formData, 'account')
  const destinationAccount = optionalId(formData, 'destinationAccount')
  const creditCard = optionalId(formData, 'creditCard')
  const obligation = optionalId(formData, 'obligation')
  if (type === 'transfer' && (!account || !destinationAccount || account === destinationAccount)) {
    return fail('Elegí dos cuentas diferentes para transferir.')
  }
  if ((type === 'credit-purchase' || type === 'credit-payment') && !creditCard) {
    return fail('Seleccioná la tarjeta.')
  }
  if ((type === 'debt-payment' || type === 'education-payment') && !obligation) {
    return fail('Seleccioná la obligación.')
  }

  try {
    await auth.payload.create({
      collection: 'transactions',
      data: {
        owner: auth.user.id,
        type,
        description,
        amount: value,
        date,
        category: optionalId(formData, 'category'),
        account,
        destinationAccount,
        creditCard,
        obligation,
        installmentCount: Math.max(1, Math.min(60, amount(formData, 'installmentCount') ?? 1)),
        notes: text(formData, 'notes'),
      },
      overrideAccess: false,
      user: auth.user,
    })
    return success('Movimiento guardado.')
  } catch {
    return fail('No fue posible guardar el movimiento. Revisá las relaciones seleccionadas.')
  }
}

export async function createAccountAction(formData: FormData): Promise<ActionResult> {
  const auth = await context()
  if (!auth) return fail('Tu sesión venció. Volvé a ingresar.')
  const name = text(formData, 'name', 80)
  const type = text(formData, 'type', 20) as 'cash' | 'bank' | 'savings' | 'wallet' | 'other'
  const initialBalance = amount(formData, 'initialBalance')
  if (name.length < 2) return fail('Ingresá el nombre de la cuenta.', 'name')
  if (!['cash', 'bank', 'savings', 'wallet', 'other'].includes(type)) return fail('Tipo inválido.')
  if (initialBalance === null) return fail('Ingresá un saldo válido.', 'initialBalance')
  try {
    await auth.payload.create({
      collection: 'accounts',
      data: {
        owner: auth.user.id,
        name,
        type,
        initialBalance,
        description: text(formData, 'description', 300),
        status: 'active',
      },
      overrideAccess: false,
      user: auth.user,
    })
    return success('Cuenta creada.')
  } catch {
    return fail('No fue posible crear la cuenta.')
  }
}

export async function createCategoryAction(formData: FormData): Promise<ActionResult> {
  const auth = await context()
  if (!auth) return fail('Tu sesión venció. Volvé a ingresar.')
  const name = text(formData, 'name', 60)
  const kind = text(formData, 'kind', 20) as 'income' | 'expense' | 'both'
  if (name.length < 2) return fail('Ingresá el nombre de la categoría.', 'name')
  if (!['income', 'expense', 'both'].includes(kind)) return fail('Tipo inválido.')
  try {
    await auth.payload.create({
      collection: 'categories',
      data: { owner: auth.user.id, name, kind, color: 'slate', archived: false },
      overrideAccess: false,
      user: auth.user,
    })
    return success('Categoría creada.')
  } catch {
    return fail('No fue posible crear la categoría.')
  }
}

export async function createCardAction(formData: FormData): Promise<ActionResult> {
  const auth = await context()
  if (!auth) return fail('Tu sesión venció. Volvé a ingresar.')
  const name = text(formData, 'name', 80)
  const bank = text(formData, 'bank', 80)
  const creditLimit = amount(formData, 'creditLimit')
  const openingUsedBalance = amount(formData, 'openingUsedBalance') ?? 0
  const closingDay = amount(formData, 'closingDay')
  const dueDay = amount(formData, 'dueDay')
  if (!name || !bank || creditLimit === null || creditLimit <= 0) return fail('Completá los datos de la tarjeta.')
  if (!closingDay || closingDay > 31 || !dueDay || dueDay > 31) return fail('Los días deben estar entre 1 y 31.')
  try {
    await auth.payload.create({
      collection: 'credit-cards',
      data: {
        owner: auth.user.id,
        name,
        bank,
        creditLimit,
        openingUsedBalance,
        closingDay,
        dueDay,
        paymentDay: amount(formData, 'paymentDay') || undefined,
        status: 'active',
      },
      overrideAccess: false,
      user: auth.user,
    })
    return success('Tarjeta agregada.')
  } catch {
    return fail('No fue posible agregar la tarjeta.')
  }
}

export async function createObligationAction(formData: FormData): Promise<ActionResult> {
  const auth = await context()
  if (!auth) return fail('Tu sesión venció. Volvé a ingresar.')
  const type = text(formData, 'type', 20) as 'loan' | 'education' | 'other'
  const name = text(formData, 'name', 100)
  const creditor = text(formData, 'creditor', 100)
  const originalAmount = amount(formData, 'originalAmount')
  const totalInstallments = amount(formData, 'totalInstallments')
  const installmentAmount = amount(formData, 'installmentAmount')
  const startDate = dateValue(formData, 'startDate')
  const dueDate = dateValue(formData, 'dueDate')
  if (!['loan', 'education', 'other'].includes(type)) return fail('Tipo inválido.')
  if (!name || !creditor || !originalAmount || !totalInstallments || !installmentAmount || !startDate || !dueDate) {
    return fail('Completá todos los campos obligatorios.')
  }
  try {
    await auth.payload.create({
      collection: 'obligations',
      data: {
        owner: auth.user.id,
        type,
        name,
        creditor,
        originalAmount,
        openingPaidAmount: amount(formData, 'openingPaidAmount') ?? 0,
        totalInstallments,
        installmentAmount,
        startDate,
        dueDate,
        frequency: 'monthly',
        interestRate: amount(formData, 'interestRate') ?? undefined,
        educationKind:
          type === 'education'
            ? (text(formData, 'educationKind', 20) as 'enrollment' | 'tuition' | 'exam' | 'other')
            : undefined,
        status: 'active',
        notes: text(formData, 'notes'),
      },
      overrideAccess: false,
      user: auth.user,
    })
    return success(type === 'education' ? 'Compromiso académico agregado.' : 'Deuda agregada.')
  } catch {
    return fail('No fue posible guardar la obligación.')
  }
}

export async function createIncomeScheduleAction(formData: FormData): Promise<ActionResult> {
  const auth = await context()
  if (!auth) return fail('Tu sesión venció. Volvé a ingresar.')
  const name = text(formData, 'name', 100)
  const value = amount(formData, 'amount')
  const nextDate = dateValue(formData, 'nextDate')
  const frequency = text(formData, 'frequency', 20) as 'monthly' | 'biweekly' | 'daily' | 'once'
  if (!name || !value || !nextDate || !['monthly', 'biweekly', 'daily', 'once'].includes(frequency)) {
    return fail('Completá los datos del ingreso programado.')
  }
  try {
    await auth.payload.create({
      collection: 'income-schedules',
      data: {
        owner: auth.user.id,
        name,
        amount: value,
        frequency,
        nextDate,
        account: optionalId(formData, 'account'),
        category: optionalId(formData, 'category'),
        active: true,
        notes: text(formData, 'notes'),
      },
      overrideAccess: false,
      user: auth.user,
    })
    return success('Ingreso programado.')
  } catch {
    return fail('No fue posible programar el ingreso.')
  }
}

export async function createReminderAction(formData: FormData): Promise<ActionResult> {
  const auth = await context()
  if (!auth) return fail('Tu sesión venció. Volvé a ingresar.')
  const title = text(formData, 'title', 120)
  const dueDate = dateValue(formData, 'dueDate')
  const type = text(formData, 'type', 20) as 'income' | 'expense' | 'card' | 'loan' | 'education' | 'other'
  if (!title || !dueDate || !['income', 'expense', 'card', 'loan', 'education', 'other'].includes(type)) {
    return fail('Completá los datos del recordatorio.')
  }
  try {
    await auth.payload.create({
      collection: 'reminders',
      data: {
        owner: auth.user.id,
        title,
        type,
        dueDate,
        amount: amount(formData, 'amount') ?? undefined,
        advanceDays: Math.min(90, amount(formData, 'advanceDays') ?? 3),
        completed: false,
        notes: text(formData, 'notes'),
      },
      overrideAccess: false,
      user: auth.user,
    })
    return success('Recordatorio creado.')
  } catch {
    return fail('No fue posible crear el recordatorio.')
  }
}

const deletableCollections = [
  'transactions',
  'accounts',
  'categories',
  'credit-cards',
  'obligations',
  'income-schedules',
  'reminders',
] as const satisfies readonly CollectionSlug[]

export async function deleteRecordAction(collection: string, id: string): Promise<ActionResult> {
  const auth = await context()
  if (!auth) return fail('Tu sesión venció. Volvé a ingresar.')
  if (!deletableCollections.includes(collection as (typeof deletableCollections)[number])) {
    return fail('Colección no permitida.')
  }
  try {
    await auth.payload.delete({
      collection: collection as (typeof deletableCollections)[number],
      id,
      overrideAccess: false,
      user: auth.user,
    })
    return success('Registro eliminado.')
  } catch {
    return fail('No se pudo eliminar: puede tener movimientos relacionados.')
  }
}
