// ===============================================================
// UNIFIED INVESTMENT CALCULATOR — Two tabs:
//   1) Property × Finance  (rent + NBFI compounding)
//   2) Finance Only         (annual compounding)
// Both tabs share one set of rates (Sanity `investmentRates`, else the
// published defaults below) and withhold tax on interest before it is
// reinvested, so the same product gives the same answer in either tab.
// ===============================================================
document.addEventListener('DOMContentLoaded', () => {

    // ---------------------------------------------------------------
    // TAB SWITCHING
    // ---------------------------------------------------------------
    const tabBtns = document.querySelectorAll('.calc-tab-btn');
    const paneProperty = document.getElementById('calcPaneProperty');
    const paneFinance = document.getElementById('calcPaneFinance');
    const calcDescEl = document.getElementById('calcDescText');

    if (!tabBtns.length) return; // not on the right page

    let activeTab = 'property'; // 'property' | 'finance'
    let propInitDone = false;
    let finInitDone = false;

    // Recalc hooks, set by each tab's init; called when the shared rates arrive from Sanity
    let _propRecalc = null;
    let _finRecalc = null;

    // ---------------------------------------------------------------
    // SHARED RATES — Sanity `investmentRates`, falling back to the rates
    // published in the site copy (MNT asset management ~13%).
    // ---------------------------------------------------------------
    const RATES = {
        yieldPercent: 7.0,   // property rental yield
        nbfiPercent: 13.0,   // MNT non-bank finance product
        taxPercent: 20.0,    // withholding tax on interest
    };

    async function loadInvestmentRates() {
        if (!window.SanityAPI || !window.SanityAPI.fetch) return;
        try {
            const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Sanity fetch timeout')), 4000));
            const rates = await Promise.race([window.SanityAPI.fetch('*[_type == "investmentRates"][0]'), timeout]);
            if (!rates) return;
            if (rates.propertyYieldPercent > 0) RATES.yieldPercent = rates.propertyYieldPercent;
            if (rates.nonBankingInterestPercent > 0) RATES.nbfiPercent = rates.nonBankingInterestPercent;
            if (rates.taxRatePercent >= 0) RATES.taxPercent = rates.taxRatePercent;
            if (propInitDone && _propRecalc) _propRecalc();
            if (finInitDone && _finRecalc) _finRecalc();
        } catch (err) {
            // Sanity unavailable — keep the published defaults
        }
    }

    // ---------------------------------------------------------------
    // I18N HELPERS for strings built in JS
    // ---------------------------------------------------------------
    function tr(key, fallback) {
        const lang = document.documentElement.lang || 'en';
        const t = window.translations && window.translations[lang];
        return (t && t[key]) || fallback;
    }

    function dateLocale() {
        const lang = document.documentElement.lang;
        return lang === 'mn' ? 'mn-MN' : lang === 'ja' ? 'ja-JP' : 'en-US';
    }

    /** "1 JPY ≈ 22.78 MNT" for the active currency, or '' for MNT. */
    function rateLine(currency) {
        if (currency === 'MNT' || !window.ExchangeRate) return '';
        const rate = window.ExchangeRate.getRate(currency);
        return rate ? `1 ${currency} ≈ ${rate.toLocaleString('en-US')} MNT` : '';
    }

    // ---------------------------------------------------------------
    // EXCHANGE-RATE SOURCE LINE
    // ---------------------------------------------------------------
    const rateSourceInfo = document.getElementById('rateSourceInfo');

    function updateRateSourceInfo() {
        if (!rateSourceInfo || !window.ExchangeRate || !window.ExchangeRate.isLoaded()) return;
        if (window.ExchangeRate.isApproximate()) {
            rateSourceInfo.textContent = tr('calc_rate_fallback', 'Exchange rates: approximate. Live rates are unavailable right now.');
            return;
        }
        const updated = window.ExchangeRate.getUpdatedAt();
        const dateText = updated ? updated.toLocaleDateString(dateLocale(), { year: 'numeric', month: 'short', day: 'numeric' }) : '';
        rateSourceInfo.textContent = tr('calc_rate_source', 'Exchange rates: mid-market (moneyconvert.net), updated {date}')
            .replace('{date}', dateText);
    }

    // The source line is built in JS, so it has to follow the language switcher
    document.addEventListener('languageChanged', updateRateSourceInfo);

    if (window.ExchangeRate) window.ExchangeRate.init().then(updateRateSourceInfo);
    loadInvestmentRates();

    function switchTab(tab) {
        activeTab = tab;
        tabBtns.forEach(btn => {
            const isActive = btn.dataset.tab === tab;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', String(isActive));
        });
        if (paneProperty) paneProperty.style.display = (tab === 'property') ? 'block' : 'none';
        if (paneFinance) paneFinance.style.display = (tab === 'finance') ? 'block' : 'none';

        // Update description text
        if (calcDescEl) {
            if (tab === 'property') {
                calcDescEl.setAttribute('data-i18n', 'calc_desc');
                calcDescEl.textContent = calcDescEl.dataset.propDesc || calcDescEl.textContent;
            } else {
                calcDescEl.setAttribute('data-i18n', 'fin_desc');
                calcDescEl.textContent = calcDescEl.dataset.finDesc || calcDescEl.textContent;
            }
            // Re-apply translations if available
            if (typeof window.applyTranslationsAndTwemoji === 'function') {
                window.applyTranslationsAndTwemoji(localStorage.getItem('nest-lang') || 'en');
            } else if (window.applyTranslations) {
                window.applyTranslations(localStorage.getItem('nest-lang') || 'en');
            }
        }

        // Lazy init
        if (tab === 'property' && !propInitDone) { propInitDone = true; setTimeout(initPropertyCalc, 50); }
        if (tab === 'finance' && !finInitDone) { finInitDone = true; setTimeout(initFinanceCalc, 50); }
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // ===============================================================
    // 1) PROPERTY × FINANCE CALCULATOR
    // ===============================================================
    function initPropertyCalc() {
        const amountInput = document.getElementById('investAmount');
        const currencySymbolEl = document.getElementById('currencySymbol');
        const yearsSlider = document.getElementById('investYears');
        const yearValueDisplays = document.querySelectorAll('#yearValueDisplay, #resYearCount');
        const currencySwitcher = document.getElementById('currencySwitcher');
        const exchangeRateInfoEl = document.getElementById('exchangeRateInfo');

        const lblPropYield = document.getElementById('lblPropYield');
        const lblNbInterest = document.getElementById('lblNbInterest');
        const lblTaxRate = document.getElementById('lblTaxRate');

        const resTotalReturn = document.getElementById('resTotalReturn');
        const resPropertyInc = document.getElementById('resPropertyInc');
        const resNbfiInc = document.getElementById('resNbfiInc');
        const resNetProfit = document.getElementById('resNetProfit');
        const resRoi = document.getElementById('resRoi');
        const tableBody = document.getElementById('yearlyTableBody');

        let currentCurrency = 'MNT';
        let currentLang = document.documentElement.lang || 'en';

        const state = RATES; // shared with the finance tab

        let _internalMntValue = 100000000;

        // --- Currency ---
        function buildCurrencySwitcher() {
            if (!currencySwitcher || !window.ExchangeRate) return;
            const currencies = window.ExchangeRate.getSupportedCurrencies();
            currencySwitcher.innerHTML = '';
            currencies.forEach(cur => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = cur.code;
                btn.dataset.currency = cur.code;
                btn.title = cur.label;
                btn.style.cssText = `padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;cursor:pointer;transition:background-color 0.15s ease-out,color 0.15s ease-out,border-color 0.15s ease-out;border:1px solid rgba(255,255,255,0.25);font-family:inherit;letter-spacing:0.5px;`;
                applyBtnStyle(btn, cur.code === currentCurrency);
                btn.addEventListener('click', () => selectCurrency(cur.code));
                currencySwitcher.appendChild(btn);
            });
        }

        function applyBtnStyle(btn, isActive) {
            btn.setAttribute('aria-pressed', String(isActive));
            if (isActive) {
                btn.style.background = 'var(--gold)';
                btn.style.color = 'var(--primary)';
                btn.style.borderColor = 'var(--gold)';
            } else {
                btn.style.background = 'transparent';
                btn.style.color = 'rgba(255,255,255,0.7)';
                btn.style.borderColor = 'rgba(255,255,255,0.25)';
            }
        }

        function updateSwitcherActiveState() {
            if (!currencySwitcher) return;
            currencySwitcher.querySelectorAll('button').forEach(btn => {
                applyBtnStyle(btn, btn.dataset.currency === currentCurrency);
            });
        }

        function selectCurrency(code) {
            if (code === currentCurrency) return;
            currentCurrency = code;
            updateSwitcherActiveState();
            updateCurrencySymbol();
            updateExchangeRateInfo();
            reformatAmountInput();
            calculateReturns();
        }

        function updateCurrencySymbol() {
            if (!currencySymbolEl || !window.ExchangeRate) return;
            currencySymbolEl.textContent = window.ExchangeRate.getSymbol(currentCurrency);
        }

        function updateExchangeRateInfo() {
            if (exchangeRateInfoEl) exchangeRateInfoEl.textContent = rateLine(currentCurrency);
        }

        // --- Amount ---
        function reformatAmountInput() {
            if (!amountInput) return;
            const displayAmount = convertFromMnt(_internalMntValue);
            amountInput.value = formatAmount(displayAmount);
        }

        /** Plain string for editing (no thousands separators); avoids per-keystroke format locking for USD/EUR/CNY. */
        function toEditableAmountString(mntVal) {
            const n = convertFromMnt(mntVal);
            if (currentCurrency === 'MNT' || currentCurrency === 'JPY' || currentCurrency === 'KRW') {
                return String(Math.round(n));
            }
            const rounded = Math.round(n * 100) / 100;
            if (!Number.isFinite(rounded)) return '0';
            if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return String(Math.round(rounded));
            return String(rounded);
        }

        function sanitizeAmountTyping(raw) {
            let val = raw.replace(/[^0-9.,]/g, '').replace(/,/g, '');
            const firstDot = val.indexOf('.');
            if (firstDot !== -1) {
                val = val.slice(0, firstDot + 1) + val.slice(firstDot + 1).replace(/\./g, '');
            }
            const intOnly = currentCurrency === 'MNT' || currentCurrency === 'JPY' || currentCurrency === 'KRW';
            if (intOnly) {
                val = val.split('.')[0];
            } else {
                const parts = val.split('.');
                if (parts[1] !== undefined) {
                    val = parts[0] + '.' + parts[1].slice(0, 2);
                }
            }
            return val;
        }

        function convertFromMnt(mntAmount) {
            if (!window.ExchangeRate) return mntAmount;
            return window.ExchangeRate.convert(mntAmount, currentCurrency);
        }

        function convertToMnt(displayAmount) {
            if (currentCurrency === 'MNT' || !window.ExchangeRate) return displayAmount;
            const rate = window.ExchangeRate.getRate(currentCurrency);
            if (!rate) return displayAmount;
            return displayAmount * rate;
        }

        function formatAmount(amount) {
            if (!window.ExchangeRate) return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount);
            return window.ExchangeRate.format(amount, currentCurrency);
        }

        function formatResult(mntAmount) {
            const displayAmount = convertFromMnt(mntAmount);
            const formatted = formatAmount(displayAmount);
            const sym = window.ExchangeRate ? window.ExchangeRate.getSymbol(currentCurrency) : currentCurrency;
            return `${formatted} ${currentCurrency === 'MNT' ? 'MNT' : `${currentCurrency} (${sym})`}`;
        }

        // --- Properties ---
        async function fetchPropertiesFromSanity() {
            const container = document.getElementById('dynamicPropertiesContainer');
            if (!container) return;
            try {
                if (!window.SanityAPI || !window.SanityAPI.fetch) { renderPropertiesFallback(container); return; }
                const query = '*[_type == "property" && isAvailable == true] | order(_createdAt desc)';
                const fetchPromise = window.SanityAPI.fetch(query);
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Sanity fetch timeout')), 5000));
                const properties = await Promise.race([fetchPromise, timeoutPromise]);
                const t = window.translations && window.translations[currentLang] ? window.translations[currentLang] : {};
                const fallbackProperties = [{
                    title: t['ex_prop_title'] || "PJ Yado NP18-17",
                    address: t['ex_prop_address'] || "41-35 second 40000 Chingeltei district, Ulaanbaatar",
                    price: 315000000, layout: "1DK", totalArea: "55 m²", buildYear: 1980, targetRent: 1837000,
                    coverImage: null, isAvailable: true,
                    description: t['ex_prop_desc'] || "This renovated 1DK property in the heart of Chingeltei district offers stable rental yields."
                }];
                const propertiesToRender = (!properties || properties.length === 0) ? fallbackProperties : properties;
                renderProperties(container, propertiesToRender, t);
            } catch (err) {
                // Error fetching properties — render fallback
                renderPropertiesFallback(container);
            }
        }

        function buildPropertyPriceDisplay(mntPrice) {
            const mntFormatted = new Intl.NumberFormat('en-US').format(mntPrice);
            let secondaryLine = '';
            if (currentCurrency !== 'MNT' && window.ExchangeRate) {
                const converted = window.ExchangeRate.convert(mntPrice, currentCurrency);
                const formatted = window.ExchangeRate.format(converted, currentCurrency);
                const sym = window.ExchangeRate.getSymbol(currentCurrency);
                secondaryLine = `<div style="font-size:15px; font-weight:600; color:var(--gold); margin-top:2px;">≈ ${sym} ${formatted} ${currentCurrency}</div>`;
            }
            return `<div style="font-size:28px; font-weight:700; color:var(--primary);">${mntFormatted} <span style="font-size:16px;">MNT</span></div>${secondaryLine}`;
        }

        function renderProperties(container, propertiesToRender, t) {
            const esc = window.SanityAPI && window.SanityAPI.escapeHTML ? window.SanityAPI.escapeHTML : (s) => String(s);
            const availableText = t['invest_available'] || 'Available';
            const valueText = t['invest_prop_price'] || 'Property Value';
            const layoutText = t['invest_layout'] || 'Layout';
            const areaText = t['invest_area'] || 'Total Area';
            const builtText = t['invest_built'] || 'Built';
            const targetRentText = t['invest_target_rent'] || 'Target Rent';
            const simulateBtnText = t['invest_simulate_btn'] || 'Calculate Returns ->';
            const formatNum = (num) => new Intl.NumberFormat('en-US').format(num);

            let html = '';
            propertiesToRender.forEach(prop => {
                const imageUrl = prop.coverImage
                    ? (window.SanityAPI && window.SanityAPI.urlFor ? window.SanityAPI.urlFor(prop.coverImage) : 'assets/renovations/p1-after.jpg')
                    : 'assets/renovations/p1-after.jpg';
                // CMS values land inside attributes/markup — force numerics to numbers
                const price = Number(prop.price) || 0;
                const buildYear = Number(prop.buildYear) || '';
                const rentFormatted = formatNum(Number(prop.targetRent) || 0);
                const desc = document.createElement('div');
                desc.innerText = prop.description || '';

                html += `
                <div class="card property-card" data-price="${price}"
                    style="display:flex; flex-direction:column; background:var(--white); border-radius:12px; overflow:hidden; box-shadow:0 15px 40px rgba(0,0,0,0.06); cursor:pointer; transition:transform 0.3s, box-shadow 0.3s; margin-bottom: 20px;">
                    <div style="width:100%; height:300px; background:url('${imageUrl}') center/cover no-repeat; background-color:var(--primary); position:relative;">
                        <div style="position:absolute; top:20px; right:20px; background:var(--gold); color:var(--primary); font-weight:700; padding:8px 16px; border-radius:30px; font-size:14px; box-shadow:0 4px 10px rgba(0,0,0,0.2);">
                            ${availableText}</div>
                    </div>
                    <div style="padding:40px;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 24px;">
                            <div>
                                <h3 style="font-size:24px; font-weight:700; color:var(--primary); margin-bottom:8px;">${esc(prop.title)}</h3>
                                <p style="color:var(--text-light); font-size:15px; display:flex; align-items:center; gap:6px;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                        <circle cx="12" cy="10" r="3"></circle>
                                    </svg>
                                    ${esc(prop.address)}
                                </p>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-size:14px; color:var(--text-light); margin-bottom:4px;">${valueText}</div>
                                <div class="prop-price-display">${buildPropertyPriceDisplay(price)}</div>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:20px; margin-bottom:30px; padding:24px; background:var(--off-white); border-radius:8px;">
                            <div><div style="font-size:13px; color:var(--text-light); margin-bottom:4px;">${layoutText}</div><div style="font-weight:700; color:var(--primary); font-size:16px;">${esc(prop.layout)}</div></div>
                            <div><div style="font-size:13px; color:var(--text-light); margin-bottom:4px;">${areaText}</div><div style="font-weight:700; color:var(--primary); font-size:16px;">${esc(prop.totalArea)}</div></div>
                            <div><div style="font-size:13px; color:var(--text-light); margin-bottom:4px;">${builtText}</div><div style="font-weight:700; color:var(--primary); font-size:16px;">${buildYear}</div></div>
                            <div><div style="font-size:13px; color:var(--text-light); margin-bottom:4px;">${targetRentText}</div><div style="font-weight:700; color:var(--primary); font-size:16px;">${rentFormatted} MNT/mo</div></div>
                        </div>
                        <p style="color:var(--text-light); line-height:1.7; font-size:15px; margin-bottom: 24px;">${desc.innerHTML}</p>
                        <div style="text-align:right;">
                            <button class="select-property-btn" style="background:var(--primary); color:var(--gold); font-weight:700; padding:12px 24px; border:none; border-radius:8px; font-size:15px; cursor:pointer; transition: opacity 0.3s; font-family:inherit;">
                                ${simulateBtnText}
                            </button>
                        </div>
                    </div>
                </div>`;
            });

            container.innerHTML = html;

            const cards = container.querySelectorAll('.property-card');
            cards.forEach(card => {
                card.addEventListener('mouseenter', () => { card.style.transform = 'translateY(-5px)'; card.style.boxShadow = '0 20px 50px rgba(0,0,0,0.1)'; });
                card.addEventListener('mouseleave', () => { card.style.transform = 'none'; card.style.boxShadow = '0 15px 40px rgba(0,0,0,0.06)'; });
                card.addEventListener('click', () => {
                    if (amountInput) {
                        const rawPrice = parseInt(card.dataset.price, 10);
                        _internalMntValue = rawPrice;
                        const displayAmount = convertFromMnt(rawPrice);
                        amountInput.value = formatAmount(displayAmount);
                        calculateReturns();
                        // Switch to property tab and scroll
                        switchTab('property');
                        const calcSection = document.getElementById('calculator');
                        if (calcSection) calcSection.scrollIntoView({ behavior: 'smooth' });
                    }
                });
            });
        }

        function renderPropertiesFallback(container) {
            const t = window.translations && window.translations[currentLang] ? window.translations[currentLang] : {};
            const prop = {
                title: t['ex_prop_title'] || "PJ Yado NP18-17",
                address: t['ex_prop_address'] || "41-35 second 40000 Chingeltei district, Ulaanbaatar",
                price: 315000000, layout: "1DK", totalArea: "55 m²", buildYear: 1980, targetRent: 1837000,
                description: t['ex_prop_desc'] || "This renovated 1DK property in the heart of Chingeltei district offers stable rental yields."
            };
            renderProperties(container, [prop], t);
        }

        // --- Assumptions Labels ---
        function updateAssumptionsLabels(suffix = '') {
            if (lblPropYield) lblPropYield.textContent = `${state.yieldPercent.toFixed(1)}%${suffix}`;
            if (lblNbInterest) lblNbInterest.textContent = `${state.nbfiPercent.toFixed(1)}%${suffix}`;
            if (lblTaxRate) lblTaxRate.textContent = `${state.taxPercent.toFixed(1)}%${suffix}`;
        }

        function applySharedRates() {
            updateAssumptionsLabels('');
            calculateReturns();
        }

        // --- Core Calc ---
        function calculateReturns() {
            if (!amountInput || !yearsSlider) return;
            const rawDisplay = amountInput.value.replace(/[^0-9.,]/g, '').replace(/,/g, '');
            const displayParsed = parseFloat(rawDisplay) || 0;
            const initialInvestment = convertToMnt(displayParsed);
            _internalMntValue = initialInvestment;

            const years = parseInt(yearsSlider.value, 10) || 5;
            yearValueDisplays.forEach(el => el.textContent = years);

            if (tableBody) tableBody.innerHTML = '';

            let totalPropertyRent = 0;
            let cumulativeInterest = 0;
            let cumulativeTax = 0;
            let totalCashPool = 0;

            // Rent goes into the NBFI product monthly; each month's interest has
            // withholding tax deducted before it is reinvested (as in the finance tab).
            for (let y = 1; y <= years; y++) {
                const annualRent = initialInvestment * (state.yieldPercent / 100);
                totalPropertyRent += annualRent;
                let yearInterest = 0;
                let yearTax = 0;
                for (let m = 1; m <= 12; m++) {
                    totalCashPool += annualRent / 12;
                    const monthInterest = totalCashPool * ((state.nbfiPercent / 100) / 12);
                    const monthTax = monthInterest * (state.taxPercent / 100);
                    yearInterest += monthInterest;
                    yearTax += monthTax;
                    totalCashPool += monthInterest - monthTax;
                }
                cumulativeInterest += yearInterest;
                cumulativeTax += yearTax;
                const currentYearEndBalance = initialInvestment + totalCashPool;

                if (tableBody) {
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                    tr.innerHTML = `
                        <td style="padding:15px 10px;">${y}</td>
                        <td style="padding:15px 10px; text-align:right;">${formatResult(annualRent)}</td>
                        <td style="padding:15px 10px; text-align:right; color:var(--gold);">${formatResult(yearInterest)}</td>
                        <td style="padding:15px 10px; text-align:right; color:#E53935;">-${formatResult(yearTax)}</td>
                        <td style="padding:15px 10px; text-align:right; font-weight:700;">${formatResult(currentYearEndBalance)}</td>`;
                    tableBody.appendChild(tr);
                }
            }

            const finalNetProfit = totalCashPool;
            const totalReturn = initialInvestment + finalNetProfit;
            const totalROI = initialInvestment > 0 ? (finalNetProfit / initialInvestment) * 100 : 0;

            if (resPropertyInc) resPropertyInc.textContent = formatResult(totalPropertyRent);
            if (resNbfiInc) resNbfiInc.textContent = formatResult(cumulativeInterest);
            if (resNetProfit) resNetProfit.textContent = formatResult(finalNetProfit);
            if (resTotalReturn) resTotalReturn.textContent = formatResult(totalReturn);
            if (resRoi) resRoi.textContent = `${totalROI.toFixed(1)}%`;
        }

        // --- Language / Currency Sync ---
        function updateLanguageCurrency() {
            currentLang = document.documentElement.lang || 'en';
            if (currentLang === 'ja' && currentCurrency === 'MNT') selectCurrency('JPY');
        }

        // --- Event Listeners (property amount: edit raw while focused; format on blur — fixes USD/CNY/EUR typing) ---
        if (amountInput) {
            amountInput.addEventListener('focus', () => {
                amountInput.value = toEditableAmountString(_internalMntValue);
            });
            amountInput.addEventListener('blur', () => {
                reformatAmountInput();
                calculateReturns();
            });
            amountInput.addEventListener('input', (e) => {
                const sanitized = sanitizeAmountTyping(e.target.value);
                e.target.value = sanitized;
                const parsed = sanitized === '' || sanitized === '.' ? 0 : parseFloat(sanitized);
                _internalMntValue = convertToMnt(Number.isFinite(parsed) ? parsed : 0);
                calculateReturns();
            });
        }

        if (yearsSlider) {
            const updateYearDisplays = () => {
                const v = yearsSlider.value;
                const primaryDisplay = document.getElementById('yearValueDisplay');
                const secondaryDisplay = document.getElementById('resYearCount');
                if (primaryDisplay) primaryDisplay.textContent = v;
                if (secondaryDisplay) secondaryDisplay.textContent = v;
                calculateReturns();
            };
            yearsSlider.addEventListener('input', updateYearDisplays);
            yearsSlider.addEventListener('change', updateYearDisplays);
        }

        // MutationObserver for lang changes
        try {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'lang') {
                        currentLang = document.documentElement.lang || 'en';
                        if (window.SanityAPI) fetchPropertiesFromSanity();
                        calculateReturns();
                    }
                });
            });
            observer.observe(document.documentElement, { attributes: true });
        } catch (err) { }

        // --- Init ---
        if (amountInput) amountInput.value = formatAmount(convertFromMnt(_internalMntValue));
        buildCurrencySwitcher();
        if (window.ExchangeRate) {
            window.ExchangeRate.init().then(() => {
                updateExchangeRateInfo();
                const container = document.getElementById('dynamicPropertiesContainer');
                if (container) {
                    container.querySelectorAll('.property-card').forEach(card => {
                        const priceDisplay = card.querySelector('.prop-price-display');
                        if (priceDisplay) priceDisplay.innerHTML = buildPropertyPriceDisplay(parseInt(card.dataset.price, 10));
                    });
                }
                calculateReturns();
            });
        }
        applySharedRates();
        fetchPropertiesFromSanity();

        // Shared rates arrived from Sanity
        _propRecalc = applySharedRates;
    }

    // ===============================================================
    // 2) FINANCE ONLY CALCULATOR
    // ===============================================================
    function initFinanceCalc() {
        const finAmountInput = document.getElementById('finAmount');
        const finCurrSymbol = document.getElementById('finCurrencySymbol');
        const finYearsSlider = document.getElementById('finYears');
        const finYearDisplay = document.getElementById('finYearDisplay');
        const finRateChipsEl = document.getElementById('finRateChips');
        const finCurrSwitcher = document.getElementById('finCurrencySwitcher');
        const finExchInfo = document.getElementById('finExchangeRateInfo');
        const finResTotal = document.getElementById('finResTotalReturn');
        const finResInterest = document.getElementById('finResInterest');
        const finResTax = document.getElementById('finResTax');
        const finResNet = document.getElementById('finResNetProfit');
        const finResRoi = document.getElementById('finResRoi');
        const finResYearCount = document.getElementById('finResYearCount');
        const finLblRate = document.getElementById('finLblRate');
        const finLblTax = document.getElementById('finLblTax');
        const finTableBody = document.getElementById('finYearlyTableBody');

        if (!finAmountInput) return;

        const MNT_RATES = [0.12, 0.13, 0.14, 0.15];
        const FOREIGN_RATES = [0.04, 0.05, 0.06];
        const FOREIGN_DEFAULT = 0.05; // published JPY asset-management rate (~5%)
        const DEFAULT_MNT = 100000000;

        let finCurrency = 'MNT';
        let finRate = RATES.nbfiPercent / 100;
        let userPickedRate = false;
        let finYears = 5;
        let finInternalMnt = DEFAULT_MNT;

        const ER = () => window.ExchangeRate;
        const taxRate = () => RATES.taxPercent / 100;
        const defaultRate = () => (finCurrency === 'MNT' ? RATES.nbfiPercent / 100 : FOREIGN_DEFAULT);
        const pct = (r) => `${+(r * 100).toFixed(1)}%`;

        function finFromMnt(mnt) {
            if (finCurrency === 'MNT' || !ER()) return mnt;
            return ER().convert(mnt, finCurrency);
        }

        function finToMnt(displayVal) {
            if (finCurrency === 'MNT' || !ER()) return displayVal;
            const rate = ER().getRate(finCurrency);
            return rate ? displayVal * rate : displayVal;
        }

        function finFmt(mnt) {
            const isJpyKrw = finCurrency === 'JPY' || finCurrency === 'KRW';
            if (finCurrency === 'MNT' || !ER()) return Math.round(mnt).toLocaleString('en-US') + ' MNT';
            const converted = ER().convert(mnt, finCurrency);
            const sym = ER().getSymbol(finCurrency);
            const dec = isJpyKrw ? 0 : 2;
            return converted.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + ` ${finCurrency} (${sym})`;
        }

        function fmtInput(num) {
            const isJpyKrw = finCurrency === 'JPY' || finCurrency === 'KRW';
            if (finCurrency === 'MNT') return Math.round(num).toLocaleString('en-US');
            return num.toLocaleString('en-US', { minimumFractionDigits: isJpyKrw ? 0 : 2, maximumFractionDigits: isJpyKrw ? 0 : 2 });
        }

        // The chip list always contains the default rate, so a Sanity rate outside the presets still shows
        function getRateList() {
            const base = (finCurrency === 'MNT') ? MNT_RATES : FOREIGN_RATES;
            const def = defaultRate();
            return base.includes(def) ? base : [...base, def].sort((a, b) => a - b);
        }

        function buildRateChips() {
            if (!finRateChipsEl) return;
            finRateChipsEl.innerHTML = '';
            const rates = getRateList();
            if (!rates.includes(finRate)) finRate = defaultRate();
            rates.forEach(r => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = pct(r);
                const isActive = r === finRate;
                btn.setAttribute('aria-pressed', String(isActive));
                btn.style.cssText = [
                    'padding:8px 18px', 'border-radius:100px',
                    `border:1.5px solid ${isActive ? 'var(--gold)' : 'rgba(255,255,255,0.25)'}`,
                    `background:${isActive ? 'var(--gold)' : 'transparent'}`,
                    `color:${isActive ? 'var(--primary)' : 'rgba(255,255,255,0.8)'}`,
                    'font-weight:700', 'font-size:14px', 'cursor:pointer',
                    'transition:background-color 0.15s ease-out,color 0.15s ease-out,border-color 0.15s ease-out', 'font-family:inherit',
                ].join(';');
                btn.addEventListener('click', () => { finRate = r; userPickedRate = true; buildRateChips(); finCalculate(); });
                finRateChipsEl.appendChild(btn);
            });
            if (finLblRate) finLblRate.textContent = (finRate * 100).toFixed(1) + '%';
        }

        function buildFinCurrSwitcher() {
            if (!finCurrSwitcher) return;
            finCurrSwitcher.innerHTML = '';
            const foreignCodes = ER() ? ER().getSupportedCurrencies().map(c => c.code).filter(c => c !== 'MNT') : ['USD', 'JPY', 'EUR', 'CNY', 'KRW'];
            const currencies = ['MNT', ...foreignCodes];
            currencies.forEach(code => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = code;
                const isActive = code === finCurrency;
                btn.setAttribute('aria-pressed', String(isActive));
                btn.style.cssText = [
                    'padding:6px 14px', 'border-radius:100px',
                    `border:1.5px solid ${isActive ? 'var(--gold)' : 'rgba(255,255,255,0.25)'}`,
                    `background:${isActive ? 'var(--gold)' : 'transparent'}`,
                    `color:${isActive ? 'var(--primary)' : 'rgba(255,255,255,0.8)'}`,
                    'font-weight:700', 'font-size:13px', 'cursor:pointer',
                    'transition:background-color 0.15s ease-out,color 0.15s ease-out,border-color 0.15s ease-out', 'font-family:inherit',
                ].join(';');
                btn.addEventListener('click', () => {
                    if (code === finCurrency) return;
                    finCurrency = code;
                    finRate = defaultRate(); // MNT and foreign products have different rates
                    userPickedRate = false;
                    buildFinCurrSwitcher(); buildRateChips();
                    if (finAmountInput) finAmountInput.value = fmtInput(finFromMnt(finInternalMnt));
                    if (finCurrSymbol) finCurrSymbol.textContent = code;
                    updateFinExchInfo(); finCalculate();
                });
                finCurrSwitcher.appendChild(btn);
            });
        }

        function updateFinExchInfo() {
            if (finExchInfo) finExchInfo.textContent = rateLine(finCurrency);
        }

        function finCalculate() {
            const years = finYears;
            const TAX_RATE = taxRate();
            if (finYearDisplay) finYearDisplay.textContent = years;
            if (finResYearCount) finResYearCount.textContent = years;
            if (finLblRate) finLblRate.textContent = (finRate * 100).toFixed(1) + '%';
            if (finLblTax) finLblTax.textContent = pct(TAX_RATE);

            const P0 = finInternalMnt;
            if (!P0 || P0 <= 0) { clearFinResults(); return; }

            let principal = P0;
            let totalGrossInterest = 0;
            let totalTax = 0;
            const rows = [];

            for (let y = 1; y <= years; y++) {
                const grossInterest = principal * finRate;
                const tax = grossInterest * TAX_RATE;
                const netInterest = grossInterest - tax;
                principal = principal + netInterest;
                totalGrossInterest += grossInterest;
                totalTax += tax;
                rows.push({ year: y, principal: principal - netInterest, grossInterest, tax, balance: principal });
            }

            const totalReturn = principal;
            const netProfit = principal - P0;
            const roi = ((netProfit / P0) * 100).toFixed(1);

            if (finResTotal) finResTotal.textContent = finFmt(totalReturn);
            if (finResInterest) finResInterest.textContent = finFmt(totalGrossInterest);
            if (finResTax) finResTax.textContent = '-' + finFmt(totalTax);
            if (finResNet) finResNet.textContent = finFmt(netProfit);
            if (finResRoi) finResRoi.textContent = roi + '%';

            if (!finTableBody) return;
            finTableBody.innerHTML = '';
            rows.forEach((r, idx) => {
                const isLast = idx === rows.length - 1;
                const tr = document.createElement('tr');
                tr.style.borderBottom = `1px solid rgba(255,255,255,${isLast ? '0' : '0.07'})`;
                tr.innerHTML = `
                    <td style="padding:14px 10px;font-weight:700;">${r.year}</td>
                    <td style="padding:14px 10px;text-align:right;color:rgba(255,255,255,0.7);">${finFmt(r.principal)}</td>
                    <td style="padding:14px 10px;text-align:right;color:var(--gold);">${finFmt(r.grossInterest)}</td>
                    <td style="padding:14px 10px;text-align:right;color:#EF9A9A;">-${finFmt(r.tax)}</td>
                    <td style="padding:14px 10px;text-align:right;font-weight:700;">${finFmt(r.balance)}</td>`;
                finTableBody.appendChild(tr);
            });
        }

        function clearFinResults() {
            [finResTotal, finResInterest, finResTax, finResNet].forEach(el => { if (el) el.textContent = '—'; });
            if (finResRoi) finResRoi.textContent = '0%';
            if (finTableBody) finTableBody.innerHTML = '';
        }

        // --- Event Listeners ---
        if (finAmountInput) {
            finAmountInput.addEventListener('input', (e) => {
                const raw = e.target.value.replace(/[^0-9.,]/g, '').replace(/,/g, '');
                const parsed = parseFloat(raw) || 0;
                finInternalMnt = finToMnt(parsed);
                finCalculate();
            });
            finAmountInput.addEventListener('focus', (e) => {
                e.target.value = e.target.value.replace(/[^0-9.,]/g, '').replace(/,/g, '');
            });
            finAmountInput.addEventListener('blur', () => {
                if (finAmountInput) finAmountInput.value = fmtInput(finFromMnt(finInternalMnt));
            });
        }

        if (finYearsSlider) {
            finYearsSlider.addEventListener('input', (e) => {
                finYears = parseInt(e.target.value, 10);
                if (finYearDisplay) finYearDisplay.textContent = finYears;
                finCalculate();
            });
        }

        // --- Init ---
        buildFinCurrSwitcher();
        buildRateChips();
        if (finAmountInput) finAmountInput.value = fmtInput(finInternalMnt);
        if (finCurrSymbol) finCurrSymbol.textContent = 'MNT';
        if (finYearsSlider) finYearsSlider.value = 5;
        if (finYearDisplay) finYearDisplay.textContent = 5;

        if (ER()) {
            ER().init().then(() => { buildFinCurrSwitcher(); updateFinExchInfo(); finCalculate(); });
        }
        finCalculate();

        // Shared rates arrived from Sanity: move to the new default unless the visitor picked a rate
        _finRecalc = () => {
            if (!userPickedRate) finRate = defaultRate();
            buildRateChips();
            finCalculate();
        };
    }

    // ---------------------------------------------------------------
    // BOOT: init the default (property) tab immediately
    // ---------------------------------------------------------------
    propInitDone = true;
    initPropertyCalc();
    switchTab('property');
});
