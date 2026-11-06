'use strict';
/* Back-office : administrateurs (tout voir) et opérateurs terrain (leurs missions seulement). */

function adminLayout(options) {
    const user = currentUser();
    const isAdmin = user.role === 'ADMIN';
    const unread = api.unreadMessages(user);
    const nav = [
        { href: '#/admin', icon: 'chart-bar', label: isAdmin ? 'Vue d\'ensemble' : 'Mes missions', exact: true },
        { href: '#/admin/demandes', icon: 'clipboard-document-list', label: isAdmin ? 'Demandes' : 'Demandes attribuées', badge: unread },
        ...(isAdmin ? [
            { href: '#/admin/clients', icon: 'users', label: 'Clients' },
            { href: '#/admin/equipe', icon: 'user-group', label: 'Équipe' },
        ] : []),
    ];
    return appLayout({ user, nav, ...options });
}

/* ---------- Vue d'ensemble ---------- */
function categoryBars(requests) {
    const rows = CATEGORIES.map((c) => ({ c, value: requests.filter((r) => serviceById(r.serviceId).cat === c.id).length }));
    const max = Math.max(1, ...rows.map((r) => r.value));
    return `<ul class="bars">${rows.map(({ c, value }) => `<li title="${esc(c.name)} : ${plural(value, 'demande')}">
        <span class="bars-label">${esc(c.short)}</span>
        <span class="bars-track"><span class="bars-fill" style="width:${(value / max) * 100}%"></span></span>
        <span class="bars-value">${value}</span>
    </li>`).join('')}</ul>`;
}

function pageAdminDashboard() {
    const user = currentUser();
    const isAdmin = user.role === 'ADMIN';
    const requests = api.visibleRequests(user);
    const count = (status) => requests.filter((r) => r.status === status).length;
    const toQuote = requests.filter((r) => r.status === 'pending' && !r.quote);
    const unassigned = requests.filter((r) => !r.operatorId && ['pending', 'active'].includes(r.status));
    const cashed = api.allInvoices().filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
    const stats = isAdmin
        ? [['document-text', toQuote.length, 'Devis à préparer', 'gold'], ['user-plus', unassigned.length, 'Non attribuées', 'gold'], ['bolt', count('active'), 'En cours', 'green'], ['banknotes', money(cashed), 'Encaissé', 'neutral']]
        : [['clipboard-document-list', requests.length, 'Missions attribuées', 'neutral'], ['clock', count('pending'), 'En attente', 'gold'], ['bolt', count('active'), 'En cours', 'green'], ['check-circle', count('done'), 'Terminées', 'neutral']];
    const priorities = (isAdmin ? [...new Set([...toQuote, ...unassigned])] : requests.filter((r) => r.status === 'active' || r.status === 'pending')).slice(0, 5);
    return adminLayout({
        title: isAdmin ? 'Vue d\'ensemble' : `Bonjour ${user.firstName}`,
        subtitle: isAdmin ? 'Ce qui demande votre attention aujourd\'hui' : 'Vos missions sur le terrain',
        content: `
        <ul class="stats">${stats.map(([ic, value, label, tone]) => `<li class="stat stat-${tone}"><span class="tile tile-sm">${icon(ic, 18)}</span><strong>${value}</strong><span>${label}</span></li>`).join('')}</ul>
        <div class="dash-grid">
            <section class="card"><div class="card-head"><h2>${isAdmin ? 'À traiter en priorité' : 'Missions à suivre'}</h2><a href="#/admin/demandes">Tout voir</a></div>
                ${priorities.length ? `<div class="request-list">${priorities.map((r) => requestRow(r, user)).join('')}</div>` : emptyState('check-circle', 'Tout est à jour', 'Aucune demande n\'attend d\'action.')}
            </section>
            <div class="stack">
                ${isAdmin ? `<section class="card"><h2>Demandes par univers</h2>${categoryBars(requests)}</section>` : ''}
                <section class="card"><h2>Par statut</h2>
                    <ul class="status-summary">${Object.keys(STATUS).map((key) => `<li>${statusBadge(key)}<strong>${count(key)}</strong></li>`).join('')}</ul>
                </section>
            </div>
        </div>`,
    });
}

/* ---------- Liste des demandes ---------- */
const adminState = { q: '', status: 'all', operator: 'all', page: 1 };

function filteredAdminRequests(user) {
    const needle = normalize(adminState.q.trim());
    return api.visibleRequests(user).filter((r) => {
        const client = userById(r.userId);
        return (adminState.status === 'all' || r.status === adminState.status)
            && (adminState.operator === 'all' || (adminState.operator === 'none' ? !r.operatorId : r.operatorId === adminState.operator))
            && (!needle || normalize(`${r.title} ${r.tracking} ${client ? fullName(client) : ''}`).includes(needle));
    });
}

function adminRequestsTable() {
    const user = currentUser();
    const list = filteredAdminRequests(user);
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    adminState.page = Math.min(adminState.page, pages);
    const start = (adminState.page - 1) * PAGE_SIZE;
    if (!list.length) return emptyState('magnifying-glass', 'Aucune demande', 'Changez votre recherche ou vos filtres.');
    return `<div class="table-wrap"><table class="table table-cards"><thead><tr><th>Suivi</th><th>Demande</th><th>Client</th><th>Agent</th><th>Statut</th><th>Date</th></tr></thead><tbody>
    ${list.slice(start, start + PAGE_SIZE).map((r) => {
        const client = userById(r.userId);
        const operator = r.operatorId ? userById(r.operatorId) : null;
        const unread = api.messagesOf(r.id).filter((m) => m.from === 'client' && !m.read).length;
        return `<tr>
            <td data-label="Suivi">${esc(r.tracking)}</td>
            <td data-label="Demande"><a class="table-link" href="#/admin/demandes/${r.id}">${esc(r.title)}</a>${r.urgency === 'urgent' ? ` <span class="badge badge-red">${icon('bolt', 14)}Urgent</span>` : ''}${unread ? ` <span class="count count-gold" title="Messages non lus">${unread}</span>` : ''}</td>
            <td data-label="Client">${client ? esc(fullName(client)) : ''}</td>
            <td data-label="Agent">${operator ? esc(fullName(operator)) : '<span class="muted">Non attribuée</span>'}</td>
            <td data-label="Statut">${statusBadge(r.status)}</td>
            <td data-label="Date">${fmtDate(r.createdAt)}</td>
        </tr>`;
    }).join('')}
    </tbody></table></div>${pagination(adminState.page, pages, 'adminPage')}`;
}

function pageAdminRequests() {
    const user = currentUser();
    const isAdmin = user.role === 'ADMIN';
    return adminLayout({
        title: isAdmin ? 'Demandes' : 'Demandes attribuées',
        subtitle: plural(api.visibleRequests(user).length, 'demande'),
        content: `
        <div class="toolbar">
            <div class="search-field">${icon('magnifying-glass', 18)}<label class="sr-only" for="admin-q">Rechercher</label><input id="admin-q" type="search" placeholder="Titre, numéro de suivi ou client…" value="${esc(adminState.q)}" data-input="adminSearch"></div>
            <label class="sr-only" for="admin-status">Statut</label>
            <select id="admin-status" class="select-inline" data-input="adminStatus"><option value="all">Tous les statuts</option>${Object.keys(STATUS).map((k) => `<option value="${k}" ${adminState.status === k ? 'selected' : ''}>${STATUS[k].label}</option>`).join('')}</select>
            ${isAdmin ? `<label class="sr-only" for="admin-operator">Agent</label>
            <select id="admin-operator" class="select-inline" data-input="adminOperator"><option value="all">Tous les agents</option><option value="none" ${adminState.operator === 'none' ? 'selected' : ''}>Non attribuées</option>${api.operators().map((o) => `<option value="${o.id}" ${adminState.operator === o.id ? 'selected' : ''}>${esc(fullName(o))}</option>`).join('')}</select>` : ''}
        </div>
        <section class="card" id="admin-requests">${adminRequestsTable()}</section>`,
    });
}

const refreshAdminRequests = () => { $('#admin-requests').innerHTML = adminRequestsTable(); };
INPUTS.adminSearch = (input) => { adminState.q = input.value; adminState.page = 1; refreshAdminRequests(); };
INPUTS.adminStatus = (input) => { adminState.status = input.value; adminState.page = 1; refreshAdminRequests(); };
INPUTS.adminOperator = (input) => { adminState.operator = input.value; adminState.page = 1; refreshAdminRequests(); };
ACTIONS.adminPage = (el) => { adminState.page = Number(el.dataset.page); refreshAdminRequests(); };

/* ---------- Détail d'une demande ---------- */
function pageAdminRequestDetail(id) {
    const user = currentUser();
    const isAdmin = user.role === 'ADMIN';
    const r = api.visibleRequests(user).find((x) => x.id === id);
    if (!r) {
        return adminLayout({ title: 'Demande introuvable', content: emptyState('magnifying-glass', 'Demande introuvable', 'Elle n\'existe pas ou ne vous est pas attribuée.', '<a class="btn btn-primary" href="#/admin/demandes">Retour aux demandes</a>') });
    }
    api.markThreadRead(r.id, 'team');
    const client = userById(r.userId);
    const docs = api.documentsOf(r.id);
    const due = dueInvoiceOf(r);
    return adminLayout({
        title: r.title,
        subtitle: `${r.tracking} · ${serviceById(r.serviceId).name}`,
        content: `
        <a class="breadcrumb" href="#/admin/demandes">${icon('arrow-left', 16)}Demandes</a>
        <section class="card status-card">${statusSteps(r.status)}</section>
        <div class="detail-grid">
            <div class="stack">
                ${requestInfoCard(r)}
                <section class="card"><h2>Messages avec le client</h2>${threadPanel(r, user)}</section>
                <section class="card"><h2>Documents</h2>
                    ${docs.length ? `<ul class="doc-list">${docs.map(documentItem).join('')}</ul>` : '<p class="muted">Aucun document pour le moment.</p>'}
                    <form class="doc-form" data-form="addDocument" data-request="${r.id}" novalidate>
                        <h3>Ajouter un document</h3>
                        <div class="form-grid">
                            ${field({ name: 'docType', label: 'Type', type: 'select', required: true, placeholder: false, options: Object.entries(DOC_TYPES).map(([value, t]) => ({ value, label: t.label })) })}
                            ${field({ name: 'docName', label: 'Nom du document', required: true, placeholder: 'Rapport semaine 5.pdf' })}
                        </div>
                        <button class="btn btn-ghost" type="submit">${icon('plus', 18)}Ajouter</button>
                    </form>
                </section>
            </div>
            <aside class="stack">
                <section class="card"><h2>Client</h2>
                    <div class="client-mini">${avatar(fullName(client))}<span><strong>${esc(fullName(client))}</strong><small>${esc(client.country)}</small></span></div>
                    <ul class="contact-list"><li>${icon('envelope', 18)}<a href="mailto:${esc(client.email)}">${esc(client.email)}</a></li><li>${icon('phone', 18)}<a href="tel:${esc(client.phone.replace(/\s/g, ''))}">${esc(client.phone)}</a></li></ul>
                </section>
                <form class="card form-card" data-form="changeStatus" data-request="${r.id}" novalidate>
                    <h2>Statut</h2>
                    ${field({ name: 'statusValue', label: 'Statut de la demande', type: 'select', required: true, placeholder: false, value: r.status, options: Object.keys(STATUS).map((k) => ({ value: k, label: STATUS[k].label })) })}
                    <button class="btn btn-primary btn-block" type="submit">Mettre à jour</button>
                </form>
                ${isAdmin ? `<form class="card form-card" data-form="assignOperator" data-request="${r.id}" novalidate>
                    <h2>Agent terrain</h2>
                    ${field({ name: 'operatorId', label: 'Attribuer à', type: 'select', optionalMark: false, placeholder: 'Personne pour le moment', value: r.operatorId ?? '', options: api.operators().map((o) => ({ value: o.id, label: fullName(o) })) })}
                    <button class="btn btn-ghost btn-block" type="submit">Attribuer</button>
                </form>
                <form class="card form-card" data-form="sendQuote" data-request="${r.id}" novalidate>
                    <h2>Devis</h2>
                    ${r.quote ? `<p class="notice">${icon('document-text')}<span>${due ? 'En attente de paiement' : 'Dernier devis'} : <strong>${money(r.quote.amount)}</strong>, ${esc(r.quote.label)}</span></p>` : ''}
                    ${field({ name: 'quoteAmount', label: 'Montant (€)', type: 'number', required: true, attrs: 'min="1" inputmode="decimal"' })}
                    ${field({ name: 'quoteLabel', label: 'Objet', required: true, value: serviceById(r.serviceId).name })}
                    <button class="btn btn-gold btn-block" type="submit">${r.quote ? 'Envoyer un nouveau devis' : 'Envoyer le devis'}</button>
                </form>` : ''}
                ${r.rating ? `<section class="card"><h2>Avis du client</h2><p class="rating-readout">${icon('star', 20)}<strong>${r.rating} sur 5</strong></p></section>` : ''}
                ${historyCard(r)}
            </aside>
        </div>`,
    });
}

FORMS.changeStatus = (form) => {
    const r = requestById(form.dataset.request);
    const status = form.elements.statusValue.value;
    if (status !== r.status) {
        api.setStatus(r, status);
        toast(`Statut : ${STATUS[status].label}. Le client est prévenu.`);
    }
    route({ keepPosition: true });
};

FORMS.assignOperator = (form) => {
    const r = requestById(form.dataset.request);
    const operatorId = form.elements.operatorId.value;
    if (operatorId !== (r.operatorId ?? '')) {
        api.assign(r, operatorId);
        toast(operatorId ? `Attribuée à ${fullName(userById(operatorId))}.` : 'Attribution retirée.');
    }
    route({ keepPosition: true });
};

FORMS.sendQuote = (form) => {
    const amount = Number(form.elements.quoteAmount.value);
    const label = form.elements.quoteLabel.value.trim();
    const errors = {};
    if (!(amount > 0)) errors.quoteAmount = 'Saisissez un montant supérieur à 0.';
    if (!label) errors.quoteLabel = 'Saisissez l\'objet du devis.';
    if (!showErrors(form, errors)) return;
    api.sendQuote(requestById(form.dataset.request), amount, label);
    toast('Devis envoyé au client.');
    route({ keepPosition: true });
};

FORMS.addDocument = (form) => {
    const name = form.elements.docName.value.trim();
    if (!showErrors(form, name ? {} : { docName: 'Donnez un nom au document.' })) return;
    api.addDocument(requestById(form.dataset.request), form.elements.docType.value, name);
    toast('Document ajouté. Il est visible par le client.');
    route({ keepPosition: true });
};

/* ---------- Clients ---------- */
let clientsQuery = '';

function clientsTable() {
    const needle = normalize(clientsQuery.trim());
    const list = api.clients().filter((c) => !needle || normalize(`${fullName(c)} ${c.email} ${c.country}`).includes(needle));
    if (!list.length) return emptyState('magnifying-glass', 'Aucun client trouvé', 'Essayez un autre nom ou e-mail.');
    return `<div class="table-wrap"><table class="table table-cards"><thead><tr><th>Client</th><th>E-mail</th><th>Pays</th><th>Demandes</th><th>Inscription</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>
    ${list.map((c) => `<tr>
        <td data-label="Client"><span class="client-mini">${avatar(fullName(c), 'avatar-sm')}<strong>${esc(fullName(c))}</strong></span></td>
        <td data-label="E-mail">${esc(c.email)}</td>
        <td data-label="Pays">${esc(c.country)}</td>
        <td data-label="Demandes">${api.requestsOf(c).length}</td>
        <td data-label="Inscription">${fmtDate(c.createdAt)}</td>
        <td class="td-action"><button class="btn btn-ghost btn-sm" type="button" data-action="viewClient" data-id="${c.id}">Fiche</button></td>
    </tr>`).join('')}
    </tbody></table></div>`;
}

function pageAdminClients() {
    return adminLayout({
        title: 'Clients',
        subtitle: plural(api.clients().length, 'client'),
        content: `<div class="toolbar"><div class="search-field">${icon('magnifying-glass', 18)}<label class="sr-only" for="clients-q">Rechercher un client</label><input id="clients-q" type="search" placeholder="Nom, e-mail ou pays…" value="${esc(clientsQuery)}" data-input="clientsSearch"></div></div>
        <section class="card" id="clients-table">${clientsTable()}</section>`,
    });
}
INPUTS.clientsSearch = (input) => { clientsQuery = input.value; $('#clients-table').innerHTML = clientsTable(); };

ACTIONS.viewClient = (el) => {
    const admin = currentUser();
    const c = userById(el.dataset.id);
    const requests = api.requestsOf(c);
    openDialog(`<h2 class="dialog-title" id="dialog-heading">${esc(fullName(c))}</h2>
    <dl class="info-list"><div><dt>E-mail</dt><dd>${esc(c.email)}</dd></div><div><dt>Téléphone</dt><dd>${esc(c.phone)}</dd></div><div><dt>Pays</dt><dd>${esc(c.country)}</dd></div><div><dt>Inscription</dt><dd>${fmtDate(c.createdAt)}</dd></div></dl>
    <h3>Demandes</h3>
    ${requests.length ? `<div class="request-list" data-action="closeDialog">${requests.map((r) => requestRow(r, admin)).join('')}</div>` : '<p class="muted">Aucune demande.</p>'}`, { wide: true });
};

/* ---------- Équipe ---------- */
function pageAdminTeam() {
    const team = db.users.filter((u) => u.role !== 'USER');
    const roleLabel = { ADMIN: 'Administrateur', OPERATOR: 'Agent terrain' };
    return adminLayout({
        title: 'Équipe',
        subtitle: 'Administrateurs et agents terrain',
        content: `<ul class="team-grid">${team.map((u) => {
            const assigned = db.requests.filter((r) => r.operatorId === u.id);
            return `<li class="card">
                <div class="client-mini">${avatar(fullName(u))}<span><strong>${esc(fullName(u))}</strong><small>${roleLabel[u.role]}</small></span></div>
                <ul class="contact-list"><li>${icon('envelope', 18)}<span>${esc(u.email)}</span></li><li>${icon('phone', 18)}<span>${esc(u.phone)}</span></li></ul>
                ${u.role === 'OPERATOR' ? `<p class="team-load"><strong>${assigned.filter((r) => r.status === 'active').length}</strong> en cours · <strong>${assigned.length}</strong> au total</p>` : '<p class="team-load muted">Accès à toutes les demandes</p>'}
            </li>`;
        }).join('')}</ul>`,
    });
}
