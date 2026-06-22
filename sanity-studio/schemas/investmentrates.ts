import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'investmentRates',
    title: 'Investment Calculator Rates',
    type: 'document',
    fields: [
        defineField({
            name: 'propertyYieldPercent',
            title: 'Property Yield (%)',
            type: 'number',
            description: 'Annual expected yield purely from the real estate rent (e.g. 5.6)',
            validation: (Rule) => Rule.required().min(0).max(100),
        }),
        defineField({
            name: 'nonBankingInterestPercent',
            title: 'Non-Banking Interest Rate (%)',
            type: 'number',
            description: 'Annual interest rate for the Non-banking product (e.g. 12)',
            validation: (Rule) => Rule.required().min(0).max(100),
        }),
        defineField({
            name: 'taxRatePercent',
            title: 'Tax Rate (%)',
            type: 'number',
            description: 'Tax rate applied to the interest earned (e.g. 20)',
            validation: (Rule) => Rule.required().min(0).max(100),
        }),
    ],
    preview: {
        select: {
            title: 'title',
        },
        prepare() {
            return {
                title: 'Calculator Rates Configuration',
            }
        },
    },
})
