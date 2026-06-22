// Letter Animation Splitting Script
window.splitLetters = function (el) {
    // Prevent double-running
    if (el.dataset.animated === 'true') return;

    // Wait a brief moment to ensure translations have been fully applied to the DOM
    setTimeout(() => {
        const rawHtml = el.innerHTML;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rawHtml;

        const fragment = document.createDocumentFragment();
        let charIndex = 0;

        function processNode(node) {
            if (node.nodeType === 3) {
                const text = node.nodeValue;
                for (let char of text) {
                    if (char === ' ') {
                        fragment.appendChild(document.createTextNode(' '));
                    } else {
                        const span = document.createElement('span');
                        span.textContent = char;
                        span.className = 'char';
                        span.style.setProperty('--i', charIndex++);
                        fragment.appendChild(span);
                    }
                }
            } else if (node.nodeType === 1) {
                const clone = node.cloneNode(false);
                Array.from(node.childNodes).forEach(child => {
                    let tempFrag = document.createDocumentFragment();
                    function processSubNode(n, targetFrag) {
                        if (n.nodeType === 3) {
                            for (let char of n.nodeValue) {
                                if (char === ' ') {
                                    targetFrag.appendChild(document.createTextNode(' '));
                                } else {
                                    const span = document.createElement('span');
                                    span.textContent = char;
                                    span.className = 'char';
                                    span.style.setProperty('--i', charIndex++);
                                    targetFrag.appendChild(span);
                                }
                            }
                        } else if (n.nodeType === 1) {
                            const subClone = n.cloneNode(false);
                            Array.from(n.childNodes).forEach(c => processSubNode(c, subClone));
                            targetFrag.appendChild(subClone);
                        }
                    }
                    processSubNode(child, tempFrag);
                    clone.appendChild(tempFrag);
                });
                fragment.appendChild(clone);
            }
        }

        Array.from(tempDiv.childNodes).forEach(processNode);
        el.innerHTML = '';
        el.appendChild(fragment);

        // Allow CSS transition to pick up the new DOM nodes
        requestAnimationFrame(() => {
            el.classList.add('animation-ready');
        });

        // Set flag to prevent double-animation, but allow re-run if language changes (managed in main.js)
        // el.dataset.animated = 'true';
    }, 50); // Small delay to let twemoji/translations settle
};

// Initial run
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        document.querySelectorAll('.animate-letters').forEach(window.splitLetters);
    }, 100);
});
