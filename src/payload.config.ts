
import path from 'path'
import { buildConfig } from 'payload'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { es as adminLanguage } from '@payloadcms/translations/languages/es'
import { fileURLToPath } from 'url'

import { Admins } from './collections/Admins'
import { Media } from './collections/Media'
import { Folders } from './collections/Folders'
import { Tags } from './collections/Tags'
import { Users } from './collections/Users'
import { Categories } from './collections/Categories'
import { Accounts } from './collections/Accounts'
import { CreditCards } from './collections/CreditCards'
import { Obligations } from './collections/Obligations'
import { Transactions } from './collections/Transactions'
import { IncomeSchedules } from './collections/IncomeSchedules'
import { Reminders } from './collections/Reminders'
import { Installments } from './collections/Installments'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Admins.slug,
    constrainWidth: true,
    dashboard: {
      widgets: [],
      defaultLayout: [
        { widgetSlug: 'activity', width: 'full' },
        { widgetSlug: 'collections', width: 'full' },
      ],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },

  i18n: {
    fallbackLanguage: 'es',
    supportedLanguages: {
      es: adminLanguage,
    },
  },

  collections: [
    Admins,
    Users,
    Media,
    Folders,
    Tags,
    Categories,
    Accounts,
    CreditCards,
    Obligations,
    Transactions,
    Installments,
    IncomeSchedules,
    Reminders,
  ],

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  localization: {
    locales: [{ code: 'en', label: 'English' }],
    fallback: true,
    defaultLocale: 'en',
  },

  plugins: [mcpPlugin({})],
})
