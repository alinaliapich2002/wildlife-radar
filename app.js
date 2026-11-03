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
function digestPlan(c) {
  const cards=issueCases(c).filter(x=>!x.exclude_from_digest&&!/москвариум/i.test(x.venue)&&x.digest_scope!=='adjacent');
  const priority=x=>x.digest_priority??({'Маркетинг':6,'Дополнительные услуги':5,'Опыт посещения':3}[x.category]||1);
  cards.sort((a,b)=>priority(b)-priority(a)||a.id.localeCompare(b.id));
  const main=cards.filter(x=>priority(x)>=5).slice(0,3);
  const groups=new Map();
  cards.filter(x=>!main.includes(x)).forEach(x=>{if(!groups.has(x.category))groups.set(x.category,[]);groups.get(x.category).push(x);});
  return {main,groups};
}
function digestCopy(x) {
  const text=(x.digest_text||x.mechanics||x.facts||'').trim();
  const segmenter=new Intl.Segmenter('ru',{granularity:'sentence'});
  return [...segmenter.segment(text)][0]?.segment.trim()||'';
}
function digestSections(c) {
  // Trend observations retain all operators, including Moskvarium.
  if((data.directions||[]).some(x=>x.id===c.id))return [{title:c.summary,entries:issueCases(c),short:true}];
  const p=digestPlan(c),sections=[];
  if(p.main.length)sections.push({title:'Главное · механики',entries:p.main,short:false});
  p.groups.forEach((entries,title)=>sections.push({title,entries,short:true}));
  return sections;
}
function issueText(c) {
  const parts=[c.title,c.period];
  digestSections(c).forEach(s=>{parts.push(s.title);s.entries.forEach(x=>parts.push((x.digest_title||x.title)+' · '+x.venue+'\n'+digestCopy(x,s.short)+'\n'+caseSource(x)));});
  if(!digestSections(c).length)parts.push('Новых внешних кейсов для сводки нет.');
  return parts.join('\n\n');
}
function issueHTML(c) {
  let html='<p><b>'+escapeHTML(c.title)+'</b><br>'+escapeHTML(c.period)+'</p>';
  digestSections(c).forEach(s=>{
    html+='<p><b>'+escapeHTML(s.title)+'</b></p>';
    s.entries.forEach(x=>{html+='<p><b><a href="'+escapeHTML(caseSource(x))+'">'+escapeHTML(x.digest_title||x.title)+'</a></b> · '+escapeHTML(x.venue)+(s.short?' — ':'<br>')+escapeHTML(digestCopy(x,s.short))+'</p>';});
  });
  if(!digestSections(c).length)html+='<p>Новых внешних кейсов для сводки нет.</p>';
  return html;
}
function openCase(id) {
  const item = data.cards.find(c => c.id === id || (c.merged_ids||[]).includes(id)); if (!item) return; id=item.id;
  ['search','category','region','period'].forEach(key => $('#'+key).value = '');
  render(); tab('feed');
  const target = document.getElementById('case-' + id);
  if (target) { target.scrollIntoView({behavior:'smooth', block:'start'}); target.focus({preventScroll:true}); }
}
function issue(c){
  const n=el('article',undefined,'issue');
  const actions=el('div',undefined,'issue-actions');
  const copy=el('button','Скопировать полную сводку','copy-issue');
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
  actions.append(copy,status);
  if(!(data.directions||[]).some(x=>x.id===c.id))n.append(captionBlock(c));
  n.append(visualGallery(c));
  const full=el('details'),heading=el('summary','Полная текстовая сводка со всеми кейсами');full.append(heading,actions,post);n.append(full);return n;
}
window.addEventListener('hashchange',()=>{if(data&&location.hash.startsWith('#case-'))openCase(location.hash.slice(6));});
fetch('data.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{data=d;$('#updated').textContent='Проверено: '+date(d.checked_at);const stale=d.last_successful_scan&&Date.now()-new Date(d.last_successful_scan)>9*86400000;$('#notice').textContent=d.pilot?'Пилотная подборка. Автоматический сбор ещё не включён. Исторические кейсы отмечены отдельно.':stale?'Обновление задерживается. Ниже — последняя успешно опубликованная подборка.':'Последний успешный сбор: '+date((d.last_successful_scan||'').slice(0,10))+'. Новые кейсы и ранее найденные практики доступны в архиве.';render();if(location.hash.startsWith('#case-'))openCase(location.hash.slice(6));$('#issues').replaceChildren(...(d.issues||[]).map(issue));$('#directions').replaceChildren(...(d.directions||[]).map(issue));if(!d.directions?.length)$('#directions').append(el('p','Пока недостаточно независимых внедрений с подтверждённой историей. Направления появятся по мере накопления базы.','empty'));$('#source-list').replaceChildren(...d.sources.map(s=>{const a=el('a',s.name+' ↗');a.href=safeLink(s.url)||'#';a.target='_blank';a.rel='noopener noreferrer';return a;}));}).catch(()=>{$('#notice').textContent='Не удалось загрузить подборку. Обновите страницу позднее.';$('#updated').textContent='Данные временно недоступны';});


function visualPages(issue) {
  const plan=digestPlan(issue), pages=plan.main.map(x=>({title:'Главное · механика',entries:[x],short:false}));
  const rest=[...plan.groups.values()].flat();
  const size=Math.max(3,Math.ceil(rest.length/Math.max(1,7-pages.length)));
  for(let i=0;i<rest.length;i+=size){
    const entries=rest.slice(i,i+size),categories=[...new Set(entries.map(x=>x.category))];
    pages.push({title:categories.length===1?categories[0]:'Коротко · другие кейсы',entries,short:true});
  }
  return pages;
}
function paintText(ctx,text,x,y,width,font,lineHeight,maxLines,color='#123e40'){
  ctx.font=font;ctx.fillStyle=color;
  const words=String(text||'').split(/\s+/),lines=[];let line='';
  for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>width&&line){lines.push(line);line=word;}else line=next;}
  if(line)lines.push(line);
  const visible=lines.slice(0,maxLines);
  if(lines.length>maxLines){let last=visible.at(-1);while(ctx.measureText(last+'…').width>width)last=last.slice(0,-1);visible[visible.length-1]=last+'…';}
  visible.forEach((s,i)=>ctx.fillText(s,x,y+i*lineHeight));
  return y+visible.length*lineHeight;
}
async function drawCasePhoto(ctx,item,x,y,w,h){
  ctx.fillStyle='#dce8dd';ctx.fillRect(x,y,w,h);
  const image=item.image;
  if(image?.url){
    try{
      const u=new URL(image.url,location.href);
      if(u.origin!==location.origin)throw Error('Only prepared local photos');
      const pic=new Image();pic.src=u.href;await pic.decode();
      const scale=Math.max(w/pic.width,h/pic.height),sw=w/scale,sh=h/scale;
      ctx.drawImage(pic,(pic.width-sw)/2,(pic.height-sh)/2,sw,sh,x,y,w,h);
      return true;
    }catch{}
  }
  paintText(ctx,'Фото не получено',x+25,y+h/2,w-50,'26px system-ui',32,2,'#637976');
  return false;
}
async function visualCanvas(issue,page,index,total){
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#f7f8f3';ctx.fillRect(0,0,1080,1350);
  ctx.fillStyle='#123e40';ctx.fillRect(0,0,1080,130);
  paintText(ctx,'ЖИВОЙ РАДАР',54,57,720,'bold 30px system-ui',36,1,'#d8eea0');
  paintText(ctx,issue.period,54,98,900,'24px system-ui',30,1,'#ffffff');
  paintText(ctx,page.title.toUpperCase(),54,174,960,'bold 24px system-ui',30,1);
  if(!page.short){
    const x=page.entries[0];await drawCasePhoto(ctx,x,54,205,972,435);
    paintText(ctx,x.image?'Фото публикации · '+x.image.credit:'Изображение недоступно · ссылка в тексте сводки',54,668,960,'20px system-ui',26,1,'#637976');
    let y=paintText(ctx,x.digest_title||x.title,54,735,960,'bold 51px system-ui',60,3);
    y=paintText(ctx,x.venue,54,y+15,960,'26px system-ui',33,2,'#146956');
    paintText(ctx,digestCopy(x),54,y+28,960,'32px system-ui',44,Math.max(1,Math.floor((1220-y-28)/44)));
  }else{
    const rowHeight=Math.floor(1010/page.entries.length);
    for(let i=0;i<page.entries.length;i++){
      const x=page.entries[i],y=215+i*rowHeight;
      let ty=paintText(ctx,x.digest_title||x.title,54,y+32,972,'bold 36px system-ui',44,2);
      ty=paintText(ctx,x.venue,54,ty+8,972,'24px system-ui',31,1,'#146956');
      paintText(ctx,digestCopy(x),54,ty+18,972,'30px system-ui',40,Math.max(1,Math.floor((rowHeight-(ty-y)-40)/40)));
      ctx.strokeStyle='#dce3da';ctx.beginPath();ctx.moveTo(54,y+rowHeight-18);ctx.lineTo(1026,y+rowHeight-18);ctx.stroke();
    }
  }
  ctx.fillStyle='#123e40';ctx.fillRect(0,1260,1080,90);
  paintText(ctx,'Источники и ссылки — в тексте сводки',54,1314,870,'23px system-ui',30,1,'#ffffff');
  paintText(ctx,(index+1)+' / '+total,940,1314,100,'23px system-ui',30,1,'#d8eea0');
  return canvas;
}
function visualGallery(issue){
  const box=el('section',undefined,'visual-gallery'),head=el('div',undefined,'issue-actions');
  const button=el('button','Показать карточки сводки','copy-issue'),message=el('span','','copy-status');
  message.setAttribute('role','status');const grid=el('div',undefined,'visual-grid');head.append(button,message);box.append(head,grid);
  button.addEventListener('click',async()=>{
    button.disabled=true;message.textContent='Готовим изображения…';
    try{
      const pages=visualPages(issue);
      for(let i=0;i<pages.length;i++){
        const item=el('div',undefined,'visual-page'),canvas=await visualCanvas(issue,pages[i],i,pages.length);
        canvas.setAttribute('role','img');canvas.setAttribute('aria-label',pages[i].entries.map(x=>x.digest_title||x.title).join('; '));
        const save=el('button','Скачать карточку '+(i+1)+' · PNG','copy-issue');
        save.addEventListener('click',()=>canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=issue.id+'-'+(i+1)+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'image/png'));
        item.append(canvas,save);grid.append(item);
      }
      message.textContent=pages.length+' карточек · 1080 × 1350 · ссылки — в тексте поста';button.hidden=true;
    }catch{message.textContent='Не удалось подготовить карточки. Попробуйте ещё раз.';button.disabled=false;}
  });
  return box;
}

function captionParts(c) {
  const matches=c.period.match(/\d{4}-\d{2}-\d{2}/g);
  let period=c.period;
  if(matches?.length===2) {
    const format=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',timeZone:'UTC'});
    period=format.format(new Date(matches[0]+'T12:00:00Z'))+' — '+format.format(new Date(matches[1]+'T12:00:00Z'));
  }
  return {title:'Живой радар · '+period,main:digestPlan(c).main};
}
function captionHTML(c) {
  const p=captionParts(c),home=new URL(location.href);home.hash='';
  return '<p><b>'+escapeHTML(p.title)+'</b></p>'+
    '<p>В карточках — новые поводы прийти, дополнительные услуги и механики продвижения океанариумов и зоопарков.</p>'+
    (p.main.length?'<p>'+ (p.main.length===3?'Три кейса, на которые стоит обратить внимание:':'Кейсы, на которые стоит обратить внимание:')+'</p>':'')+
    p.main.map(x=>'<p>• <b><a href="'+escapeHTML(caseSource(x))+'">'+escapeHTML(x.venue+' — '+(x.digest_title||x.title))+'</a></b>: '+escapeHTML(digestCopy(x))+'</p>').join('')+
    '<p>Остальные кейсы — коротко в карточках. <a href="'+escapeHTML(home.href)+'">Все описания и источники — в радаре</a>.</p>'+
    '<p><i>В подборке есть анонсы. Коммерческий эффект описанных решений пока не подтверждён.</i></p>';
}
function captionText(c) {
  const p=captionParts(c),home=new URL(location.href);home.hash='';
  return [p.title,'В карточках — новые поводы прийти, дополнительные услуги и механики продвижения океанариумов и зоопарков.',
    p.main.length===3?'Три кейса, на которые стоит обратить внимание:':'Кейсы, на которые стоит обратить внимание:',
    ...p.main.map(x=>'• '+x.venue+' — '+(x.digest_title||x.title)+': '+digestCopy(x)+'\n'+caseSource(x)),
    'Остальные кейсы — коротко в карточках. Все описания и источники — в радаре: '+home.href,
    'В подборке есть анонсы. Коммерческий эффект описанных решений пока не подтверждён.'].join('\n\n');
}
function captionBlock(c) {
  const box=el('section',undefined,'caption-block'),heading=el('h3','Подпись к карточкам · Telegram');
  const post=el('div',undefined,'telegram-post');post.innerHTML=captionHTML(c);
  const actions=el('div',undefined,'issue-actions'),copy=el('button','Скопировать подпись к карточкам','copy-issue'),status=el('span','','copy-status');
  status.setAttribute('role','status');
  copy.addEventListener('click',async()=>{
    try{
      await navigator.clipboard.write([new ClipboardItem({
        'text/html':new Blob([captionHTML(c)],{type:'text/html'}),
        'text/plain':new Blob([captionText(c)],{type:'text/plain'})
      })]);status.textContent='Подпись скопирована — вставьте в Telegram';
    }catch{
      const selection=window.getSelection(),range=document.createRange();
      range.selectNodeContents(post);selection.removeAllRanges();selection.addRange(range);
      status.textContent='Подпись выделена. Нажмите Ctrl+C и вставьте в Telegram';
    }
  });
  actions.append(copy,status);box.append(heading,post,actions);return box;
}
