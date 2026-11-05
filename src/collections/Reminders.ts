import type { CollectionConfig } from 'payload'
import { authenticatedCreate, ownedAccess, ownerField, setOwner } from './access'

export const Reminders: CollectionConfig = {
  slug: 'reminders',
  admin: { group: 'Planificación', useAsTitle: 'title' },
  access: {
    create: authenticatedCreate,
    read: ownedAccess,
    update: ownedAccess,
    delete: ownedAccess,
  },
  hooks: { beforeValidate: [setOwner] },
  fields: [
    ownerField,
    { name: 'title', type: 'text', required: true, maxLength: 120 },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Ingreso', value: 'income' },
        { label: 'Gasto', value: 'expense' },
        { label: 'Tarjeta', value: 'card' },
        { label: 'Préstamo', value: 'loan' },
        { label: 'Facultad', value: 'education' },
        { label: 'Otro', value: 'other' },
      ],
    },
    { name: 'dueDate', type: 'date', required: true, index: true },
    { name: 'amount', type: 'number', min: 0 },
    { name: 'advanceDays', type: 'number', required: true, defaultValue: 3, min: 0, max: 90 },
    { name: 'completed', type: 'checkbox', required: true, defaultValue: false },
    { name: 'notes', type: 'textarea', maxLength: 300 },
  ],
}
