(() => {
  const $=(s,ctx=document)=>ctx.querySelector(s), $$=(s,ctx=document)=>[...ctx.querySelectorAll(s)];
  const body=document.body;
  requestAnimationFrame(()=>body.classList.add('is-ready'));

  // V3 site identity from assets/js/config.js.
  const cfg=window.PHOTO_ARCHIVE_CONFIG||{};
  if(cfg.siteName){
    document.title=document.title.replace('你的名字',cfg.siteName);
    $$('.brand').forEach(brand=>{
      const textNode=[...brand.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
      if(textNode) textNode.textContent=cfg.siteName+' ';
    });
    $$('[data-site-name]').forEach(el=>el.textContent=cfg.siteName);
  }
  if(cfg.siteSubtitle) $$('[data-site-subtitle]').forEach(el=>el.textContent=cfg.siteSubtitle);

  // Page transition for local HTML navigation, including links inserted from the archive API.
  document.addEventListener('click',e=>{
    const a=e.target.closest?.('a[data-transition]');
    if(!a||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target==='_blank') return;
    const href=a.getAttribute('href');
    if(!href||href.startsWith('#')||href.startsWith('mailto:')||href.startsWith('http')) return;
    e.preventDefault(); body.classList.add('is-leaving'); setTimeout(()=>location.href=href,260);
  });

  // Mobile navigation.
  const menuBtn=$('.mobile-menu-button');
  if(menuBtn){
    const closeMenu=()=>{body.classList.remove('menu-open');menuBtn.setAttribute('aria-expanded','false');menuBtn.textContent='菜单'};
    menuBtn.addEventListener('click',()=>{
      const open=!body.classList.contains('menu-open'); body.classList.toggle('menu-open',open);
      menuBtn.setAttribute('aria-expanded',String(open)); menuBtn.textContent=open?'关闭':'菜单';
    });
    $$('.mobile-menu a').forEach(a=>a.addEventListener('click',closeMenu));
    document.addEventListener('keydown',e=>{if(e.key==='Escape') closeMenu()});
  }

  // Reveal motion.
  const revealEls=$$('.reveal,.project-row');
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('is-visible');io.unobserve(entry.target)}
    }),{threshold:.11,rootMargin:'0px 0px -5%'});
    revealEls.forEach(el=>io.observe(el));
  } else revealEls.forEach(el=>el.classList.add('is-visible'));

  // Custom cursor for project links and index rows, including dynamically loaded archive items.
  const cursor=$('.cursor');
  if(cursor && matchMedia('(pointer:fine)').matches){
    document.addEventListener('pointermove',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px'});
    document.addEventListener('pointerover',e=>{if(e.target.closest?.('.project-card,.index-row')) cursor.classList.add('on')});
    document.addEventListener('pointerout',e=>{
      const from=e.target.closest?.('.project-card,.index-row');
      const to=e.relatedTarget?.closest?.('.project-card,.index-row');
      if(from && from!==to) cursor.classList.remove('on');
    });
  }

  // Homepage preview/index modes.
  const viewButtons=$$('.view-toggle button');
  if(viewButtons.length){
    const setMode=mode=>{
      const index=mode==='index'; body.classList.toggle('index-mode',index);
      viewButtons.forEach(btn=>btn.classList.toggle('active',btn.dataset.mode===mode));
    };
    viewButtons.forEach(btn=>btn.addEventListener('click',()=>setMode(btn.dataset.mode)));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&body.classList.contains('index-mode'))setMode('previews')});
    const preview=$('.index-preview'), previewImg=preview?.querySelector('img'), indexList=$('.index-list');
    indexList?.addEventListener('pointerover',e=>{
      const row=e.target.closest('.index-row');
      if(row&&preview&&previewImg){previewImg.src=row.dataset.img||'';preview.classList.toggle('show',Boolean(row.dataset.img))}
    });
    indexList?.addEventListener('pointerout',e=>{
      const row=e.target.closest('.index-row');
      if(row&&!row.contains(e.relatedTarget)) preview?.classList.remove('show');
    });
  }

  // Project template population.
  if(body.dataset.page==='project' && window.PROJECTS){
    const slug=new URLSearchParams(location.search).get('p')||'quiet-rooms';
    const p=window.PROJECTS[slug]||window.PROJECTS['quiet-rooms'];
    document.title=`${p.title} — ${cfg.siteName||'你的名字'}`;
    $$('[data-project-title]').forEach(el=>el.textContent=p.title);
    $$('[data-project-type]').forEach(el=>el.textContent=p.type);
    $$('[data-project-year]').forEach(el=>el.textContent=p.year);
    $$('[data-project-location]').forEach(el=>el.textContent=p.location);
    $$('[data-project-role]').forEach(el=>el.textContent=p.role);
    $$('[data-project-description]').forEach(el=>el.textContent=p.description);
    const hero=$('[data-project-hero]'); if(hero){hero.src=p.hero;hero.alt=p.title+' — 项目封面'}
    $$('[data-project-image]').forEach((img,i)=>{img.src=p.images[i%p.images.length];img.alt=`${p.title} — 图片 ${i+1}`});
    const next=$('[data-next-project]'); if(next){next.href=`project.html?p=${p.next.slug}`; $('[data-next-title]',next).textContent=p.next.title;}
  }

  // Project info drawer.
  const infoBtn=$('[data-info-open]'), infoClose=$('[data-info-close]');
  if(infoBtn){
    const close=()=>{body.classList.remove('info-open');infoBtn.setAttribute('aria-expanded','false')};
    infoBtn.addEventListener('click',()=>{body.classList.add('info-open');infoBtn.setAttribute('aria-expanded','true')});
    infoClose?.addEventListener('click',close);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  }

  // Contact copy email.
  const copyBtn=$('.copy-email');
  if(copyBtn){
    copyBtn.addEventListener('click',async()=>{
      const email=copyBtn.dataset.email; try{await navigator.clipboard.writeText(email)}catch{const t=document.createElement('textarea');t.value=email;document.body.append(t);t.select();document.execCommand('copy');t.remove()}
      const toast=$('.toast'); if(toast){toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1600)}
    });
  }
})();
