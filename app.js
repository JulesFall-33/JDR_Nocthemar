// légères particules d'embrasement qui remontent — commun à toutes les pages
(function(){
  const canvas = document.getElementById('embers');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, dpr;
  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener('resize', resize);
  resize();

  const COLORS = ['200,60,50', '224,90,40', '160,40,40'];
  const COUNT = window.innerWidth < 700 ? 12 : 22;
  const particles = [];

  function spawn(p){
    p.x = Math.random() * w;
    p.y = h + Math.random() * 60;
    p.r = 0.6 + Math.random() * 1.4;
    p.speed = 0.25 + Math.random() * 0.55;
    p.drift = (Math.random() - 0.5) * 0.4;
    p.wobble = Math.random() * Math.PI * 2;
    p.wobbleSpeed = 0.01 + Math.random() * 0.02;
    p.life = 0;
    p.maxLife = h / p.speed * (0.85 + Math.random() * 0.3);
    p.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    p.baseAlpha = 0.16 + Math.random() * 0.22;
  }

  for(let i=0;i<COUNT;i++){
    const p = {};
    spawn(p);
    p.y = Math.random() * h;
    p.life = Math.random() * p.maxLife;
    particles.push(p);
  }

  function draw(){
    ctx.clearRect(0,0,w,h);
    for(const p of particles){
      p.life += 1;
      p.wobble += p.wobbleSpeed;
      p.y -= p.speed;
      p.x += p.drift + Math.sin(p.wobble) * 0.3;

      const lifeRatio = p.life / p.maxLife;
      let alpha = p.baseAlpha;
      if(lifeRatio < 0.12) alpha *= lifeRatio / 0.12;
      else if(lifeRatio > 0.75) alpha *= Math.max(0, 1 - (lifeRatio - 0.75) / 0.25);

      if(p.y < -20 || p.life >= p.maxLife){
        spawn(p);
        continue;
      }

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
      grad.addColorStop(0, `rgba(${p.color},${alpha})`);
      grad.addColorStop(1, `rgba(${p.color},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255,220,190,${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

// --- Recherche du Codex ---
(function(){
  const toggle = document.getElementById('searchToggle');
  const panel = document.getElementById('searchPanel');
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  if(!toggle || !panel || !input || !results) return;

  const PAGES = [
    {name:"Accueil", path:"index.html", tag:"Codex"},
    {name:"Pouvoirs", path:"categories/Pouvoirs.html", tag:"Catégorie"},
    {name:"Les Veines", path:"categories/Les_Veines.html", tag:"Pouvoirs"},
    {name:"Héritage de Sang", path:"categories/Héritage_de_sang.html", tag:"Pouvoirs",
      keywords:["Valcor","Aster","Draven","Morn","Elyr","Kaelis","Veyra","Sang du Géant","Sang Lunaire","Sang Draconique","Sang Funéraire","Sang Féerique","Sang d'Argent","Sang Sauvage"]},
    {name:"Combat", path:"categories/Combat.html", tag:"Catégorie"},
    {name:"Bestiaire", path:"categories/Bestiaire.html", tag:"Catégorie",
      keywords:["Mange-cœur","Goule","Géant des os","Ours caveur","Élan noir","Géant des Collines","Chacal rouge","Slime","Lombre","Élan","Lièvre des landes","Lueurine","Renard","Blaireau","Hérisson","Écureuil","Sanglier","Chevreuil","Cerf","Mouton","Chèvre","Vache","Cochon","Âne","Chat","Chien","Cheval","Wyverne","Aigle géant","Aigle royal","Corbeau","Cigogne","Héron","Canard","Moineau","Hirondelle","Chouette","Pie","Pigeon","Poulet","Oie","Megalodon","Dos-de-vase","Grenouille cloche","Dauphin","Phoque","Poisson","Méduse","Huître","Carpe","Truite","Anguille","Écrevisse","Tortue de rivière","Loutre","Mouches de charogne","Abeille","Papillon","Libellule","Coccinelle","Luciole","Escargot","Araignée","Ver de terre"]},
    {name:"Personnages", path:"categories/Personnages.html", tag:"Catégorie"},
    {name:"Équipement", path:"categories/Equipement.html", tag:"Catégorie"},
    {name:"Factions", path:"categories/Factions.html", tag:"Catégorie"},
    {name:"Lore", path:"categories/Lore.html", tag:"Catégorie"},
    {name:"Cartes", path:"categories/Cartes.html", tag:"Catégorie"},
    {name:"Commerce", path:"categories/Commerce.html", tag:"Catégorie"},
    {name:"Politique", path:"categories/Politique.html", tag:"Catégorie"},
    {name:"Religion", path:"categories/Religion.html", tag:"Catégorie"},
    {name:"Règles du JDR", path:"categories/Regles.html", tag:"Catégorie"},
    {name:"Sang", path:"Rang%20des%20Pouvoirs/Sang.html", tag:"Rang de Veine"},
    {name:"Trône", path:"Rang%20des%20Pouvoirs/Trone.html", tag:"Rang de Veine"},
    {name:"Regard", path:"Rang%20des%20Pouvoirs/Regard.html", tag:"Rang de Veine"},
    {name:"Rêve", path:"Rang%20des%20Pouvoirs/Reve.html", tag:"Rang de Veine"},
    {name:"Tombeau", path:"Rang%20des%20Pouvoirs/Tombeau.html", tag:"Rang de Veine"},
    {name:"Bête", path:"Rang%20des%20Pouvoirs/Bete.html", tag:"Rang de Veine"},
    {name:"Forge", path:"Rang%20des%20Pouvoirs/Forge.html", tag:"Rang de Veine"},
    {name:"Marée", path:"Rang%20des%20Pouvoirs/Maree.html", tag:"Rang de Veine"},
    {name:"Racine", path:"Rang%20des%20Pouvoirs/Racine.html", tag:"Rang de Veine"},
    {name:"Esprit", path:"Rang%20des%20Pouvoirs/Esprit.html", tag:"Rang de Veine"},
    {name:"Ombre", path:"Rang%20des%20Pouvoirs/Ombre.html", tag:"Rang de Veine"},
    {name:"Chaîne", path:"Rang%20des%20Pouvoirs/Chaine.html", tag:"Rang de Veine"},
    {name:"Dalek", path:"Personnages/Dalek.html", tag:"Personnage"},
    {name:"Kaéliss", path:"Personnages/Kaeliss.html", tag:"Personnage"},
    {name:"Seigneur des Marais", path:"Personnages/Seigneur_des_Marais.html", tag:"Personnage"},
    {name:"Monde", path:"Monde/Monde.html", tag:"Monde"}
  ];

  // Calcule le préfixe relatif (racine ou "../") selon la profondeur de la page courante
  const brandHref = (document.querySelector('.topbar .brand') || {}).getAttribute
    ? document.querySelector('.topbar .brand').getAttribute('href')
    : 'index.html';
  const base = (brandHref || 'index.html').replace(/index\.html$/, '');

  function norm(s){
    return s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  }

  let currentMatches = [];
  let selIndex = -1;

  function updateSel(){
    const items = results.querySelectorAll('.search-item');
    items.forEach((el, i) => el.classList.toggle('sel', i === selIndex));
    const selEl = items[selIndex];
    if(selEl) selEl.scrollIntoView({block:'nearest'});
  }

  function go(m){
    window.location.href = base + m.path;
  }

  function render(matches, query){
    currentMatches = matches;
    selIndex = matches.length ? 0 : -1;
    results.innerHTML = '';
    if(!query){
      results.innerHTML = '<div class="search-hint">Tapez le nom d’une Veine, d’un lieu, d’un personnage…</div>';
      return;
    }
    if(!matches.length){
      results.innerHTML = '<div class="search-empty">Aucun résultat pour « '+query+' ».</div>';
      return;
    }
    matches.forEach((m, i) => {
      const item = document.createElement('div');
      item.className = 'search-item' + (i === 0 ? ' sel' : '');
      const subtitle = m.matched ? m.tag + ' — ' + m.matched : m.tag;
      item.innerHTML = '<span class="sr-name">'+m.name+'</span><span class="sr-path">'+subtitle+'</span>';
      item.addEventListener('click', () => go(m));
      results.appendChild(item);
    });
  }

  function search(q){
    const nq = norm(q.trim());
    if(!nq){ render([], ''); return; }
    const matches = [];
    PAGES.forEach(p => {
      if(norm(p.name).includes(nq) || norm(p.tag).includes(nq)){
        matches.push(p);
        return;
      }
      const hit = (p.keywords || []).find(k => norm(k).includes(nq));
      if(hit) matches.push(Object.assign({}, p, {matched: hit}));
    });
    render(matches, q.trim());
  }

  function openPanel(){
    panel.classList.add('open');
    toggle.classList.add('active');
    render([], '');
    input.focus();
  }
  function closePanel(){
    panel.classList.remove('open');
    toggle.classList.remove('active');
    input.value = '';
  }

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if(panel.classList.contains('open')) closePanel();
    else openPanel();
  });

  input.addEventListener('input', () => search(input.value));

  input.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){ closePanel(); return; }
    if(!currentMatches.length) return;
    if(e.key === 'ArrowDown'){
      e.preventDefault();
      selIndex = (selIndex + 1) % currentMatches.length;
      updateSel();
    } else if(e.key === 'ArrowUp'){
      e.preventDefault();
      selIndex = (selIndex - 1 + currentMatches.length) % currentMatches.length;
      updateSel();
    } else if(e.key === 'Enter'){
      e.preventDefault();
      if(selIndex >= 0) go(currentMatches[selIndex]);
    }
  });

  document.addEventListener('click', (e) => {
    if(panel.classList.contains('open') && !panel.contains(e.target) && e.target !== toggle){
      closePanel();
    }
  });
})();

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

// --- Cartes de personnage : inclinaison 3D au survol, retournement au clic ---
(function(){
  document.querySelectorAll('.card-art-frame').forEach(frame => {
    const tilt = frame.querySelector('.card-tilt');
    const flip = frame.querySelector('.card-flip');
    if(!tilt || !flip) return;

    frame.addEventListener('mousemove', (e) => {
      const rect = frame.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rx = (0.5 - y) * 16;
      const ry = (x - 0.5) * 16;
      tilt.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    });

    frame.addEventListener('mouseleave', () => {
      tilt.style.transform = 'rotateX(0deg) rotateY(0deg)';
    });

    frame.addEventListener('click', () => {
      flip.classList.toggle('flipped');
    });
  });
})();
