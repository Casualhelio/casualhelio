/**
 * exchange-rate.js
 * Fetches daily mid-market exchange rates and exposes them for the
 * investment calculator.
 *
 * Source: moneyconvert.net (USD-based mid-market rates, converted to MNT).
 * If the fetch fails, approximate built-in rates are used and
 * isApproximate() reports true so the UI can say so.
 *
 * The Mongolian bank-rate API this used to call (Heroku) was shut down, and
 * its Render successor returns no data, so per-bank rates are not offered.
 *
 * Usage (global window.ExchangeRate):
 *   await window.ExchangeRate.init();
 *   const jpy = window.ExchangeRate.getRate('JPY');   // MNT per 1 JPY
 */

(function () {
    const API_URL = 'https://cdn.moneyconvert.net/api/latest.json';
    const CURRENCIES = ['usd', 'jpy', 'eur', 'cny', 'krw'];

    // Last-resort rates (MNT per unit), used only when the live fetch fails.
    const APPROXIMATE_RATES = { usd: 3566, jpy: 22.72, eur: 4204, cny: 513, krw: 2.43 };

    const SUPPORTED_CURRENCIES = [
        { code: 'MNT', label: 'MNT – Mongolian Tögrög', symbol: 'MNT', decimals: 0 },
        { code: 'USD', label: 'USD – US Dollar', symbol: '$', decimals: 2 },
        { code: 'JPY', label: 'JPY – Japanese Yen', symbol: '¥', decimals: 0 },
        { code: 'EUR', label: 'EUR – Euro', symbol: '€', decimals: 2 },
        { code: 'CNY', label: 'CNY – Chinese Yuan', symbol: '¥', decimals: 2 },
        { code: 'KRW', label: 'KRW – Korean Won', symbol: '₩', decimals: 0 },
    ];

    let ratesMap = {};      // { usd: 3565, ... } MNT per unit
    let updatedAt = null;   // Date of the live rates, null when approximate
    let approximate = false;
    let loaded = false;
    let initPromise = null;

    // moneyconvert quotes everything per 1 USD; convert to MNT per unit.
    function toMntRates(data) {
        if (!data || !data.rates || !(data.rates.MNT > 0)) return null;
        const mntPerUsd = data.rates.MNT;
        const map = {};
        CURRENCIES.forEach(cur => {
            const perUsd = cur === 'usd' ? 1 : data.rates[cur.toUpperCase()];
            if (perUsd > 0) map[cur] = Math.round((mntPerUsd / perUsd) * 100) / 100;
        });
        return Object.keys(map).length ? map : null;
    }

    async function fetchRates() {
        try {
            const res = await fetch(API_URL, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const map = toMntRates(data);
            if (!map) throw new Error('Unexpected rate payload');
            ratesMap = map;
            const ts = data.ts ? new Date(data.ts) : null;
            updatedAt = ts && !isNaN(ts) ? ts : null;
            approximate = false;
        } catch (err) {
            ratesMap = { ...APPROXIMATE_RATES };
            updatedAt = null;
            approximate = true;
        }
        loaded = true;
    }

    const ExchangeRate = {
        init() {
            if (!initPromise) initPromise = fetchRates();
            return initPromise;
        },

        getRate(currencyCode) {
            if (!currencyCode || currencyCode.toUpperCase() === 'MNT') return null;
            return ratesMap[currencyCode.toLowerCase()] || null;
        },

        convert(mntAmount, currencyCode) {
            if (!currencyCode || currencyCode.toUpperCase() === 'MNT') return mntAmount;
            const rate = this.getRate(currencyCode);
            if (!rate) return mntAmount;
            return mntAmount / rate;
        },

        format(amount, currencyCode) {
            const cur = SUPPORTED_CURRENCIES.find(c => c.code === (currencyCode || 'MNT').toUpperCase());
            const decimals = cur ? cur.decimals : 0;
            try {
                return new Intl.NumberFormat('en-US', {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals,
                }).format(amount);
            } catch (e) {
                return amount.toFixed(decimals);
            }
        },

        getSymbol(currencyCode) {
            const cur = SUPPORTED_CURRENCIES.find(c => c.code === (currencyCode || 'MNT').toUpperCase());
            return cur ? cur.symbol : currencyCode;
        },

        getSupportedCurrencies() { return SUPPORTED_CURRENCIES; },
        isLoaded() { return loaded; },

        /** True when the live fetch failed and built-in approximate rates are in use. */
        isApproximate() { return approximate; },

        /** Date the live rates were published, or null when approximate. */
        getUpdatedAt() { return updatedAt; },
    };

    window.ExchangeRate = ExchangeRate;
})();
