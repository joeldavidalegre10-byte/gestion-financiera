import type { Access, CollectionBeforeValidateHook, FieldAccess } from 'payload'

export const isAppUser = (user: unknown): user is { id: string | number; collection: 'users' } =>
  Boolean(
    user &&
      typeof user === 'object' &&
      'collection' in user &&
      user.collection === 'users' &&
      'id' in user,
  )

export const isAdmin = (user: unknown) =>
  Boolean(user && typeof user === 'object' && 'collection' in user && user.collection === 'admins')

export const ownedAccess: Access = ({ req }) => {
  if (isAdmin(req.user)) return true
  if (!isAppUser(req.user)) return false
  return { owner: { equals: req.user.id } }
}

export const authenticatedCreate: Access = ({ req }) => isAdmin(req.user) || isAppUser(req.user)

export const ownerFieldAccess: FieldAccess = ({ req }) => isAdmin(req.user)

export const setOwner: CollectionBeforeValidateHook = ({ data, operation, req }) => {
  if (operation === 'create' && isAppUser(req.user)) {
    return { ...data, owner: req.user.id }
  }
  return data
}

export const ownerField = {
  name: 'owner',
  type: 'relationship',
  relationTo: 'users',
  required: true,
  index: true,
  access: {
    create: ownerFieldAccess,
    update: ownerFieldAccess,
  },
  admin: {
    position: 'sidebar',
    readOnly: true,
  },
} as const
