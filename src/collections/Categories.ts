import type { CollectionConfig } from 'payload'
import { authenticatedCreate, ownedAccess, ownerField, setOwner } from './access'

export const Categories: CollectionConfig = {
  slug: 'categories',
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
    { name: 'name', type: 'text', required: true, maxLength: 60 },
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'expense',
      options: [
        { label: 'Ingreso', value: 'income' },
        { label: 'Gasto', value: 'expense' },
        { label: 'Ambos', value: 'both' },
      ],
    },
    {
      name: 'color',
      type: 'select',
      defaultValue: 'slate',
      options: ['slate', 'green', 'red', 'blue', 'orange', 'violet'],
    },
    { name: 'archived', type: 'checkbox', defaultValue: false },
  ],
}
