import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'

import { schemaTypes } from './schemas'

export default defineConfig({
    name: 'default',
    title: 'Nest Group',

    projectId: 'ka04oafk',
    dataset: 'production',

    plugins: [structureTool()],

    schema: {
        types: schemaTypes,
    },
})
