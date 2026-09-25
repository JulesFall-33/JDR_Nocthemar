// =====================================================================
//  Pages des personnages : écrit les informations de la carte (nom, rang,
//  attaques, rareté) dans le cadre noir de l'illustration.
//  Les données viennent du catalogue Supabase (table cards), retrouvées par
//  le nom indiqué dans data-carte-nom, ex :
//    <div class="card-face card-face-front carte-infos-hote" data-carte-nom="Kaéliss">
// =====================================================================
import { supabase } from './supabase.js';
import { htmlInfos } from './cartes.js';

for (const face of document.querySelectorAll('[data-carte-nom]')) {
  const { data: carte } = await supabase
    .from('cards')
    .select('*')
    .eq('name', face.dataset.carteNom)
    .maybeSingle();

  if (carte) face.insertAdjacentHTML('beforeend', htmlInfos(carte));
}
