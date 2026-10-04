  document.getElementById('year').textContent = new Date().getFullYear();

(function(){
  var btn = document.getElementById('menuToggle');
  var panel = document.getElementById('mobileNav');
  if (!btn || !panel) return;

  function closeMenu(){
    btn.setAttribute('aria-expanded', 'false');
    panel.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  function openMenu(){
    btn.setAttribute('aria-expanded', 'true');
    panel.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  btn.addEventListener('click', function(){
    var isOpen = btn.getAttribute('aria-expanded') === 'true';
    if (isOpen) closeMenu(); else openMenu();
  });
  panel.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', closeMenu);
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') closeMenu();
  });
})();
