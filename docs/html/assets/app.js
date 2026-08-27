(() => {
    const input = document.getElementById('doc-search');
    const results = document.getElementById('search-results');
    const data = Array.isArray(window.__DOC_SEARCH__) ? window.__DOC_SEARCH__ : [];
    if (!input || !results) return;

    function hide() {
        results.hidden = true;
        results.innerHTML = '';
    }

    function render(query) {
        const q = query.trim().toLowerCase();
        if (!q) {
            hide();
            return;
        }

        const matches = data
            .map(item => {
                const name = item.name.toLowerCase();
                const canonical = item.canonical.toLowerCase();
                let score = 9;
                if (name === q || canonical === q) score = 0;
                else if (name.startsWith(q)) score = 1;
                else if (canonical.startsWith(q)) score = 2;
                else if (name.includes(q)) score = 3;
                else if (canonical.includes(q)) score = 4;
                else if ((item.summary || '').toLowerCase().includes(q)) score = 6;
                return { item, score };
            })
            .filter(entry => entry.score < 9)
            .sort((a, b) => a.score - b.score || a.item.name.localeCompare(b.item.name))
            .slice(0, 18);

        if (!matches.length) {
            results.innerHTML = '<div class="search-result"><small>No matches</small></div>';
            results.hidden = false;
            return;
        }

        results.innerHTML = matches.map(({ item }) =>
            `<a class="search-result" href="${item.href}"><b>${escapeHtml(item.canonical)}</b><small>${escapeHtml(item.kind)}${item.summary ? ` — ${escapeHtml(item.summary)}` : ''}</small></a>`
        ).join('');
        results.hidden = false;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            input.value = '';
            hide();
            input.blur();
        }
        else if (e.key === 'Enter') {
            const first = results.querySelector('a');
            if (first) first.click();
        }
    });
    document.addEventListener('click', e => {
        if (!results.contains(e.target) && e.target !== input) hide();
    });
})();
