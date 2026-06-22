import { defineField, defineType } from 'sanity'

export const newsType = defineType({
    name: 'news',
    title: 'News Article',
    type: 'document',
    fields: [
        defineField({
            name: 'title_en',
            title: 'Title (English)',
            type: 'string',
            validation: (Rule) => Rule.required()
        }),
        defineField({
            name: 'title_mn',
            title: 'Title (Mongolian)',
            type: 'string',
        }),
        defineField({
            name: 'title_ja',
            title: 'Title (Japanese)',
            type: 'string',
        }),
        defineField({
            name: 'date',
            title: 'Published Date',
            type: 'date',
        }),
        defineField({
            name: 'image',
            title: 'Cover Image (used in news listings)',
            type: 'image',
            options: { hotspot: true }
        }),
        defineField({
            name: 'gallery',
            title: 'Gallery Images (slideshow on the article page)',
            description: 'Add multiple images — they will display as a swipeable slider at the top of the article. The Cover Image above is automatically included as the first slide.',
            type: 'array',
            of: [{
                type: 'image',
                options: { hotspot: true },
                fields: [
                    {
                        name: 'caption',
                        title: 'Caption (optional)',
                        type: 'string'
                    }
                ]
            }],
            options: {
                layout: 'grid'
            }
        }),
        defineField({
            name: 'content_en',
            title: 'Content (English)',
            type: 'array',
            of: [{ type: 'block' }]
        }),
        defineField({
            name: 'content_mn',
            title: 'Content (Mongolian)',
            type: 'array',
            of: [{ type: 'block' }]
        }),
        defineField({
            name: 'content_ja',
            title: 'Content (Japanese)',
            type: 'array',
            of: [{ type: 'block' }]
        })
    ]
})
