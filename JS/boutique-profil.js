// =====================================================================
//  Boutique du profil
//  Cosmétiques de profil (items.shop = 'fun'), gérés par le site :
//  un exemplaire par joueur, achat via buy_fun_item.
// =====================================================================
import { supabase } from './supabase.js';
import { $, esc, LIBELLES, etat, apercu, masquerImagesCassees, boutonAchat } from './boutique-commun.js';

export async function afficherBoutiqueProfil() {
  const { data: items, error } = await supabase
    .from('items')
    .select('*')
    .eq('shop', 'fun')
    .eq('is_available', true)
    .order('price');

  const zone = $('profil');

  if (error) {
    zone.innerHTML = `<p class="vide">Impossible de charger la boutique.</p>`;
    return;
  }
  if (!items?.length) {
    zone.innerHTML = `<p class="vide">Rien à vendre pour l'instant.</p>`;
    return;
  }

  zone.innerHTML = items.map((item) => {
    const deja = etat.possedes.has(item.id);
    return `
      <article class="article">
        ${apercu(item)}
        <span class="article__type">${esc(LIBELLES[item.kind] ?? item.kind)}</span>
        <h3 class="article__nom">${esc(item.name)}</h3>
        ${item.description ? `<p class="article__desc">${esc(item.description)}</p>` : ''}
        <div class="article__pied">
          <span class="article__prix">${item.price} <small>pièces</small></span>
        </div>
        ${boutonAchat('profil', item.id, item.price, deja ? 'Possédé' : null)}
      </article>`;
  }).join('');

  masquerImagesCassees(zone);
}

export function acheterProfil(itemId) {
  return supabase.rpc('buy_fun_item', { p_item_id: itemId });
}
