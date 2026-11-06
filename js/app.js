'use strict';
/* Routeur et écoute des événements. Chaque page est une fonction qui renvoie du HTML. */

let pendingScrollTarget = null;
let isFirstRender = true;

function parseRoute() {
    const raw = location.hash.replace(/^#/, '') || '/';
    const [path, query = ''] = raw.split('?');
    return { parts: path.split('/').filter(Boolean), params: new URLSearchParams(query), raw: location.hash || '#/' };
}

function redirect(hash) {
    location.hash = hash;
    return '';
}

function clientPage(parts, params, raw) {
    const user = currentUser();
    if (!user) return redirect(`#/connexion?suite=${encodeURIComponent(raw)}`);
    if (user.role !== 'USER') return redirect('#/admin');
    const [section, id] = parts;
    switch (section) {
        case undefined: return pageClientDashboard();
        case 'services': return pageClientCatalog(params);
        case 'nouvelle-demande': return pageNewRequest(params);
        case 'demandes': return id ? pageClientRequestDetail(id) : pageClientRequests();
        case 'documents': return pageClientDocuments();
        case 'messages': return pageClientMessages(id);
        case 'paiements': return pageClientPayments();
        case 'parrainage': return pageClientReferral();
        case 'profil': return pageClientProfile();
        case 'notifications': return pageClientNotifications();
        default: return clientLayout({ title: 'Page introuvable', content: emptyState('magnifying-glass', 'Page introuvable', 'Cette page n\'existe pas.', '<a class="btn btn-primary" href="#/espace">Tableau de bord</a>') });
    }
}

function adminPage(parts, raw) {
    const user = currentUser();
    if (!user) return redirect(`#/connexion?suite=${encodeURIComponent(raw)}`);
    if (user.role === 'USER') return redirect('#/espace');
    const [section, id] = parts;
    if (['clients', 'equipe'].includes(section) && user.role !== 'ADMIN') return redirect('#/admin');
    switch (section) {
        case undefined: return pageAdminDashboard();
        case 'demandes': return id ? pageAdminRequestDetail(id) : pageAdminRequests();
        case 'clients': return pageAdminClients();
        case 'equipe': return pageAdminTeam();
        default: return adminLayout({ title: 'Page introuvable', content: emptyState('magnifying-glass', 'Page introuvable', 'Cette page n\'existe pas.', '<a class="btn btn-primary" href="#/admin">Retour</a>') });
    }
}

function publicPage(parts, params) {
    const user = currentUser();
    const [section, id] = parts;
    if (['connexion', 'inscription'].includes(section) && user) return redirect(user.role === 'USER' ? '#/espace' : '#/admin');
    switch (section) {
        case undefined: return pageHome();
        case 'services': return id ? pageServiceDetail(id) : pageServices(params);
        case 'connexion': return pageLogin(params);
        case 'inscription': return pageRegister(params);
        case 'verification-email': return pageVerifyEmail();
        case 'mot-de-passe-oublie': return pageForgot();
        case 'reinitialiser-mot-de-passe': return pageReset();
        case 'mentions-legales': case 'confidentialite': case 'cgu': return pageLegal(section);
        default: return pageNotFound();
    }
}

function route({ keepPosition = false } = {}) {
    const { parts, params, raw } = parseRoute();
    const scrollY = window.scrollY;
    let html;
    if (parts[0] === 'espace') html = clientPage(parts.slice(1), params, raw);
    else if (parts[0] === 'admin') html = adminPage(parts.slice(1), raw);
    else html = publicPage(parts, params);
    if (html === '') return;

    $('#root').innerHTML = html;
    const heading = $('h1')?.textContent.trim();
    document.title = heading ? `${heading} · KWABO` : 'KWABO';
    scrollThreadToEnd();

    if (keepPosition) { window.scrollTo(0, scrollY); return; }
    if (!isFirstRender) $('#main')?.focus({ preventScroll: true });
    isFirstRender = false;
    if (pendingScrollTarget) {
        const target = document.getElementById(pendingScrollTarget);
        pendingScrollTarget = null;
        target?.scrollIntoView();
    } else {
        window.scrollTo(0, 0);
    }
}

ACTIONS.closeDialog = () => closeDialog();

ACTIONS.toggleSiteMenu = (el) => {
    const open = $('#site-nav').classList.toggle('open');
    el.setAttribute('aria-expanded', String(open));
    el.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    el.innerHTML = icon(open ? 'x-mark' : 'bars-3', 24);
};

/* L'œil est barré quand le mot de passe est caché, ouvert quand il est visible. */
ACTIONS.togglePassword = (el) => {
    const input = el.parentElement.querySelector('input');
    const willShow = input.type === 'password';
    input.type = willShow ? 'text' : 'password';
    const label = willShow ? 'Masquer le mot de passe' : 'Afficher le mot de passe';
    el.setAttribute('aria-label', label);
    el.setAttribute('title', label);
    el.setAttribute('aria-pressed', String(willShow));
    el.innerHTML = icon(willShow ? 'eye' : 'eye-slash');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
};

function hideSearchResults(except = null) {
    $$('.search-results').forEach((list) => {
        if (list === except) return;
        list.hidden = true;
        list.closest('form')?.querySelector('input')?.setAttribute('aria-expanded', 'false');
    });
}

document.addEventListener('click', (event) => {
    const skip = event.target.closest('.skip-link');
    if (skip) {
        event.preventDefault();
        $('#main')?.focus();
        return;
    }

    hideSearchResults(event.target.closest('.search')?.querySelector('.search-results'));

    /* Un clic sur le fond de la fenêtre la ferme. */
    if (event.target === $('#dialog')) { closeDialog(); return; }

    const scrollLink = event.target.closest('a[data-scroll]');
    if (scrollLink) {
        event.preventDefault();
        const id = scrollLink.dataset.scroll;
        $('#site-nav')?.classList.remove('open');
        const onHome = parseRoute().parts.length === 0;
        if (onHome && document.getElementById(id)) {
            document.getElementById(id).scrollIntoView();
        } else {
            pendingScrollTarget = id;
            location.hash = '#/';
        }
        return;
    }

    const actionEl = event.target.closest('[data-action]');
    const action = actionEl && ACTIONS[actionEl.dataset.action];
    if (action) {
        if (actionEl.tagName === 'A') event.preventDefault();
        action(actionEl, event);
        return;
    }

    if (event.target.closest('.side-link')) ACTIONS.closeSidebar();
});

document.addEventListener('submit', (event) => {
    const form = event.target.closest('form[data-form]');
    const handler = form && FORMS[form.dataset.form];
    if (!handler) return;
    event.preventDefault();
    handler(form, event);
});

document.addEventListener('input', (event) => {
    const el = event.target.closest('[data-input]');
    const handler = el && INPUTS[el.dataset.input];
    if (handler) handler(el, event);
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { hideSearchResults(); ACTIONS.closeSidebar(); }
    if (event.key === 'Enter' && !event.shiftKey && event.target.matches('[data-enter-submit]')) {
        event.preventDefault();
        event.target.closest('form').requestSubmit();
    }
});

window.addEventListener('hashchange', () => { closeDialog(); route(); });

$('.dialog-close').innerHTML = icon('x-mark', 22);
route();
