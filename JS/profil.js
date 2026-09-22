// =====================================================================
//  Page profil
//  profil.html           -> mon profil (avec pièces, inventaire, historique)
//  profil.html?id=12345  -> profil public d'un autre joueur (ID Discord)
// =====================================================================
import { supabase, connexionDiscord, getMonJoueur, SITE_ROOT } from './supabase.js';

const $ = (id) => document.getElementById(id);

// Protège contre l'injection de code quand on insère du texte venant de la base
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// Le joueur + ses cosmétiques équipés, en une seule requête
const SELECT_JOUEUR = `
  *,
  banner:items!players_banner_item_id_fkey(*),
  title:items!players_title_item_id_fkey(*),
  theme:items!players_theme_item_id_fkey(*)
`;

const COSMETIQUES = ['banner', 'title', 'theme'];
const LIBELLES = { banner: 'Bannière', title: 'Titre', theme: 'Thème', rp: 'Objet', wallpaper: 'Fond', access: 'Accès', other: 'Divers' };
const SOURCES  = { bot: 'En jeu', mj: 'MJ', boutique_jour: 'Boutique du jour', boutique_fun: 'Boutique fun' };


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

  afficherEntete(joueur);
  await afficherPerso(discordId);

  // Partie privée : seulement sur mon propre profil
  if (moi && moi.discord_id === discordId) {
    $('prive').hidden = false;
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
  if (j.theme?.payload?.accent) {
    document.documentElement.style.setProperty('--accent', j.theme.payload.accent);
  }
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

  // Le format de "data" est décidé par le bot : on affiche tout ce qu'il contient
  const lignes = Object.entries(perso.data || {})
    .map(([cle, val]) => `
      <div class="stat">
        <dt>${esc(cle)}</dt>
        <dd>${esc(typeof val === 'object' ? JSON.stringify(val) : val)}</dd>
      </div>`)
    .join('');

  zone.innerHTML = `
    <h3 class="perso__nom">${esc(perso.name)}</h3>
    ${lignes ? `<dl class="stats">${lignes}</dl>` : '<p class="vide">Fiche encore vide.</p>'}`;
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
  const { data: objets } = await supabase
    .from('inventory')
    .select('quantity, item:items(*)')
    .eq('discord_id', discordId)
    .order('acquired_at', { ascending: false });

  const zone = $('inventaire');

  if (!objets?.length) {
    zone.innerHTML = `<p class="vide">Ton inventaire est vide.</p>`;
    return;
  }

  const equipes = [joueur.banner_item_id, joueur.title_item_id, joueur.theme_item_id];

  zone.innerHTML = objets.map(({ quantity, item }) => {
    let action = '';
    if (COSMETIQUES.includes(item.kind)) {
      action = equipes.includes(item.id)
        ? `<span class="badge">Équipé</span>`
        : `<button type="button" class="btn-petit" data-equiper="${item.id}">Équiper</button>`;
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
}


async function afficherHistorique(discordId) {
  const { data: lignes } = await supabase
    .from('transactions')
    .select('*')
    .eq('discord_id', discordId)
    .order('created_at', { ascending: false })
    .limit(15);

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


// Bouton "Équiper" (un seul écouteur pour toute la liste)
$('inventaire').addEventListener('click', async (e) => {
  const bouton = e.target.closest('[data-equiper]');
  if (!bouton) return;

  bouton.disabled = true;
  const { error } = await supabase.rpc('equip_cosmetic', { p_item_id: Number(bouton.dataset.equiper) });

  if (error) {
    alert(error.message);
    bouton.disabled = false;
  } else {
    location.reload();
  }
});

init();
