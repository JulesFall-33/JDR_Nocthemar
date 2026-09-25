// =====================================================================
//  Boutique du marchand
//  La sélection (table daily_shop) est générée par le bot Discord et
//  renouvelée toutes les 5 h : ici on ne fait que l'afficher et appeler
//  buy_daily_item. Stock limité, vérifié côté serveur.
// =====================================================================
import { supabase } from './supabase.js';
import { $, esc, LIBELLES, apercu, masquerImagesCassees, boutonAchat } from './boutique-commun.js';

export async function afficherBoutiqueDuJour() {
  const zone = $('jour');

  // Début du créneau de 5 h en cours, calculé par la base
  const { data: slot, error: erreurSlot } = await supabase.rpc('current_shop_slot');
  if (erreurSlot || !slot) {
    zone.innerHTML = `<p class="vide">Impossible de charger la boutique du marchand.</p>`;
    return;
  }

  const { data: lignes, error } = await supabase
    .from('daily_shop')
    .select('price, stock, item:items(*)')
    .eq('slot', slot)
    .order('price');

  if (error) {
    zone.innerHTML = `<p class="vide">Impossible de charger la boutique du marchand.</p>`;
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
        ${apercu(item)}
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

  masquerImagesCassees(zone);
}

export function acheterDuJour(itemId) {
  return supabase.rpc('buy_daily_item', { p_item_id: itemId });
}

// Temps restant avant le prochain renouvellement (next_shop_refresh, calculé par la base)
const DELAI_APRES_RENOUVELLEMENT = 5_000; // laisse au bot le temps d'écrire la nouvelle sélection
let minuteurRebours;

export async function demarrerCompteARebours() {
  const el = $('rebours');
  clearInterval(minuteurRebours);

  const { data, error } = await supabase.rpc('next_shop_refresh');
  if (error || !data) {
    el.textContent = '';
    return;
  }
  const prochain = new Date(data);

  // L'heure vient de Supabase en UTC : on l'affiche en heure de Paris (infobulle)
  el.title = `Renouvellement à ${prochain.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })} (heure de Paris)`;

  const maj = () => {
    const reste = Math.max(0, Math.floor((prochain - Date.now()) / 1000));
    const hh = Math.floor(reste / 3600);
    const mm = Math.floor((reste % 3600) / 60);
    const ss = reste % 60;
    el.textContent = `Prochain renouvellement dans ${hh} h ${String(mm).padStart(2, '0')} min ${String(ss).padStart(2, '0')} s`;

    if (reste === 0) {
      clearInterval(minuteurRebours);
      el.textContent = 'Le marchand renouvelle son étal…';
      setTimeout(async () => {
        await afficherBoutiqueDuJour();
        demarrerCompteARebours();
      }, DELAI_APRES_RENOUVELLEMENT);
    }
  };
  maj();
  minuteurRebours = setInterval(maj, 1_000);
}
