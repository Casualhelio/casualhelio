/**
 * Aceternity-style Interactive Scrolling Timeline
 * Calculates scroll percentage over the timeline component container
 */

document.addEventListener('DOMContentLoaded', () => {
    const timelineContainer = document.querySelector('.timeline-items');
    const progressBar = document.getElementById('timeline-progress');

    if (!timelineContainer || !progressBar) return;

    // We use a RAF (Request Animation Frame) loop to ensure buttery-smooth updates 
    // without throttling the main thread during heavy scrolling.
    let ticking = false;

    function updateTimelineScroll() {
        // Calculate the bounding rectangle of the entire timeline container
        const rect = timelineContainer.getBoundingClientRect();

        // Window height
        const windowHeight = window.innerHeight;

        // The scroll progress starts when the TOP of the container enters the 
        // bottom 20% of the screen (early start) and finishes when the BOTTOM 
        // of the container passes the middle of the screen.

        const startOffset = windowHeight * 0.8;
        const endOffset = windowHeight * 0.5;

        // Distance the container has traveled relative to our start line
        const scrolled = startOffset - rect.top;

        // Total distance the container needs to scroll to be considered "complete"
        const totalDistance = rect.height + (startOffset - endOffset);

        // Calculate raw percentage
        let percentage = (scrolled / totalDistance) * 100;

        // Clamp between 0% and 100%
        percentage = Math.max(0, Math.min(100, percentage));

        // Apply the height dynamically to the fill bar
        progressBar.style.height = `${percentage}%`;

        // Optionally, make the line glow hotter as it gets closer to 100% 
        // by mapping opacity from 0.4 to 1
        const opacity = 0.4 + (0.6 * (percentage / 100));
        progressBar.style.opacity = opacity.toString();

        ticking = false;
    }

    // Scroll listener with RAF debouncing for performance
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateTimelineScroll();
            });
            ticking = true;
        }
    }, { passive: true });

    // Initial call to set the line position on page load
    updateTimelineScroll();
});
