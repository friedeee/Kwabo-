'use strict';
/*
 * Faux serveur de la maquette : tout est gardé dans le navigateur (localStorage).
 * Ce fichier est le seul à remplacer par de vrais appels à l'API le moment venu.
 */
const DB_KEY = 'kwabo-maquette-db';
const SESSION_KEY = 'kwabo-maquette-session';

/* Pas une vraie protection : évite seulement de garder le mot de passe en clair pendant la démo. */
function demoHash(text) {
    let h = 5381;
    for (const c of String(text)) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
    return `demo-${h.toString(36)}`;
}

const hoursAgo = (n) => new Date(Date.now() - n * 3600000).toISOString();
const daysAgo = (n) => hoursAgo(n * 24);

function seedDb() {
    const prefs = Object.fromEntries(NOTIFICATION_PREFS.map((p) => [p.key, true]));
    const person = (id, role, firstName, lastName, email, country, phone, extra = {}) => ({
        id, role, firstName, lastName, email, country, phone,
        password: demoHash('Demo1234'), verified: true, twoFactor: false, prefs: { ...prefs },
        referralCode: `KW-${firstName.toUpperCase().slice(0, 4)}${id.slice(-2)}`, createdAt: daysAgo(90), ...extra,
    });
    const users = [
        person('u01', 'USER', 'Aïcha', 'Sossa', 'client@kwabo.demo', 'France', '+33 6 12 34 56 78'),
        person('u02', 'USER', 'Romuald', 'Agbo', 'romuald@exemple.com', 'Belgique', '+32 470 12 34 56', { createdAt: daysAgo(40) }),
        person('u03', 'USER', 'Clarisse', 'Houngbo', 'clarisse@exemple.com', 'Canada', '+1 514 555 0147', { createdAt: daysAgo(12) }),
        person('u10', 'ADMIN', 'Équipe', 'KWABO', 'admin@kwabo.demo', 'Bénin', '+229 01 00 00 00 00'),
        person('u11', 'OPERATOR', 'Maxime', 'Dossou', 'agent@kwabo.demo', 'Bénin', '+229 01 00 00 00 01'),
        person('u12', 'OPERATOR', 'Sènan', 'Kpadé', 'senan@kwabo.demo', 'Bénin', '+229 01 00 00 00 02'),
    ];
    const request = (id, userId, serviceId, status, title, city, age, extra = {}) => ({
        id, tracking: `KW-2026-${id.slice(-4)}`, userId, serviceId, status, title, city,
        urgency: 'normal', budget: '', description: '', details: {}, operatorId: null, quote: null, rating: null,
        createdAt: daysAgo(age), history: [{ at: daysAgo(age), text: 'Demande reçue' }], ...extra,
    });
    const requests = [
        request('r0001', 'u01', 'suivi-chantier', 'active', 'Suivi de ma villa à Abomey-Calavi', 'Abomey-Calavi', 30, {
            budget: '160 €/mois', description: 'Construction d\'une villa en cours. Je veux une visite chaque semaine et un contrôle des matériaux livrés.',
            details: { adresse: 'Quartier Tankpè, von face école', macon: 'M. Zannou, +229 01 00 00 00 10', stade: 'Élévation des murs', visite: 'Le vendredi matin' },
            operatorId: 'u11', quote: { amount: 160, label: 'Suivi de chantier, 1 mois' },
            history: [{ at: daysAgo(30), text: 'Demande reçue' }, { at: daysAgo(29), text: 'Devis envoyé : 160 €' }, { at: daysAgo(28), text: 'Mission démarrée après paiement' }, { at: daysAgo(3), text: 'Rapport hebdomadaire disponible' }],
        }),
        request('r0002', 'u01', 'sante', 'pending', 'Médicaments de ma mère', 'Cotonou', 1, {
            urgency: 'urgent', budget: '50 €/mois', description: 'Ma mère a besoin de son traitement chaque mois, livré à domicile.',
            details: { patient: 'Mme Sossa', etablissement: 'CNHU de Cotonou' },
            quote: { amount: 45, label: 'Santé de vos proches, 1 mois' },
            history: [{ at: daysAgo(1), text: 'Demande reçue' }, { at: hoursAgo(5), text: 'Devis envoyé : 45 €' }],
        }),
        request('r0003', 'u01', 'administratif', 'done', 'Acte de naissance de mon fils', 'Porto-Novo', 70, {
            budget: '60 €', description: 'Obtenir une copie intégrale de l\'acte de naissance.', details: { document: 'Acte de naissance', pourQui: 'Mon fils' },
            operatorId: 'u12', quote: { amount: 55, label: 'Assistance administrative' },
            history: [{ at: daysAgo(70), text: 'Demande reçue' }, { at: daysAgo(69), text: 'Devis envoyé : 55 €' }, { at: daysAgo(68), text: 'Mission démarrée après paiement' }, { at: daysAgo(60), text: 'Mission terminée' }],
        }),
        request('r0004', 'u02', 'fret', 'pending', 'Colis de Bruxelles vers Cotonou', 'Cotonou', 0.2, {
            description: 'Deux cartons de vêtements et du petit électroménager.', details: { villeEnvoi: 'Bruxelles', poids: '45', mode: 'Maritime' },
        }),
        request('r0005', 'u03', 'faire-venir', 'active', 'Visa études pour ma nièce', 'Parakou', 12, {
            budget: '300 €', description: 'Dossier de visa études vers le Canada.', details: { parente: 'Nièce', visa: 'Études', destination: 'Canada' },
            operatorId: 'u12', quote: { amount: 250, label: 'Faire venir un proche' },
            history: [{ at: daysAgo(12), text: 'Demande reçue' }, { at: daysAgo(11), text: 'Devis envoyé : 250 €' }, { at: daysAgo(10), text: 'Mission démarrée après paiement' }],
        }),
    ];
    const doc = (id, requestId, type, name, age) => ({ id, requestId, type, name, createdAt: daysAgo(age) });
    return {
        users,
        requests,
        nextRequest: 6,
        documents: [
            doc('d1', 'r0001', 'contract', 'Contrat de mission signé.pdf', 28),
            doc('d2', 'r0001', 'report', 'Rapport semaine 3.pdf', 10),
            doc('d3', 'r0001', 'report', 'Rapport semaine 4.pdf', 3),
            doc('d4', 'r0001', 'video', 'Vidéo 360° du chantier.mp4', 3),
            doc('d5', 'r0001', 'photo', 'Livraison de ciment.jpg', 4),
            doc('d6', 'r0001', 'receipt', 'Reçu ciment et fer.pdf', 4),
            doc('d7', 'r0003', 'contract', 'Contrat de mission signé.pdf', 68),
            doc('d8', 'r0003', 'receipt', 'Reçu mairie de Porto-Novo.pdf', 62),
            doc('d9', 'r0005', 'contract', 'Contrat de mission signé.pdf', 10),
        ],
        messages: [
            { id: 'm1', requestId: 'r0001', from: 'team', author: 'Équipe KWABO', text: 'Bonjour Aïcha, le rapport de la semaine est disponible dans vos documents.', at: hoursAgo(72), read: true },
            { id: 'm2', requestId: 'r0001', from: 'client', author: 'Aïcha Sossa', text: 'Merci. Le ciment livré correspond bien à ce qui était prévu ?', at: hoursAgo(50), read: true },
            { id: 'm3', requestId: 'r0001', from: 'team', author: 'Maxime Dossou', text: 'Oui, nous avons vérifié la livraison. Le reçu et la photo sont dans vos documents.', at: hoursAgo(48), read: false },
            { id: 'm4', requestId: 'r0002', from: 'team', author: 'Équipe KWABO', text: 'Votre devis est prêt. Dès le paiement reçu, nous organisons la première livraison.', at: hoursAgo(5), read: false },
            { id: 'm5', requestId: 'r0004', from: 'client', author: 'Romuald Agbo', text: 'Quelle est la date du prochain groupage maritime ?', at: hoursAgo(4), read: false },
        ],
        invoices: [
            { id: 'F-2026-0041', requestId: 'r0003', userId: 'u01', label: 'Assistance administrative', amount: 55, status: 'paid', method: 'card', createdAt: daysAgo(69), paidAt: daysAgo(68) },
            { id: 'F-2026-0042', requestId: 'r0001', userId: 'u01', label: 'Suivi de chantier, 1 mois', amount: 160, status: 'paid', method: 'wise', createdAt: daysAgo(29), paidAt: daysAgo(28) },
            { id: 'F-2026-0051', requestId: 'r0005', userId: 'u03', label: 'Faire venir un proche', amount: 250, status: 'paid', method: 'momo', createdAt: daysAgo(11), paidAt: daysAgo(10) },
            { id: 'F-2026-0058', requestId: 'r0002', userId: 'u01', label: 'Santé de vos proches, 1 mois', amount: 45, status: 'due', method: null, createdAt: hoursAgo(5), paidAt: null },
        ],
        notifications: [
            { id: 'n1', userId: 'u01', text: 'Devis reçu pour « Médicaments de ma mère » : 45 €', href: '#/espace/demandes/r0002', at: hoursAgo(5), read: false },
            { id: 'n2', userId: 'u01', text: 'Rapport hebdomadaire disponible pour « Suivi de ma villa à Abomey-Calavi »', href: '#/espace/demandes/r0001', at: daysAgo(3), read: false },
            { id: 'n3', userId: 'u01', text: 'Mission terminée : « Acte de naissance de mon fils »', href: '#/espace/demandes/r0003', at: daysAgo(60), read: true },
        ],
        savedMethods: { u01: [{ type: 'card', label: 'Visa se terminant par 4242' }] },
        referrals: { u01: [{ name: 'Romuald A.', status: 'Actif', at: daysAgo(40) }, { name: 'Clarisse H.', status: 'Inscrite', at: daysAgo(12) }] },
    };
}

const store = {
    read(area, key, fallback = null) {
        try { return JSON.parse(area.getItem(key)) ?? fallback; } catch { return fallback; }
    },
    write(area, key, value) {
        try { area.setItem(key, JSON.stringify(value)); } catch { /* la maquette fonctionne aussi sans stockage */ }
    },
};

let db = store.read(localStorage, DB_KEY) ?? seedDb();
const save = () => store.write(localStorage, DB_KEY, db);

const uid = (prefix) => `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
const fullName = (u) => `${u.firstName} ${u.lastName}`;
const serviceById = (id) => SERVICES.find((s) => s.id === id);
const userById = (id) => db.users.find((u) => u.id === id);
const requestById = (id) => db.requests.find((r) => r.id === id);

class ApiError extends Error {
    constructor(message, field = null) { super(message); this.field = field; }
}

function notify(userId, text, href) {
    db.notifications.unshift({ id: uid('n'), userId, text, href, at: new Date().toISOString(), read: false });
}

function log(request, text) {
    request.history.push({ at: new Date().toISOString(), text });
}

/* ---------- Session ---------- */
const session = {
    get userId() { return store.read(localStorage, SESSION_KEY) ?? store.read(sessionStorage, SESSION_KEY); },
    open(userId, remember) { store.write(remember ? localStorage : sessionStorage, SESSION_KEY, userId); },
    close() {
        try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); } catch { /* rien à faire */ }
    },
};
const currentUser = () => (session.userId ? userById(session.userId) ?? null : null);

/* ---------- API de démonstration ---------- */
const api = {
    register({ firstName, lastName, email, dial, phone, country, password, sponsorCode = '' }) {
        const address = email.trim().toLowerCase();
        if (db.users.some((u) => u.email === address)) throw new ApiError('Cet e-mail est déjà utilisé.', 'email');
        const code = sponsorCode.trim().toUpperCase();
        const sponsor = code ? db.users.find((u) => u.referralCode === code) : null;
        if (code && !sponsor) throw new ApiError('Ce code de parrainage n\'existe pas.', 'sponsorCode');
        if (sponsor) {
            (db.referrals[sponsor.id] ??= []).push({ name: `${firstName.trim()} ${lastName.trim()[0]?.toUpperCase() ?? ''}.`, status: 'Inscrit', at: new Date().toISOString() });
        }
        const user = {
            id: uid('u'), role: 'USER', firstName: firstName.trim(), lastName: lastName.trim(), email: address, country,
            phone: `${dial} ${phone.trim()}`, password: demoHash(password), verified: false, twoFactor: false,
            prefs: Object.fromEntries(NOTIFICATION_PREFS.map((p) => [p.key, true])),
            referralCode: `KW-${firstName.trim().toUpperCase().slice(0, 4)}${String(db.users.length).padStart(2, '0')}`, createdAt: new Date().toISOString(),
        };
        db.users.push(user);
        save();
        return user;
    },
    verifyEmail(email) {
        const user = db.users.find((u) => u.email === email);
        if (user) { user.verified = true; save(); }
        return user;
    },
    login({ email, password, remember, code }) {
        const user = db.users.find((u) => u.email === email.trim().toLowerCase());
        if (!user || user.password !== demoHash(password)) throw new ApiError('E-mail ou mot de passe incorrect.', 'email');
        if (!user.verified) throw new ApiError('Confirmez d\'abord votre e-mail avec le lien reçu.', 'email');
        if (user.twoFactor && code === undefined) return { needsCode: true };
        if (user.twoFactor && code !== '123456') throw new ApiError('Code incorrect.', 'code');
        session.open(user.id, remember);
        return { user };
    },
    logout: () => session.close(),
    resetPassword(email, password) {
        const user = db.users.find((u) => u.email === email);
        if (!user) throw new ApiError('Ce lien n\'est plus valable.');
        user.password = demoHash(password);
        save();
    },
    updateProfile(user, fields) { Object.assign(user, fields); save(); },
    changePassword(user, current, next) {
        if (user.password !== demoHash(current)) throw new ApiError('Mot de passe actuel incorrect.', 'current');
        user.password = demoHash(next);
        save();
    },
    deleteAccount(user) {
        const ids = db.requests.filter((r) => r.userId === user.id).map((r) => r.id);
        db.requests = db.requests.filter((r) => r.userId !== user.id);
        db.documents = db.documents.filter((d) => !ids.includes(d.requestId));
        db.messages = db.messages.filter((m) => !ids.includes(m.requestId));
        db.invoices = db.invoices.filter((i) => i.userId !== user.id);
        db.notifications = db.notifications.filter((n) => n.userId !== user.id);
        db.users = db.users.filter((u) => u.id !== user.id);
        save();
        session.close();
    },

    requestsOf: (user) => db.requests.filter((r) => r.userId === user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    createRequest(user, payload) {
        const number = String(db.nextRequest++).padStart(4, '0');
        const request = {
            id: `r${number}`, tracking: `KW-2026-${number}`, userId: user.id, status: 'pending', operatorId: null, quote: null, rating: null,
            createdAt: new Date().toISOString(), history: [{ at: new Date().toISOString(), text: 'Demande reçue' }], ...payload,
        };
        db.requests.push(request);
        notify(user.id, `Demande reçue : « ${request.title} ». Numéro de suivi ${request.tracking}.`, `#/espace/demandes/${request.id}`);
        save();
        return request;
    },
    cancelRequest(request) {
        request.status = 'cancelled';
        log(request, 'Demande annulée par le client');
        db.invoices.filter((i) => i.requestId === request.id && i.status === 'due').forEach((i) => { i.status = 'cancelled'; });
        save();
    },
    rateRequest(request, rating) {
        request.rating = rating;
        log(request, `Note du client : ${rating}/5`);
        save();
    },

    messagesOf: (requestId) => db.messages.filter((m) => m.requestId === requestId),
    sendMessage(request, user, text, attachment) {
        const isClient = user.role === 'USER';
        db.messages.push({ id: uid('m'), requestId: request.id, from: isClient ? 'client' : 'team', author: fullName(user), text, attachment: attachment || null, at: new Date().toISOString(), read: false });
        if (!isClient) notify(request.userId, `Nouveau message sur « ${request.title} »`, `#/espace/demandes/${request.id}`);
        save();
    },
    /* Messages reçus non lus, côté client ou côté équipe. */
    markThreadRead(requestId, side) {
        db.messages.filter((m) => m.requestId === requestId && m.from !== side).forEach((m) => { m.read = true; });
        save();
    },
    unreadMessages(user) {
        const side = user.role === 'USER' ? 'client' : 'team';
        const allowed = this.visibleRequests(user).map((r) => r.id);
        return db.messages.filter((m) => allowed.includes(m.requestId) && m.from !== side && !m.read).length;
    },
    visibleRequests(user) {
        if (user.role === 'USER') return this.requestsOf(user);
        const list = user.role === 'OPERATOR' ? db.requests.filter((r) => r.operatorId === user.id) : db.requests;
        return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    documentsOf: (requestId) => db.documents.filter((d) => d.requestId === requestId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    addDocument(request, type, name) {
        db.documents.push({ id: uid('d'), requestId: request.id, type, name, createdAt: new Date().toISOString() });
        if (type === 'report') {
            log(request, 'Rapport hebdomadaire disponible');
            notify(request.userId, `Rapport hebdomadaire disponible pour « ${request.title} »`, `#/espace/demandes/${request.id}`);
        }
        save();
    },

    notificationsOf: (user) => db.notifications.filter((n) => n.userId === user.id).sort((a, b) => new Date(b.at) - new Date(a.at)),
    markNotificationRead(id) {
        const n = db.notifications.find((x) => x.id === id);
        if (n) { n.read = true; save(); }
    },
    markAllRead(user) {
        db.notifications.filter((n) => n.userId === user.id).forEach((n) => { n.read = true; });
        save();
    },

    invoicesOf: (user) => db.invoices.filter((i) => i.userId === user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    payInvoice(invoiceId, method) {
        const invoice = db.invoices.find((i) => i.id === invoiceId);
        invoice.status = 'paid';
        invoice.method = method;
        invoice.paidAt = new Date().toISOString();
        const request = requestById(invoice.requestId);
        notify(invoice.userId, `Paiement confirmé : ${invoice.amount} € pour « ${request.title} »`, `#/espace/paiements`);
        if (request.status === 'pending') {
            request.status = 'active';
            log(request, 'Mission démarrée après paiement');
            notify(invoice.userId, `Votre mission « ${request.title} » a démarré.`, `#/espace/demandes/${request.id}`);
        }
        save();
    },
    methodsOf: (user) => db.savedMethods[user.id] ?? [],
    removeMethod(user, index) { (db.savedMethods[user.id] ?? []).splice(index, 1); save(); },
    referralsOf: (user) => db.referrals[user.id] ?? [],

    /* Back-office */
    setStatus(request, status) {
        request.status = status;
        log(request, `Statut : ${STATUS[status].label}`);
        if (status === 'cancelled') {
            db.invoices.filter((i) => i.requestId === request.id && i.status === 'due').forEach((i) => { i.status = 'cancelled'; });
        }
        if (status === 'done') notify(request.userId, `Mission terminée : « ${request.title} »`, `#/espace/demandes/${request.id}`);
        if (status === 'active') notify(request.userId, `Votre mission « ${request.title} » a démarré.`, `#/espace/demandes/${request.id}`);
        save();
    },
    assign(request, operatorId) {
        request.operatorId = operatorId || null;
        log(request, operatorId ? `Attribuée à ${fullName(userById(operatorId))}` : 'Attribution retirée');
        save();
    },
    sendQuote(request, amount, label) {
        request.quote = { amount, label };
        log(request, `Devis envoyé : ${amount} €`);
        db.invoices.filter((i) => i.requestId === request.id && i.status === 'due').forEach((i) => { i.status = 'cancelled'; });
        db.invoices.push({ id: `F-2026-${String(100 + db.invoices.length).padStart(4, '0')}`, requestId: request.id, userId: request.userId, label, amount, status: 'due', method: null, createdAt: new Date().toISOString(), paidAt: null });
        notify(request.userId, `Devis reçu pour « ${request.title} » : ${amount} €`, `#/espace/demandes/${request.id}`);
        save();
    },
    clients: () => db.users.filter((u) => u.role === 'USER'),
    operators: () => db.users.filter((u) => u.role === 'OPERATOR'),
    allInvoices: () => db.invoices,
};

function resetDemo() {
    try { localStorage.removeItem(DB_KEY); } catch { /* rien à faire */ }
    session.close();
    db = seedDb();
}
