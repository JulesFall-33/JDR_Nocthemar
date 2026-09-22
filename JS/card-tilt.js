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
