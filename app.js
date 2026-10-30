'use strict';
const $ = s => document.querySelector(s);
let data;
function el(tag, text, cls) { const n=document.createElement(tag); if(text!==undefined)n.textContent=text; if(cls)n.className=cls; return n; }
function safeLink(url) {try{const u=new URL(url);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}}
function date(value){if(!value)return 'Дата не установлена';const d=new Date(value+'T12:00:00Z');return Number.isNaN(+d)?'Дата не установлена':d.toLocaleDateString('ru-RU');}
function tab(id){document.querySelectorAll('.panel').forEach(n=>n.hidden=n.id!==id);document.querySelectorAll('[data-tab]').forEach(n=>{n.classList.toggle('active',n.dataset.tab===id);n.setAttribute('aria-pressed',String(n.dataset.tab===id));});}
document.querySelectorAll('[data-tab]').forEach(n=>n.addEventListener('click',()=>tab(n.dataset.tab)));
$('#method-link').addEventListener('click',e=>{e.preventDefault();tab('sources');$('#sources').scrollIntoView({behavior:'smooth'});});
function field(root,title,text,cls){if(!text)return;const box=el('div',undefined,cls);box.append(el('span',title,'field-title'),el('p',text));root.append(box);}
function card(c){const n=el('article',undefined,'card');n.id='case-'+c.id;n.tabIndex=-1;const meta=el('div',undefined,'card-meta');meta.append(el('span',c.category,'tag'),el('span',c.historical?'ИСТОРИЧЕСКИЙ ПРИМЕР':date(c.published),c.historical?'historical':''));n.append(meta,el('h3',c.title),el('div',c.venue+' · '+c.country,'venue'),el('p',c.facts));field(n,'Механика кейса',c.mechanics,'mechanics');const details=el('div',undefined,'details');details.id='details-'+c.id;details.hidden=true;field(details,'Аудитория и задача',c.audience+' · '+c.goal);field(details,'Идея применения · гипотеза',c.idea,'idea');field(details,'Как проверить',c.metrics);n.append(details);const toggle=el('button','Идея применения и проверка ↗','details-toggle');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls',details.id);toggle.addEventListener('click',()=>{details.hidden=!details.hidden;toggle.setAttribute('aria-expanded',String(!details.hidden));toggle.textContent=details.hidden?'Идея применения и проверка ↗':'Свернуть ↑';});n.append(toggle);n.append(el('p','Публикация: '+date(c.published)+(c.event_date?' · Событие: '+c.event_date:''),'date-note'));const links=el('div',undefined,'sources');(c.sources||[]).forEach(s=>{const href=safeLink(s.url);if(!href)return;const a=el('a',s.label||'Оригинал ↗');a.href=href;a.target='_blank';a.rel='noopener noreferrer';links.append(a);});n.append(links);return n;}
function render(){const q=$('#search').value.trim().toLocaleLowerCase('ru');const category=$('#category').value,region=$('#region').value,days=Number($('#period').value);const threshold=Date.now()-days*86400000;const list=data.cards.filter(c=>(!q||[c.title,c.venue,c.facts,c.mechanics,c.audience,c.goal].join(' ').toLocaleLowerCase('ru').includes(q))&&(!category||c.category===category)&&(!region||(region==='ru'?c.country==='Россия':c.country!=='Россия'))&&(!days||(c.published&&new Date(c.published)>=threshold))).sort((a,b)=>(b.published||'').localeCompare(a.published||''));$('#cards').replaceChildren(...list.map(card));$('#count').textContent=list.length;$('#empty').hidden=list.length>0;}
['search','category','region','period'].forEach(id=>$('#'+id).addEventListener(id==='search'?'input':'change',()=>data&&render()));$('#reset').addEventListener('click',()=>{['search','category','region','period'].forEach(id=>$('#'+id).value='');if(data)render();});
function issueCases(c) {
  return (c.case_ids || []).map(id => data.cards.find(x => x.id === id)).filter(Boolean);
}
function caseURL(c) {
  const u = new URL(location.href); u.hash = 'case-' + c.id; return u.href;
}
function issueText(c) {
  const parts = [c.title, c.period, c.summary];
  if ((c.items || []).length) parts.push('Главное в подборке:\n' + c.items.map(t => '• ' + t).join('\n'));
  issueCases(c).forEach((item, i) => {
    parts.push((i + 1) + '. ' + item.title + '\n' + item.venue + ' · ' + item.country + ' · Публикация: ' + date(item.published) + (item.historical ? ' · Исторический пример' : '') + (item.event_date ? '\nСобытие: ' + item.event_date : ''));
    parts.push(item.facts, 'Механика: ' + item.mechanics, 'Аудитория: ' + item.audience,
      'Коммерческая задача: ' + item.goal, 'Идея для океанариума (гипотеза): ' + item.idea,
      'Как проверить: ' + item.metrics, 'Кейс в радаре: ' + caseURL(item));
    (item.sources || []).forEach(source => { const url = safeLink(source.url); if (url) parts.push('Источник: ' + url); });
  });
  if (issueCases(c).length) parts.push('Идеи применения и показатели теста — гипотезы. Описание механики само по себе не подтверждает её финансовую эффективность.');
  return parts.filter(Boolean).join('\n\n');
}
function openCase(id) {
  const item = data.cards.find(c => c.id === id); if (!item) return;
  ['search','category','region','period'].forEach(key => $('#'+key).value = '');
  render(); tab('feed');
  const target = document.getElementById('case-' + id);
  if (target) { target.scrollIntoView({behavior:'smooth', block:'start'}); target.focus({preventScroll:true}); }
}
function issue(c){
  const n=el('article',undefined,'issue');
  n.append(el('span',c.period,'eyebrow'),el('h3',c.title),el('p',c.summary));
  const actions=el('div',undefined,'issue-actions');
  const copy=el('button','Скопировать сводку для чата','copy-issue');
  const status=el('span','','copy-status'); status.setAttribute('role','status');
  const fallback=el('textarea',undefined,'copy-fallback'); fallback.readOnly=true; fallback.hidden=true;
  fallback.setAttribute('aria-label','Полный текст сводки со ссылками');
  copy.addEventListener('click',async()=>{
    const text=issueText(c);
    try { await navigator.clipboard.writeText(text); status.textContent='Скопировано — можно вставить в чат'; fallback.hidden=true; }
    catch { fallback.value=text; fallback.hidden=false; fallback.focus(); fallback.select(); status.textContent='Нажмите Ctrl+C или скопируйте выделенный текст'; }
  });
  actions.append(copy,status); n.append(actions,fallback);
  if ((c.items||[]).length) { const box=el('div',undefined,'issue-takeaways'); box.append(el('h4','Главное в подборке')); const ul=el('ul'); c.items.forEach(text=>ul.append(el('li',text))); box.append(ul); n.append(box); }
  issueCases(c).forEach((item,i)=>{
    const box=el('section',undefined,'issue-case');
    box.append(el('h4',(i+1)+'. '+item.title),el('p',item.venue+' · '+item.country+' · Публикация: '+date(item.published)+(item.historical?' · Исторический пример':''),'venue'));
    if(item.event_date) box.append(el('p','Событие: '+item.event_date,'date-note'));
    box.append(el('p',item.facts));
    field(box,'Как устроена механика',item.mechanics,'mechanics');
    field(box,'Для кого',item.audience); field(box,'Коммерческая задача',item.goal);
    field(box,'Идея для океанариума · гипотеза',item.idea,'idea'); field(box,'Как проверить',item.metrics);
    const links=el('div',undefined,'sources'); const internal=el('a','Кейс в радаре ↗'); internal.href=caseURL(item);
    internal.addEventListener('click',e=>{e.preventDefault();location.hash='case-'+item.id;openCase(item.id);}); links.append(internal);
    (item.sources||[]).forEach(source=>{const href=safeLink(source.url);if(!href)return;const a=el('a',source.label||'Оригинал ↗');a.href=href;a.target='_blank';a.rel='noopener noreferrer';links.append(a);});
    box.append(links); n.append(box);
  });
  return n;
}
window.addEventListener('hashchange',()=>{if(data&&location.hash.startsWith('#case-'))openCase(location.hash.slice(6));});
fetch('data.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{data=d;$('#updated').textContent='Проверено: '+date(d.checked_at);const stale=d.last_successful_scan&&Date.now()-new Date(d.last_successful_scan)>9*86400000;$('#notice').textContent=d.pilot?'Пилотная подборка. Автоматический сбор ещё не включён. Исторические кейсы отмечены отдельно.':stale?'Обновление задерживается. Ниже — последняя успешно опубликованная подборка.':'Последний успешный сбор: '+date((d.last_successful_scan||'').slice(0,10))+'. Новые кейсы и ранее найденные практики доступны в архиве.';render();if(location.hash.startsWith('#case-'))openCase(location.hash.slice(6));$('#issues').replaceChildren(...(d.issues||[]).map(issue));$('#directions').replaceChildren(...(d.directions||[]).map(issue));if(!d.directions?.length)$('#directions').append(el('p','Пока недостаточно независимых внедрений с подтверждённой историей. Направления появятся по мере накопления базы.','empty'));$('#source-list').replaceChildren(...d.sources.map(s=>{const a=el('a',s.name+' ↗');a.href=safeLink(s.url)||'#';a.target='_blank';a.rel='noopener noreferrer';return a;}));}).catch(()=>{$('#notice').textContent='Не удалось загрузить подборку. Обновите страницу позднее.';$('#updated').textContent='Данные временно недоступны';});

