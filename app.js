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
function caseSource(c) { return (c.sources||[]).map(s=>safeLink(s.url)).find(Boolean)||caseURL(c); }
function escapeHTML(v) { return String(v||'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
function issueText(c) {
  const parts=[c.title,c.period];
  issueCases(c).forEach((x,i)=>parts.push((i+1)+'. '+x.title+'\n'+x.venue+' · '+x.country+(x.historical?' · Исторический пример':'')+'\n'+caseSource(x),x.facts,'Механика: '+x.mechanics));
  if(!issueCases(c).length) parts.push(c.summary);
  return parts.filter(Boolean).join('\n\n');
}
function issueHTML(c) {
  let html='<p><b>'+escapeHTML(c.title)+'</b><br>'+escapeHTML(c.period)+'</p>';
  issueCases(c).forEach((x,i)=>{
    html+='<p><b><a href="'+escapeHTML(caseSource(x))+'">'+(i+1)+'. '+escapeHTML(x.title)+'</a></b><br>'+escapeHTML(x.venue+' · '+x.country+(x.historical?' · Исторический пример':''))+'</p><p>'+escapeHTML(x.facts)+'</p><p><b>Механика:</b> '+escapeHTML(x.mechanics)+'</p>';
  });
  if(!issueCases(c).length) html+='<p>'+escapeHTML(c.summary)+'</p>';
  return html;
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
  const actions=el('div',undefined,'issue-actions');
  const copy=el('button','Скопировать пост для Telegram','copy-issue');
  const status=el('span','','copy-status');status.setAttribute('role','status');
  const post=el('div',undefined,'telegram-post');
  // Content is escaped and source links allow only HTTP(S).
  post.innerHTML=issueHTML(c);
  copy.addEventListener('click',async()=>{
    try{
      if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw Error();
      await navigator.clipboard.write([new ClipboardItem({
        'text/html':new Blob([issueHTML(c)],{type:'text/html'}),
        'text/plain':new Blob([issueText(c)],{type:'text/plain'})
      })]);
      status.textContent='Скопировано с форматированием — вставьте в Telegram';
    }catch{
      const selection=window.getSelection(),range=document.createRange();
      range.selectNodeContents(post);selection.removeAllRanges();selection.addRange(range);
      status.textContent='Текст выделен. Нажмите Ctrl+C и вставьте в Telegram';
    }
  });
  actions.append(copy,status);n.append(actions,post);return n;
}
window.addEventListener('hashchange',()=>{if(data&&location.hash.startsWith('#case-'))openCase(location.hash.slice(6));});
fetch('data.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{data=d;$('#updated').textContent='Проверено: '+date(d.checked_at);const stale=d.last_successful_scan&&Date.now()-new Date(d.last_successful_scan)>9*86400000;$('#notice').textContent=d.pilot?'Пилотная подборка. Автоматический сбор ещё не включён. Исторические кейсы отмечены отдельно.':stale?'Обновление задерживается. Ниже — последняя успешно опубликованная подборка.':'Последний успешный сбор: '+date((d.last_successful_scan||'').slice(0,10))+'. Новые кейсы и ранее найденные практики доступны в архиве.';render();if(location.hash.startsWith('#case-'))openCase(location.hash.slice(6));$('#issues').replaceChildren(...(d.issues||[]).map(issue));$('#directions').replaceChildren(...(d.directions||[]).map(issue));if(!d.directions?.length)$('#directions').append(el('p','Пока недостаточно независимых внедрений с подтверждённой историей. Направления появятся по мере накопления базы.','empty'));$('#source-list').replaceChildren(...d.sources.map(s=>{const a=el('a',s.name+' ↗');a.href=safeLink(s.url)||'#';a.target='_blank';a.rel='noopener noreferrer';return a;}));}).catch(()=>{$('#notice').textContent='Не удалось загрузить подборку. Обновите страницу позднее.';$('#updated').textContent='Данные временно недоступны';});

