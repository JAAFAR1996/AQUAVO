(function(){
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var items = Array.prototype.slice.call(document.querySelectorAll('.motion-item'));

    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach(function(el){ el.classList.add('is-in'); });
      return;
    }

    document.documentElement.classList.add('motion-ready');

    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting) return;
        var el = entry.target;
        var siblings = el.parentElement ? Array.prototype.filter.call(
          el.parentElement.children,
          function(x){ return x.classList && x.classList.contains('motion-item'); }
        ) : [];
        var idx = Math.max(0, siblings.indexOf(el));
        var delay = Math.min(idx * 55, 180);

        window.setTimeout(function(){
          el.classList.add('is-in');
        }, delay);

        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });

    items.forEach(function(el){ io.observe(el); });
  })();