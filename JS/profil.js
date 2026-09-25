// =====================================================================
//  Page profil
//  profil.html           -> mon profil (avec pièces, inventaire, historique)
//  profil.html?id=12345  -> profil public d'un autre joueur (ID Discord)
// =====================================================================
import { supabase, connexionDiscord, getMonJoueur, SITE_ROOT } from './supabase.js';
import { $, esc, couleur, LIBELLES, SOURCES } from './commun.js';
import { chargerDeck, Deck, activerGlisser } from './cartes.js';

// Le joueur + ses cosmétiques équipés, en une seule requête
const SELECT_JOUEUR = `
  *,
  banner:items!players_banner_item_id_fkey(*),
  title:items!players_title_item_id_fkey(*),
  theme:items!players_theme_item_id_fkey(*)
`;

const COSMETIQUES = ['banner', 'title', 'theme'];


async function init() {
  const idVisite = new URLSearchParams(location.search).get('id');
  const moi = await getMonJoueur();
  const discordId = idVisite || moi?.discord_id;

  // Personne de connecté et pas de profil demandé
  if (!discordId) {
    $('chargement').hidden = true;
    $('non-connecte').hidden = false;
    $('btn-connexion').addEventListener('click', connexionDiscord);
    return;
  }

  const { data: joueur, error } = await supabase
    .from('players')
    .select(SELECT_JOUEUR)
    .eq('discord_id', discordId)
    .maybeSingle();

  if (error || !joueur) {
    $('chargement').textContent = 'Joueur introuvable.';
    return;
  }

  const estMoi = moi?.discord_id === discordId;

  afficherEntete(joueur);
  await Promise.all([afficherPerso(discordId), afficherDeck(discordId, estMoi)]);

  // Partie privée : seulement sur mon propre profil
  if (estMoi) {
    $('prive').hidden = false;
    $('bourse').hidden = false;
    await Promise.all([
      afficherSolde(discordId),
      afficherInventaire(discordId, joueur),
      afficherHistorique(discordId),
    ]);
  }

  $('chargement').hidden = true;
  $('profil').hidden = false;
}


function afficherEntete(j) {
  document.title = `${j.username ?? 'Joueur'} — Nocthémar`;
  $('pseudo').textContent = j.username ?? 'Joueur inconnu';
  $('titre').textContent = j.title?.payload?.text ?? '';

  if (j.avatar_url) $('avatar').src = j.avatar_url;
  else $('avatar').hidden = true;

  if (j.banner?.payload?.image) {
    $('banniere').style.backgroundImage = `url("${new URL(j.banner.payload.image, SITE_ROOT)}")`;
  }
  const accent = couleur(j.theme?.payload?.accent);
  if (accent) {
    document.documentElement.style.setProperty('--accent', accent);
    // Thème à une seule couleur : accent2 reprend accent
    document.documentElement.style.setProperty('--accent2', couleur(j.theme.payload.accent2) ?? accent);
  }
}


// Le format de "data" est décidé par le bot : ces listes servent juste à
// reconnaître les clés connues pour les mettre en valeur. Tout le reste
// (clés inconnues) s'affiche quand même, dans une zone générique en bas.
const CLE_CA = 'CA';
const CLES_JAUGES = ['PV', 'XP'];
const ATTRIBUTS = [
  ['AGI', 'Agilité'], ['FOR', 'Force'], ['CON', 'Constitution'],
  ['PER', 'Perception'], ['ESP', 'Esprit'], ['CHA', 'Charisme'],
];
const CLES_IDENTITE = ['RACE', 'GENRE', 'NIVEAU', 'VEINE'];
const LIBELLES_IDENTITE = { RACE: 'Race', GENRE: 'Genre', NIVEAU: 'Niveau', VEINE: 'Veine' };

// Enlève les accents pour comparer "RÊVE" et "REVE" sans se soucier de la casse
const normaliser = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();

const VIDE_RE = /^(—|-|vide|aucun[e]?|n\/a)$/i;

function analyserFraction(val) {
  const m = String(val).match(/^\s*(-?\d+(?:[.,]\d+)?)\s*\/\s*(-?\d+(?:[.,]\d+)?)\s*$/);
  if (!m) return null;
  const actuel = parseFloat(m[1].replace(',', '.'));
  const max = parseFloat(m[2].replace(',', '.'));
  return { actuel, max, pct: max > 0 ? Math.min(100, Math.max(0, (actuel / max) * 100)) : 0 };
}

async function afficherPerso(discordId) {
  const { data: perso } = await supabase
    .from('characters')
    .select('*')
    .eq('discord_id', discordId)
    .eq('is_active', true)
    .maybeSingle();

  const zone = $('perso');

  if (!perso) {
    zone.innerHTML = `<p class="vide">Aucun personnage actif pour l'instant. La fiche se crée sur Discord, avec le bot.</p>`;
    return;
  }

  const data = perso.data || {};
  const clesRestantes = new Set(Object.keys(data));
  const trouverCle = (nom) => {
    const cle = [...clesRestantes].find((c) => normaliser(c) === normaliser(nom));
    if (cle) clesRestantes.delete(cle);
    return cle;
  };

  // Sous-titre : Race · Genre · Niveau, seulement les infos présentes
  const sousTitre = ['RACE', 'GENRE', 'NIVEAU']
    .map((nom) => {
      const cle = [...clesRestantes].find((c) => normaliser(c) === nom) ?? Object.keys(data).find((c) => normaliser(c) === nom);
      const val = cle ? data[cle] : null;
      return val && !VIDE_RE.test(String(val)) ? (nom === 'NIVEAU' ? `Niveau ${esc(val)}` : esc(val)) : null;
    })
    .filter(Boolean)
    .join(' · ');

  // Jauges : CA en badge, PV/XP en barres si elles ont un format "x / y"
  let jaugesHtml = '';
  const cleCA = trouverCle(CLE_CA);
  if (cleCA) {
    jaugesHtml += `
      <div class="jauge jauge--badge jauge--ca">
        <span class="jauge__label">${esc(cleCA)}</span>
        <span class="jauge__valeur">${esc(data[cleCA])}</span>
      </div>`;
  }
  for (const nom of CLES_JAUGES) {
    const cle = trouverCle(nom);
    if (!cle) continue;
    const val = data[cle];
    const frac = analyserFraction(val);
    if (frac) {
      jaugesHtml += `
        <div class="jauge jauge--barre jauge--${nom.toLowerCase()}">
          <div class="jauge__tete">
            <span class="jauge__label">${esc(cle)}</span>
            <span class="jauge__valeur">${esc(val)}</span>
          </div>
          <div class="jauge__piste"><div class="jauge__remplissage" style="width:${frac.pct}%"></div></div>
        </div>`;
    } else {
      jaugesHtml += `
        <div class="jauge jauge--badge">
          <span class="jauge__label">${esc(cle)}</span>
          <span class="jauge__valeur">${esc(val)}</span>
        </div>`;
    }
  }

  // Attributs : toujours dans le même ordre, avec libellé complet en infobulle
  let attributsHtml = '';
  for (const [nom, libelle] of ATTRIBUTS) {
    const cle = trouverCle(nom);
    if (!cle) continue;
    const val = String(data[cle]);
    const signe = /^\s*-/.test(val) ? 'neg' : /^\s*\+?0+\s*$/.test(val) ? 'neutre' : 'pos';
    attributsHtml += `
      <div class="attribut attribut--${signe}" title="${esc(libelle)}">
        <span class="attribut__valeur">${esc(val)}</span>
        <span class="attribut__label">${esc(nom)}</span>
      </div>`;
  }

  // Identité : Veine (Race, Genre, Niveau sont déjà dans le sous-titre)
  let identiteHtml = '';
  for (const nom of ['VEINE']) {
    const cle = trouverCle(nom);
    if (!cle) continue;
    const val = data[cle];
    const estVide = VIDE_RE.test(String(val));
    identiteHtml += `
      <span class="chip${estVide ? ' chip--vide' : ''}">
        <span class="chip__label">${esc(LIBELLES_IDENTITE[nom])}</span>
        <span class="chip__valeur">${esc(val)}</span>
      </span>`;
  }
  // Retire aussi Race/Genre/Niveau du reliquat, même s'ils n'ont pas de chip dédiée,
  // ainsi qu'un éventuel ancien champ Héritage (l'Héritage de Sang n'existe plus dans l'univers)
  ['RACE', 'GENRE', 'NIVEAU', 'HERITAGE'].forEach(trouverCle);

  // Tout ce qui n'est pas reconnu ci-dessus : affiché tel quel, sans mise en forme spéciale.
  // Une valeur "Objet A, Objet B, Objet C" est éclatée en liste pour rester lisible.
  const autresHtml = [...clesRestantes]
    .map((cle) => {
      const val = data[cle];
      const elements = typeof val === 'string' ? val.split(',').map((v) => v.trim()).filter(Boolean) : [];
      const dd = elements.length > 1
        ? `<dd><ul class="stat__liste">${elements.map((el) => `<li>${esc(el)}</li>`).join('')}</ul></dd>`
        : `<dd>${esc(typeof val === 'object' ? JSON.stringify(val) : val)}</dd>`;
      return `
      <div class="stat">
        <dt>${esc(cle)}</dt>
        ${dd}
      </div>`;
    })
    .join('');

  zone.innerHTML = `
    <div class="perso__entete">
      <h3 class="perso__nom">${esc(perso.name)}</h3>
      ${sousTitre ? `<p class="perso__sous-titre">${sousTitre}</p>` : ''}
    </div>
    ${jaugesHtml ? `<div class="perso__jauges">${jaugesHtml}</div>` : ''}
    ${attributsHtml ? `<div class="perso__attributs">${attributsHtml}</div>` : ''}
    ${identiteHtml ? `<div class="perso__identite">${identiteHtml}</div>` : ''}
    ${autresHtml ? `<dl class="stats stats--autres">${autresHtml}</dl>` : ''}
    ${!jaugesHtml && !attributsHtml && !identiteHtml && !autresHtml ? '<p class="vide">Fiche encore vide.</p>' : ''}`;
}


// Deck de cartes : lecture seule pour les visiteurs ; sur mon profil,
// je peux le renommer, retirer des cartes et les réorganiser en les glissant.
async function afficherDeck(discordId, estMoi) {
  const { nom, ids, cartes } = await chargerDeck(discordId);
  const deck = new Deck($('deck'), { nom, ids, cartes, editable: estMoi, lienAjout: 'collection.html' });

  if (!estMoi) return;
  $('lien-collection').hidden = false;
  activerGlisser($('deck'), {
    poignee: '.deck-emplacement .carte-jeu',
    cible: '.deck-emplacement',
    deposer: (carte, cible) => deck.placer(Number(carte.dataset.carte), Number(cible.dataset.position)),
  });
}


async function afficherSolde(discordId) {
  const { data } = await supabase
    .from('wallets')
    .select('balance')
    .eq('discord_id', discordId)
    .maybeSingle();

  $('solde').textContent = (data?.balance ?? 0).toLocaleString('fr-FR');
}


async function afficherInventaire(discordId, joueur) {
  const { data } = await supabase
    .from('inventory')
    .select('quantity, item:items(*)')
    .eq('discord_id', discordId)
    .order('acquired_at', { ascending: false });

  // Les objets "rp" vivent déjà dans l'inventaire du personnage géré par le bot
  const objets = (data ?? []).filter(({ item }) => item.kind !== 'rp');

  const zone = $('inventaire');

  if (!objets.length) {
    zone.innerHTML = `<p class="vide">Aucun cosmétique pour l'instant.</p>`;
    return;
  }

  const equipes = [joueur.banner_item_id, joueur.title_item_id, joueur.theme_item_id];

  zone.innerHTML = objets.map(({ quantity, item }) => {
    let action = '';
    if (COSMETIQUES.includes(item.kind)) {
      action = equipes.includes(item.id)
        ? `<button type="button" class="btn-petit btn-petit--retirer" data-desequiper="${item.kind}">Retirer</button>`
        : `<button type="button" class="btn-petit btn-petit--equiper" data-equiper="${item.id}">Équiper</button>`;
    }
    return `
      <li class="objet">
        <div>
          <span class="objet__type">${esc(LIBELLES[item.kind] ?? item.kind)}</span>
          <strong>${esc(item.name)}</strong>${quantity > 1 ? ` <span class="objet__qte">×${quantity}</span>` : ''}
        </div>
        ${action}
      </li>`;
  }).join('');

  limiterHauteur(zone, 3);
}


// N'affiche que les `n` premiers éléments d'une liste, le reste est accessible en faisant défiler.
// ResizeObserver : la liste est encore cachée au premier rendu, on mesure dès qu'elle devient visible.
function limiterHauteur(liste, n) {
  new ResizeObserver(() => {
    const dernier = liste.children[n - 1];
    liste.style.maxHeight = liste.children.length > n
      ? `${dernier.offsetTop + dernier.offsetHeight}px`
      : '';
  }).observe(liste);
}


async function afficherHistorique(discordId) {
  const { data: lignes } = await supabase
    .from('transactions')
    .select('*')
    .eq('discord_id', discordId)
    .order('created_at', { ascending: false })
    .limit(3);

  const zone = $('historique');

  if (!lignes?.length) {
    zone.innerHTML = `<p class="vide">Aucune transaction pour l'instant.</p>`;
    return;
  }

  zone.innerHTML = lignes.map((t) => `
    <li class="transac">
      <div>
        <span>${esc(t.reason ?? SOURCES[t.source])}</span>
        <small>${new Date(t.created_at).toLocaleDateString('fr-FR')} · ${esc(SOURCES[t.source] ?? t.source)}</small>
      </div>
      <strong class="${t.amount >= 0 ? 'gain' : 'perte'}">${t.amount >= 0 ? '+' : ''}${t.amount}</strong>
    </li>`).join('');
}


// Boutons "Équiper" / "Retirer" (un seul écouteur pour toute la liste)
$('inventaire').addEventListener('click', async (e) => {
  const bouton = e.target.closest('[data-equiper], [data-desequiper]');
  if (!bouton || bouton.disabled) return;

  bouton.disabled = true;
  const { error } = bouton.dataset.equiper
    ? await supabase.rpc('equip_cosmetic', { p_item_id: Number(bouton.dataset.equiper) })
    : await supabase.rpc('unequip_cosmetic', { p_kind: bouton.dataset.desequiper });

  if (error) {
    alert(error.message);
    bouton.disabled = false;
  } else {
    location.reload();
  }
});

init();
