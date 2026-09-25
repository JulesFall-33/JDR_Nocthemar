// =====================================================================
//  Boutique — code partagé entre la boutique du marchand et celle du profil
//  (état du joueur connecté, rendu d'une carte d'article, bouton d'achat).
// =====================================================================
import { supabase, SITE_ROOT } from './supabase.js';
import { $, esc, couleur } from './commun.js';

export { $, esc, LIBELLES, notifier } from './commun.js';

// État du joueur, lu par les deux boutiques
export const etat = {
  moi: null,             // ligne "players" du joueur connecté (ou null)
  solde: 0,
  possedes: new Set(),   // ids des objets déjà possédés
};


export async function chargerSolde() {
  const { data } = await supabase.from('wallets').select('balance').eq('discord_id', etat.moi.discord_id).maybeSingle();
  etat.solde = data?.balance ?? 0;
  $('solde').textContent = etat.solde.toLocaleString('fr-FR');
}

export async function chargerPossedes() {
  const { data } = await supabase.from('inventory').select('item_id').eq('discord_id', etat.moi.discord_id);
  etat.possedes = new Set((data ?? []).map((l) => l.item_id));
}


// Petit aperçu visuel selon le type d'objet
export function apercu(item) {
  const p = item.payload ?? {};
  if (item.kind === 'banner' && p.image) {
    return `<div class="apercu"><img src="${esc(new URL(p.image, SITE_ROOT))}" alt=""></div>`;
  }
  if (item.kind === 'theme' && couleur(p.accent)) {
    const c2 = couleur(p.accent2);
    return `<div class="apercu apercu--theme" style="--c:${p.accent}${c2 ? `;--c2:${c2}` : ''}"></div>`;
  }
  if (item.kind === 'title' && p.text) {
    return `<div class="apercu apercu--titre">« ${esc(p.text)} »</div>`;
  }
  // Tous les autres objets (potions, jetons…) peuvent avoir une petite icône (ex : emoji Discord)
  if (item.kind !== 'banner' && p.image) {
    return `<img class="article__icone" src="${esc(new URL(p.image, SITE_ROOT))}" alt="">`;
  }
  return '';
}

// Image d'aperçu ou icône introuvable -> on la retire au lieu d'afficher une image cassée
export function masquerImagesCassees(zone) {
  zone.querySelectorAll('.apercu img').forEach((img) => {
    img.addEventListener('error', () => img.parentElement.remove(), { once: true });
  });
  zone.querySelectorAll('.article__icone').forEach((img) => {
    img.addEventListener('error', () => img.remove(), { once: true });
  });
}


// Bouton d'achat (même logique pour les deux boutiques)
export function boutonAchat(boutique, itemId, prix, bloque) {
  if (bloque) {
    return `<button type="button" class="btn-acheter" disabled>${bloque}</button>`;
  }
  if (!etat.moi) {
    return `<button type="button" class="btn-acheter" disabled>Connecte-toi pour acheter</button>`;
  }
  if (etat.solde < prix) {
    return `<button type="button" class="btn-acheter" disabled>Pas assez de pièces</button>`;
  }
  return `<button type="button" class="btn-acheter" data-boutique="${boutique}" data-item="${itemId}">Acheter</button>`;
}

