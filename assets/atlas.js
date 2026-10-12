'use strict';
/* Atlas Estelar. Independente de bibliotecas; os dados continuam em data/familia.json. */
const $=s=>document.querySelector(s),NS='http://www.w3.org/2000/svg';
const state={data:null,people:new Map(),parents:new Map(),children:new Map(),mode:'constellation',branch:'all',query:'',focus:null,selected:null,root:null,points:new Map(),shown:new Set(),scale:1,tx:0,ty:0,group:null,dragging:false,moved:false,start:null,base:null};
const motion=matchMedia('(prefers-reduced-motion: reduce)');
function node(tag,cl,text){let e=document.createElement(tag);if(cl)e.className=cl;if(text!==undefined)e.textContent=text;return e}
function sv(tag,attributes,text){let e=document.createElementNS(NS,tag);for(let [k,v] of Object.entries(attributes||{}))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e}
function nameOf(p){return p.display_name||p.name}
function parentOf(id){return(state.parents.get(id)||[]).map(e=>state.people.get(e.parent)).filter(Boolean)}
function childOf(id){return(state.children.get(id)||[]).map(e=>state.people.get(e.child)).filter(Boolean)}
function relatedSet(id,kind){let seen=new Set([id]),q=[id];while(q.length){let current=q.shift(),next=kind==='ancestors'?parentOf(current):childOf(current);for(let p of next)if(!seen.has(p.id)){seen.add(p.id);q.push(p.id)}}return seen}
function confirmedDeath(p){return p.life_status==='deceased'&&p.death&&p.death.confirmed===true}
function publicBio(p){return confirmedDeath(p)&&Array.isArray(p.biography)?p.biography.filter(x=>typeof x==='string'&&x.trim()):[]}
function visible(p){return(state.branch==='all'||p.branch===state.branch||p.branch==='root')&&(!state.focus||state.focus.ids.has(p.id))}
function matches(p){if(!state.query)return true;return[p.name,p.display_name||'',p.origin||'',p.birth?.place||''].join(' ').toLocaleLowerCase('pt-PT').includes(state.query)}
function indexData(d){state.data=d;state.people=new Map(d.people.map(p=>[p.id,p]));state.root=d.people.find(p=>p.generation===0)?.id||d.people[0]?.id;state.selected=state.root;state.parents.clear();state.children.clear();
for(let e of d.relations){if(!state.parents.has(e.child))state.parents.set(e.child,[]);if(!state.children.has(e.parent))state.children.set(e.parent,[]);state.parents.get(e.child).push(e);state.children.get(e.parent).push(e)}
for(let arr of state.parents.values())arr.sort((a,b)=>({father:0,mother:1}[a.kind]??3)-({father:0,mother:1}[b.kind]??3))}
function constellation(){let out=new Map();
function place(id,lo,hi){if(out.has(id))return;let p=state.people.get(id);if(!p)return;let theta=(lo+hi)/2,rad=[0,240,440,640,840,1000][p.generation]||1000+(p.generation-5)*130;
out.set(id,{x:rad*Math.cos(theta),y:rad*Math.sin(theta)});
let parents=state.parents.get(id)||[],step=(hi-lo)/Math.max(1,parents.length);parents.forEach((rel,i)=>place(rel.parent,lo+i*step,lo+(i+1)*step))}
place(state.root,-Math.PI,Math.PI);
state.data.people.filter(p=>!out.has(p.id)).forEach((p,i,arr)=>{let t=Math.PI*2*i/Math.max(1,arr.length);out.set(p.id,{x:1100*Math.cos(t),y:1100*Math.sin(t)})});return out}
function tree(){let out=new Map(),row=0;
function visit(id){if(out.has(id))return out.get(id).y;let p=state.people.get(id);if(!p)return 0;let pp=state.parents.get(id)||[],ys=pp.map(e=>visit(e.parent));let y=ys.length?ys.reduce((a,b)=>a+b,0)/ys.length:row++*150;out.set(id,{x:p.generation*275,y});return y}
visit(state.root);state.data.people.filter(p=>!out.has(p.id)).forEach(p=>out.set(p.id,{x:p.generation*275,y:row++*150}));let ys=[...out.values()].map(v=>v.y),offset=(Math.min(...ys)+Math.max(...ys))/2;out.forEach(p=>p.y-=offset);return out}
function labelLines(str){if(str.length<22)return[str];let list=[''];for(let word of str.split(' ')){let i=list.length-1;if((list[i]+' '+word).trim().length>19&&list[i]&&list.length<3)list.push(word);else list[i]=(list[i]+' '+word).trim()}return list}
function apply(){if(state.group)state.group.setAttribute('transform','translate('+state.tx+' '+state.ty+') scale('+state.scale+')')}
function fit(){let pts=[...state.points].filter(([id])=>state.shown.has(id)).map(([,v])=>v);if(!pts.length)return;let box=$('#graph').getBoundingClientRect(),minX=Math.min(...pts.map(v=>v.x))-120,maxX=Math.max(...pts.map(v=>v.x))+120,minY=Math.min(...pts.map(v=>v.y))-100,maxY=Math.max(...pts.map(v=>v.y))+100;
state.scale=Math.min(1.2,Math.max(.12,Math.min((box.width-56)/(maxX-minX),(box.height-126)/(maxY-minY))));state.tx=box.width/2-(minX+maxX)*state.scale/2;state.ty=(box.height-5)/2-(minY+maxY)*state.scale/2;apply()}
function zoom(k,x,y){let rect=$('#graph').getBoundingClientRect(),cx=x??rect.width/2,cy=y??rect.height/2,newScale=Math.max(.12,Math.min(3.6,state.scale*k));let factor=newScale/state.scale;state.tx=cx-(cx-state.tx)*factor;state.ty=cy-(cy-state.ty)*factor;state.scale=newScale;apply()}
function renderGraph(reset){if(!state.data||$('#main').hidden)return;let scene=$('#graph'),box=scene.getBoundingClientRect();if(box.width<30||box.height<30)return;scene.replaceChildren();scene.setAttribute('viewBox','0 0 '+box.width+' '+box.height);
let group=sv('g');scene.append(group);state.group=group;state.points=state.mode==='tree'?tree():constellation();
let entries=state.data.people.filter(visible);state.shown=new Set(entries.map(p=>p.id));
if(state.mode==='constellation'){[240,440,640,840].forEach(r=>group.append(sv('circle',{cx:0,cy:0,r:r,class:'graph-orbit'})))}else{[0,1,2,3,4].forEach(n=>group.append(sv('line',{x1:n*275,x2:n*275,y1:-1700,y2:1700,stroke:'#5a6b87','stroke-opacity':'.16','stroke-dasharray':'5 13'})))}
for(let e of state.data.relations){if(!state.shown.has(e.child)||!state.shown.has(e.parent))continue;let a=state.points.get(e.child),b=state.points.get(e.parent);if(!a||!b)continue;let d=state.mode==='tree'?'M'+a.x+','+a.y+' C'+(a.x+140)+','+a.y+' '+(b.x-140)+','+b.y+' '+b.x+','+b.y:'M'+a.x+','+a.y+' Q'+((a.x+b.x)*.53)+','+((a.y+b.y)*.53)+' '+b.x+','+b.y;
group.append(sv('path',{d:d,class:'graph-link'+(state.selected===e.child||state.selected===e.parent?' active':'')}))}
for(let p of entries){let pos=state.points.get(p.id);if(!pos)continue;let g=sv('g',{transform:'translate('+pos.x+' '+pos.y+')',class:'person-node'+(p.placeholder?' unknown':'')+(state.selected===p.id?' current':'')+(!matches(p)?' dim':''),tabindex:'0',role:'button','aria-label':'Abrir ficha individual: '+nameOf(p),'data-id':p.id});
g.append(sv('rect',{x:-96,y:-53,width:192,height:106,rx:6,class:'panel'}));g.append(sv('circle',{cx:-76,cy:-34,r:4,class:'symbol'}));g.append(sv('text',{x:-64,y:-30,class:'label'},'GERAÇÃO '+(p.generation+1)));
let lines=labelLines(nameOf(p));lines.forEach((line,i)=>g.append(sv('text',{x:-74,y:(lines.length===1?10:-5)+i*18,class:'name',style:'font-size:'+(lines.length>2?14:lines.length===2?16:17)+'px'},line)));
g.append(sv('text',{x:-74,y:41,class:'where'},(p.origin||(p.placeholder?'Por identificar':'Ramo '+p.branch)).slice(0,30)));
g.addEventListener('click',ev=>{if(state.moved){ev.preventDefault();return}openProfile(p.id)});g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();openProfile(p.id)}});group.append(g)}
$('#graphLabel').textContent=state.mode==='tree'?'ÁRVORE GENEALÓGICA':'CONSTELAÇÃO FAMILIAR';$('#graphCount').textContent=entries.length+' pessoas';
if(state.query&&!entries.some(matches))group.append(sv('text',{x:0,y:0,fill:'#e2c896','text-anchor':'middle'},'Sem resultados para a pesquisa'));
if(reset)fit();else apply()}
function graphGestures(){const g=$('#graph');g.addEventListener('pointerdown',ev=>{if(ev.pointerType==='mouse'&&ev.button!==0)return;state.dragging=true;state.moved=false;state.start={x:ev.clientX,y:ev.clientY};state.base={x:state.tx,y:state.ty};g.classList.add('dragging');g.setPointerCapture(ev.pointerId)});
g.addEventListener('pointermove',ev=>{if(!state.dragging)return;let dx=ev.clientX-state.start.x,dy=ev.clientY-state.start.y;if(Math.hypot(dx,dy)>7)state.moved=true;if(state.moved){state.tx=state.base.x+dx;state.ty=state.base.y+dy;apply()}});
const end=()=>{state.dragging=false;g.classList.remove('dragging');setTimeout(()=>state.moved=false,20)};g.addEventListener('pointerup',end);g.addEventListener('pointercancel',end);
g.addEventListener('wheel',ev=>{ev.preventDefault();let r=g.getBoundingClientRect();zoom(ev.deltaY<0?1.17:.85,ev.clientX-r.left,ev.clientY-r.top)},{passive:false});
$('#zoomIn').onclick=()=>zoom(1.3);$('#zoomOut').onclick=()=>zoom(.77);$('#zoomFit').onclick=fit;
g.addEventListener('keydown',ev=>{let dir={ArrowLeft:[35,0],ArrowRight:[-35,0],ArrowUp:[0,35],ArrowDown:[0,-35]}[ev.key];if(dir){ev.preventDefault();state.tx+=dir[0];state.ty+=dir[1];apply()}})}
function showMain(){if($('#main').hidden){$('#main').hidden=false;$('#profile').hidden=true;$('#header').hidden=false}}
function showProfile(){if(!$('#main').hidden){$('#main').hidden=true;$('#profile').hidden=false;$('#header').hidden=true}scrollTo(0,0)}
function goExplorer(){location.hash='#universo';showMain();requestAnimationFrame(()=>{renderGraph(true);$('#universo').scrollIntoView({behavior:motion.matches?'instant':'smooth'})})}
function openProfile(id){if(!state.people.has(id))return;state.selected=id;let hash='#/p/'+encodeURIComponent(id);if(location.hash===hash)route();else location.hash=hash}
function makeFact(label,value){let f=node('div','fact');f.append(node('small','',label),node('b','',value||'Por identificar'));return f}
function relatives(list,target){let root=$(target);root.replaceChildren();if(!list.length){root.append(node('p','hint','Ainda não há relações identificadas.'));return}list.forEach(p=>{let b=node('button','relative',nameOf(p)+'  ↗');b.type='button';b.onclick=()=>openProfile(p.id);root.append(b)})}
function profile(id){let p=state.people.get(id);if(!p)return;state.selected=id;showProfile();
$('#profileKicker').textContent='GERAÇÃO '+(p.generation+1)+' / '+(p.branch==='root'?'PONTO DE PARTIDA':'RAMO '+p.branch.toUpperCase());$('#profileName').textContent=nameOf(p);$('#profilePlace').textContent=p.origin||'Localidade por identificar';
let badges=$('#profileBadges');badges.replaceChildren();badges.append(node('span','',p.placeholder?'Por identificar':'Arquivo genealógico'));if(p.confidence==='family')badges.append(node('span','','Testemunho familiar'));if(confirmedDeath(p))badges.append(node('span','','Falecimento confirmado'));
let b=$('#biography');b.replaceChildren();let paragraphs=publicBio(p);
if(paragraphs.length){paragraphs.forEach(t=>b.append(node('p','',t)))}else if(p.life_status==='living'){b.append(node('p','','Biografia não publicada: pessoa viva.'))}else{b.append(node('p','','Ainda não existe biografia validada. O falecimento e os acontecimentos de vida precisam de confirmação antes de se publicar uma narrativa.'))}
let fact=$('#facts');fact.replaceChildren();fact.append(makeFact('Data de nascimento',p.life_status==='living'?'Reservada':p.birth?.date),makeFact('Local de nascimento',p.life_status==='living'?'Reservado':p.birth?.place),makeFact('Falecimento',confirmedDeath(p)?(p.death.date||'Confirmado; data desconhecida'):'Não confirmado'),makeFact('Localidade associada',p.origin));
if(p.life_status!=='living'&&p.notes)fact.append(makeFact('Relato ou apontamento familiar',p.notes));
let source=$('#sources');source.replaceChildren();let s=(p.source_ids||[]).map(id=>state.data.sources.find(x=>x.id===id)).filter(Boolean);if(!s.length)source.append(node('p','hint','Ainda não foram associadas fontes a este registo.'));
else s.forEach(x=>{let art=node('article');art.append(node('b','',x.title),node('p','',x.description));source.append(art)});
let aa=relatedSet(id,'ancestors'),dd=relatedSet(id,'descendants');$('#ancestorCount').textContent=[...aa].filter(x=>x!==id&&!state.people.get(x)?.placeholder).length;$('#descendantCount').textContent=[...dd].filter(x=>x!==id&&!state.people.get(x)?.placeholder).length;relatives(parentOf(id),'#parents');relatives(childOf(id),'#children');
$('#goAncestors').onclick=()=>focusRelatives(id,'ancestors');$('#goDescendants').onclick=()=>focusRelatives(id,'descendants');$('#seeOnTree').onclick=()=>focusRelatives(id,'ancestors');
document.title=nameOf(p)+' · Raízes & Legado';$('#announce').textContent='Ficha de '+nameOf(p)}
function focusRelatives(id,kind){let p=state.people.get(id);state.focus={ids:relatedSet(id,kind),id,kind};state.branch='all';state.query='';$('#branch').value='all';$('#search').value='';$('#focusBanner').hidden=false;$('#focusLabel').textContent=(kind==='ancestors'?'Ascendentes de ':'Descendentes de ')+nameOf(p);goExplorer()}
function route(){if(!state.data)return;let h=location.hash,decode='';if(h.startsWith('#/p/')){try{decode=decodeURIComponent(h.slice(4))}catch{decode=''}}if(decode&&state.people.has(decode)){profile(decode);return}
showMain();document.title='Raízes & Legado · Atlas Estelar';requestAnimationFrame(()=>{renderGraph(false);if(h==='#universo')$('#universo').scrollIntoView({behavior:'instant'});else if(h==='#investigacao')$('#investigacao').scrollIntoView({behavior:'instant'});else if(h==='#/'||h==='#')scrollTo({top:0,behavior:'instant'})})}
function starfield(){let canvas=$('#stars'),context=canvas.getContext('2d');if(!context)return;let stars=[],w=0,h=0,t=0,frame=0,active=true;
const rand=n=>{let a=Math.sin(n*821.77)*42758.63;return a-Math.floor(a)};
function resize(){let r=canvas.getBoundingClientRect(),d=Math.min(1.8,devicePixelRatio||1);w=r.width;h=r.height;canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);context.setTransform(d,0,0,d,0,0);let count=Math.min(220,Math.max(65,Math.round(w*h/6800)));stars=Array.from({length:count},(_,i)=>({x:rand(i+1)*w,y:rand(i*3+7)*h,r:.35+rand(i*4+2)*1.3,p:rand(i*6+8)*Math.PI*2}))}
function paint(){if(!active)return;context.clearRect(0,0,w,h);for(let s of stars){context.beginPath();context.arc(s.x,s.y,s.r,0,Math.PI*2);context.fillStyle='rgba(255,226,188,'+(.25+.6*(1+Math.sin(t/65+s.p))/2)+')';context.fill()}if(!motion.matches){t++;frame=requestAnimationFrame(paint)}}
resize();paint();addEventListener('resize',()=>{resize();if(motion.matches)paint()},{passive:true});
let obs=new IntersectionObserver(events=>{active=events[0]?.isIntersecting&&!document.hidden;cancelAnimationFrame(frame);if(active)paint()});obs.observe(canvas);document.addEventListener('visibilitychange',()=>{active=!document.hidden;if(active)paint();else cancelAnimationFrame(frame)})}
async function init(){graphGestures();starfield();
try{let res=await fetch('data/familia.json',{cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);let d=await res.json();if(!Array.isArray(d.people)||!Array.isArray(d.relations))throw Error('Dados inválidos');indexData(d);
$('#totalPeople').textContent=d.people.length;$('#totalGenerations').textContent=new Set(d.people.map(p=>p.generation)).size;
for(let [i,q] of d.research_questions.entries()){let a=node('article');a.append(node('small','','PISTA '+String(i+1).padStart(2,'0')),node('p','',q.question));$('#research').append(a)}
document.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>{state.mode=button.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===button)));renderGraph(true)});
$('#branch').onchange=e=>{state.branch=e.target.value;state.focus=null;$('#focusBanner').hidden=true;renderGraph(true)};
$('#search').oninput=e=>{state.query=e.target.value.trim().toLocaleLowerCase('pt-PT');renderGraph(false)};
$('#clearFocus').onclick=()=>{state.focus=null;$('#focusBanner').hidden=true;renderGraph(true)};
$('#back').onclick=goExplorer;addEventListener('hashchange',route);let resized;addEventListener('resize',()=>{clearTimeout(resized);resized=setTimeout(()=>renderGraph(true),140)},{passive:true});
renderGraph(true);route()
}catch(error){console.error('Falha no Atlas Estelar',error);$('#stage').append(node('p','hint','Não foi possível carregar a árvore. Atualiza a página para tentar novamente.'))}}
document.addEventListener('DOMContentLoaded',init);
