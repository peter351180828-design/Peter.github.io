(() => {
  const A = window.PhotoArchive;
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];
  const page = document.body.dataset.page;
  const escapeHtml = A?.escapeHtml || (s => String(s || ''));

  function showConfigNotice(target) {
    if (!target || A?.configured) return;
    target.innerHTML = '<div class="setup-notice"><strong>网站还没有连接 Supabase。</strong><span>按照《零基础部署说明》完成 Project URL 与 Publishable key 两项配置后，这里会自动读取你的照片。</span></div>';
  }

  function dateLabel(value) {
    if (!value) return '日期未知';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '日期未知';
    return new Intl.DateTimeFormat('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit' }).format(d);
  }

  function exifItems(photo) {
    const e = photo.exif || {}, f = photo.formatted || {};
    return [['设备', e.camera], ['镜头', e.lens], ['焦段', f.focalLength], ['光圈', f.aperture], ['快门', f.shutter], ['ISO', f.iso?.replace('ISO ', '')], ['曝光', f.compensation]]
      .filter(([, value]) => value != null && value !== '');
  }

  function exifRail(photo, index) {
    const items = exifItems(photo);
    const shotDate = photo.exif?.dateTaken ? dateLabel(photo.exif.dateTaken) : null;
    if (!items.length && !shotDate) return `<figcaption class="exif-rail"><span class="exif-index">${String(index + 1).padStart(2,'0')}</span><span class="exif-missing">无可读 EXIF</span></figcaption>`;
    return `<figcaption class="exif-rail"><span class="exif-index">${String(index + 1).padStart(2,'0')}</span>${items.map(([l,v]) => `<span class="exif-pair"><small>${escapeHtml(l)}</small><b>${escapeHtml(v)}</b></span>`).join('')}${shotDate ? `<span class="exif-pair exif-date"><small>拍摄</small><b>${escapeHtml(shotDate)}</b></span>` : ''}</figcaption>`;
  }

  function photoBlock(photo, index) {
    const variants = ['archive-photo-full','archive-photo-inset','archive-photo-portrait','archive-photo-wide','archive-photo-offset'];
    return `<figure class="archive-photo-block ${variants[index % variants.length]} reveal"><div class="archive-photo-layout"><div class="archive-photo-media"><img loading="lazy" src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.title || photo.project || '摄影作品')}"></div>${exifRail(photo,index)}</div>${photo.note ? `<p class="archive-photo-note">${escapeHtml(photo.note)}</p>` : ''}</figure>`;
  }

  function activateReveals(root = document) {
    const els = $$('.reveal:not(.is-visible)', root);
    if (!('IntersectionObserver' in window)) return els.forEach(el => el.classList.add('is-visible'));
    const io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
    }), { threshold:.08, rootMargin:'0px 0px -4%' });
    els.forEach(el => io.observe(el));
  }

  async function safePhotos(options = {}) {
    if (!A?.configured) return null;
    try { return await A.fetchPhotos(options); }
    catch (error) { console.error(error); return null; }
  }

  async function updateGlobalCount() {
    const els = $$('[data-photo-count]');
    if (!els.length) return;
    if (!A?.configured) return els.forEach(el => el.textContent = '档案未连接');
    const photos = await safePhotos();
    els.forEach(el => el.textContent = photos ? `档案 ${photos.length}` : '档案读取失败');
  }

  async function initHome() {
    const holder = $('[data-dynamic-project-grid]');
    if (!holder) return;
    if (!A?.configured) return;
    const photos = await safePhotos();
    if (!photos?.length) return;
    const projects = A.groupProjects(photos);
    $('#demo-projects')?.setAttribute('hidden','');
    $('#personal-projects')?.removeAttribute('hidden');
    $('#personal-projects-count').textContent = `${projects.length} 个系列 / ${photos.length} 张`;
    const rowClasses = ['row-a','row-b','row-c','row-d'];
    let html = '';
    for (let i = 0; i < projects.length; i += 2) {
      html += `<div class="project-row ${rowClasses[(i/2)%rowClasses.length]}">`;
      projects.slice(i,i+2).forEach((project, idx) => {
        const cover = project.cover;
        const ratio = cover?.exif?.width && cover?.exif?.height && cover.exif.height > cover.exif.width ? 'ratio-tall' : (idx ? 'ratio-cinema' : 'ratio-wide');
        html += `<a class="project-card" data-transition ${idx ? 'style="--offset:3vw"' : ''} href="project.html?collection=${encodeURIComponent(project.name)}"><div class="media ${ratio}"><img src="${escapeHtml(cover.url)}" alt="${escapeHtml(project.name)}"></div><div class="project-meta"><span>${escapeHtml(project.name)}</span><span>${project.count} 张${project.year ? ` / ${escapeHtml(project.year)}` : ''}</span></div></a>`;
      });
      html += '</div>';
    }
    holder.innerHTML = html;
    const list = $('[data-dynamic-index-list]');
    if (list) list.innerHTML = projects.map((project,i) => `<a class="index-row" data-transition href="project.html?collection=${encodeURIComponent(project.name)}" data-img="${escapeHtml(project.cover.url)}"><span>${String(i+1).padStart(2,'0')}</span><span>${escapeHtml(project.name)}</span><span>${project.count} 张</span><span>${escapeHtml(project.year || '—')}</span></a>`).join('');
    activateReveals(holder);
  }

  async function initPersonalProject() {
    if (page !== 'project') return;
    const collection = new URLSearchParams(location.search).get('collection');
    if (!collection) return;
    const photos = await safePhotos({project:collection, sort:'oldest'});
    if (!photos?.length) return;
    const years = photos.map(p => new Date(p.exif?.dateTaken || p.uploadedAt)).filter(d => !Number.isNaN(d.getTime())).map(d => d.getFullYear());
    const year = years.length ? (Math.min(...years) === Math.max(...years) ? String(years[0]) : `${Math.min(...years)}—${Math.max(...years)}`) : '—';
    const description = `${photos.length} 张照片。按拍摄时间排列，设备与曝光参数保留在每张照片旁边。`;
    document.title = `${collection} — ${A.config.siteName || '摄影档案'}`;
    $$('[data-project-title]').forEach(el => el.textContent = collection);
    $$('[data-project-type]').forEach(el => el.textContent = '个人系列');
    $$('[data-project-year]').forEach(el => el.textContent = year);
    $$('[data-project-description]').forEach(el => el.textContent = description);
    $$('[data-project-role]').forEach(el => el.textContent = '摄影 / 个人档案');
    $$('[data-project-location]').forEach(el => el.textContent = 'EXIF 与个人备注');
    const hero = $('[data-project-hero]');
    if (hero) { hero.src = photos[0].url; hero.alt = `${collection} — 封面`; }
    $('#demo-project-story')?.setAttribute('hidden','');
    const story = $('#personal-project-story');
    story.removeAttribute('hidden');
    story.innerHTML = photos.map(photoBlock).join('') + `<section class="project-notes reveal"><h2>系列信息</h2><p>${escapeHtml(description)}</p><dl class="project-credits"><dt>照片</dt><dd>${photos.length} 张</dd><dt>年份</dt><dd>${escapeHtml(year)}</dd><dt>用途</dt><dd>个人回忆 / 摄影档案</dd></dl></section>`;
    const all = await safePhotos();
    const projects = all ? A.groupProjects(all) : [];
    const here = projects.findIndex(p => p.name === collection);
    const next = projects.length > 1 ? projects[(here + 1) % projects.length] : null;
    const link = $('[data-next-project]');
    if (next && link) { link.href = `project.html?collection=${encodeURIComponent(next.name)}`; $('[data-next-title]',link).textContent = next.name; }
    else if (link) { link.href = 'archive.html'; $('[data-next-title]',link).textContent = '全部档案'; }
    activateReveals(story);
  }

  function archiveCard(photo) {
    const exif = [photo.exif?.camera, photo.formatted?.focalLength, photo.formatted?.aperture, photo.formatted?.shutter].filter(Boolean);
    const d = photo.exif?.dateTaken || photo.uploadedAt;
    return `<article class="archive-card reveal" data-project="${escapeHtml(photo.project)}"><a href="project.html?collection=${encodeURIComponent(photo.project)}" data-transition><div class="archive-card-media"><img loading="lazy" src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.title || photo.project)}"></div><div class="archive-card-meta"><span>${escapeHtml(photo.title || photo.project)}</span><span>${escapeHtml(dateLabel(d))}</span></div><div class="archive-card-exif">${exif.map(v => `<span>${escapeHtml(v)}</span>`).join('')}</div></a></article>`;
  }

  async function initArchive() {
    if (page !== 'archive') return;
    const grid = $('#archive-grid'), empty = $('#archive-empty'), count = $('#archive-count'), filter = $('#archive-project-filter');
    if (!A?.configured) { showConfigNotice(grid); count.textContent = '尚未连接数据'; return; }
    const photos = await safePhotos();
    if (!photos) { grid.innerHTML = '<p class="archive-loading">读取失败。请检查 Supabase 配置与网络。</p>'; return; }
    if (!photos.length) { count.textContent = '0 张照片'; empty.hidden = false; return; }
    const projects = [...new Set(photos.map(p => p.project))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
    filter.insertAdjacentHTML('beforeend', projects.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join(''));
    const render = () => {
      const value = filter.value;
      const visible = value ? photos.filter(p => p.project === value) : photos;
      count.textContent = `${visible.length} 张照片`;
      grid.innerHTML = visible.map(archiveCard).join('');
      activateReveals(grid);
    };
    filter.addEventListener('change', render); render();
  }

  function renderBars(el, items) {
    if (!el) return;
    if (!items?.length) { el.innerHTML = '<p class="chart-empty">暂无数据</p>'; return; }
    const max = Math.max(...items.map(i => i.count));
    el.innerHTML = items.map(item => `<div class="bar-row"><div class="bar-label"><span>${escapeHtml(item.label)}</span><span>${item.count}</span></div><div class="bar-track"><i style="width:${Math.max(3,item.count/max*100)}%"></i></div></div>`).join('');
  }

  function renderDonut(el, legend, items, total) {
    if (!el || !legend) return;
    if (!items?.length || !total) { el.classList.add('empty'); el.innerHTML = '<span>—</span>'; legend.innerHTML = '<p class="chart-empty">暂无 EXIF 机身数据</p>'; return; }
    const palette = ['#171715','#4b4a45','#73716a','#99968e','#bdb9af','#d6d1c7','#e5e0d7','#ece8e0'];
    let at = 0;
    const stops = items.map((item,i) => { const start = at; at += item.count/total*100; return `${palette[i%palette.length]} ${start}% ${at}%`; });
    if (at < 100) stops.push(`rgba(23,23,21,.08) ${at}% 100%`);
    el.style.background = `conic-gradient(${stops.join(',')})`;
    el.innerHTML = `<span>${total}<small>张</small></span>`;
    legend.innerHTML = items.map((item,i) => `<div class="legend-row"><i style="background:${palette[i%palette.length]}"></i><span>${escapeHtml(item.label)}</span><b>${item.count}</b></div>`).join('');
  }

  async function initStats() {
    if (page !== 'stats') return;
    if (!A?.configured) { $('#stats-empty').hidden = false; $('#stats-empty p').textContent = '网站还没有连接 Supabase。完成部署说明中的配置后，这里会自动生成数据。'; return; }
    const photos = await safePhotos();
    if (!photos) return;
    const stats = A.buildStats(photos);
    $('[data-metric="total"]').textContent = stats.total;
    $('[data-metric="coverage"]').textContent = `${stats.exifCoverage}%`;
    $('[data-metric="camera"]').textContent = stats.primaryCamera || '—';
    $('[data-metric="focal"]').textContent = stats.medianFocalLength ? `${Number(stats.medianFocalLength.toFixed(1))}mm` : '—';
    $('[data-panel-total="cameras"]').textContent = `${stats.cameras.reduce((s,i)=>s+i.count,0)} 张有机身信息`;
    renderDonut($('#camera-donut'), $('#camera-legend'), stats.cameras, stats.total);
    renderBars($('#focal-bars'), stats.focalLengths); renderBars($('#lens-bars'), stats.lenses);
    renderBars($('#aperture-bars'), stats.apertures); renderBars($('#iso-bars'), stats.iso); renderBars($('#year-bars'), stats.years);
    if (!stats.total) $('#stats-empty').hidden = false;
  }

  updateGlobalCount(); initHome(); initPersonalProject(); initArchive(); initStats();
})();
