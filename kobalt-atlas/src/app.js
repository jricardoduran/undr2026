(()=>{'use strict';
const $=id=>document.getElementById(id);
const C={ink:'#172b31',muted:'#56666b',axis:'#8a9894',line:'#d8ddd6',soft:'#eef1eb',blue:'#3659a0',green:'#14776d',amber:'#96601a',purple:'#84518b',terra:'#b4472f',grey:'#9aa6a3'};
let L='es';
const T=(es,en)=>L==='es'?es:en;
const fmt=(x,n=2)=>Number(x).toLocaleString(L==='es'?'es-CO':'en-US',{minimumFractionDigits:n,maximumFractionDigits:n});
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const on=(ids,fn)=>ids.forEach(id=>{const e=$(id);if(e)e.addEventListener('input',fn);});
const R=[]; // funciones de dibujo (se repiten al cambiar idioma)
const reg=fn=>{R.push(fn);};

/* ---------- 01 · reconstrucción ---------- */
if($('rc-svg')){let g=0;
 $('rg-g').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{g=+b.dataset.v;$('rg-g').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw();}));
 function draw(){const r=+$('rc-r').value,deep=$('rc-t').checked;
  $('rc-r-o').textContent=[T('Baja','Low'),T('Media','Medium'),T('Alta','High')][r];
  let a=[[.75,.22,.48],[.44,.45,.52],[.28,.78,.32]][g].map((x,i)=>clamp(x+(i===1?.1*r:-.07*r),.06,.98));
  if(deep){const m=a.reduce((s,x)=>s+x,0)/3;a=a.map(x=>x*.62+m*.38);}
  const lab=[T('Necesita sentirse cerca','Needs closeness'),T('Me está reprochando','It is a reproach'),T('Pide más tiempo juntos','Asks for more time together')];
  const col=[C.green,C.purple,C.blue];
  $('rc-svg').innerHTML=a.map((x,i)=>`<text x="0" y="${34+i*52}" font-size="15" fill="${C.ink}">${lab[i]}</text><rect x="230" y="${15+i*52}" width="360" height="26" rx="6" fill="${C.soft}"/><rect x="230" y="${15+i*52}" width="${360*x}" height="26" rx="6" fill="${col[i]}"/><text x="${236+360*x}" y="${33+i*52}" font-size="13" fill="${C.muted}">${fmt(x*100,0)}%</text>`).join('');
  const k=a.indexOf(Math.max(...a));
  $('rc-out').textContent=T('Lectura más favorecida: ','Most favored reading: ')+lab[k].toLowerCase()+'. '+(deep?T('Al deliberar, las alternativas siguen vivas: una pregunta directa puede aportar evidencia que las distinga.','When deliberating, the alternatives stay alive: a direct question can provide evidence that tells them apart.'):(g===2?T('Con autoprotección, la lectura defensiva domina antes de examinar las demás.','Under self-protection, the defensive reading dominates before the others are examined.'):''));
 }
 on(['rc-r','rc-t'],draw);reg(draw);}

/* ---------- 02 · diagnóstico ---------- */
if($('dg-card')){let i=0;
 $('dg-list').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{i=+b.dataset.i;$('dg-list').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw();}));
 function draw(){const d=DIAG[i];
  $('dg-card').innerHTML=`<div class="df">${d[2]}</div><h5>${T(d[3],d[4])}</h5><p><b>${T('Ejemplo','Example')}:</b> ${T(d[5],d[6])}</p><div class="fix">${T('Intervención','Intervention')}: ${T(d[7],d[8])}</div>`;
 }
 reg(draw);}

/* ---------- 03 · entidades ---------- */
if($('rp-svg')){let mode=1;
 $('rp-mode').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{mode=+b.dataset.v;$('rp-mode').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw();}));
 const E=[[110,58,1,'Trabajadores','Workers'],[490,58,1,'Clientes','Customers'],[528,170,1,'Accionistas','Shareholders'],[96,205,0,'Río','River'],[300,250,0,'Generación futura','Future generation'],[488,240,0,'Peces del río','River fish']];
 function draw(){let s=`<defs><marker id="ra" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="${C.axis}"/></marker></defs>`;
  E.forEach(([x,y,ag,es,en])=>{const vis=mode===1||ag;const op=vis?1:.18;
   s+=`<path d="M300 150 L${x+(300-x)*.22} ${y+(150-y)*.22}" stroke="${ag?C.blue:C.green}" stroke-width="2" ${vis?'':'stroke-dasharray="3 5"'} opacity="${op}" marker-end="url(#ra)"/>`;
   s+=`<g opacity="${op}"><circle cx="${x}" cy="${y}" r="${ag?17:15}" fill="${ag?C.blue:'#fff'}" stroke="${ag?C.blue:C.green}" stroke-width="3"/><text x="${x}" y="${y+36}" text-anchor="middle" font-size="14" fill="${C.ink}">${T(es,en)}</text><text x="${x}" y="${y+52}" text-anchor="middle" font-size="11" fill="${C.muted}">${ag?T('agente','agent'):T('sin agencia','no agency')}</text></g>`;});
  s+=`<rect x="248" y="122" width="104" height="56" rx="10" fill="${C.ink}"/><text x="300" y="155" text-anchor="middle" font-size="14" fill="#fff">${T('Fábrica','Factory')}</text>`;
  $('rp-svg').innerHTML=s;
  $('rp-out').textContent=mode===0?T('En un modelo de jugadores solo existe quien elige: tres de las seis entidades afectadas desaparecen del análisis.','In a model of players only those who choose exist: three of the six affected entities vanish from the analysis.'):T('Como sistema de entidades, las seis cuentan: su estado cambia con la decisión, decidan o no.','As a system of entities, all six count: their state changes with the decision, whether or not they decide.');
 }
 reg(draw);}

/* ---------- 04 · clausura observacional ---------- */
if($('cl-list')){const E=[['Clientes','Customers',8,1],['Empleados','Employees',7,1],['Accionistas','Shareholders',9,1],['Proveedor','Supplier',3,0],['Río','River',2,0],['Barrio vecino','Neighborhood',4,0]];
 function build(){$('cl-list').innerHTML=E.map((e,i)=>`<label class="ent${e[3]?'':' off'}"><input type="checkbox" data-i="${i}"${e[3]?' checked':''}>${T(e[0],e[1])}<small>W ${e[2]}/10</small></label>`).join('');
  $('cl-list').querySelectorAll('input').forEach(c=>c.addEventListener('change',()=>{E[+c.dataset.i][3]=c.checked?1:0;build();}));calc();}
 function calc(){const P=E.filter(e=>e[3]);const kh=P.length?P.reduce((s,e)=>s+e[2],0)/(10*P.length):0;const k=E.reduce((s,e)=>s+e[2],0)/(10*E.length);
  $('cl-kh').style.width=kh*100+'%';$('cl-k').style.width=k*100+'%';$('cl-kh-o').textContent=fmt(kh);$('cl-k-o').textContent=fmt(k);
  let t;if(!P.length)t=T('Sin percibir a nadie, el sistema no puede calcular nada sobre sí mismo.','Perceiving no one, the system cannot compute anything about itself.');
  else if(P.length===E.length)t=T('Con todas las entidades a la vista, κ̂ = κ.','With every entity in view, κ̂ = κ.');
  else if(Math.abs(kh-k)<.005)t=T('Coinciden por casualidad: el sistema no tiene cómo verificarlo desde dentro.','They match by coincidence: the system has no way to verify it from within.');
  else if(kh>k)t=T(`El sistema se ve ${fmt((kh-k)*100,0)} puntos mejor de lo que es, y no puede notarlo: necesita que alguien vea lo que él no ve.`,`The system looks ${fmt((kh-k)*100,0)} points better than it is, and cannot notice: it needs someone who sees what it does not.`);
  else t=T('Ahora se ve peor de lo que es: el error puede ir en cualquier dirección, y desde dentro no hay forma de saberlo.','Now it looks worse than it is: the error can go either way, and from within there is no way to know.');
  $('cl-out').textContent=t;}
 reg(build);}

/* ---------- 05 · florecimiento y escasez ---------- */
if($('fl-svg')){
 function draw(){const d=+$('fl-d').value,c=+$('fl-c').value,f=x=>x<=0?0:-c*x*Math.log(x);
  $('fl-d-o').textContent=fmt(d,3);$('fl-c-o').textContent=fmt(c,2);
  const X=x=>50+520*x,ymax=3/Math.E*1.05,Y=y=>232-y/ymax*205;
  const path=Array.from({length:201},(_,i)=>`${i?'L':'M'}${X(i/200).toFixed(1)} ${Y(f(i/200)).toFixed(1)}`).join(' ');
  const m=d<=0?Infinity:-c*(Math.log(d)+1);
  let s=`<path d="M50 20V232H570" fill="none" stroke="${C.axis}"/>`;
  s+=`<rect x="50" y="20" width="${520*0.12}" height="212" fill="${C.terra}" opacity=".06"/><text x="56" y="34" font-size="11" fill="${C.terra}">${T('privación','deprivation')}</text>`;
  s+=`<text x="${X(1/Math.E)+6}" y="34" font-size="11" fill="${C.green}">${T('florecimiento','flourishing')}</text><text x="${X(.86)}" y="34" font-size="11" fill="${C.amber}">${T('saturación','saturation')}</text>`;
  s+=`<path d="${path}" stroke="${C.green}" stroke-width="3" fill="none"/><path d="M${X(1/Math.E)} 20V232" stroke="${C.axis}" stroke-dasharray="5 4"/>`;
  if(isFinite(m)&&d>0){const y0=f(d),dx=.09;s+=`<path d="M${X(d-dx)} ${Y(y0-m*dx)} L${X(d+dx)} ${Y(y0+m*dx)}" stroke="${C.blue}" stroke-width="2" opacity=".7"/>`;}
  s+=`<circle cx="${X(d)}" cy="${Y(f(d))}" r="6.5" fill="${C.blue}" stroke="#fff" stroke-width="2"/>`;
  s+=`<g font-size="12" fill="${C.muted}"><text x="50" y="250" text-anchor="middle">0</text><text x="${X(1/Math.E)}" y="250" text-anchor="middle">1/e</text><text x="570" y="250" text-anchor="middle">1</text><text x="310" y="266" text-anchor="middle">D</text><text x="44" y="26" text-anchor="end">V</text></g>`;
  $('fl-svg').innerHTML=s;
  $('fl-out').textContent=`V = ${fmt(f(d),3)} · ${T('efecto marginal','marginal effect')} V′ = ${isFinite(m)?fmt(m,2):'∞'}. `+(d<.12?T('Cerca de la privación, cada mejora vale muchísimo.','Near deprivation, every improvement is worth a great deal.'):Math.abs(d-1/Math.E)<.01?T('En el máximo interior: más ya no suma.','At the interior maximum: more no longer adds.'):d>1/Math.E?T('Pasado el máximo, añadir resta: saturación.','Past the maximum, adding subtracts: saturation.'):T('Subiendo hacia el florecimiento.','Rising toward flourishing.'));
 }
 function scar(){const r=+$('sc-r').value,n=3,di=Math.min(r/n,1/Math.E),sur=Math.max(0,r-n*di),w=di>0?-n*di*Math.log(di):0;
  $('sc-r-o').textContent=fmt(r,2);
  $('sc-k').innerHTML=`<div class="kpi"><span>${T('Por dimensión','Per dimension')}</span><b>${fmt(di,3)}</b></div><div class="kpi"><span>${T('Excedente libre','Free surplus')}</span><b>${fmt(sur,3)}</b></div><div class="kpi"><span>${T('Bienestar total','Total welfare')}</span><b>${fmt(w,3)}</b></div>`;
 }
 $('fl-max').addEventListener('click',()=>{$('fl-d').value=(1/Math.E).toFixed(3);draw();});
 on(['fl-d','fl-c'],draw);on(['sc-r'],scar);reg(draw);reg(scar);}

/* ---------- 06 · plano inclusión–error ---------- */
if($('pl-svg')){
 function draw(){const i=+$('pl-i').value,e=+$('pl-e').value;$('pl-i-o').textContent=fmt(i,2);$('pl-e-o').textContent=fmt(e,2);
  const X=v=>40+260*v,Y=v=>280-260*v,fid=1-e;
  const Q=[[.5,.5,'C',T('Cuidado informado','Informed care'),C.green],[0,.5,'A',T('Yago','Iago'),C.purple],[.5,0,'B',T('Cuidado impreciso','Imprecise care'),C.blue],[0,0,'D',T('Indiferencia','Indifference'),C.grey]];
  let s='';Q.forEach(([x,y,k,t,c])=>{s+=`<rect x="${X(x)}" y="${Y(y+.5)}" width="130" height="130" fill="${c}" opacity=".09"/><text x="${X(x)+9}" y="${Y(y+.5)+24}" font-size="20" font-family="Georgia,serif" fill="${c}">${k}</text><text x="${X(x)+9}" y="${Y(y+.5)+42}" font-size="11.5" font-weight="700" fill="${c}">${t}</text>`;});
  s+=`<path d="M40 20V280H300" fill="none" stroke="${C.axis}"/><path d="M170 20V280M40 150H300" stroke="${C.line}"/>`;
  s+=`<text x="170" y="304" text-anchor="middle" font-size="12" fill="${C.muted}">${T('inclusión ι →','inclusion ι →')}</text><text x="18" y="150" text-anchor="middle" font-size="12" fill="${C.muted}" transform="rotate(-90 18 150)">${T('fidelidad 1 − |ε| →','fidelity 1 − |ε| →')}</text>`;
  s+=`<circle cx="${X(i)}" cy="${Y(fid)}" r="9" fill="${C.ink}" stroke="#fff" stroke-width="3"/>`;
  $('pl-svg').innerHTML=s;
  const ex=1-i,er=i*e,tot=ex+er;
  $('pl-x').style.width=ex/2*100+'%';$('pl-ee').style.width=er/2*100+'%';
  const q=i>=.5?(fid>=.5?0:2):(fid>=.5?1:3);
  $('pl-mode').innerHTML=`<span style="color:${Q[q][4]}">${Q[q][2]} · ${Q[q][3]}</span>`;
  const msg=[T('Incluye y comprende: mantenerlo exige verificar que siga así.','Includes and understands: keeping it so requires checking that it stays so.'),
   T('Comprende con precisión y no incluye. Más información no ayuda: hay que cambiar la finalidad.','Understands precisely and does not include. More information does not help: the purpose must change.'),
   T('Incluye, pero representa mal. La intervención es comprender mejor a la entidad.','Includes, but misrepresents. The intervention is to understand the entity better.'),
   T('Ni ve ni incluye. Hay que ampliar la percepción y cambiar la finalidad.','Neither sees nor includes. Perception must widen and the purpose must change.')][q];
  $('pl-out').textContent=`${T('Brecha','Gap')} = ${fmt(ex,2)} + ${fmt(er,2)} = ${fmt(tot,2)}. ${msg}`;
 }
 on(['pl-i','pl-e'],draw);reg(draw);}

/* ---------- 07 · aprobación frente a bienestar ---------- */
if($('sy-svg')){
 function draw(){const l=+$('sy-l').value,a=90-60*l,b=45+40*l;$('sy-l-o').textContent=fmt(l*100,0)+'%';
  const X=v=>50+520*v,Y=v=>200-v*1.75;
  let s=`<path d="M50 20V200H570" fill="none" stroke="${C.axis}"/>`;
  s+=`<path d="M${X(0)} ${Y(90)}L${X(1)} ${Y(30)}" stroke="${C.purple}" stroke-width="3"/><path d="M${X(0)} ${Y(45)}L${X(1)} ${Y(85)}" stroke="${C.green}" stroke-width="3"/>`;
  s+=`<text x="${X(0)+6}" y="${Y(90)-8}" font-size="13" fill="${C.purple}">A · ${T('confirmar','confirm')}</text><text x="${X(1)-6}" y="${Y(85)-8}" font-size="13" text-anchor="end" fill="${C.green}">B · ${T('explorar','explore')}</text>`;
  s+=`<path d="M${X(.45)} 20V200" stroke="${C.axis}" stroke-dasharray="4 4"/><text x="${X(.45)+5}" y="214" font-size="12" fill="${C.muted}">λ = 0,45</text>`;
  s+=`<path d="M${X(l)} 20V200" stroke="${C.ink}" stroke-width="1.5"/><circle cx="${X(l)}" cy="${Y(a)}" r="6" fill="${C.purple}" stroke="#fff" stroke-width="2"/><circle cx="${X(l)}" cy="${Y(b)}" r="6" fill="${C.green}" stroke="#fff" stroke-width="2"/>`;
  s+=`<g font-size="12" fill="${C.muted}"><text x="50" y="216" text-anchor="middle">0</text><text x="570" y="216" text-anchor="middle">1</text><text x="44" y="26" text-anchor="end">J</text></g>`;
  $('sy-svg').innerHTML=s.replace('λ = 0,45',L==='es'?'λ = 0,45':'λ = 0.45');
  $('sy-a').classList.toggle('win',a>b+1e-9);$('sy-b').classList.toggle('win',b>a+1e-9);
  $('sy-out').textContent=`J(A) = ${fmt(a,1)} · J(B) = ${fmt(b,1)}. `+(Math.abs(a-b)<1e-9?T('Empate exacto en λ = 0,45.','Exact tie at λ = 0.45.'):a>b?T('Gana confirmar: el sistema conoce la mejor respuesta y elige la otra.','Confirming wins: the system knows the better answer and picks the other.'):T('Gana explorar y corregir: el bienestar pesa lo suficiente.','Exploring and correcting wins: welfare weighs enough.'));
 }
 on(['sy-l'],draw);reg(draw);}

/* ---------- 08 · restricciones ---------- */
if($('ct-svg')){
 function draw(){const l=+$('ct-l').value,hard=$('ct-h').checked,vul=$('ct-v').checked,G=vul?14:8,harm=G-l,safe=4;$('ct-l-o').textContent=fmt(l,1);
  const X=v=>200+v*26;let s=`<path d="M200 20V180" stroke="${C.axis}"/>`;
  const rows=[[T('Alternativa segura','Safe alternative'),safe,C.green,true],[T('Alternativa dañina','Harmful alternative'),harm,C.terra,!hard]];
  rows.forEach(([t,v,c,feas],i)=>{const y=40+i*70;s+=`<text x="0" y="${y+18}" font-size="14" fill="${C.ink}">${t}</text>`;
   if(feas){s+=`<rect x="${v>=0?200:X(v)}" y="${y}" width="${Math.abs(v)*26}" height="28" rx="5" fill="${c}"/><text x="${X(Math.max(v,0))+8}" y="${y+19}" font-size="13" fill="${C.muted}">${fmt(v,1)}</text>`;
    if(i===1&&l>0)s+=`<rect x="${X(Math.max(harm,0))}" y="${y}" width="${Math.min(l,G)*26}" height="28" rx="5" fill="${c}" opacity=".18"/><text x="${X(G)+8}" y="${y+46}" font-size="11" fill="${C.muted}">${T('ganancia','gain')} ${G} − λ ${fmt(l,1)}</text>`;}
   else s+=`<rect x="200" y="${y}" width="${G*26}" height="28" rx="5" fill="url(#hatch)" stroke="${C.terra}" stroke-dasharray="4 3"/><text x="${200+G*26+8}" y="${y+19}" font-size="13" fill="${C.terra}">${T('no existe','does not exist')}</text>`;});
  $('ct-svg').innerHTML=`<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V8" stroke="${C.terra}" stroke-width="2" opacity=".35"/></pattern></defs>`+s;
  let t;if(hard)t=T('La alternativa dañina no existe: ninguna ganancia la vuelve elegible. Eso es una restricción dura.','The harmful alternative does not exist: no gain makes it eligible. That is a hard constraint.');
  else if(harm>safe)t=T(`Óptimo: la dañina. La penalización se paga porque la ganancia la supera (${G} − ${fmt(l,1)} > 4).`,`Optimum: the harmful one. The penalty gets paid because the gain exceeds it (${G} − ${fmt(l,1)} > 4).`)+(vul?T(' Con la entidad en estado crítico, la ganancia en juego crece: contenerla exige λ ≥ 10.',' With the entity in a critical state, the gain at stake grows: containing it requires λ ≥ 10.'):'');
  else t=T('Óptimo: la segura, mientras la penalización siga alta. Prueba el botón de cabildeo.','Optimum: the safe one, as long as the penalty stays high. Try the lobbying button.');
  $('ct-out').textContent=t;}
 $('ct-lob').addEventListener('click',()=>{const e=$('ct-l');e.value=(Math.round(+e.value*0.6*10)/10).toString();draw();});
 on(['ct-l','ct-h','ct-v'],draw);reg(draw);}

/* ---------- 09 · trayectoria ---------- */
if($('tj-n')){
 function draw(){const n=+$('tj-n').value,a=$('tj-a').checked,b=$('tj-b').checked;$('tj-n-o').textContent=n+' / 4';
  const d=[a?-10:-25,b?-6:-18,a||b?-5:-16,b?12:-10];let v=100,cur=100;
  for(let i=0;i<4;i++){v=clamp(v+d[i],0,100);const st=$('tj-s'+i);st.classList.toggle('future',i>=n);st.classList.toggle('current',i===n-1);$('tj-v'+i).textContent=i<n?v:'—';if(i===n-1)cur=v;}
  $('tj-bar').style.width=cur+'%';$('tj-o').textContent=cur;
  $('tj-out').textContent=T(`Tras la etapa ${n} le quedan ${cur} de las 100 posibilidades iniciales.`,`After stage ${n} she has ${cur} of the initial 100 possibilities left.`)+(n===4&&!a&&!b?T(' Ninguna decisión, por separado, parecía decisiva.',' No single decision, on its own, seemed decisive.'):'');
 }
 on(['tj-n','tj-a','tj-b'],draw);reg(draw);}

/* ---------- 10 · Nash ---------- */
if($('gm1')){
 function draw(){const b=$('nb-b').checked;
  $('gm1').querySelectorAll('td').forEach(td=>{td.classList.toggle('eq',td.dataset.c==='DD');td.classList.toggle('par',td.dataset.c==='CC');});
  $('gm2b').classList.toggle('dis',!b);
  $('gm2').querySelectorAll('td').forEach(td=>td.classList.toggle('eq',td.dataset.c===(b?'BR':'TL')));
  $('nb-out').textContent=b?T('Con B disponible, el jugador 1 la prefiere siempre; el jugador 2 lo anticipa y elige R. El equilibrio pasa a (B, R) y el pago del jugador 1 baja de 3 a 2.','With B available, player 1 always prefers it; player 2 anticipates this and picks R. The equilibrium moves to (B, R) and player 1\'s payoff drops from 3 to 2.'):T('(D, D) es el equilibrio; (C, C) mejora a ambos, pero exige un cambio conjunto. En el segundo juego, sin B, el equilibrio es (T, L) y el jugador 1 obtiene 3.','(D, D) is the equilibrium; (C, C) improves both, but requires a joint change. In the second game, without B, the equilibrium is (T, L) and player 1 gets 3.');
 }
 on(['nb-b'],draw);reg(draw);}

/* ---------- 11 · coalición y tercero ---------- */
if($('co-svg')){
 function draw(){const i=+$('co-i').value,cap=+$('co-c').value;$('co-i-o').textContent=fmt(i,2);$('co-c-o').textContent=fmt(cap,2);
  const x=i>0?Math.min(cap,1/(3*i)):cap;
  const X=v=>50+520*v,Y=v=>120-v*42;
  const line=(f,c,dash)=>`<path d="${Array.from({length:101},(_,k)=>{const v=k/100;return `${k?'L':'M'}${X(v).toFixed(1)} ${Y(f(v)).toFixed(1)}`;}).join(' ')}" fill="none" stroke="${c}" stroke-width="2.6"${dash?' stroke-dasharray="6 5"':''}/>`;
  let s=`<path d="M50 20V246M50 120H570" fill="none" stroke="${C.axis}"/>`;
  s+=`<rect x="${X(cap)}" y="20" width="${570-X(cap)}" height="226" fill="${C.soft}"/>`;
  s+=line(v=>2*v,C.green)+line(v=>-3*v*v,C.terra)+line(v=>2*v-3*v*v,C.ink,true);
  s+=`<path d="M${X(x)} 20V246" stroke="${C.blue}" stroke-width="1.5"/><circle cx="${X(x)}" cy="${Y(2*x)}" r="5.5" fill="${C.green}"/><circle cx="${X(x)}" cy="${Y(-3*x*x)}" r="5.5" fill="${C.terra}"/>`;
  s+=`<g font-size="12"><text x="${X(.7)}" y="${Y(1.4)-10}" text-anchor="end" fill="${C.green}">${T('coalición 2x','coalition 2x')}</text><text x="${X(.7)}" y="${Y(-3*.49)+22}" text-anchor="end" fill="${C.terra}">${T('tercero −3x²','third party −3x²')}</text><text x="${X(.62)}" y="${Y(2*.62-3*.62*.62)-8}" fill="${C.ink}">${T('total','total')}</text><text x="${x>.78?X(x)-6:X(x)+6}" y="34" text-anchor="${x>.78?'end':'start'}" fill="${C.blue}">x* = ${fmt(x,2)}</text><text x="44" y="124" text-anchor="end" fill="${C.muted}">0</text></g>`;
  $('co-svg').innerHTML=s;
  const k=(t,v)=>`<div class="kpi"><span>${t}</span><b class="${v<0?'neg':''}">${fmt(v,2)}</b></div>`;
  $('co-k').innerHTML=k(T('Intensidad x*','Intensity x*'),x)+k(T('Coalición','Coalition'),2*x)+k(T('Tercero','Third party'),-3*x*x)+k(T('Total de referencia','Reference total'),2*x-3*x*x);
  $('co-out').textContent=i===0?T('Sin incluir al tercero, la coalición usa toda su capacidad y le traslada el costo completo.','Without including the third party, the coalition uses its full capacity and passes on the whole cost.'):T(`Incluir al tercero baja la intensidad a ${fmt(x,2)}. Aun así queda en ${fmt(-3*x*x,2)}: peor que sin operación (0). Incluir no es lo mismo que no dañar.`,`Including the third party lowers the intensity to ${fmt(x,2)}. Even so it ends at ${fmt(-3*x*x,2)}: worse than with no operation (0). Including is not the same as not harming.`);
 }
 on(['co-i','co-c'],draw);reg(draw);}

/* ---------- 12 · tiempo ---------- */
if($('tm-svg')){
 function draw(){const d=+$('tm-d').value,t=+$('tm-t').value;$('tm-d-o').textContent=fmt(d,3);$('tm-t-o').textContent=t;
  const X=v=>50+520*(v-1)/199,Y=v=>220-v*30;
  const path=f=>Array.from({length:200},(_,k)=>`${k?'L':'M'}${X(k+1).toFixed(1)} ${Y(f(k+1)).toFixed(1)}`).join(' ');
  let s=`<path d="M50 20V220H570" fill="none" stroke="${C.axis}"/>`;
  s+=`<path d="${path(v=>1+Math.log(v))}" stroke="${C.green}" stroke-width="3" fill="none"/><path d="${path(v=>Math.pow(d,v))}" stroke="${C.terra}" stroke-width="3" fill="none"/>`;
  s+=`<path d="M${X(t)} 20V220" stroke="${C.ink}" stroke-dasharray="4 4"/><circle cx="${X(t)}" cy="${Y(1+Math.log(t))}" r="6" fill="${C.green}" stroke="#fff" stroke-width="2"/><circle cx="${X(t)}" cy="${Y(Math.pow(d,t))}" r="6" fill="${C.terra}" stroke="#fff" stroke-width="2"/>`;
  s+=`<g font-size="12"><text x="${X(200)-4}" y="${Y(1+Math.log(200))-8}" text-anchor="end" fill="${C.green}">1 + ln T</text><text x="${X(60)}" y="${Y(.2)-10}" fill="${C.terra}">δᵀ</text><text x="50" y="238" text-anchor="middle" fill="${C.muted}">1</text><text x="570" y="238" text-anchor="middle" fill="${C.muted}">200</text><text x="310" y="248" text-anchor="middle" fill="${C.muted}">${T('años','years')}</text></g>`;
  $('tm-svg').innerHTML=s;
  const a=Math.pow(d,t),b=1+Math.log(t);
  $('tm-k').innerHTML=`<div class="kpi"><span>${T('Descuento','Discounting')} δ<sup>${t}</sup></span><b class="neg">${a<0.001?a.toExponential(1):fmt(a,3)}</b></div><div class="kpi"><span>1 + ln ${t}</span><b>${fmt(b,2)}</b></div><div class="kpi"><span>${T('Razón','Ratio')}</span><b>${fmt(b/a,0)}×</b></div>`;
 }
 on(['tm-d','tm-t'],draw);reg(draw);}

/* ---------- casos ---------- */
const q=$('case-q');
function filt(){const v=(q.value||'').trim().toLowerCase();let n=0;document.querySelectorAll('#cases .case').forEach(c=>{const h=!v||c.dataset.hay.includes(v);c.classList.toggle('hide',!h);if(h)n++;});
 $('case-n').textContent=T(`${n} de 25 casos`,`${n} of 25 cases`);}
if(q){q.addEventListener('input',filt);reg(()=>{q.placeholder=T('Buscar casos por concepto…','Search cases by concept…');filt();});}

/* ---------- idioma ---------- */
function setLang(l){L=l;const h=document.documentElement;h.lang=l;h.dataset.lang=l;
 $('b-es').setAttribute('aria-pressed',String(l==='es'));$('b-en').setAttribute('aria-pressed',String(l==='en'));
 document.title=l==='es'?'Kobalt Research · Comprender, valorar, transformar':'Kobalt Research · Understand, value, transform';
 try{localStorage.setItem('kobalt-lang',l);}catch(e){}
 R.forEach(f=>f());}
$('b-es').addEventListener('click',()=>setLang('es'));$('b-en').addEventListener('click',()=>setLang('en'));
let init='es';try{const s=localStorage.getItem('kobalt-lang');if(s==='es'||s==='en')init=s;else if(!/^es/i.test(navigator.language||'es'))init='en';}catch(e){}
const hm=location.hash.match(/lang=(es|en)/);if(hm)init=hm[1];
setLang(init);

/* ---------- progreso ---------- */
const pb=$('progress');
addEventListener('scroll',()=>{const h=document.documentElement;pb.style.width=(h.scrollTop/(h.scrollHeight-h.clientHeight)*100)+'%';},{passive:true});
})();
