// Contact form submission via Web3Forms
const form = document.getElementById("contactForm");
const result = document.getElementById("resultMsg");
const submitBtn = document.getElementById("submitBtn");

form.addEventListener("submit", function (e) {
    e.preventDefault();
    const formData = new FormData(form);
    const object = Object.fromEntries(formData);
    const json = JSON.stringify(object);

    const lang = localStorage.getItem('nest-lang') || 'en';
    const tr = window.translations && window.translations[lang] || {};
    submitBtn.textContent = tr.con_wait || "Please wait...";
    submitBtn.disabled = true;
    result.style.display = "none";

    fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: json
    })
        .then(async (response) => {
            let jsonResponse = await response.json();
            if (response.status == 200) {
                result.innerHTML = tr.con_success || "&#10003; Thank you! Your message has been received. We'll be in touch soon.";
                result.style.background = "rgba(36,69,86,0.07)";
                result.style.borderLeft = "4px solid var(--gold)";
                result.style.color = "var(--primary)";
                form.reset();
            } else {
                console.warn('Form submission error:', response);
                result.textContent = jsonResponse.message || (tr.con_error || "Something went wrong! Please try again.");
                result.style.background = "#fff3f3";
                result.style.borderLeft = "4px solid #dc3545";
                result.style.color = "#dc3545";
            }
        })
        .catch((error) => {
            console.warn('Form submission failed:', error);
            result.textContent = tr.con_error || "Something went wrong! Please try again.";
            result.style.background = "#fff3f3";
            result.style.borderLeft = "4px solid #dc3545";
            result.style.color = "#dc3545";
        })
        .finally(function () {
            result.style.display = "block";
            submitBtn.textContent = tr.con_submit || "Санал илгээх →";
            submitBtn.disabled = false;
            setTimeout(() => {
                result.style.display = "none";
            }, 5000);
        });
});
