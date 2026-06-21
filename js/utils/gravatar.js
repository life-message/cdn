function isEmail(str) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

const defaultGravatarImage = 'retro';

async function applyGravatarToImage(img, defaultImage = defaultGravatarImage) {
    const key = img.dataset.gravatar.trim();
    const size = img.dataset.size || img.width || 80;

    const stored = localStorage.getItem(key);
    const candidate = stored !== null ? stored.trim() : key;

    if (!candidate || !isEmail(candidate)) {
        const params = new URLSearchParams({ s: size, d: defaultImage, f: 'y' });
        img.src = `https://www.gravatar.com/avatar/?${params}`;
        return;
    }

    const email = candidate.toLowerCase();
    const encoder = new TextEncoder();
    const data = encoder.encode(email);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    const params = new URLSearchParams({ s: size, d: defaultImage, r: 'g' });
    img.src = `https://www.gravatar.com/avatar/${hashHex}?${params}`;
}

async function applyGravatars(defaultImage = defaultGravatarImage) {
    const images = document.querySelectorAll('img[data-gravatar]');
    for (const img of images) {
        await applyGravatarToImage(img, defaultImage);
    }
}

function watchForGravatarImages(defaultImage = defaultGravatarImage) {
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;

                // сам добавленный узел — img с data-gravatar
                if (node.matches?.('img[data-gravatar]')) {
                    applyGravatarToImage(node, defaultImage);
                }

                // img внутри добавленного поддерева
                node.querySelectorAll?.('img[data-gravatar]').forEach(img => {
                    applyGravatarToImage(img, defaultImage);
                });
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return observer;
}

// Запускаем после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    applyGravatars();
    watchForGravatarImages();
});