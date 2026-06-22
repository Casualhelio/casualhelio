function initGlowingEffect() {
    // Select all cards that should have the glow (including dynamically added ones if called again)
    const cards = document.querySelectorAll('.company-card, .news-card, .stat-box');

    cards.forEach(card => {
        // Prevent double injection
        if (card.querySelector('.glowing-effect-container')) return;

        card.classList.add('glowing-card');

        const container = document.createElement('div');
        container.className = 'glowing-effect-container';
        container.style.setProperty('--start', '0');

        const border = document.createElement('div');
        border.className = 'glowing-effect-border';

        container.appendChild(border);
        card.appendChild(container); // attach to card

        container._currentAngle = 0;
        container._animationFrame = null;
    });

    const proximity = 80;

    function handlePointerMove(e) {
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        document.querySelectorAll('.glowing-card').forEach(card => {
            const container = card.querySelector('.glowing-effect-container');
            if (!container) return;

            const rect = card.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            // Activate glow if mouse is near the card's bounding box perimeter or inside
            const isActive = mouseX >= rect.left - proximity &&
                mouseX <= rect.left + rect.width + proximity &&
                mouseY >= rect.top - proximity &&
                mouseY <= rect.top + rect.height + proximity;

            // We set opacity directly for a guaranteed CSS transition
            container.style.opacity = isActive ? "1" : "0";

            if (!isActive) return;

            const center = [rect.left + rect.width * 0.5, rect.top + rect.height * 0.5];

            // Calculate angle for the conic gradient to point toward the mouse
            let targetAngle = (180 * Math.atan2(mouseY - center[1], mouseX - center[0])) / Math.PI + 90;

            if (container._animationFrame) cancelAnimationFrame(container._animationFrame);

            // Find shortest path to new angle
            let angleDiff = ((targetAngle - container._currentAngle + 180) % 360) - 180;
            // Handle JS modulo bug with negative numbers:
            if (angleDiff < -180) angleDiff += 360;

            let finalAngle = container._currentAngle + angleDiff;

            const startTime = performance.now();
            const startAngle = container._currentAngle;
            const duration = 200; // ms transition time for the spin

            function step(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // Ease out cubic
                const ease = 1 - Math.pow(1 - progress, 3);

                container._currentAngle = startAngle + (finalAngle - startAngle) * ease;

                // Keep the angle bounded between -360 and 360 over time to prevent huge numbers
                container._currentAngle = container._currentAngle % 360;

                container.style.setProperty('--start', container._currentAngle);

                if (progress < 1) {
                    container._animationFrame = requestAnimationFrame(step);
                }
            }
            container._animationFrame = requestAnimationFrame(step);
        });
    }

    if (window._glowingEffectPointerMove) {
        document.body.removeEventListener('pointermove', window._glowingEffectPointerMove);
        window.removeEventListener('scroll', window._glowingEffectScroll);
    }

    let lastEvent = { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 };

    window._glowingEffectPointerMove = (e) => {
        lastEvent = e;
        handlePointerMove(e);
    };

    window._glowingEffectScroll = () => {
        handlePointerMove(lastEvent);
    };

    document.body.addEventListener('pointermove', window._glowingEffectPointerMove, { passive: true });
    window.addEventListener('scroll', window._glowingEffectScroll, { passive: true });
}

// Ensure the effect works even if DOM elements are rendered a bit late
document.addEventListener('languageChanged', () => { setTimeout(initGlowingEffect, 100); });
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlowingEffect);
} else {
    initGlowingEffect();
}
