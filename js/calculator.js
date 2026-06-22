// ===============================================================
// UNIFIED INVESTMENT CALCULATOR — Two tabs:
//   1) Property × Finance  (rent + NBFI compounding)
//   2) Finance Only         (annual compounding, 20% withholding tax)
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

    // ---------------------------------------------------------------
    // BANK SELECTOR
    // ---------------------------------------------------------------
    const bankSelector = document.getElementById('bankSelector');
    const bankDateInfo = document.getElementById('bankDateInfo');

    // Expose recalc callbacks so bank/rate-type change can trigger them
    let _propRecalc = null;  // set by initPropertyCalc
    let _finRecalc = null;   // set by initFinanceCalc

    function populateBankSelector() {
        if (!bankSelector || !window.ExchangeRate) return;
        const banks = window.ExchangeRate.getAvailableBanks();
        const currentVal = bankSelector.value;
        bankSelector.innerHTML = '<option value="best">🏦 Best Rate (Auto)</option>';
        banks.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.name;
            opt.textContent = b.displayName;
            bankSelector.appendChild(opt);
        });
        if (currentVal && currentVal !== 'best') bankSelector.value = currentVal;
        updateBankDateInfo();
    }

    function updateBankDateInfo() {
        if (!bankDateInfo || !window.ExchangeRate) return;
        if (window.ExchangeRate.isUsingFallback && window.ExchangeRate.isUsingFallback()) {
            bankDateInfo.textContent = 'Live mid-market rates (moneyconvert.net)';
            return;
        }
        const sel = window.ExchangeRate.getSelectedBank();
        if (sel) {
            const data = window.ExchangeRate.getBankData(sel);
            if (data && data.date) {
                bankDateInfo.textContent = `Updated: ${data.date}`;
                return;
            }
        }
        const latestDate = window.ExchangeRate.getLatestDate ? window.ExchangeRate.getLatestDate() : null;
        bankDateInfo.textContent = latestDate ? `API data: ${latestDate}` : '';
    }

    if (bankSelector) {
        bankSelector.addEventListener('change', () => {
            if (!window.ExchangeRate) return;
            window.ExchangeRate.setBank(bankSelector.value === 'best' ? null : bankSelector.value);
        });
    }



    // Listen for any exchange rate changes (bank or rate type) and recalculate
    if (window.ExchangeRate) {
        window.ExchangeRate.onChange(() => {
            updateBankDateInfo();
            if (propInitDone && _propRecalc) _propRecalc();
            if (finInitDone && _finRecalc) _finRecalc();
        });
    }

    function switchTab(tab) {
        activeTab = tab;
        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
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

        let state = {
            yieldPercent: 7.0,
            nbfiPercent: 12.0,
            taxPercent: 20.0,
        };

        let _internalMntValue = 100000000;

        // --- Currency ---
        function buildCurrencySwitcher() {
            if (!currencySwitcher || !window.ExchangeRate) return;
            const currencies = window.ExchangeRate.getSupportedCurrencies();
            currencySwitcher.innerHTML = '';
            currencies.forEach(cur => {
                const btn = document.createElement('button');
                btn.textContent = cur.code;
                btn.dataset.currency = cur.code;
                btn.title = cur.label;
                btn.style.cssText = `padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s;border:1px solid rgba(255,255,255,0.25);font-family:inherit;letter-spacing:0.5px;`;
                applyBtnStyle(btn, cur.code === currentCurrency);
                btn.addEventListener('click', () => selectCurrency(cur.code));
                currencySwitcher.appendChild(btn);
            });
        }

        function applyBtnStyle(btn, isActive) {
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
            if (!exchangeRateInfoEl) return;
            if (currentCurrency === 'MNT') { exchangeRateInfoEl.textContent = ''; return; }
            const rate = window.ExchangeRate && window.ExchangeRate.getRate(currentCurrency);
            if (rate) {
                const isFallback = window.ExchangeRate.isUsingFallback && window.ExchangeRate.isUsingFallback();
                const source = isFallback ? 'Mid-market' : (window.ExchangeRate.getSelectedBankDisplayName ? window.ExchangeRate.getSelectedBankDisplayName() : 'Best Rate');
                exchangeRateInfoEl.textContent = `Live rate: 1 ${currentCurrency} ≈ ${rate.toLocaleString('en-US')} MNT  (${source})`;
            } else {
                exchangeRateInfoEl.textContent = 'Using approximate fallback rate';
            }
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

        // --- Sanity Rates ---
        async function fetchRatesFromSanity() {
            useDefaultRates();
            try {
                if (!window.SanityAPI || !window.SanityAPI.fetch) return;
                const query = '*[_type == "investmentRates"][0]';
                const fetchPromise = window.SanityAPI.fetch(query);
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Sanity fetch timeout')), 4000));
                const rates = await Promise.race([fetchPromise, timeoutPromise]);
                if (rates) {
                    if (rates.propertyYieldPercent) state.yieldPercent = rates.propertyYieldPercent;
                    if (rates.nonBankingInterestPercent) state.nbfiPercent = rates.nonBankingInterestPercent;
                    if (rates.taxRatePercent) state.taxPercent = rates.taxRatePercent;
                    updateAssumptionsLabels('');
                    calculateReturns();
                }
            } catch (err) {
                // Sanity fetch error or timeout — keep default rates
            }
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

        function useDefaultRates() {
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

            for (let y = 1; y <= years; y++) {
                const annualRent = initialInvestment * (state.yieldPercent / 100);
                totalPropertyRent += annualRent;
                let yearInterest = 0;
                for (let m = 1; m <= 12; m++) {
                    totalCashPool += annualRent / 12;
                    const monthInterest = totalCashPool * ((state.nbfiPercent / 100) / 12);
                    yearInterest += monthInterest;
                    totalCashPool += monthInterest;
                }
                cumulativeInterest += yearInterest;
                const yearTax = yearInterest * (state.taxPercent / 100);
                cumulativeTax += yearTax;
                const currentYearEndBalance = initialInvestment + totalCashPool - cumulativeTax;

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

            const finalNetProfit = totalCashPool - cumulativeTax;
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
                populateBankSelector();
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
        fetchRatesFromSanity();
        fetchPropertiesFromSanity();

        // Register recalc callback for bank changes
        _propRecalc = () => {
            buildCurrencySwitcher();
            updateCurrencySymbol();
            updateExchangeRateInfo();
            reformatAmountInput();
            calculateReturns();
        };
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
        const finTableBody = document.getElementById('finYearlyTableBody');

        if (!finAmountInput) return;

        const MNT_RATES = [0.12, 0.13, 0.14, 0.15];
        const FOREIGN_RATES = [0.04, 0.05, 0.06];
        const TAX_RATE = 0.20;
        const DEFAULT_MNT = 100000000;

        let finCurrency = 'MNT';
        let finRate = 0.14;
        let finYears = 5;
        let finInternalMnt = DEFAULT_MNT;

        const ER = () => window.ExchangeRate;

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

        function getRateList() { return (finCurrency === 'MNT') ? MNT_RATES : FOREIGN_RATES; }

        function buildRateChips() {
            if (!finRateChipsEl) return;
            finRateChipsEl.innerHTML = '';
            const rates = getRateList();
            if (!rates.includes(finRate)) finRate = rates[Math.floor(rates.length / 2)];
            rates.forEach(r => {
                const btn = document.createElement('button');
                btn.textContent = (r * 100).toFixed(0) + '%';
                const isActive = r === finRate;
                btn.style.cssText = [
                    'padding:8px 18px', 'border-radius:100px',
                    `border:1.5px solid ${isActive ? 'var(--gold)' : 'rgba(255,255,255,0.25)'}`,
                    `background:${isActive ? 'var(--gold)' : 'transparent'}`,
                    `color:${isActive ? 'var(--primary)' : 'rgba(255,255,255,0.8)'}`,
                    'font-weight:700', 'font-size:14px', 'cursor:pointer', 'transition:all 0.2s', 'font-family:inherit',
                ].join(';');
                btn.addEventListener('click', () => { finRate = r; buildRateChips(); finCalculate(); });
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
                btn.textContent = code;
                const isActive = code === finCurrency;
                btn.style.cssText = [
                    'padding:6px 14px', 'border-radius:100px',
                    `border:1.5px solid ${isActive ? 'var(--gold)' : 'rgba(255,255,255,0.25)'}`,
                    `background:${isActive ? 'var(--gold)' : 'transparent'}`,
                    `color:${isActive ? 'var(--primary)' : 'rgba(255,255,255,0.8)'}`,
                    'font-weight:700', 'font-size:13px', 'cursor:pointer', 'transition:all 0.2s', 'font-family:inherit',
                ].join(';');
                btn.addEventListener('click', () => {
                    finCurrency = code;
                    buildFinCurrSwitcher(); buildRateChips();
                    if (finAmountInput) finAmountInput.value = fmtInput(finFromMnt(finInternalMnt));
                    if (finCurrSymbol) finCurrSymbol.textContent = code;
                    updateFinExchInfo(); finCalculate();
                });
                finCurrSwitcher.appendChild(btn);
            });
        }

        function updateFinExchInfo() {
            if (!finExchInfo) return;
            if (finCurrency === 'MNT' || !ER()) { finExchInfo.textContent = ''; return; }
            const rate = ER().getRate(finCurrency);
            const isFallback = ER().isUsingFallback && ER().isUsingFallback();
            const source = isFallback ? 'Mid-market' : (ER().getSelectedBankDisplayName ? ER().getSelectedBankDisplayName() : 'Best Rate');
            if (rate) finExchInfo.textContent = `Live rate: 1 ${finCurrency} ≈ ${rate.toLocaleString('en-US')} MNT (${source})`;
        }

        function finCalculate() {
            const years = finYears;
            if (finYearDisplay) finYearDisplay.textContent = years;
            if (finResYearCount) finResYearCount.textContent = years;
            if (finLblRate) finLblRate.textContent = (finRate * 100).toFixed(1) + '%';

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
        finInternalMnt = DEFAULT_MNT;
        finCurrency = 'MNT';
        finRate = 0.14;
        finYears = 5;
        buildFinCurrSwitcher();
        buildRateChips();
        if (finAmountInput) finAmountInput.value = fmtInput(finInternalMnt);
        if (finCurrSymbol) finCurrSymbol.textContent = 'MNT';
        if (finYearsSlider) finYearsSlider.value = 5;
        if (finYearDisplay) finYearDisplay.textContent = 5;

        if (ER()) {
            ER().init().then(() => { buildFinCurrSwitcher(); updateFinExchInfo(); populateBankSelector(); finCalculate(); });
        }
        finCalculate();

        // Register recalc callback for bank changes
        _finRecalc = () => {
            buildFinCurrSwitcher();
            updateFinExchInfo();
            if (finAmountInput) finAmountInput.value = fmtInput(finFromMnt(finInternalMnt));
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
