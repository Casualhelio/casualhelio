/**
 * exchange-rate.js
 * Fetches live exchange rates from the Mongolian Bank Exchange Rate API
 * and exposes them for use by the investment calculator.
 *
 * API: https://github.com/btseee/mongolian-bank-exchange-rate
 * Endpoint: GET /rates/latest  (returns latest rates for 13 Mongolian banks)
 *
 * Features:
 *  - Choose a specific bank or "Best Rate" (auto-pick)
 *  - Toggle between Buy and Sell rates (noncash preferred, cash fallback)
 *  - Rates cached in memory for the session
 *
 * Usage (global window.ExchangeRate):
 *   await window.ExchangeRate.init();
 *   window.ExchangeRate.setBank('GolomtBank');
 *   window.ExchangeRate.setRateType('buy');     // 'buy' | 'sell'
 *   const usd = window.ExchangeRate.getRate('usd');
 *   const both = window.ExchangeRate.getBuySell('usd');  // { buy: 3557, sell: 3567 }
 */

(function () {
    const API_URL = 'https://mongolian-bank-exchange-rate-6620c122ff22.herokuapp.com/rates/latest';
    const FALLBACK_API_URL = 'https://cdn.moneyconvert.net/api/latest.json';
    const STALE_THRESHOLD_DAYS = 3;
    const PREFERRED_BANKS = ['MongolBank', 'GolomtBank', 'KhanBank', 'TDBM', 'XacBank'];

    const SUPPORTED_CURRENCIES = [
        { code: 'MNT', label: 'MNT – Mongolian Tögrög', symbol: 'MNT', decimals: 0 },
        { code: 'USD', label: 'USD – US Dollar', symbol: '$', decimals: 2 },
        { code: 'JPY', label: 'JPY – Japanese Yen', symbol: '¥', decimals: 0 },
        { code: 'EUR', label: 'EUR – Euro', symbol: '€', decimals: 2 },
        { code: 'CNY', label: 'CNY – Chinese Yuan', symbol: '¥', decimals: 2 },
        { code: 'KRW', label: 'KRW – Korean Won', symbol: '₩', decimals: 0 },
    ];

    const BANK_DISPLAY_NAMES = {
        'MongolBank': 'MongolBank (Central)',
        'GolomtBank': 'Golomt Bank',
        'KhanBank': 'Khan Bank',
        'TDBM': 'TDB (Trade & Dev)',
        'XacBank': 'XacBank',
        'StateBank': 'State Bank',
        'ArigBank': 'Arig Bank',
        'BogdBank': 'Bogd Bank',
        'CapitronBank': 'Capitron Bank',
        'NIBank': 'NI Bank',
        'CKBank': 'Chinggis Khaan Bank',
        'TransBank': 'Trans Bank',
        'MBank': 'M Bank',
    };

    // Internal state
    let allBanksData = [];
    let ratesMap = {};           // { usd: 3565, ... }
    let buySellMap = {};         // { usd: { buy: 3557, sell: 3567 }, ... }
    let selectedBank = null;     // null = "Best Rate"
    let rateType = 'sell';       // 'buy' | 'sell'
    let loaded = false;
    let loading = false;
    let usingFallback = false;
    let initPromise = null;
    let onChangeCallbacks = [];

    /**
     * Extract a rate value from a bank entry for a currency.
     * Returns { buy, sell } or null.
     */
    function extractBuySell(bankEntry, currencyCode) {
        const key = currencyCode.toLowerCase();
        if (!bankEntry || !bankEntry.rates || !bankEntry.rates[key]) return null;
        const rData = bankEntry.rates[key];
        const buyVal = rData.noncash?.buy ?? rData.cash?.buy ?? null;
        const sellVal = rData.noncash?.sell ?? rData.cash?.sell ?? null;
        if ((!buyVal || buyVal <= 0) && (!sellVal || sellVal <= 0)) return null;
        return {
            buy: (buyVal && buyVal > 0) ? buyVal : null,
            sell: (sellVal && sellVal > 0) ? sellVal : null,
        };
    }

    /**
     * Pick the best bank's buy/sell for a currency.
     */
    function pickBestBuySell(allBanks, currencyCode) {
        for (const bankName of PREFERRED_BANKS) {
            const bankEntry = allBanks.find(b => b.bank_name === bankName);
            if (!bankEntry) continue;
            const bs = extractBuySell(bankEntry, currencyCode);
            if (bs && (bs.buy || bs.sell)) return bs;
        }
        for (const bankEntry of allBanks) {
            const bs = extractBuySell(bankEntry, currencyCode);
            if (bs && (bs.buy || bs.sell)) return bs;
        }
        return null;
    }

    function rebuildRatesMap() {
        const currencies = ['usd', 'jpy', 'eur', 'cny', 'krw'];
        ratesMap = {};
        buySellMap = {};
        currencies.forEach(cur => {
            let bs;
            if (selectedBank) {
                const bankEntry = allBanksData.find(b => b.bank_name === selectedBank);
                bs = bankEntry ? extractBuySell(bankEntry, cur) : null;
                if (!bs) bs = pickBestBuySell(allBanksData, cur); // fallback
            } else {
                bs = pickBestBuySell(allBanksData, cur);
            }
            if (bs) {
                buySellMap[cur] = bs;
                // Use the selected rate type, fall back to the other if unavailable
                const val = (rateType === 'buy')
                    ? (bs.buy || bs.sell)
                    : (bs.sell || bs.buy);
                if (val) ratesMap[cur] = val;
            }
        });
    }

    function isDataStale(banksData) {
        if (!banksData || banksData.length === 0) return true;
        let latest = null;
        banksData.forEach(b => {
            if (b.date && (!latest || b.date > latest)) latest = b.date;
        });
        if (!latest) return true;
        const latestMs = new Date(latest).getTime();
        const nowMs = Date.now();
        return (nowMs - latestMs) > STALE_THRESHOLD_DAYS * 86400000;
    }

    function applyMoneyConvertRates(data) {
        if (!data || !data.rates || !data.rates.MNT) return false;
        const mntPerUsd = data.rates.MNT;
        const currencies = ['usd', 'jpy', 'eur', 'cny', 'krw'];
        const usdRateKeys = { usd: 1, jpy: 'JPY', eur: 'EUR', cny: 'CNY', krw: 'KRW' };

        ratesMap = {};
        buySellMap = {};
        currencies.forEach(cur => {
            let mntPerUnit;
            if (cur === 'usd') {
                mntPerUnit = mntPerUsd;
            } else {
                const foreignPerUsd = data.rates[usdRateKeys[cur]];
                if (!foreignPerUsd || foreignPerUsd <= 0) return;
                mntPerUnit = mntPerUsd / foreignPerUsd;
            }
            const rounded = Math.round(mntPerUnit * 100) / 100;
            ratesMap[cur] = rounded;
            buySellMap[cur] = { buy: rounded, sell: rounded };
        });
        return Object.keys(ratesMap).length > 0;
    }

    async function fetchFallbackRates() {
        try {
            const res = await fetch(FALLBACK_API_URL, { cache: 'no-store' });
            if (!res.ok) return false;
            const data = await res.json();
            return applyMoneyConvertRates(data);
        } catch (err) {
            return false;
        }
    }

    async function fetchRates() {
        if (loading) return initPromise;
        loading = true;
        try {
            const res = await fetch(API_URL, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            allBanksData = await res.json();

            if (isDataStale(allBanksData)) {
                const fallbackOk = await fetchFallbackRates();
                if (!fallbackOk) {
                    rebuildRatesMap();
                }
                usingFallback = true;
            } else {
                rebuildRatesMap();
                usingFallback = false;
            }
            loaded = true;
        } catch (err) {
            const fallbackOk = await fetchFallbackRates();
            if (!fallbackOk) {
                allBanksData = [];
                ratesMap = { usd: 3566, jpy: 22.72, eur: 4204, cny: 513, krw: 2.43 };
                buySellMap = {
                    usd: { buy: 3558, sell: 3566 },
                    jpy: { buy: 22.2, sell: 22.72 },
                    eur: { buy: 4132, sell: 4204 },
                    cny: { buy: 509, sell: 513 },
                    krw: { buy: 2.38, sell: 2.43 },
                };
            }
            usingFallback = true;
            loaded = true;
        } finally {
            loading = false;
        }
    }

    function fireCallbacks() {
        onChangeCallbacks.forEach(cb => { try { cb(); } catch (e) { } });
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

        /**
         * Get both buy and sell rates for a currency.
         * Returns { buy: number|null, sell: number|null } or null.
         */
        getBuySell(currencyCode) {
            if (!currencyCode || currencyCode.toUpperCase() === 'MNT') return null;
            return buySellMap[currencyCode.toLowerCase()] || null;
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
        isUsingFallback() { return usingFallback; },

        getAvailableBanks() {
            if (!allBanksData || allBanksData.length === 0) return [];
            return allBanksData
                .filter(b => b.bank_name !== 'MBank')
                .map(b => ({
                    name: b.bank_name,
                    displayName: BANK_DISPLAY_NAMES[b.bank_name] || b.bank_name,
                    date: b.date,
                }))
                .sort((a, b) => {
                    const aIdx = PREFERRED_BANKS.indexOf(a.name);
                    const bIdx = PREFERRED_BANKS.indexOf(b.name);
                    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                    if (aIdx !== -1) return -1;
                    if (bIdx !== -1) return 1;
                    return a.displayName.localeCompare(b.displayName);
                });
        },

        getSelectedBank() { return selectedBank; },

        getSelectedBankDisplayName() {
            if (!selectedBank) return 'Best Rate';
            return BANK_DISPLAY_NAMES[selectedBank] || selectedBank;
        },

        setBank(bankName) {
            if (bankName === 'best' || bankName === '') bankName = null;
            if (bankName === selectedBank) return;
            selectedBank = bankName;
            if (!usingFallback) rebuildRatesMap();
            fireCallbacks();
        },

        /**
         * Get the current rate type: 'buy' or 'sell'.
         */
        getRateType() { return rateType; },

        /**
         * Switch between buy and sell rates.
         * @param {'buy'|'sell'} type
         */
        setRateType(type) {
            if (type !== 'buy' && type !== 'sell') return;
            if (type === rateType) return;
            rateType = type;
            if (!usingFallback) rebuildRatesMap();
            fireCallbacks();
        },

        onChange(callback) {
            if (typeof callback === 'function') onChangeCallbacks.push(callback);
        },

        // Legacy alias
        onBankChange(callback) { this.onChange(callback); },

        getBankData(bankName) {
            return allBanksData.find(b => b.bank_name === bankName) || null;
        },

        /**
         * Get the latest date from all bank data.
         */
        getLatestDate() {
            if (!allBanksData || allBanksData.length === 0) return null;
            let latest = null;
            allBanksData.forEach(b => {
                if (b.date && (!latest || b.date > latest)) latest = b.date;
            });
            return latest;
        },
    };

    window.ExchangeRate = ExchangeRate;
})();
