// =====================================================================
//  Page boutique
//  - Boutique du jour : sélection qui change chaque jour, stock limité
//  - Boutique fun     : cosmétiques de profil, un exemplaire par joueur
//  Les achats passent par les fonctions SQL buy_daily_item / buy_fun_item :
//  le solde et le stock sont vérifiés côté serveur, impossible de tricher.
// =====================================================================
import { supabase, connexionDiscord, getMonJoueur, SITE_ROOT } from './supabase.js';

const $ = (id) => document.getElementById(id);

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const LIBELLES = { banner: 'Bannière', title: 'Titre', theme: 'Thème', rp: 'Objet', wallpaper: 'Fond', access: 'Accès', other: 'Divers' };

// Date du jour à l'heure de Paris, au format AAAA-MM-JJ (comme dans la base)
const aujourdhui = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });

let moi = null;          // ligne "players" du joueur connecté (ou null)
let solde = 0;
let possedes = new Set(); // ids des objets déjà possédés


async function init() {
  moi = await getMonJoueur();

  if (moi) {
    $('bourse').hidden = false;
    await Promise.all([chargerSolde(), chargerPossedes()]);
  } else {
    $('invite').hidden = false;
    $('btn-connexion').addEventListener('click', connexionDiscord);
  }

  await Promise.all([afficherBoutiqueDuJour(), afficherBoutiqueFun()]);
  demarrerCompteARebours();
}


async function chargerSolde() {
  const { data } = await supabase.from('wallets').select('balance').eq('discord_id', moi.discord_id).maybeSingle();
  solde = data?.balance ?? 0;
  $('solde').textContent = solde.toLocaleString('fr-FR');
}

async function chargerPossedes() {
  const { data } = await supabase.from('inventory').select('item_id').eq('discord_id', moi.discord_id);
  possedes = new Set((data ?? []).map((l) => l.item_id));
}


// ---------------------------------------------------------------------
// Boutique du jour
// ---------------------------------------------------------------------
async function afficherBoutiqueDuJour() {
  const { data: lignes, error } = await supabase
    .from('daily_shop')
    .select('price, stock, item:items(*)')
    .eq('day', aujourdhui())
    .order('price');

  const zone = $('jour');

  if (error) {
    zone.innerHTML = `<p class="vide">Impossible de charger la boutique du jour.</p>`;
    return;
  }
  if (!lignes?.length) {
    zone.innerHTML = `<p class="vide">Le marchand installe encore son étal… Reviens dans quelques minutes.</p>`;
    return;
  }

  zone.innerHTML = lignes.map(({ price, stock, item }) => {
    const epuise = stock <= 0;
    return `
      <article class="article${epuise ? ' article--epuise' : ''}">
        <span class="article__type">${esc(LIBELLES[item.kind] ?? item.kind)}</span>
        <h3 class="article__nom">${esc(item.name)}</h3>
        ${item.description ? `<p class="article__desc">${esc(item.description)}</p>` : ''}
        <div class="article__pied">
          <span class="article__prix">${price} <small>pièces</small></span>
          <span class="article__stock">${epuise ? 'Épuisé' : `${stock} en stock`}</span>
        </div>
        ${boutonAchat('jour', item.id, price, epuise ? 'Épuisé' : null)}
      </article>`;
  }).join('');
}


// ---------------------------------------------------------------------
// Boutique fun
// ---------------------------------------------------------------------
async function afficherBoutiqueFun() {
  const { data: items, error } = await supabase
    .from('items')
    .select('*')
    .eq('shop', 'fun')
    .eq('is_available', true)
    .order('price');

  const zone = $('fun');

  if (error) {
    zone.innerHTML = `<p class="vide">Impossible de charger la boutique.</p>`;
    return;
  }
  if (!items?.length) {
    zone.innerHTML = `<p class="vide">Rien à vendre pour l'instant.</p>`;
    return;
  }

  zone.innerHTML = items.map((item) => {
    const deja = possedes.has(item.id);
    return `
      <article class="article">
        ${apercu(item)}
        <span class="article__type">${esc(LIBELLES[item.kind] ?? item.kind)}</span>
        <h3 class="article__nom">${esc(item.name)}</h3>
        ${item.description ? `<p class="article__desc">${esc(item.description)}</p>` : ''}
        <div class="article__pied">
          <span class="article__prix">${item.price} <small>pièces</small></span>
        </div>
        ${boutonAchat('fun', item.id, item.price, deja ? 'Possédé' : null)}
      </article>`;
  }).join('');

  // Image de bannière introuvable -> on retire l'aperçu au lieu d'afficher une image cassée
  zone.querySelectorAll('.apercu img').forEach((img) => {
    img.addEventListener('error', () => img.parentElement.remove(), { once: true });
  });
}

// Petit aperçu visuel selon le type d'objet
function apercu(item) {
  const p = item.payload ?? {};
  if (item.kind === 'banner' && p.image) {
    return `<div class="apercu"><img src="${esc(new URL(p.image, SITE_ROOT))}" alt=""></div>`;
  }
  if (item.kind === 'theme' && p.accent) {
    return `<div class="apercu apercu--theme" style="--c:${esc(p.accent)}"></div>`;
  }
  if (item.kind === 'title' && p.text) {
    return `<div class="apercu apercu--titre">« ${esc(p.text)} »</div>`;
  }
  return '';
}


// ---------------------------------------------------------------------
// Bouton d'achat (même logique pour les deux boutiques)
// ---------------------------------------------------------------------
function boutonAchat(boutique, itemId, prix, bloque) {
  if (bloque) {
    return `<button type="button" class="btn-acheter" disabled>${bloque}</button>`;
  }
  if (!moi) {
    return `<button type="button" class="btn-acheter" disabled>Connecte-toi pour acheter</button>`;
  }
  if (solde < prix) {
    return `<button type="button" class="btn-acheter" disabled>Pas assez de pièces</button>`;
  }
  return `<button type="button" class="btn-acheter" data-boutique="${boutique}" data-item="${itemId}">Acheter</button>`;
}

document.addEventListener('click', async (e) => {
  const bouton = e.target.closest('.btn-acheter[data-item]');
  if (!bouton) return;

  const nom = bouton.closest('.article').querySelector('.article__nom').textContent;
  if (!confirm(`Acheter « ${nom} » ?`)) return;

  bouton.disabled = true;
  bouton.textContent = '…';

  const itemId = Number(bouton.dataset.item);
  const { data, error } = bouton.dataset.boutique === 'jour'
    ? await supabase.rpc('buy_daily_item', { p_item_id: itemId })
    : await supabase.rpc('buy_fun_item', { p_item_id: itemId });

  if (error) {
    notifier(error.message, 'erreur');
  } else {
    notifier(`${data.item} acheté pour ${data.price} pièces !`);
  }

  // On recharge tout pour afficher le nouveau solde, stock et état "Possédé"
  await Promise.all([chargerSolde(), chargerPossedes()]);
  await Promise.all([afficherBoutiqueDuJour(), afficherBoutiqueFun()]);
});


// ---------------------------------------------------------------------
// Petits utilitaires d'affichage
// ---------------------------------------------------------------------
let minuteurNotif;
function notifier(message, type = 'ok') {
  const n = $('notif');
  n.textContent = message;
  n.className = `notif notif--${type} notif--visible`;
  clearTimeout(minuteurNotif);
  minuteurNotif = setTimeout(() => n.classList.remove('notif--visible'), 4000);
}

// Temps restant avant minuit (heure de Paris)
function demarrerCompteARebours() {
  const el = $('rebours');
  const maj = () => {
    const [h, m, s] = new Date()
      .toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour12: false })
      .split(':').map(Number);
    const reste = 24 * 3600 - (h * 3600 + m * 60 + s);
    const hh = Math.floor(reste / 3600);
    const mm = Math.floor((reste % 3600) / 60);
    el.textContent = `Nouvelle sélection dans ${hh} h ${String(mm).padStart(2, '0')}`;
  };
  maj();
  setInterval(maj, 30_000);
}

init();
