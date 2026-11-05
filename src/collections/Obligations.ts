import type { CollectionAfterChangeHook, CollectionConfig } from 'payload'
import { authenticatedCreate, ownedAccess, ownerField, setOwner } from './access'

const createObligationInstallments: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create' || !req.user) return doc
  const start = new Date(doc.startDate)
  const total = Math.max(1, Number(doc.totalInstallments))
  for (let index = 0; index < total; index += 1) {
    const dueDate = new Date(start)
    if (doc.frequency === 'weekly') dueDate.setDate(dueDate.getDate() + 7 * index)
    else if (doc.frequency === 'biweekly') dueDate.setDate(dueDate.getDate() + 15 * index)
    else dueDate.setMonth(dueDate.getMonth() + index)
    await req.payload.create({
      collection: 'installments',
      data: {
        owner: req.user.id,
        label: `${doc.name} · ${index + 1}/${total}`,
        number: index + 1,
        amount: doc.installmentAmount,
        dueDate: dueDate.toISOString(),
        obligation: doc.id,
        status: 'pending',
      },
      overrideAccess: false,
      req,
      user: req.user,
    })
  }
  return doc
}

export const Obligations: CollectionConfig = {
  slug: 'obligations',
  admin: { group: 'Crédito y deudas', useAsTitle: 'name' },
  access: {
    create: authenticatedCreate,
    read: ownedAccess,
    update: ownedAccess,
    delete: ownedAccess,
  },
  hooks: {
    beforeValidate: [setOwner],
    afterChange: [createObligationInstallments],
  },
  fields: [
    ownerField,
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Préstamo', value: 'loan' },
        { label: 'Facultad', value: 'education' },
        { label: 'Otra deuda', value: 'other' },
      ],
    },
    { name: 'name', type: 'text', required: true, maxLength: 100 },
    { name: 'creditor', label: 'Entidad, institución o persona', type: 'text', required: true },
    { name: 'originalAmount', type: 'number', required: true, min: 1 },
    { name: 'openingPaidAmount', type: 'number', defaultValue: 0, min: 0 },
    { name: 'totalInstallments', type: 'number', required: true, min: 1 },
    { name: 'installmentAmount', type: 'number', required: true, min: 1 },
    { name: 'startDate', type: 'date', required: true },
    { name: 'dueDate', type: 'date', required: true },
    {
      name: 'frequency',
      type: 'select',
      required: true,
      defaultValue: 'monthly',
      options: [
        { label: 'Mensual', value: 'monthly' },
        { label: 'Quincenal', value: 'biweekly' },
        { label: 'Semanal', value: 'weekly' },
        { label: 'Personalizada', value: 'custom' },
      ],
    },
    { name: 'interestRate', type: 'number', min: 0, max: 100 },
    {
      name: 'educationKind',
      type: 'select',
      options: [
        { label: 'Matrícula', value: 'enrollment' },
        { label: 'Mensualidad', value: 'tuition' },
        { label: 'Examen', value: 'exam' },
        { label: 'Otro', value: 'other' },
      ],
      admin: { condition: (_, siblingData) => siblingData?.type === 'education' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Activa', value: 'active' },
        { label: 'Pagada', value: 'paid' },
        { label: 'Pausada', value: 'paused' },
      ],
    },
    { name: 'notes', type: 'textarea', maxLength: 500 },
  ],
}
