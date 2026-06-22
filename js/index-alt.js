// Custom animated numbers for stats-alt (index-alt.html)
document.addEventListener('DOMContentLoaded', () => {
    const spans = document.querySelectorAll('.stat-box span[data-target]');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.getAttribute('data-target'));
                let count = 0;
                const inc = target / 40;
                const update = setInterval(() => {
                    count += inc;
                    if (count >= target) {
                        entry.target.innerText = target;
                        clearInterval(update);
                    } else {
                        entry.target.innerText = Math.floor(count);
                    }
                }, 40);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    spans.forEach(s => observer.observe(s));

    // Map animation dash
    const path = document.querySelector('.anim-dash');
    if (path) {
        const length = path.getTotalLength();
        path.style.strokeDasharray = length;
        path.style.strokeDashoffset = length;
        path.style.animation = 'dash 3s linear infinite alternate';

        const style = document.createElement('style');
        style.innerHTML = `@keyframes dash { to { stroke-dashoffset: 0; } }`;
        document.head.appendChild(style);
    }
});
