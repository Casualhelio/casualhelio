import { defineType, defineField } from 'sanity'

export default defineType({
    name: 'property',
    title: 'Investment Properties',
    type: 'document',
    fields: [
        defineField({
            name: 'title',
            title: 'Property Title',
            type: 'string',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'address',
            title: 'Property Address',
            type: 'string',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'price',
            title: 'Property Value (MNT)',
            type: 'number',
            description: 'The total value/price of the property in MNT.',
            validation: (Rule) => Rule.required().positive(),
        }),
        defineField({
            name: 'layout',
            title: 'Layout Type',
            type: 'string',
            description: 'E.g., 1DK, 2LDK, Studio',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'totalArea',
            title: 'Total Area',
            type: 'string',
            description: 'E.g., 55 m²',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'buildYear',
            title: 'Year Built',
            type: 'number',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'targetRent',
            title: 'Target Monthly Rent (MNT)',
            type: 'number',
            validation: (Rule) => Rule.required().positive(),
        }),
        defineField({
            name: 'coverImage',
            title: 'Cover Image',
            type: 'image',
            options: {
                hotspot: true,
            },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'isAvailable',
            title: 'Is Available for Investment?',
            type: 'boolean',
            initialValue: true,
        }),
        defineField({
            name: 'description',
            title: 'Description',
            type: 'text',
            description: 'Short description of the property.',
            validation: (Rule) => Rule.required(),
        }),
    ],
    preview: {
        select: {
            title: 'title',
            subtitle: 'address',
            media: 'coverImage',
        },
    },
})
