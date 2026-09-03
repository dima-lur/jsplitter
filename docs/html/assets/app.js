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

                if (name === q) score = 0;
                else if (canonical === q) score = 1;
                else if (name.startsWith(q)) score = 2;
                else if (canonical.startsWith(q)) score = 3;
                else if (name.includes(q)) score = 4;
                else if (canonical.includes(q)) score = 5;

                return { item, score };
            })
            .filter(entry => entry.score < 9)
            .sort((a, b) =>
                a.score - b.score ||
                a.item.name.localeCompare(b.item.name) ||
                a.item.canonical.localeCompare(b.item.canonical)
            )
            .slice(0, 24);

        if (!matches.length) {
            results.innerHTML = '<div class="search-result search-empty">No matches</div>';
            results.hidden = false;
            return;
        }

        results.innerHTML = matches.map(({ item }) =>
            `<a class="search-result" href="${item.href}"><b>${escapeHtml(item.canonical)}</b><small>${escapeHtml(item.kind)}</small></a>`
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
    input.addEventListener('focus', () => {
        if (input.value.trim()) render(input.value);
    });
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

(() => {
    const sidebar = document.querySelector('.sidebar');
    const searchBox = document.querySelector('.search-box');
    const navData = window.__DOC_NAV__ && typeof window.__DOC_NAV__ === 'object'
        ? window.__DOC_NAV__
        : {};
    if (!sidebar) return;

    const treeStateKey = 'jsplitter-docgen-tree-state';
    const navScrollKey = 'jsplitter-docgen-nav-scroll';
    const rootTrees = Array.from(sidebar.querySelectorAll('.nav-page-tree[data-nav-root]'));

    function readJson(key, fallback) {
        try {
            const raw = sessionStorage.getItem(key);
            if (!raw) return fallback;
            const value = JSON.parse(raw);
            return value && typeof value === 'object' ? value : fallback;
        }
        catch {
            return fallback;
        }
    }

    function writeJson(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
        }
        catch {
            // Storage may be unavailable for local file URLs or restricted contexts.
        }
    }

    const treeState = readJson(treeStateKey, { roots: {}, groups: {} });
    if (!treeState.roots || typeof treeState.roots !== 'object') treeState.roots = {};
    if (!treeState.groups || typeof treeState.groups !== 'object') treeState.groups = {};

    function rootKey(tree) {
        return tree ? tree.getAttribute('data-nav-root') || '' : '';
    }

    function rootPageLink(tree) {
        return tree ? tree.querySelector(':scope > .nav-page-link[href]') : null;
    }

    function navigationTarget(url) {
        return `${url.pathname}${url.search}`;
    }

    function currentTarget() {
        return navigationTarget(window.location);
    }

    function isOrdinaryLeftClick(event) {
        return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    }

    function groupState(root, title) {
        const states = treeState.groups[root];
        if (!states || !Object.prototype.hasOwnProperty.call(states, title)) return true;
        return Boolean(states[title]);
    }

    function saveGroupState(root, title, open) {
        if (!treeState.groups[root]) treeState.groups[root] = {};
        treeState.groups[root][title] = Boolean(open);
        writeJson(treeStateKey, treeState);
    }

    function memberHref(href) {
        const url = new URL(href, window.location.href);
        if (url.origin === window.location.origin && navigationTarget(url) === currentTarget()) {
            return url.hash || href;
        }
        return href;
    }

    function buildGroup(root, group) {
        const details = document.createElement('details');
        details.className = 'nav-member-group';
        details.setAttribute('data-nav-group', group.title);
        details.open = groupState(root, group.title);

        const summary = document.createElement('summary');
        summary.className = 'nav-member-summary';

        const title = document.createElement('span');
        title.textContent = group.title;
        summary.appendChild(title);

        const count = document.createElement('span');
        count.className = 'nav-member-count';
        count.textContent = String(group.items.length);
        summary.appendChild(count);
        details.appendChild(summary);

        const links = document.createElement('div');
        links.className = 'nav-member-links';

        for (const item of group.items) {
            const link = document.createElement('a');
            link.className = 'nav-member-link';
            link.href = memberHref(item.href);
            link.textContent = item.name;
            links.appendChild(link);
        }

        details.appendChild(links);
        details.addEventListener('toggle', () => saveGroupState(root, group.title, details.open));
        return details;
    }

    function populateRoot(tree) {
        if (!tree || tree.dataset.navPopulated === '1') return;

        const root = rootKey(tree);
        const container = tree.querySelector(':scope > [data-nav-members]');
        const groups = Array.isArray(navData[root]) ? navData[root] : [];
        if (!container) return;

        for (const group of groups) container.appendChild(buildGroup(root, group));
        tree.dataset.navPopulated = '1';
    }

    function isRootOpen(tree) {
        return Boolean(tree && tree.classList.contains('open'));
    }

    function setRootOpen(tree, open, persist) {
        if (!tree) return;

        const shouldOpen = Boolean(open);
        if (shouldOpen) populateRoot(tree);
        tree.classList.toggle('open', shouldOpen);

        const container = tree.querySelector(':scope > [data-nav-members]');
        if (container) container.hidden = !shouldOpen;

        if (persist) {
            treeState.roots[rootKey(tree)] = shouldOpen;
            writeJson(treeStateKey, treeState);
        }
    }

    function isActiveRoot(tree) {
        const link = rootPageLink(tree);
        if (!link) return false;
        const url = new URL(link.href, window.location.href);
        return url.origin === window.location.origin && navigationTarget(url) === currentTarget();
    }

    // Reconstruct the same tree geometry before restoring scroll. Explicit state wins;
    // on a first/direct visit the active page opens by default.
    for (const tree of rootTrees) {
        const key = rootKey(tree);
        const hasState = Object.prototype.hasOwnProperty.call(treeState.roots, key);
        const open = hasState ? Boolean(treeState.roots[key]) : isActiveRoot(tree);
        setRootOpen(tree, open, false);
    }

    function activeMemberLink() {
        if (!window.location.hash) return null;

        for (const link of sidebar.querySelectorAll('.nav-member-link[href]')) {
            const url = new URL(link.href, window.location.href);
            const active = url.origin === window.location.origin &&
                navigationTarget(url) === currentTarget() &&
                url.hash === window.location.hash;
            link.classList.toggle('active', active);
            if (active) return link;
        }

        return null;
    }

    function ensureActiveMemberBranch() {
        if (!window.location.hash) return null;
        const activeTree = rootTrees.find(isActiveRoot);
        if (!activeTree) return null;

        if (!isRootOpen(activeTree)) setRootOpen(activeTree, true, true);
        else populateRoot(activeTree);

        const link = activeMemberLink();
        if (!link) return null;

        const group = link.closest('.nav-member-group');
        if (group && !group.open) {
            group.open = true;
            saveGroupState(rootKey(activeTree), group.getAttribute('data-nav-group') || '', true);
        }
        return link;
    }

    function visibleTreeTop() {
        const sidebarRect = sidebar.getBoundingClientRect();
        if (!searchBox || getComputedStyle(searchBox).position !== 'sticky') return sidebarRect.top;
        return Math.max(sidebarRect.top, searchBox.getBoundingClientRect().bottom);
    }

    function ensureVisible(element) {
        if (!element || element.offsetParent === null || sidebar.scrollHeight <= sidebar.clientHeight) return;

        const sidebarRect = sidebar.getBoundingClientRect();
        const rect = element.getBoundingClientRect();
        const padding = 8;
        const top = visibleTreeTop();

        if (rect.top < top + padding) sidebar.scrollTop += rect.top - top - padding;
        else if (rect.bottom > sidebarRect.bottom - padding) sidebar.scrollTop += rect.bottom - sidebarRect.bottom + padding;
    }

    function scrollActiveRootNearTop() {
        const tree = rootTrees.find(isActiveRoot);
        if (!tree || sidebar.scrollHeight <= sidebar.clientHeight) return;

        const link = rootPageLink(tree);
        if (!link) return;

        const sidebarRect = sidebar.getBoundingClientRect();
        const linkRect = link.getBoundingClientRect();
        const context = linkRect.height * 1.5;
        const target = sidebar.scrollTop + linkRect.top - visibleTreeTop() - context;
        sidebar.scrollTop = Math.max(0, target);
    }

    function storeNavigationScroll(url) {
        writeJson(navScrollKey, {
            target: navigationTarget(url),
            scrollTop: sidebar.scrollTop
        });
    }

    function restoreNavigationScroll() {
        const state = readJson(navScrollKey, null);
        try { sessionStorage.removeItem(navScrollKey); } catch {}

        if (!state || state.target !== currentTarget() || !Number.isFinite(state.scrollTop)) return false;
        sidebar.scrollTop = state.scrollTop;
        return true;
    }

    sidebar.addEventListener('click', event => {
        const link = event.target.closest('a[href]');
        if (!link || !sidebar.contains(link) || !isOrdinaryLeftClick(event)) return;

        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin) return;

        const tree = link.classList.contains('nav-page-link')
            ? link.closest('.nav-page-tree')
            : null;
        const samePage = navigationTarget(url) === currentTarget();

        if (tree && samePage && !url.hash) {
            // The active root is already the current page. Clicking its label is a
            // tree operation, not a page reload. Modified clicks are filtered above
            // and therefore keep normal browser link behaviour.
            event.preventDefault();
            setRootOpen(tree, !isRootOpen(tree), true);
            return;
        }

        if (tree && !samePage) {
            // Persist the destination as open, but do not expand it in the current
            // document. The clicked row therefore cannot move even transiently
            // before navigation starts. The destination page reconstructs it open.
            treeState.roots[rootKey(tree)] = true;
            writeJson(treeStateKey, treeState);
        }

        if (!samePage) storeNavigationScroll(url);
    });

    window.addEventListener('hashchange', () => {
        for (const link of sidebar.querySelectorAll('.nav-member-link.active')) link.classList.remove('active');
        const link = ensureActiveMemberBranch();
        ensureVisible(link);
    });

    const initialMember = ensureActiveMemberBranch();
    requestAnimationFrame(() => {
        if (restoreNavigationScroll()) return;
        if (initialMember) ensureVisible(initialMember);
        else scrollActiveRootNearTop();
    });
})();
