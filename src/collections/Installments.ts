import type { CollectionConfig } from 'payload'
import { authenticatedCreate, ownedAccess, ownerField, setOwner } from './access'

export const Installments: CollectionConfig = {
  slug: 'installments',
  admin: { group: 'Planificación', useAsTitle: 'label' },
  access: {
    create: authenticatedCreate,
    read: ownedAccess,
    update: ownedAccess,
    delete: ownedAccess,
  },
  hooks: { beforeValidate: [setOwner] },
  fields: [
    ownerField,
    { name: 'label', type: 'text', required: true, maxLength: 140 },
    { name: 'number', type: 'number', required: true, min: 1 },
    { name: 'amount', type: 'number', required: true, min: 1 },
    { name: 'dueDate', type: 'date', required: true, index: true },
    { name: 'transaction', type: 'relationship', relationTo: 'transactions' },
    { name: 'creditCard', type: 'relationship', relationTo: 'credit-cards' },
    { name: 'obligation', type: 'relationship', relationTo: 'obligations' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pendiente', value: 'pending' },
        { label: 'Pagada', value: 'paid' },
        { label: 'Atrasada', value: 'overdue' },
      ],
    },
    { name: 'paidAt', type: 'date' },
  ],
}
