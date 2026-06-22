/**
 * Company Cards Carousel
 * Cycles through company cards with prev/next arrows and dot indicators
 */
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        const carousel = document.querySelector('.companies-carousel');
        if (!carousel) return;

        const cards = carousel.querySelectorAll('.company-card');

        // Add click listener to each card
        cards.forEach(card => {
            card.addEventListener('click', function () {
                // If the card is already active, we don't necessarily want to close it, 
                // but we might want to just keep it open.
                cards.forEach(c => c.classList.remove('active'));
                this.classList.add('active');
            });
        });
    });
})();
