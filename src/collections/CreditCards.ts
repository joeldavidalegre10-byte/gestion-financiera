import type { CollectionConfig } from 'payload'
import { authenticatedCreate, ownedAccess, ownerField, setOwner } from './access'

export const CreditCards: CollectionConfig = {
  slug: 'credit-cards',
  admin: { group: 'Crédito y deudas', useAsTitle: 'name' },
  access: {
    create: authenticatedCreate,
    read: ownedAccess,
    update: ownedAccess,
    delete: ownedAccess,
  },
  hooks: { beforeValidate: [setOwner] },
  fields: [
    ownerField,
    { name: 'name', type: 'text', required: true, maxLength: 80 },
    { name: 'bank', type: 'text', required: true, maxLength: 80 },
    { name: 'creditLimit', type: 'number', required: true, min: 0 },
    {
      name: 'openingUsedBalance',
      label: 'Saldo utilizado al comenzar',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    { name: 'closingDay', type: 'number', required: true, min: 1, max: 31 },
    { name: 'dueDay', type: 'number', required: true, min: 1, max: 31 },
    { name: 'paymentDay', type: 'number', min: 1, max: 31 },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Activa', value: 'active' },
        { label: 'Bloqueada', value: 'blocked' },
        { label: 'Cerrada', value: 'closed' },
      ],
    },
  ],
}
