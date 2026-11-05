import { APIError, type CollectionAfterChangeHook, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'
import { authenticatedCreate, ownedAccess, ownerField, setOwner } from './access'

const relationshipCollections = {
  category: 'categories',
  account: 'accounts',
  destinationAccount: 'accounts',
  creditCard: 'credit-cards',
  obligation: 'obligations',
} as const

const validateOwnedRelationships: CollectionBeforeValidateHook = async ({ data, req }) => {
  if (!data || !req.user) return data
  for (const [field, collection] of Object.entries(relationshipCollections)) {
    const id = data[field]
    if (!id) continue
    try {
      await req.payload.findByID({
        collection,
        id: typeof id === 'object' ? id.id : id,
        overrideAccess: false,
        req,
        user: req.user,
      })
    } catch {
      throw new APIError(`La relación ${field} no pertenece al usuario.`, 400)
    }
  }
  return data
}

const createCreditInstallments: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create' || doc.type !== 'credit-purchase' || !doc.creditCard || !req.user) return doc
  const total = Math.max(1, Number(doc.installmentCount ?? 1))
  const cardId = typeof doc.creditCard === 'object' ? doc.creditCard.id : doc.creditCard
  const card = await req.payload.findByID({
    collection: 'credit-cards',
    id: cardId,
    overrideAccess: false,
    req,
    user: req.user,
  })
  const base = new Date(doc.date)
  for (let index = 0; index < total; index += 1) {
    const dueDate = new Date(base.getFullYear(), base.getMonth() + index + 1, Math.min(card.dueDay, 28), 12)
    await req.payload.create({
      collection: 'installments',
      data: {
        owner: req.user.id,
        label: `${doc.description} · ${index + 1}/${total}`,
        number: index + 1,
        amount: Math.round(doc.amount / total),
        dueDate: dueDate.toISOString(),
        transaction: doc.id,
        creditCard: cardId,
        status: 'pending',
      },
      overrideAccess: false,
      req,
      user: req.user,
    })
  }
  return doc
}

export const Transactions: CollectionConfig = {
  slug: 'transactions',
  admin: { group: 'Finanzas', useAsTitle: 'description' },
  access: {
    create: authenticatedCreate,
    read: ownedAccess,
    update: ownedAccess,
    delete: ownedAccess,
  },
  hooks: {
    beforeValidate: [setOwner, validateOwnedRelationships],
    afterChange: [createCreditInstallments],
  },
  fields: [
    ownerField,
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Ingreso recibido', value: 'income' },
        { label: 'Gasto', value: 'expense' },
        { label: 'Transferencia', value: 'transfer' },
        { label: 'Compra con tarjeta', value: 'credit-purchase' },
        { label: 'Pago de tarjeta', value: 'credit-payment' },
        { label: 'Pago de préstamo', value: 'debt-payment' },
        { label: 'Pago de facultad', value: 'education-payment' },
      ],
    },
    { name: 'description', type: 'text', required: true, maxLength: 120 },
    { name: 'amount', type: 'number', required: true, min: 1 },
    { name: 'date', type: 'date', required: true, index: true },
    { name: 'category', type: 'relationship', relationTo: 'categories' },
    { name: 'account', type: 'relationship', relationTo: 'accounts' },
    { name: 'destinationAccount', type: 'relationship', relationTo: 'accounts' },
    { name: 'creditCard', type: 'relationship', relationTo: 'credit-cards' },
    { name: 'obligation', type: 'relationship', relationTo: 'obligations' },
    { name: 'installmentCount', type: 'number', min: 1, max: 60, defaultValue: 1 },
    { name: 'notes', type: 'textarea', maxLength: 500 },
  ],
}
