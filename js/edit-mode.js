// =============================================
// ON-PAGE TEXT EDITOR  (Nest Group)
// ---------------------------------------------
// Inert by default. Only activates when the URL has ?edit=1
// e.g.  index.html?edit=1   or open edit.html and pick a page.
//
// What it does:
//   • Makes every translatable bit of text on the page click-to-edit.
//   • Lets you switch between English / Mongolian / Japanese and edit each.
//   • Saves your changes back into js/translations.js (direct save in
//     Chrome/Edge, otherwise a download you drop into your js/ folder).
//
// It reads/writes window.translations (the same store the live site uses)
// and respects the three attribute types main.js understands:
//   data-i18n      → plain text   (textContent)
//   data-i18n-html → rich text    (innerHTML — bold / <br> / <em>)
//   data-i18n-ph   → form field placeholders
// =============================================
(function () {
    'use strict';

    // ---- Gate: do nothing unless explicitly in edit mode ---------------
    var params = new URLSearchParams(location.search);
    if (params.get('edit') !== '1') return;

    var LANGS = [
        { code: 'en', label: 'EN', name: 'English' },
        { code: 'mn', label: 'MN', name: 'Монгол' },
        { code: 'ja', label: 'JA', name: '日本語' }
    ];

    var currentLang = localStorage.getItem('nest-lang') || 'mn';
    if (!LANGS.some(function (l) { return l.code === currentLang; })) currentLang = 'en';

    var fileHandle = null;          // remembered File System Access handle
    var changedKeys = {};           // { "lang:key": true } for the edit counter
    var els = { toolbar: null, counter: null, status: null, popover: null };

    // -------------------------------------------------------------------
    // Boot: wait until translations + the i18n engine + injected chrome
    // (nav / footer) are present, then turn on editing.
    // -------------------------------------------------------------------
    function boot() {
        if (!window.translations || typeof window.applyTranslations !== 'function') {
            return setTimeout(boot, 100);
        }
        injectStyles();
        buildToolbar();
        // Repaint from the RAW text store (undoes twemoji <img> swaps and any
        // letter-splitting) so what we read back on save is clean text.
        repaint(currentLang);
        observeLateNodes();
        showHint();
    }

    if (document.readyState === 'complete') {
        setTimeout(boot, 300);
    } else {
        window.addEventListener('load', function () { setTimeout(boot, 300); });
    }

    // -------------------------------------------------------------------
    // Repaint the page in `lang` straight from window.translations, then
    // (re)attach the editing handlers. No twemoji, no letter-splitting.
    // -------------------------------------------------------------------
    function repaint(lang) {
        currentLang = lang;
        window.applyTranslations(lang);     // sets text/html/placeholder from store
        normalizeRichText();                // undo any animate-letters splitting
        attachAll();
        syncToolbar();
    }

    // Animated headers (.animate-letters) get split into per-letter spans by
    // applyTranslations → splitLetters. For editing we want the plain string.
    function normalizeRichText() {
        var t = window.translations[currentLang] || {};
        document.querySelectorAll('[data-i18n-html].animate-letters').forEach(function (el) {
            var key = el.dataset.i18nHtml;
            if (t[key] !== undefined) el.innerHTML = t[key];
        });
    }

    // -------------------------------------------------------------------
    // Attach editing to every translatable element (idempotent).
    // -------------------------------------------------------------------
    function attachAll() {
        document.querySelectorAll('[data-i18n], [data-i18n-html], [data-i18n-ph]').forEach(attach);
    }

    function attach(el) {
        if (el.closest('#nest-editbar')) return;          // never edit the toolbar
        if (el.dataset.neAttached === '1') {
            // already wired — just refresh placeholder badge text if needed
            return;
        }
        el.dataset.neAttached = '1';

        var key = el.dataset.i18n || el.dataset.i18nHtml || el.dataset.i18nPh;
        if (!key) return;

        if (el.hasAttribute('data-i18n-ph')) {
            // Inputs / textareas: can't contenteditable a placeholder → popover.
            el.classList.add('ne-editable', 'ne-ph');
            el.addEventListener('focus', function (e) { e.preventDefault(); el.blur(); openPlaceholderEditor(el, key); });
            el.addEventListener('mousedown', function (e) { e.preventDefault(); openPlaceholderEditor(el, key); });
            return;
        }

        var isHtml = el.hasAttribute('data-i18n-html');
        el.classList.add('ne-editable');
        el.setAttribute('contenteditable', 'true');
        el.setAttribute('spellcheck', 'false');

        // Don't follow links / submit forms while editing.
        var anchor = el.closest('a');
        if (anchor && !anchor.dataset.neNoNav) {
            anchor.dataset.neNoNav = '1';
            anchor.addEventListener('click', function (e) { e.preventDefault(); });
        }
        el.addEventListener('click', function (e) { e.stopPropagation(); });

        // Live capture into the store as they type.
        el.addEventListener('input', function () {
            var val = isHtml ? el.innerHTML : el.textContent;
            store(currentLang, key, val);
        });

        // Paste as plain text so styled clipboard content can't sneak in.
        el.addEventListener('paste', function (e) {
            e.preventDefault();
            var text = (e.clipboardData || window.clipboardData).getData('text');
            document.execCommand('insertText', false, text);
        });

        el.addEventListener('focus', function () { el.classList.add('ne-active'); });
        el.addEventListener('blur', function () { el.classList.remove('ne-active'); });
    }

    function store(lang, key, val) {
        if (!window.translations[lang]) window.translations[lang] = {};
        window.translations[lang][key] = val;
        changedKeys[lang + ':' + key] = true;
        updateCounter();
    }

    // -------------------------------------------------------------------
    // Placeholder editor popover (for form fields)
    // -------------------------------------------------------------------
    function openPlaceholderEditor(input, key) {
        closePopover();
        var rect = input.getBoundingClientRect();
        var pop = document.createElement('div');
        pop.className = 'ne-popover';
        pop.innerHTML =
            '<label>Placeholder text (' + currentLang.toUpperCase() + ')</label>' +
            '<textarea rows="2"></textarea>' +
            '<div class="ne-pop-actions">' +
            '  <button type="button" class="ne-btn ne-pop-cancel">Cancel</button>' +
            '  <button type="button" class="ne-btn ne-btn-gold ne-pop-save">Save</button>' +
            '</div>';
        document.body.appendChild(pop);
        pop.style.top = (window.scrollY + rect.bottom + 8) + 'px';
        pop.style.left = (window.scrollX + rect.left) + 'px';

        var ta = pop.querySelector('textarea');
        ta.value = (window.translations[currentLang] && window.translations[currentLang][key]) || '';
        ta.focus();

        pop.querySelector('.ne-pop-cancel').addEventListener('click', closePopover);
        pop.querySelector('.ne-pop-save').addEventListener('click', function () {
            store(currentLang, key, ta.value);
            input.placeholder = ta.value;
            closePopover();
        });
        els.popover = pop;
    }

    function closePopover() {
        if (els.popover) { els.popover.remove(); els.popover = null; }
    }

    // -------------------------------------------------------------------
    // Toolbar
    // -------------------------------------------------------------------
    function buildToolbar() {
        var bar = document.createElement('div');
        bar.id = 'nest-editbar';

        var brand = document.createElement('div');
        brand.className = 'ne-brand';
        brand.innerHTML = '<span class="ne-dot"></span> Text Editor';

        var langWrap = document.createElement('div');
        langWrap.className = 'ne-langs';
        LANGS.forEach(function (l) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'ne-lang' + (l.code === currentLang ? ' active' : '');
            b.dataset.lang = l.code;
            b.textContent = l.label;
            b.title = 'Edit ' + l.name;
            b.addEventListener('click', function () { repaint(l.code); });
            langWrap.appendChild(b);
        });

        var counter = document.createElement('span');
        counter.className = 'ne-counter';
        counter.textContent = 'No changes yet';
        els.counter = counter;

        var saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'ne-btn ne-btn-gold';
        saveBtn.textContent = '💾 Save';
        saveBtn.addEventListener('click', save);

        var exitBtn = document.createElement('a');
        exitBtn.className = 'ne-btn ne-exit';
        exitBtn.textContent = 'Exit';
        exitBtn.href = location.pathname;   // reload without ?edit=1
        exitBtn.title = 'Leave edit mode';

        var status = document.createElement('div');
        status.className = 'ne-status';
        els.status = status;

        bar.appendChild(brand);
        bar.appendChild(langWrap);
        bar.appendChild(counter);
        bar.appendChild(saveBtn);
        bar.appendChild(exitBtn);
        bar.appendChild(status);
        document.body.appendChild(bar);
        document.body.classList.add('ne-on');
        els.toolbar = bar;
    }

    function syncToolbar() {
        if (!els.toolbar) return;
        els.toolbar.querySelectorAll('.ne-lang').forEach(function (b) {
            b.classList.toggle('active', b.dataset.lang === currentLang);
        });
        updateCounter();
    }

    function updateCounter() {
        if (!els.counter) return;
        var n = Object.keys(changedKeys).length;
        els.counter.textContent = n === 0 ? 'No changes yet'
            : n + (n === 1 ? ' edit' : ' edits') + ' unsaved';
        els.counter.classList.toggle('ne-dirty', n > 0);
    }

    function setStatus(msg, ok) {
        if (!els.status) return;
        els.status.textContent = msg;
        els.status.className = 'ne-status ' + (ok ? 'ok' : 'warn') + ' show';
        clearTimeout(setStatus._t);
        setStatus._t = setTimeout(function () { els.status.classList.remove('show'); }, 6000);
    }

    // -------------------------------------------------------------------
    // Save → regenerate js/translations.js
    // -------------------------------------------------------------------
    function buildFileContents() {
        var header =
            '// Auto-generated by the on-page Text Editor (edit.html).\n' +
            '// Last saved: ' + new Date().toISOString() + '\n' +
            '// Edit text by opening any page with ?edit=1 — do not hand-edit unless you must.\n\n';
        return header + 'window.translations = ' +
            JSON.stringify(window.translations, null, 2) + ';\n';
    }

    function save() {
        closePopover();
        var contents = buildFileContents();

        // Best path: write straight to the file (Chrome/Edge over localhost/https).
        if (window.showSaveFilePicker) {
            saveWithFileSystem(contents);
        } else {
            downloadFile(contents);
        }
    }

    function saveWithFileSystem(contents) {
        var p = fileHandle
            ? Promise.resolve(fileHandle)
            : window.showSaveFilePicker({
                suggestedName: 'translations.js',
                types: [{ description: 'JavaScript', accept: { 'text/javascript': ['.js'] } }]
            });

        p.then(function (handle) {
            fileHandle = handle;
            return handle.createWritable();
        }).then(function (writable) {
            return writable.write(contents).then(function () { return writable.close(); });
        }).then(function () {
            changedKeys = {};
            updateCounter();
            setStatus('✅ Saved to translations.js. Re-upload that file to your host to go live.', true);
        }).catch(function (err) {
            if (err && err.name === 'AbortError') return;     // user cancelled the picker
            // Fall back to a plain download if direct write isn't allowed.
            downloadFile(contents);
        });
    }

    function downloadFile(contents) {
        var blob = new Blob([contents], { type: 'text/javascript;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'translations.js';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        changedKeys = {};
        updateCounter();
        setStatus('⬇️ Downloaded translations.js — replace js/translations.js with it, then re-upload.', true);
    }

    // -------------------------------------------------------------------
    // Catch nav/footer/back-to-top injected after load
    // -------------------------------------------------------------------
    function observeLateNodes() {
        var obs = new MutationObserver(function (muts) {
            var found = false;
            muts.forEach(function (m) {
                m.addedNodes.forEach(function (node) {
                    if (node.nodeType !== 1) return;
                    if (node.id === 'nest-editbar' || node.closest && node.closest('#nest-editbar')) return;
                    if (node.matches && node.matches('[data-i18n], [data-i18n-html], [data-i18n-ph]')) found = true;
                    if (node.querySelector && node.querySelector('[data-i18n], [data-i18n-html], [data-i18n-ph]')) found = true;
                });
            });
            if (found) attachAll();
        });
        obs.observe(document.body, { childList: true, subtree: true });
    }

    // -------------------------------------------------------------------
    // First-run hint
    // -------------------------------------------------------------------
    function showHint() {
        if (sessionStorage.getItem('ne-hint-seen')) return;
        sessionStorage.setItem('ne-hint-seen', '1');
        setStatus('Click any text to edit it. Switch EN/MN/JA above. Hit Save when done.', true);
    }

    // -------------------------------------------------------------------
    // Styles
    // -------------------------------------------------------------------
    function injectStyles() {
        var css =
            '#nest-editbar{position:fixed;top:0;left:0;right:0;z-index:2147483000;' +
            'display:flex;align-items:center;gap:14px;padding:8px 16px;' +
            'background:#244556;color:#fff;font-family:Inter,system-ui,sans-serif;font-size:14px;' +
            'box-shadow:0 2px 12px rgba(0,0,0,.25);}' +
            '.ne-on{padding-top:52px!important;}' +
            '#nest-editbar .ne-brand{font-weight:700;display:flex;align-items:center;gap:8px;white-space:nowrap;}' +
            '#nest-editbar .ne-dot{width:10px;height:10px;border-radius:50%;background:#C9A84C;' +
            'box-shadow:0 0 0 0 rgba(201,168,76,.7);animation:nePulse 2s infinite;}' +
            '@keyframes nePulse{0%{box-shadow:0 0 0 0 rgba(201,168,76,.6)}70%{box-shadow:0 0 0 8px rgba(201,168,76,0)}100%{box-shadow:0 0 0 0 rgba(201,168,76,0)}}' +
            '#nest-editbar .ne-langs{display:flex;gap:4px;background:rgba(255,255,255,.1);padding:3px;border-radius:8px;}' +
            '#nest-editbar .ne-lang{border:0;background:transparent;color:#cdd8df;font-weight:600;' +
            'padding:5px 12px;border-radius:6px;cursor:pointer;font-size:13px;}' +
            '#nest-editbar .ne-lang.active{background:#fff;color:#244556;}' +
            '#nest-editbar .ne-counter{margin-left:4px;color:#9fb3bf;font-size:13px;white-space:nowrap;}' +
            '#nest-editbar .ne-counter.ne-dirty{color:#C9A84C;font-weight:600;}' +
            '#nest-editbar .ne-btn{margin-left:auto;border:0;cursor:pointer;font-weight:600;font-size:14px;' +
            'padding:8px 16px;border-radius:6px;background:rgba(255,255,255,.15);color:#fff;text-decoration:none;}' +
            '#nest-editbar .ne-btn-gold{background:#C9A84C;color:#173140;margin-left:auto;}' +
            '#nest-editbar .ne-exit{margin-left:0;}' +
            '#nest-editbar .ne-btn:hover{opacity:.9;}' +
            '#nest-editbar .ne-status{position:absolute;top:52px;right:16px;max-width:520px;' +
            'background:#173140;color:#fff;padding:10px 14px;border-radius:8px;font-size:13px;line-height:1.5;' +
            'box-shadow:0 6px 20px rgba(0,0,0,.3);opacity:0;transform:translateY(-6px);pointer-events:none;' +
            'transition:opacity .2s,transform .2s;}' +
            '#nest-editbar .ne-status.show{opacity:1;transform:translateY(0);}' +
            '#nest-editbar .ne-status.ok{border-left:3px solid #C9A84C;}' +
            '#nest-editbar .ne-status.warn{border-left:3px solid #e06b5a;}' +
            // editable affordances
            '.ne-editable{outline:1px dashed rgba(201,168,76,.55);outline-offset:2px;border-radius:2px;' +
            'cursor:text;transition:background .15s,outline-color .15s;}' +
            '.ne-editable:hover{background:rgba(201,168,76,.12);outline-color:#C9A84C;}' +
            '.ne-editable.ne-active{background:rgba(201,168,76,.18);outline:2px solid #C9A84C;}' +
            '.ne-ph{cursor:pointer;}' +
            // popover
            '.ne-popover{position:absolute;z-index:2147483001;width:320px;background:#fff;color:#244556;' +
            'border-radius:10px;padding:14px;box-shadow:0 10px 30px rgba(0,0,0,.25);' +
            'font-family:Inter,system-ui,sans-serif;}' +
            '.ne-popover label{display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:#5b7180;}' +
            '.ne-popover textarea{width:100%;box-sizing:border-box;border:1px solid #cdd8df;border-radius:6px;' +
            'padding:8px;font:inherit;font-size:13px;resize:vertical;}' +
            '.ne-pop-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px;}' +
            '.ne-popover .ne-btn{padding:6px 14px;border-radius:6px;border:0;cursor:pointer;font-weight:600;' +
            'background:#eef1f3;color:#244556;font-size:13px;}' +
            '.ne-popover .ne-btn-gold{background:#C9A84C;color:#173140;}';

        var style = document.createElement('style');
        style.id = 'nest-editbar-style';
        style.textContent = css;
        document.head.appendChild(style);
    }
})();
