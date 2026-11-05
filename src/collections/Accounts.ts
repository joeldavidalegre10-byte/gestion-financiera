import type { CollectionConfig } from 'payload'
import { authenticatedCreate, ownedAccess, ownerField, setOwner } from './access'

export const Accounts: CollectionConfig = {
  slug: 'accounts',
  admin: { group: 'Finanzas', useAsTitle: 'name' },
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
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Efectivo', value: 'cash' },
        { label: 'Cuenta bancaria', value: 'bank' },
        { label: 'Cuenta de ahorro', value: 'savings' },
        { label: 'Billetera digital', value: 'wallet' },
        { label: 'Otra', value: 'other' },
      ],
    },
    { name: 'initialBalance', type: 'number', required: true, defaultValue: 0, min: 0 },
    { name: 'description', type: 'textarea', maxLength: 300 },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Activa', value: 'active' },
        { label: 'Archivada', value: 'archived' },
      ],
    },
  ],
}
