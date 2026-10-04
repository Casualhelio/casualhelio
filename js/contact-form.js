// Contact form submission via Web3Forms
const form = document.getElementById("contactForm");
const result = document.getElementById("resultMsg");
const submitBtn = document.getElementById("submitBtn");

// Arriving from the calculator or the Investment page (?topic=ir&msg=…):
// pick the inquiry type and start the message with the simulation.
(function prefillFromLink() {
    const params = new URLSearchParams(window.location.search);
    const type = document.getElementById("inquiryType");
    const message = document.getElementById("message");
    if (type && params.get("topic") === "ir") type.value = "Investment";
    const msg = params.get("msg");
    if (message && msg && !message.value) message.value = msg.slice(0, 1000); // .value, never HTML
})();

form.addEventListener("submit", function (e) {
    e.preventDefault();
    const formData = new FormData(form);
    const object = Object.fromEntries(formData);
    // The inquiry type leads the email subject, so the team can sort at a glance
    if (object["Inquiry Type"]) object.subject = `[${object["Inquiry Type"]}] ${object.subject}`;
    const json = JSON.stringify(object);

    const lang = document.documentElement.lang || 'mn';
    const tr = window.translations && window.translations[lang] || {};
    submitBtn.textContent = tr.con_wait || "Please wait...";
    submitBtn.disabled = true;
    // Clear the old result so the live region announces the next one
    result.style.display = "none";
    result.textContent = "";

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
            // Stays visible until the next submit, so nobody misses the confirmation
            result.style.display = "block";
            submitBtn.textContent = tr.con_submit || "Санал илгээх →";
            submitBtn.disabled = false;
        });
});
