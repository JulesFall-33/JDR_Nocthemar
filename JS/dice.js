// --- Dé à 20 faces (page d'accueil) ---
(function(){
  const die = document.getElementById('d20Die');
  const face = document.getElementById('d20Face');
  const result = document.getElementById('d20Result');
  if(!die || !face || !result) return;

  let rolling = false;

  die.addEventListener('click', () => {
    if(rolling) return;
    rolling = true;
    die.classList.add('rolling');
    result.classList.remove('crit', 'fumble');
    result.textContent = 'Le destin tranche…';

    let ticks = 0;
    const totalTicks = 14;
    const spin = setInterval(() => {
      face.textContent = 1 + Math.floor(Math.random() * 20);
      ticks++;
      if(ticks >= totalTicks){
        clearInterval(spin);
        const roll = 1 + Math.floor(Math.random() * 20);
        face.textContent = roll;
        die.classList.remove('rolling');
        rolling = false;
        if(roll === 20){
          result.textContent = '20 — Réussite critique !';
          result.classList.add('crit');
        } else if(roll === 1){
          result.textContent = '1 — Échec critique...';
          result.classList.add('fumble');
        } else {
          result.textContent = 'Résultat : ' + roll;
        }
      }
    }, 60);
  });
})();
