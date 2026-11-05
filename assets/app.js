/* Canal – maquette d'annuaire-organigramme. Vanilla JS, aucune dépendance.
   Vues (routage par #ancre) : accueil, annuaire, organigramme, projets, projet-<id>,
   avant-apres, cas-usage, agent-<id> (fiche ouverte par-dessus l'annuaire). */
(function () {
  'use strict';
  var D = window.CANAL_DATA;
  var N = D.nodes, A = D.agents, P = D.projets;
  var byId = {}; A.forEach(function (a) { byId[a.id] = a; });
  var projById = {}; P.forEach(function (p) { projById[p.id] = p; });
  var app = document.getElementById('app');

  /* ---------- Outils ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, ' ').replace(/œ/g, 'oe'); }
  var STOP = { de: 1, du: 1, des: 1, la: 1, le: 1, les: 1, l: 1, d: 1, et: 1, a: 1, au: 1, aux: 1, un: 1, une: 1, pour: 1, qui: 1, en: 1, sur: 1, s: 1, occupe: 1, contacter: 1 };
  function tokens(q) { return norm(q).split(/[^a-z0-9%]+/).filter(function (t) { return t && !STOP[t]; }); }
  function initials(a) { return (a.prenom[0] + a.nom.replace(/^(El |De |Le )/, '')[0]).toUpperCase(); }
  function pathOf(id) { var p = []; while (id) { p.unshift(id); id = N[id].parent; } return p; }
  function dirOf(nodeId) { var p = pathOf(nodeId); for (var i = p.length - 1; i >= 0; i--) if (N[p[i]].type === 'direction') return p[i]; return null; }
  function label(n) { return n.sigle && n.type !== 'direction' ? n.sigle : n.nom; }
  var HUES = {}; var dirs = Object.keys(N).filter(function (k) { return N[k].type === 'direction'; });
  dirs.forEach(function (d, i) { HUES[d] = Math.round(i * 360 / dirs.length + 200) % 360; });
  function color(nodeId) { var d = dirOf(nodeId); var h = d ? HUES[d] : 210; return 'hsl(' + h + ' 52% 42%)'; }
  function avatar(a, cls) { return '<span class="av' + (cls ? ' ' + cls : '') + '" style="background:' + color(a.node) + '" aria-hidden="true">' + esc(initials(a)) + '</span>'; }
  function full(a) { return a.prenom + ' ' + a.nom; }
  function crumbText(a) { return pathOf(a.node).slice(1).map(function (id) { return label(N[id]); }).join(' › '); }
  function shortPath(a) { var n = N[a.node]; var d = dirOf(a.node); return n.type === 'service' ? n.nom + ' · ' + N[d].nom : n.nom; }
  var counts = {};
  (function count(id) { var c = A.filter(function (a) { return a.node === id; }).length; N[id].children.forEach(function (k) { c += count(k); }); counts[id] = c; return c; })(D.racine);

  /* Surlignage insensible aux accents */
  function hl(str, toks) {
    if (!toks || !toks.length) return esc(str);
    var chars = Array.from(str), nm = '', map = [];
    chars.forEach(function (ch, i) { var n = norm(ch); for (var k = 0; k < n.length; k++) { nm += n[k]; map.push(i); } });
    var marks = new Array(chars.length).fill(false);
    toks.forEach(function (t) { var from = 0, ix; while ((ix = nm.indexOf(t, from)) !== -1) { for (var k = ix; k < ix + t.length; k++) marks[map[k]] = true; from = ix + t.length; } });
    var out = '', open = false;
    chars.forEach(function (ch, i) { if (marks[i] && !open) { out += '<mark>'; open = true; } if (!marks[i] && open) { out += '</mark>'; open = false; } out += esc(ch); });
    return out + (open ? '</mark>' : '');
  }

  /* ---------- Index de recherche ---------- */
  function fields(a) {
    var n = N[a.node], path = pathOf(a.node);
    return [
      [norm(full(a)), 10], [norm(a.poste), 6], [norm(a.kw.join(' | ')), 5],
      [norm(path.slice(1).map(function (id) { return N[id].nom + ' ' + N[id].sigle; }).join(' | ')), 3],
      [norm(a.projets.map(function (p) { return projById[p].nom; }).join(' | ')), 4],
      [norm(a.missions.join(' | ')), 3], [norm(a.lieu || ''), 1]
    ];
  }
  var INDEX = {};
  function reindex(a) { INDEX[a.id] = fields(a); }
  A.forEach(reindex);
  function search(q, opts) {
    opts = opts || {};
    var toks = tokens(q);
    var res = [];
    A.forEach(function (a) {
      if (opts.dir && dirOf(a.node) !== opts.dir) return;
      if (opts.proj && a.projets.indexOf(opts.proj) === -1) return;
      var f = INDEX[a.id], score = 0;
      for (var i = 0; i < toks.length; i++) {
        var best = 0;
        for (var j = 0; j < f.length; j++) {
          var ix = f[j][0].indexOf(toks[i]);
          if (ix !== -1) { var w = f[j][1] * (ix === 0 || /[^a-z0-9]/.test(f[j][0][ix - 1]) ? 1 : 0.6); if (w > best) best = w; }
        }
        if (!best) return;
        score += best;
      }
      var lvl = N[a.node].head === a.id ? 0.5 : 0;
      res.push({ a: a, s: score + lvl });
    });
    res.sort(function (x, y) { return y.s - x.s || x.a.nom.localeCompare(y.a.nom); });
    return { toks: toks, list: res.map(function (r) { return r.a; }) };
  }
  function oldSearch(q) { // annuaire actuel : nom et prénom uniquement
    var t = norm(q).trim(); if (!t) return [];
    return A.filter(function (a) { return norm(a.nom).indexOf(t) === 0 || norm(a.prenom).indexOf(t) === 0 || norm(full(a)) === t || norm(a.nom + ' ' + a.prenom) === t; });
  }
  function matchingServices(toks) {
    if (!toks.length) return [];
    return Object.keys(N).filter(function (k) {
      var n = N[k]; if (n.type !== 'service' && n.type !== 'direction') return false;
      var s = norm(n.nom + ' ' + n.sigle);
      return toks.every(function (t) { return s.indexOf(t) !== -1; });
    }).slice(0, 4);
  }

  /* ---------- État ---------- */
  var state = { q: '', dir: '', proj: '', limit: 30, orgPath: ['ville', 'dgs'], orgAgent: null, manager: false, managedDir: 'drc', baQ: 'mécénat', lastView: 'annuaire' };

  function toast(msg) {
    var old = document.querySelector('.toast'); if (old) old.remove();
    var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3200);
  }

  /* ---------- En-tête commun ---------- */
  document.getElementById('topSearch').addEventListener('submit', function (e) {
    e.preventDefault(); state.q = document.getElementById('topQ').value; state.limit = 30;
    if (location.hash === '#annuaire') render(); else location.hash = 'annuaire';
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-soon]'), function (b) {
    b.addEventListener('click', function () { toast('« ' + b.dataset.soon + ' » : rubrique hors du périmètre de la maquette.'); });
  });
  function setTab(on) { Array.prototype.forEach.call(document.querySelectorAll('#tiles [data-tab]'), function (a) { a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); }

  /* ---------- Accueil ---------- */
  function heroArt() {
    var s = '<svg class="art" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="800" height="300" fill="#16212D"/>';
    var lv = [[400], [170, 400, 630], [80, 170, 260, 330, 400, 470, 540, 630, 720]];
    var y = [70, 150, 228];
    for (var i = 1; i < lv.length; i++) lv[i].forEach(function (x, k) { var px = lv[i - 1][Math.min(lv[i - 1].length - 1, Math.floor(k * lv[i - 1].length / lv[i].length))]; s += '<path d="M' + px + ' ' + (y[i - 1] + 14) + ' C' + px + ' ' + (y[i] - 30) + ' ' + x + ' ' + (y[i - 1] + 40) + ' ' + x + ' ' + (y[i] - 14) + '" stroke="#2C3E52" stroke-width="2" fill="none"/>'; });
    lv.forEach(function (row, i) { row.forEach(function (x, k) { var c = (i === 2 && (k === 2 || k === 6)) || (i === 1 && k === 1) ? '#E5602A' : '#1A8ACB'; s += '<circle cx="' + x + '" cy="' + y[i] + '" r="' + (i === 0 ? 16 : i === 1 ? 13 : 10) + '" fill="' + c + '"/>'; }); });
    s += '<path d="M260 225 C 300 270, 500 270, 540 225" stroke="#E5602A" stroke-width="2.5" stroke-dasharray="6 6" fill="none"/>';
    return s + '</svg>';
  }
  function viewHome() {
    setTab(false);
    var pick = ['mécénat', 'tournage', 'chauffage', 'crèche'];
    app.innerHTML =
      '<section class="hero">' + heroArt() +
        '<div class="cap"><h1>Nouveau : l’annuaire-organigramme</h1><p>Trouvez un collègue par son métier, situez-le dans l’organigramme, retrouvez qui travaille sur quel projet.</p><a href="#annuaire">Découvrir l’annuaire</a></div>' +
      '</section>' +
      '<div class="quick"><button class="btn dot" data-soon2="Ma collectivité">Ma collectivité ▾</button><button class="btn dot" data-soon2="Mon guide RH">Mon guide RH ▾</button><button class="btn dot" data-soon2="Mes demandes">Mes demandes ▾</button><button class="btn dot" data-soon2="Mon pack numérique">Mon pack numérique ▾</button></div>' +
      '<div class="section-title"><h2>Ce que change l’annuaire</h2><span class="muted">' + A.length + ' agents fictifs · ' + dirs.length + ' directions · ' + P.length + ' projets</span></div>' +
      '<div class="features">' +
        '<a class="card feature" href="#annuaire"><span class="n">1</span><h3>Chercher par mot-clé</h3><p>Un métier, une mission, un sujet : « ' + pick.join(' », « ') + ' ». Plus besoin de connaître le nom de la personne.</p></a>' +
        '<a class="card feature" href="#organigramme"><span class="n">2</span><h3>Situer chaque interlocuteur</h3><p>Un clic sur un agent : son poste, ses missions, son service et sa place dans l’organigramme de la ville.</p></a>' +
        '<a class="card feature" href="#projets"><span class="n">3</span><h3>Voir qui travaille sur quoi</h3><p>Des tags projets relient les agents de toutes les directions qui portent un même projet.</p></a>' +
        '<a class="card feature" href="#avant-apres"><span class="n">4</span><h3>Avant / après</h3><p>La même recherche dans l’annuaire actuel et dans l’annuaire proposé.</p></a>' +
      '</div>';
    Array.prototype.forEach.call(app.querySelectorAll('[data-soon2]'), function (b) { b.addEventListener('click', function () { toast('« ' + b.dataset.soon2 + ' » : rubrique hors du périmètre de la maquette.'); }); });
  }

  /* ---------- Module annuaire : en-tête et sous-navigation ---------- */
  function moduleHead(active) {
    var tabs = [['annuaire', 'Rechercher'], ['organigramme', 'Organigramme'], ['projets', 'Projets'], ['avant-apres', 'Avant / après'], ['cas-usage', 'Cas d’usage']];
    var opts = dirs.slice().sort(function (a, b) { return N[a].nom.localeCompare(N[b].nom); }).map(function (d) { return '<option value="' + d + '"' + (d === state.managedDir ? ' selected' : '') + '>' + esc(N[d].nom) + '</option>'; }).join('');
    return '<div class="mod-head"><div><p class="eyebrow">Annuaire</p><h1>Annuaire<span>-</span>organigramme</h1></div>' +
      '<button class="toggle" type="button" id="mgr" aria-pressed="' + state.manager + '"><span class="sw" aria-hidden="true"></span>Mode gestionnaire</button></div>' +
      (state.manager ? '<div class="manager-bar"><b>Vous gérez :</b><label class="sr" for="mgrDir">Direction gérée</label><select id="mgrDir">' + opts + '</select><span>Ouvrez la fiche d’un agent de cette direction pour mettre à jour ses mots-clés et ses projets. Démonstration : rien n’est enregistré.</span></div>' : '') +
      '<nav class="subnav" aria-label="Annuaire">' + tabs.map(function (t) { return '<a href="#' + t[0] + '"' + (t[0] === active ? ' class="on" aria-current="page"' : '') + '>' + t[1] + '</a>'; }).join('') + '</nav>';
  }
  function bindHead() {
    var m = document.getElementById('mgr');
    if (m) m.addEventListener('click', function () { state.manager = !state.manager; render(); if (state.manager) toast('Mode gestionnaire activé : chaque direction tient ses fiches à jour.'); });
    var s = document.getElementById('mgrDir');
    if (s) s.addEventListener('change', function () { state.managedDir = s.value; render(); });
  }

  /* ---------- Recherche ---------- */
  function personCard(a, toks) {
    var proj = a.projets.map(function (p) { return '<span class="chip proj">' + hl(projById[p].nom, toks) + '</span>'; }).join('');
    var kw = a.kw.slice(0, 4).map(function (k) { return '<span class="chip kw">' + hl(k, toks) + '</span>'; }).join('');
    return '<button type="button" class="card person" data-agent="' + a.id + '">' + avatar(a) +
      '<span class="who"><span class="name">' + hl(full(a), toks) + '</span><span class="role">' + hl(a.poste, toks) + '</span>' +
      '<span class="path">' + hl(shortPath(a), toks) + '</span>' + (kw || proj ? '<span class="chips">' + proj + kw + '</span>' : '') + '</span></button>';
  }
  function viewSearch() {
    setTab(true);
    var r = search(state.q, { dir: state.dir, proj: state.proj });
    var hasQ = r.toks.length || state.dir || state.proj;
    var list = hasQ ? r.list : A.filter(function (a) { return N[a.node].head === a.id && N[a.node].type === 'direction'; });
    var sugg = ['mécénat', 'tournage', 'chauffage', 'crèche', 'Tourcoing Plage', 'marchés publics', 'GLPI', 'subventions associations'];
    var dirOpts = '<option value="">Toutes les directions</option>' + dirs.slice().sort(function (a, b) { return N[a].nom.localeCompare(N[b].nom); }).map(function (d) { return '<option value="' + d + '"' + (d === state.dir ? ' selected' : '') + '>' + esc(N[d].nom) + '</option>'; }).join('');
    var svc = matchingServices(r.toks);
    app.innerHTML = moduleHead('annuaire') +
      '<form class="searchbox" id="sf" role="search"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
        '<label class="sr" for="q">Rechercher un agent, un métier, une mission, un projet</label><input id="q" type="search" autocomplete="off" placeholder="Un nom, un métier, une mission, un projet…" value="' + esc(state.q) + '"><button class="btn" type="submit">Rechercher</button></form>' +
      '<p class="hint">Essayez : </p><div class="chips" style="margin-top:.4rem">' + sugg.map(function (s) { return '<button type="button" class="chip" data-q="' + esc(s) + '">' + esc(s) + '</button>'; }).join('') + '</div>' +
      '<div class="search-layout"><aside class="card filters" aria-label="Filtres">' +
        '<div><h3><label for="fd">Direction</label></h3><select id="fd">' + dirOpts + '</select></div>' +
        '<div><h3>Projet</h3><div class="chips" style="margin-top:.5rem">' + P.map(function (p) { return '<button type="button" class="chip' + (state.proj === p.id ? ' on' : '') + '" data-proj="' + p.id + '" aria-pressed="' + (state.proj === p.id) + '">' + esc(p.nom) + '</button>'; }).join('') + '</div></div>' +
        (hasQ ? '<button type="button" class="btn ghost small" id="reset">Effacer la recherche</button>' : '') +
      '</aside><section aria-live="polite">' +
        '<div class="results-head">' + (hasQ ? '<p><b>' + list.length + '</b> agent' + (list.length > 1 ? 's' : '') + ' trouvé' + (list.length > 1 ? 's' : '') + '</p>' : '<p><b>Les directrices et directeurs</b> de la ville</p>') + '</div>' +
        (svc.length ? '<div class="svc-hits">' + svc.map(function (k) { return '<button type="button" class="svc-hit" data-node="' + k + '"><b>' + hl(N[k].nom, r.toks) + '</b><span>' + (N[k].type === 'service' ? 'Service · ' + esc(N[N[k].parent].nom) : 'Direction') + ' · ' + counts[k] + ' agents · voir dans l’organigramme</span></button>'; }).join('') + '</div>' : '') +
        (list.length ? '<div class="list">' + list.slice(0, state.limit).map(function (a) { return personCard(a, r.toks); }).join('') + '</div>' +
          (list.length > state.limit ? '<button type="button" class="btn ghost more" id="more">Afficher plus (' + (list.length - state.limit) + ')</button>' : '')
          : '<div class="card empty"><b>Aucun agent ne correspond</b><p class="muted">Essayez un mot plus court ou retirez un filtre.</p></div>') +
      '</section></div>';
    bindHead();
    var q = document.getElementById('q');
    document.getElementById('sf').addEventListener('submit', function (e) { e.preventDefault(); state.q = q.value; state.limit = 30; render(); });
    q.addEventListener('input', function () { clearTimeout(typeTimer); typeTimer = setTimeout(function () {
      if (!document.getElementById('q') || (location.hash || '#accueil') !== '#annuaire') return;
      state.q = q.value; state.limit = 30; render(); var nq = document.getElementById('q'); if (nq) { nq.focus(); nq.setSelectionRange(nq.value.length, nq.value.length); } }, 220); });
    document.getElementById('fd').addEventListener('change', function (e) { state.dir = e.target.value; render(); });
    on('[data-q]', function (b) { state.q = b.dataset.q; state.limit = 30; render(); });
    on('[data-proj]', function (b) { state.proj = state.proj === b.dataset.proj ? '' : b.dataset.proj; render(); });
    on('[data-node]', function (b) { goOrg(b.dataset.node); });
    var rs = document.getElementById('reset'); if (rs) rs.addEventListener('click', function () { state.q = ''; state.dir = ''; state.proj = ''; render(); });
    var mo = document.getElementById('more'); if (mo) mo.addEventListener('click', function () { state.limit += 30; render(); });
    bindAgents();
  }
  function on(sel, fn) { Array.prototype.forEach.call(app.querySelectorAll(sel), function (el) { el.addEventListener('click', function () { fn(el); }); }); }
  function bindAgents(root) { Array.prototype.forEach.call((root || app).querySelectorAll('[data-agent]'), function (el) { el.addEventListener('click', function () { openAgent(el.dataset.agent); }); }); }

  /* ---------- Fiche agent ---------- */
  var lastFocus = null;
  function openAgent(id) {
    var a = byId[id]; if (!a) return;
    closeAgent(true);
    lastFocus = document.activeElement;
    var path = pathOf(a.node);
    var n = N[a.node];
    var boss = n.head && n.head !== a.id ? byId[n.head] : (n.parent && N[n.parent].head ? byId[N[n.parent].head] : null);
    var mates = A.filter(function (x) { return x.node === a.node && x.id !== a.id && (!boss || x.id !== boss.id); }).slice(0, 6);
    var editable = state.manager && dirOf(a.node) === state.managedDir;
    var scrim = document.createElement('div'); scrim.className = 'scrim'; scrim.id = 'scrim';
    var d = document.createElement('aside'); d.className = 'drawer'; d.id = 'drawer'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'agentName');
    d.innerHTML = '<div class="drawer-in">' +
      '<div class="drawer-top"><span class="eyebrow">Fiche agent</span><button type="button" class="icon-btn" id="close" aria-label="Fermer la fiche"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>' +
      '<div class="id">' + avatar(a) + '<div><h2 id="agentName">' + esc(full(a)) + '</h2><p>' + esc(a.poste) + '</p></div></div>' +
      '<div class="block"><h3>Position dans l’organigramme</h3><ol class="crumbs">' + path.map(function (pid, i) { return '<li>' + (i === path.length - 1 ? '<button type="button" class="here" data-org="' + pid + '">' + esc(label(N[pid])) + '</button>' : '<button type="button" data-org="' + pid + '">' + esc(label(N[pid])) + '</button>') + '</li>'; }).join('') + '</ol>' +
        '<button type="button" class="btn small" data-org-agent="' + a.id + '">Voir dans l’organigramme</button></div>' +
      '<div class="block"><h3>Coordonnées</h3><div class="contact">' +
        '<div><span>' + esc(a.mail) + '</span><button type="button" class="btn ghost small" data-copy="' + esc(a.mail) + '">Copier</button></div>' +
        '<div><span>' + esc(a.tel) + '</span></div><div><span>' + esc(a.lieu || '') + '</span></div></div></div>' +
      '<div class="block"><h3>Missions</h3><ul class="miss">' + a.missions.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="block"><h3>Mots-clés</h3><div class="chips">' + a.kw.map(function (k, i) { return '<span class="chip kw"><button type="button" data-kw="' + esc(k) + '" style="all:unset;cursor:pointer">' + esc(k) + '</button>' + (editable ? '<button type="button" class="x" data-rmkw="' + i + '" aria-label="Retirer ' + esc(k) + '">×</button>' : '') + '</span>'; }).join('') + '</div></div>' +
      '<div class="block"><h3>Projets</h3>' + (a.projets.length ? '<div class="chips">' + a.projets.map(function (p, i) { return '<span class="chip proj"><a href="#projet-' + p + '" style="color:inherit;text-decoration:none">' + esc(projById[p].nom) + '</a>' + (editable ? '<button type="button" class="x" data-rmproj="' + i + '" aria-label="Retirer le projet">×</button>' : '') + '</span>'; }).join('') + '</div>' : '<p class="muted">Aucun projet transversal renseigné.</p>') + '</div>' +
      (editable ? '<div class="edit"><b>Mettre à jour la fiche (mode gestionnaire)</b>' +
        '<form class="row" id="addKw"><label class="sr" for="nkw">Nouveau mot-clé</label><input id="nkw" placeholder="Ajouter un mot-clé (ex. tournages)"><button class="btn small orange" type="submit">Ajouter</button></form>' +
        '<form class="row" id="addProj"><label class="sr" for="nproj">Projet</label><select id="nproj">' + P.filter(function (p) { return a.projets.indexOf(p.id) === -1; }).map(function (p) { return '<option value="' + p.id + '">' + esc(p.nom) + '</option>'; }).join('') + '</select><button class="btn small orange" type="submit">Associer</button></form></div>'
        : (state.manager ? '<p class="muted" style="font-size:.9rem">Cet agent dépend d’une autre direction : seule sa direction peut modifier sa fiche.</p>' : '')) +
      (boss ? '<div class="block"><h3>Responsable</h3><div class="mini-list">' + mini(boss) + '</div></div>' : '') +
      (mates.length ? '<div class="block"><h3>Dans le même service</h3><div class="mini-list">' + mates.map(mini).join('') + '</div></div>' : '') +
      '</div>';
    document.body.appendChild(scrim); document.body.appendChild(d);
    document.body.style.overflow = 'hidden';
    scrim.addEventListener('click', function () { closeAgent(); });
    d.querySelector('#close').addEventListener('click', function () { closeAgent(); });
    d.querySelector('#close').focus();
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAgent(); });
    each(d, '[data-org]', function (b) { closeAgent(true); goOrg(b.dataset.org); });
    each(d, '[data-org-agent]', function (b) { closeAgent(true); goOrg(a.node, a.id); });
    each(d, '[data-kw]', function (b) { closeAgent(true); state.q = b.dataset.kw; state.dir = ''; state.proj = ''; go('annuaire'); });
    each(d, '[data-agent]', function (b) { openAgent(b.dataset.agent); });
    each(d, '[data-copy]', function (b) {
      var txt = b.dataset.copy;
      try { navigator.clipboard.writeText(txt).then(function () { toast('Adresse copiée.'); }, function () { toast(txt); }); } catch (err) { toast(txt); }
    });
    each(d, 'a[href^="#projet-"]', function (l) { closeAgent(true); });
    if (editable) {
      d.querySelector('#addKw').addEventListener('submit', function (e) { e.preventDefault(); var v = d.querySelector('#nkw').value.trim(); if (!v) return; a.kw.push(v); reindex(a); toast('Mot-clé « ' + v + ' » ajouté. Il est déjà trouvable dans la recherche.'); refreshBehind(); openAgent(a.id); });
      d.querySelector('#addProj').addEventListener('submit', function (e) { e.preventDefault(); var v = d.querySelector('#nproj').value; if (!v) return; a.projets.push(v); reindex(a); toast('Associé au projet « ' + projById[v].nom + ' ».'); refreshBehind(); openAgent(a.id); });
      each(d, '[data-rmkw]', function (b) { a.kw.splice(+b.dataset.rmkw, 1); reindex(a); refreshBehind(); openAgent(a.id); });
      each(d, '[data-rmproj]', function (b) { a.projets.splice(+b.dataset.rmproj, 1); reindex(a); refreshBehind(); openAgent(a.id); });
    }
  }
  function refreshBehind() { var y = window.scrollY; render(true); window.scrollTo(0, y); }
  function mini(a) { return '<button type="button" class="mini" data-agent="' + a.id + '">' + avatar(a) + '<span><b>' + esc(full(a)) + '</b><small>' + esc(a.poste) + '</small></span></button>'; }
  function each(root, sel, fn) { Array.prototype.forEach.call(root.querySelectorAll(sel), function (el) { el.addEventListener('click', function (e) { if (el.tagName !== 'A') e.preventDefault(); fn(el); }); }); }
  function closeAgent(silent) {
    var d = document.getElementById('drawer'), s = document.getElementById('scrim');
    if (d) d.remove(); if (s) s.remove(); document.body.style.overflow = '';
    if (!silent && lastFocus && document.contains(lastFocus)) lastFocus.focus();
    if (/^#agent-/.test(location.hash)) history.replaceState(null, '', '#' + state.lastView);
  }

  /* ---------- Organigramme ---------- */
  function goOrg(nodeId, agentId) {
    var p = pathOf(nodeId);
    if (N[nodeId].children.length && p.length < 2) p.push(N[nodeId].children[0]);
    state.orgPath = p; state.orgAgent = agentId || null;
    if (location.hash === '#organigramme') render(); else go('organigramme');
  }
  function viewOrg() {
    setTab(true);
    var path = state.orgPath, cur = path[path.length - 1];
    // Vue d'ensemble (haut de l'organigramme)
    var dgs = N.dgs, maire = N.maire;
    function box(id, extra) { var n = N[id]; var onp = path.indexOf(id) !== -1; return '<button type="button" class="ov-box' + (onp ? ' on' : '') + (extra || '') + '" data-ov="' + id + '">' + esc(label(n)) + '<small>' + counts[id] + ' agents</small></button>'; }
    var ov = '<div class="card overview" aria-label="Vue d’ensemble"><div class="ov-tree">' +
      '<div class="ov-row"><span class="ov-box root">Ville de Tourcoing<small>' + A.length + ' agents (fictifs)</small></span></div>' +
      '<div class="ov-row">' + box('maire') + box('dgs') + '</div>' +
      '<div class="ov-row">' + dgs.children.filter(function (c) { return N[c].type === 'dgas'; }).map(function (c) { return box(c); }).join('') + '</div>' +
      '<div class="ov-row">' + dgs.children.filter(function (c) { return N[c].type === 'direction'; }).map(function (c) { return box(c); }).join('') + maire.children.map(function (c) { return box(c); }).join('') + '</div>' +
      '</div></div>';
    // Colonnes
    var cols = '';
    for (var i = 0; i < path.length; i++) {
      var node = N[path[i]];
      var kids = node.children.slice();
      var members = A.filter(function (a) { return a.node === node.id; });
      if (!kids.length && !members.length) continue;
      var isCur = i === path.length - 1 || (i === path.length - 2 && !N[path[path.length - 1]].children.length && !A.some(function (a) { return a.node === path[path.length - 1]; }));
      var head = node.head ? byId[node.head] : null;
      var title = node.type === 'ville' ? 'Ville de Tourcoing' : label(node);
      var c = '<section class="card mcol' + (i === path.length - 1 ? ' cur' : '') + '" aria-label="' + esc(title) + '">' +
        (i > 0 ? '<button type="button" class="btn ghost small back" data-up="' + i + '">‹ Retour</button>' : '') +
        '<h3>' + esc(title) + '</h3>';
      if (head && node.type !== 'service') c += '<div class="head-card">' + (node.type === 'direction' ? 'Direction' : 'Pilotage') + ' : <b>' + esc(full(head)) + '</b><br>' + esc(head.poste) + '</div>';
      members.filter(function (a) { return node.type !== 'service' || true; }).forEach(function (a) {
        c += '<button type="button" class="mitem agent' + (a.id === state.orgAgent ? ' hl' : '') + '" data-agent="' + a.id + '">' + avatar(a) + '<span class="t">' + esc(full(a)) + '<br><small>' + esc(a.poste) + '</small></span></button>';
      });
      kids.forEach(function (k) {
        var kn = N[k];
        var sub = kn.type === 'service' ? counts[k] + ' ag.' : (kn.children.length + (kn.type === 'dgas' ? ' dir.' : ' serv.'));
        c += '<button type="button" class="mitem' + (path[i + 1] === k ? ' on' : '') + '" data-col="' + i + '" data-kid="' + k + '"><span class="t">' + esc(label(kn)) + '</span><small>' + sub + ' ›</small></button>';
      });
      cols += c + '</section>';
    }
    app.innerHTML = moduleHead('organigramme') + ov +
      '<ol class="crumbs org-crumbs">' + path.map(function (pid, i) { return '<li>' + (i === path.length - 1 ? '<span class="here">' + esc(N[pid].type === 'ville' ? 'Ville' : label(N[pid])) + '</span>' : '<button type="button" data-up="' + (i + 1) + '">' + esc(N[pid].type === 'ville' ? 'Ville' : label(N[pid])) + '</button>') + '</li>'; }).join('') + '</ol>' +
      '<div class="miller" id="miller">' + cols + '</div>' +
      '<p class="hint">Cliquez sur un pôle, une direction puis un service. Les agents de chaque niveau s’affichent avec leur poste ; un clic ouvre leur fiche.</p>';
    bindHead(); bindAgents();
    on('[data-kid]', function (b) { state.orgPath = path.slice(0, +b.dataset.col + 1).concat(b.dataset.kid); state.orgAgent = null; render(); scrollMiller(); });
    on('[data-up]', function (b) { state.orgPath = path.slice(0, Math.max(1, +b.dataset.up)); state.orgAgent = null; render(); });
    on('[data-ov]', function (b) { var id = b.dataset.ov; state.orgPath = pathOf(id); state.orgAgent = null; render(); scrollMiller(); });
    scrollMiller();
    if (state.orgAgent) { var el = app.querySelector('.mitem.hl'); if (el) el.scrollIntoView({ block: 'nearest' }); }
  }
  function scrollMiller() { var m = document.getElementById('miller'); if (m) m.scrollLeft = m.scrollWidth; }

  /* ---------- Projets ---------- */
  function members(pid) { return A.filter(function (a) { return a.projets.indexOf(pid) !== -1; }); }
  function groupByDir(list) { var g = {}; list.forEach(function (a) { var d = dirOf(a.node); (g[d] = g[d] || []).push(a); }); return g; }
  function spread(list) { var g = groupByDir(list); return '<div class="spread" aria-hidden="true">' + Object.keys(g).map(function (d) { return '<i style="flex:' + g[d].length + ';background:hsl(' + HUES[d] + ' 52% 48%)"></i>'; }).join('') + '</div>'; }
  function viewProjects() {
    setTab(true);
    app.innerHTML = moduleHead('projets') +
      '<p class="muted" style="margin-bottom:1rem;max-width:62ch">Chaque projet transversal a son tag. Associé aux fiches des agents par leur direction, il montre en un coup d’œil qui travaille ensemble, et dans quels services.</p>' +
      '<div class="proj-grid">' + P.map(function (p) {
        var m = members(p.id), g = groupByDir(m);
        return '<a class="card proj" href="#projet-' + p.id + '"><span class="eyebrow">#' + esc(p.nom) + '</span><h3>' + esc(p.nom) + '</h3><p>' + esc(p.desc) + '</p>' +
          '<div class="stats"><span><b>' + m.length + '</b> agents</span><span><b>' + Object.keys(g).length + '</b> directions</span></div>' + spread(m) +
          '<div class="facepile">' + m.slice(0, 8).map(function (a) { return avatar(a); }).join('') + '</div></a>';
      }).join('') + '</div>';
    bindHead();
  }
  function viewProject(pid) {
    setTab(true);
    var p = projById[pid]; if (!p) return go('projets');
    var m = members(pid), g = groupByDir(m), ref = byId[p.referent];
    app.innerHTML = moduleHead('projets') +
      '<p style="margin-bottom:.8rem"><a href="#projets">‹ Tous les projets</a></p>' +
      '<section class="card proj-head"><span class="eyebrow">Tag projet</span><h1>' + esc(p.nom) + '</h1><p style="max-width:65ch">' + esc(p.desc) + '</p>' +
        '<div class="stats"><span><b>' + m.length + '</b> agents</span><span><b>' + Object.keys(g).length + '</b> directions</span></div>' + spread(m) +
        (ref ? '<div><p class="eyebrow" style="color:var(--muted);margin-bottom:.35rem">Référent·e</p><div class="mini-list" style="max-width:24rem">' + mini(ref) + '</div></div>' : '') + '</section>' +
      '<div class="section-title"><h2>L’équipe, direction par direction</h2></div>' +
      '<div class="groups">' + Object.keys(g).map(function (d) {
        return '<section class="card group"><h3><i style="background:hsl(' + HUES[d] + ' 52% 48%)"></i>' + esc(N[d].nom) + '</h3><div class="mini-list">' + g[d].map(mini).join('') + '</div></section>';
      }).join('') + '</div>';
    bindHead(); bindAgents();
  }

  /* ---------- Avant / après ---------- */
  function viewBA() {
    setTab(true);
    var q = state.baQ, olds = oldSearch(q), r = search(q);
    var ex = byId[N['com-mec'].head];
    var sugg = ['mécénat', 'tournage', 'chauffage', 'Tourcoing Plage', ex.nom];
    app.innerHTML = moduleHead('avant-apres') +
      '<form class="searchbox" id="baf" role="search"><label class="sr" for="baq">Recherche comparée</label><input id="baq" type="search" autocomplete="off" value="' + esc(q) + '" placeholder="Tapez une recherche"><button class="btn" type="submit">Comparer</button></form>' +
      '<div class="chips" style="margin:.7rem 0 1.2rem">' + sugg.map(function (s) { return '<button type="button" class="chip" data-ba="' + esc(s) + '">' + esc(s) + '</button>'; }).join('') + '</div>' +
      '<div class="ba">' +
        '<section class="card ba-col old"><h2><span class="tag old">Aujourd’hui</span>Annuaire actuel</h2>' +
          '<p class="muted" style="font-size:.9rem">Recherche par nom ou prénom uniquement. Pas de poste, pas de missions, pas de rattachement visible.</p>' +
          '<div class="fake-input">Nom, prénom : ' + esc(q) + '</div>' +
          '<div><span class="big-' + (olds.length ? 'count' : 'zero') + '">' + olds.length + '</span> <span class="muted">résultat' + (olds.length > 1 ? 's' : '') + '</span></div>' +
          (olds.length ? olds.slice(0, 5).map(function (a) { return '<div class="oldrow"><span>' + esc(a.nom.toUpperCase() + ' ' + a.prenom) + '</span><span>' + esc(a.tel) + '</span></div>'; }).join('') : '<p class="muted">Pour trouver la bonne personne, il faut déjà connaître son nom.</p>') +
        '</section>' +
        '<section class="card ba-col"><h2><span class="tag new">Proposé</span>Annuaire-organigramme</h2>' +
          '<p class="muted" style="font-size:.9rem">Recherche dans les noms, postes, missions, mots-clés, services et projets.</p>' +
          '<div><span class="big-' + (r.list.length ? 'count' : 'zero') + '">' + r.list.length + '</span> <span class="muted">agent' + (r.list.length > 1 ? 's' : '') + ' trouvé' + (r.list.length > 1 ? 's' : '') + '</span></div>' +
          '<div class="list">' + r.list.slice(0, 4).map(function (a) { return personCard(a, r.toks); }).join('') + '</div>' +
          (r.list.length > 4 ? '<button type="button" class="btn ghost small" id="seeAll">Voir les ' + r.list.length + ' résultats</button>' : '') +
        '</section></div>';
    bindHead(); bindAgents();
    document.getElementById('baf').addEventListener('submit', function (e) { e.preventDefault(); state.baQ = document.getElementById('baq').value; render(); });
    on('[data-ba]', function (b) { state.baQ = b.dataset.ba; render(); });
    var sa = document.getElementById('seeAll'); if (sa) sa.addEventListener('click', function () { state.q = q; state.dir = ''; state.proj = ''; go('annuaire'); });
  }

  /* ---------- Cas d'usage ---------- */
  function viewCases() {
    setTab(true);
    var cases = [
      { t: 'Qui s’occupe du mécénat ?', q: 'Je découvre qu’il existe un service mécénat. J’ai peut-être perdu plein de temps à chercher moi-même, alors qu’il y a un pro là-dessus.', who: 'Agente d’une direction culturelle', act: 'search', v: 'mécénat', btn: 'Rechercher « mécénat »' },
      { t: 'Qui contacter pour un tournage dans la rue ?', q: 'Il faut déjà savoir exactement qui l’on veut contacter, connaître son nom, pour le trouver dans l’annuaire.', who: 'Responsable d’un équipement', act: 'search', v: 'tournage', btn: 'Rechercher « tournage »' },
      { t: 'Qui travaille sur Tourcoing Plage ?', q: 'La direction qui propose doit être motrice, porteuse et opérationnelle.', who: 'Directrice', act: 'proj', v: 'tourcoing-plage', btn: 'Voir l’équipe du projet' },
      { t: 'Le chauffage est en panne : qui suit le dossier ?', q: 'Une fois que la demande est envoyée, quelquefois il n’y a aucun retour.', who: 'Responsable d’un équipement', act: 'search', v: 'chauffage', btn: 'Rechercher « chauffage »' },
      { t: 'Mon interlocuteur a changé de direction', q: 'On est informé par un vague organigramme. Ce qui m’intéresse, c’est de savoir avec qui je vais travailler.', who: 'Chargée de projets', act: 'org', v: 'ejp-jeun', btn: 'Ouvrir l’organigramme' },
      { t: 'Chaque direction tient ses fiches à jour', q: 'Faire une interface dans le Canal où chaque direction intègre ses propres organigrammes et les tient à jour.', who: 'Directrice', act: 'mgr', v: 'drc', btn: 'Essayer le mode gestionnaire' }
    ];
    app.innerHTML = moduleHead('cas-usage') +
      '<p class="muted" style="margin-bottom:1rem;max-width:62ch">Six situations tirées des entretiens menés avec des agents de la ville en novembre 2026. Citations anonymisées.</p>' +
      '<div class="cases">' + cases.map(function (c, i) {
        return '<article class="card case"><span class="eyebrow">Cas ' + (i + 1) + '</span><h3>' + esc(c.t) + '</h3><blockquote>« ' + esc(c.q) + ' »<cite>' + esc(c.who) + '</cite></blockquote><button type="button" class="btn small" data-case="' + i + '">' + esc(c.btn) + '</button></article>';
      }).join('') + '</div>';
    bindHead();
    on('[data-case]', function (b) {
      var c = cases[+b.dataset.case];
      if (c.act === 'search') { state.q = c.v; state.dir = ''; state.proj = ''; go('annuaire'); }
      else if (c.act === 'proj') go('projet-' + c.v);
      else if (c.act === 'org') goOrg(c.v);
      else if (c.act === 'mgr') { state.manager = true; state.managedDir = c.v; state.q = ''; state.dir = c.v; go('annuaire'); toast('Mode gestionnaire : ouvrez la fiche d’un agent de la direction pour la modifier.'); }
    });
  }

  /* ---------- Routage ---------- */
  function go(h) { if (location.hash === '#' + h) render(); else location.hash = h; }
  var typeTimer = null;
  function render(keepDrawer) {
    clearTimeout(typeTimer);
    var h = location.hash.replace('#', '') || 'accueil';
    var agentMatch = /^agent-(a\d+)$/.exec(h);
    if (!keepDrawer) closeAgent(true);
    if (agentMatch) { h = state.lastView; }
    if (h === 'accueil') viewHome();
    else if (h === 'annuaire') viewSearch();
    else if (h === 'organigramme') viewOrg();
    else if (h === 'projets') viewProjects();
    else if (/^projet-/.test(h)) viewProject(h.slice(7));
    else if (h === 'avant-apres') viewBA();
    else if (h === 'cas-usage') viewCases();
    else viewHome();
    if (h !== 'accueil') state.lastView = h;
    if (agentMatch) openAgent(agentMatch[1]);
  }
  var prevHash = location.hash;
  window.addEventListener('hashchange', function () {
    var top = !/^#agent-/.test(location.hash);
    render();
    if (top && location.hash !== prevHash) window.scrollTo(0, 0);
    prevHash = location.hash;
  });
  render();
})();
