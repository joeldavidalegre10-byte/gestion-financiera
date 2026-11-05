import type { CollectionConfig } from 'payload'
import { authenticatedCreate, ownedAccess, ownerField, setOwner } from './access'

export const IncomeSchedules: CollectionConfig = {
  slug: 'income-schedules',
  admin: { group: 'Planificación', useAsTitle: 'name' },
  access: {
    create: authenticatedCreate,
    read: ownedAccess,
    update: ownedAccess,
    delete: ownedAccess,
  },
  hooks: { beforeValidate: [setOwner] },
  fields: [
    ownerField,
    { name: 'name', type: 'text', required: true, maxLength: 100 },
    { name: 'amount', type: 'number', required: true, min: 1 },
    {
      name: 'frequency',
      type: 'select',
      required: true,
      options: [
        { label: 'Mensual', value: 'monthly' },
        { label: 'Quincenal', value: 'biweekly' },
        { label: 'Diaria', value: 'daily' },
        { label: 'Única', value: 'once' },
      ],
    },
    { name: 'nextDate', type: 'date', required: true },
    { name: 'account', type: 'relationship', relationTo: 'accounts' },
    { name: 'category', type: 'relationship', relationTo: 'categories' },
    { name: 'active', type: 'checkbox', required: true, defaultValue: true },
    { name: 'notes', type: 'textarea', maxLength: 300 },
  ],
}
