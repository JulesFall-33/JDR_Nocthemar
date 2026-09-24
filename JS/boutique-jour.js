// =====================================================================
//  Boutique du jour
//  La sélection (table daily_shop) est générée par le bot Discord :
//  ici on ne fait que l'afficher et appeler buy_daily_item.
//  Stock limité, vérifié côté serveur.
// =====================================================================
import { supabase } from './supabase.js';
import { $, esc, LIBELLES, apercu, masquerImagesCassees, boutonAchat } from './boutique-commun.js';

// Date du jour à l'heure de Paris, au format AAAA-MM-JJ (comme dans la base)
const aujourdhui = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });

export async function afficherBoutiqueDuJour() {
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

// Temps restant avant minuit (heure de Paris)
export function demarrerCompteARebours() {
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
