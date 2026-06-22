document.addEventListener("click", function (e) {
    const btn = e.target.closest("button[data-close]");
    if (!btn) return;

    if (btn.closest("a")) {
        e.preventDefault();
        e.stopPropagation();
    }

    const name = btn.dataset.close;
    const targets = document.querySelectorAll(`[data-close="${name}"]:not(button)`);

    const isHidden = [...targets].some((el) => el.hasAttribute("hidden"));

    targets.forEach((el) => {
        if (isHidden) {
            el.removeAttribute("hidden");
        } else {
            el.setAttribute("hidden", "");
        }
    });

    document.querySelectorAll(`button[data-close="${name}"]`).forEach((b) => {
        const icon = b.querySelector("i, .material-symbols-rounded, [data-toggle-text]");
        if (!icon) return;

        if (icon.textContent.trim() === "menu") {
            icon.textContent = "close";
        } else if (icon.textContent.trim() === "close") {
            icon.textContent = "menu";
        }
    });
});
