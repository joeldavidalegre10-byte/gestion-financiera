import type { CollectionConfig } from 'payload'
import { isAdmin, isAppUser } from './access'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    hidden: true,
    useAsTitle: 'name',
  },
  access: {
    admin: () => false,
    create: () => true,
    delete: ({ req }) => isAdmin(req.user) || isAppUser(req.user),
    read: ({ req }) => {
      if (isAdmin(req.user)) return true
      if (!isAppUser(req.user)) return false
      return { id: { equals: req.user.id } }
    },
    update: ({ req }) => {
      if (isAdmin(req.user)) return true
      if (!isAppUser(req.user)) return false
      return { id: { equals: req.user.id } }
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      maxLength: 80,
    },
    {
      name: 'currency',
      type: 'select',
      required: true,
      defaultValue: 'PYG',
      options: [{ label: 'Guaraní paraguayo (Gs.)', value: 'PYG' }],
    },
    {
      name: 'theme',
      type: 'select',
      defaultValue: 'system',
      options: [
        { label: 'Sistema', value: 'system' },
        { label: 'Claro', value: 'light' },
        { label: 'Oscuro', value: 'dark' },
      ],
    },
  ],
}
