const form = document.getElementById('auth-form');
const switchButtons = form.querySelectorAll('header nav button[data-form-body]');
const formBodies = form.querySelectorAll('form > div, :scope > div');

function switchForm(targetId) {
    switchButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.formBody === targetId);
    });

    formBodies.forEach(body => {
        const isVisible = body.id === targetId;
        body.hidden = !isVisible;

        body.querySelectorAll('input').forEach(input => {
            input.disabled = !isVisible;
        });
    });
}

switchButtons.forEach(btn => {
    btn.addEventListener('click', () => switchForm(btn.dataset.formBody));
});

switchForm(switchButtons[0].dataset.formBody);