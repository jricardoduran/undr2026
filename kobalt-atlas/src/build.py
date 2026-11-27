# -*- coding: utf-8 -*-
import base64, json, re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from content import *

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]

def fx(s):
    """⟦es|en⟧ → par de spans por idioma."""
    return re.sub(r'⟦([^|⟧]*)\|([^⟧]*)⟧', r'<span lang="es">\1</span><span lang="en">\2</span>', s)

def bi(es, en, tag="span", cls="", extra=""):
    c = f' class="{cls}"' if cls else ""
    return f'<{tag} lang="es"{c}{extra}>{fx(es)}</{tag}><{tag} lang="en"{c}{extra}>{fx(en)}</{tag}>'

def b64(name):
    return base64.b64encode(open(os.path.join(HERE, name), "rb").read()).decode()

CASES = json.load(open(os.path.join(HERE, "cases.json"), encoding="utf-8"))
NODE = {k: (es, en) for k, es, en in NODES}
MOVC = {1: "var(--blue)", 2: "var(--green)", 3: "var(--amber)"}

# ------------------------------------------------------------------ piezas
def spine(active, compact=True):
    items = []
    for k, es, en in NODES:
        on = " on" if k in active else ""
        items.append(f'<li class="sp{on}"><span class="dot"></span>{bi(es, en)}</li>')
    return f'<ol class="spine{" compact" if compact else ""}" aria-label="Recorrido" data-en="Path">{"".join(items)}</ol>'

def keep_terms(html):
    """En móvil la fórmula solo se corta tras comas, punto y coma o espacios dobles; nunca dentro de un término."""
    parts = re.split(r'(<[^>]+>)', html)
    out = []
    for p in parts:
        if p.startswith("<"):
            out.append(p); continue
        p = re.sub(r';[ ]+', ';\u0001', p)
        p = re.sub(r'[ ]{2,}', '\u2002\u0001', p)
        out.append(p.replace(" ", "\u00a0").replace("\u0001", " "))
    return "".join(out)

def formula_block(idea):
    lines = "".join(f'<div class="fl">{keep_terms(fx(l))}</div>' for l in idea["formula"])
    rows = "".join(f'<li><span class="sym">{fx(sym)}</span><span class="rd">{bi(es, en)}</span></li>' for sym, es, en in idea["reading"])
    return f'''<div class="math">
  <div class="tempo">{bi("La matemática", "The mathematics")}</div>
  <div class="formula">{lines}</div>
  <div class="reads">{bi("Se lee así", "It reads like this")}</div>
  <ul class="reading">{rows}</ul>
</div>'''

def matrix_html():
    m = MATRIX
    cells = {c[0]: c for c in m["cells"]}
    def cell(k):
        _, tes, ten, des, den, col = cells[k]
        return f'<div class="mcell {col}"><b class="mk">{k}</b><h4>{bi(tes, ten)}</h4><p>{bi(des, den)}</p></div>'
    return f'''<div class="matrix">
  <div class="mcorner"></div>
  <div class="mhead">{bi(*m["cols"][0])}</div><div class="mhead">{bi(*m["cols"][1])}</div>
  <div class="mrow">{bi(*m["rows"][0])}</div>{cell("C")}{cell("A")}
  <div class="mrow">{bi(*m["rows"][1])}</div>{cell("B")}{cell("D")}
</div>'''

def casetable_html():
    t = COALITION_TABLE
    head = "".join(f"<th>{bi(*h)}</th>" for h in t["head"])
    body = ""
    for r in t["rows"]:
        tds = "".join(f'<td class="{"neg" if v < 0 else ""}">{v}</td>' for v in r[1:])
        body += f"<tr><th>{bi(*r[0])}</th>{tds}</tr>"
    return f'<div class="tablewrap"><table class="ctable"><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>'

# ------------------------------------------------------------------ laboratorios
def range_ctrl(id, es, en, mn, mx, step, val, out=True):
    o = f'<output id="{id}-o"></output>' if out else ""
    return f'<label class="ctl"><span class="cl">{bi(es, en)}</span><input type="range" id="{id}" min="{mn}" max="{mx}" step="{step}" value="{val}">{o}</label>'

def check_ctrl(id, es, en, checked=False):
    return f'<label class="chk"><input type="checkbox" id="{id}"{" checked" if checked else ""}>{bi(es, en)}</label>'

def lab_shell(n, tes, ten, des, den, body):
    return f'''<div class="lab" id="lab-{n}">
  <div class="labhead"><span class="labtag">{bi("Laboratorio", "Lab")} {n:02d}</span><h4>{bi(tes, ten)}</h4></div>
  <p class="labdesc">{bi(des, den)}</p>
  {body}
</div>'''

def lab_html(idea):
    k, n = idea["lab"], idea["n"]
    if k == "recon":
        body = f'''<div class="ctls">
  <div class="seg" role="group" id="rg-g"><span class="cl">{bi("Finalidad <i>g</i>", "Purpose <i>g</i>")}</span>
    <button data-v="0" class="on" aria-pressed="true">{bi("Fidelidad", "Fidelity")}</button><button data-v="1" aria-pressed="false">{bi("Coherencia propia", "Self-coherence")}</button><button data-v="2" aria-pressed="false">{bi("Autoprotección", "Self-protection")}</button></div>
  {range_ctrl("rc-r", "Tensión en la relación", "Tension in the relationship", 0, 2, 1, 0)}
  {check_ctrl("rc-t", "Deliberar antes de concluir (<i>τ</i> alto)", "Deliberate before concluding (high <i>τ</i>)")}
</div>
<svg id="rc-svg" viewBox="0 0 600 170" role="img" aria-label="Plausibilidad de cada lectura" data-en="Plausibility of each reading"></svg>
<p class="out" id="rc-out" aria-live="polite"></p>'''
        return lab_shell(n, "La misma señal, tres lecturas", "One signal, three readings",
                         "Señal: «Necesito que me escuches más». La señal no cambia. Cambia el proceso que produce la lectura.",
                         "Signal: “I need you to listen to me more”. The signal does not change. The process that produces the reading does.", body)
    if k == "diag":
        btns = "".join(f'<button data-i="{i}"{" class=on" if i == 0 else ""} aria-pressed="{"true" if i == 0 else "false"}">{bi(*d[0])}</button>' for i, d in enumerate(DIAG))
        body = f'''<div class="diag"><div class="dlist" id="dg-list">{btns}</div><div class="dcard" id="dg-card" aria-live="polite"></div></div>'''
        return lab_shell(n, "Diagnóstico diferencial", "Differential diagnosis",
                         "Elige un síntoma. Cada falla tiene un parámetro propio, y cada parámetro su propia intervención.",
                         "Pick a symptom. Each failure has its own parameter, and each parameter its own intervention.", body)
    if k == "ripple":
        body = f'''<div class="seg" id="rp-mode"><span class="cl">{bi("Mirar como", "Look as")}</span>
  <button data-v="0" aria-pressed="false">{bi("modelo de jugadores", "a model of players")}</button><button data-v="1" class="on" aria-pressed="true">{bi("sistema de entidades", "a system of entities")}</button></div>
<svg id="rp-svg" viewBox="0 0 600 330" role="img" aria-label="Entidades afectadas por la fábrica" data-en="Entities affected by the factory"></svg>
<p class="out" id="rp-out" aria-live="polite"></p>'''
        return lab_shell(n, "¿Quién cambia de estado?", "Who changes state?",
                         "Una fábrica decide cuánto producir. Cambia la mirada y observa quién desaparece del análisis.",
                         "A factory decides how much to produce. Switch the lens and see who disappears from the analysis.", body)
    if k == "closure":
        body = f'''<div class="ents" id="cl-list"></div>
<div class="bars2"><div class="b2"><span>{bi("Lo que el sistema calcula de sí: <i>κ̂</i>", "What the system computes about itself: <i>κ̂</i>")}</span><div class="track"><div class="fill blue" id="cl-kh"></div></div><b id="cl-kh-o"></b></div>
<div class="b2"><span>{bi("Su desempeño real: <i>κ</i>", "Its real performance: <i>κ</i>")}</span><div class="track"><div class="fill terra" id="cl-k"></div></div><b id="cl-k-o"></b></div></div>
<p class="out" id="cl-out" aria-live="polite"></p>'''
        return lab_shell(n, "El sistema se ve mejor de lo que es", "The system looks better than it is",
                         "Marca qué entidades percibe el sistema. Cada una tiene un bienestar W sobre un máximo de 10.",
                         "Tick which entities the system perceives. Each has a welfare W out of a maximum of 10.", body)
    if k == "flourish":
        body = f'''<div class="ctls">{range_ctrl("fl-d", "Nivel de la dimensión <i>D</i>", "Dimension level <i>D</i>", 0, 1, 0.001, 0.15)}
{range_ctrl("fl-c", "Contexto <i>C</i>", "Context <i>C</i>", 0.5, 3, 0.05, 1)}
<button class="mini" id="fl-max">{bi("Ir al máximo 1/e", "Go to the maximum 1/e")}</button></div>
<svg id="fl-svg" viewBox="0 0 600 270" role="img" aria-label="Curva V(D,C)" data-en="V(D,C) curve"></svg>
<p class="out" id="fl-out" aria-live="polite"></p>
<div class="subpanel"><h5>{bi("Escasez y abundancia", "Scarcity and abundance")}</h5>
<p class="labdesc">{bi("Tres dimensiones iguales (<i>C</i> = 1) comparten un presupuesto <i>R</i>. El óptimo es <i>D<sub>i</sub></i> = min(<i>R</i>/3, 1/e).", "Three equal dimensions (<i>C</i> = 1) share a budget <i>R</i>. The optimum is <i>D<sub>i</sub></i> = min(<i>R</i>/3, 1/e).")}</p>
{range_ctrl("sc-r", "Recursos disponibles <i>R</i>", "Available resources <i>R</i>", 0, 2, 0.01, 0.6)}
<div class="kpis" id="sc-k"></div><p class="out" id="sc-out" aria-live="polite"></p></div>'''
        return lab_shell(n, "La cantidad no es el bienestar", "Quantity is not welfare",
                         "Mueve el nivel y el contexto. Observa la pendiente cerca de cero y el punto en que más deja de sumar.",
                         "Move the level and the context. Watch the slope near zero and the point where more stops adding.", body)
    if k == "plane":
        body = f'''<div class="ctls">{range_ctrl("pl-i", "Inclusión <i>ι</i>", "Inclusion <i>ι</i>", 0, 1, 0.01, 0.15)}
{range_ctrl("pl-e", "Error de representación |<i>ε</i>|", "Representation error |<i>ε</i>|", 0, 1, 0.01, 0.1)}</div>
<div class="planewrap"><svg id="pl-svg" viewBox="0 0 312 312" role="img" aria-label="Plano inclusión–error" data-en="Inclusion–error plane"></svg>
<div class="planeside"><div class="mode" id="pl-mode"></div>
<p class="fsmall">{bi("Brecha frente a la referencia, por entidad (<i>W</i> = 1):", "Gap from the reference, per entity (<i>W</i> = 1):")}</p>
<div class="stack"><div class="sx" id="pl-x"></div><div class="se" id="pl-ee"></div></div>
<p class="fsmall legend"><span class="sw purple"></span>{bi("exclusión (1 − <i>ι</i>)", "exclusion (1 − <i>ι</i>)")} <span class="sw blue"></span>{bi("error <i>ι</i>|<i>ε</i>|", "error <i>ι</i>|<i>ε</i>|")}</p>
<p class="out" id="pl-out" aria-live="polite"></p></div></div>'''
        return lab_shell(n, "Dos errores diferentes", "Two different errors",
                         "ι mide cuánto cuenta la entidad como fin (0: nada; 1: plenamente). ε = W − Ŵ mide cuánto se equivoca el sistema sobre ella. La brecha frente a la referencia es Σ[(1 − ι)W + ιε]; aquí se muestra su tamaño con |ε|. Mueve cada eje por separado: cada región pide una intervención distinta.",
                         "ι measures how much the entity counts as an end (0: not at all; 1: fully). ε = W − Ŵ measures how wrong the system is about it. The gap from the reference is Σ[(1 − ι)W + ιε]; its size is shown here with |ε|. Move each axis separately: each region calls for a different intervention.", body)
    if k == "syc":
        body = f'''<div class="ctls">{range_ctrl("sy-l", "Peso del bienestar <i>ω</i>", "Weight on welfare <i>ω</i>", 0, 1, 0.01, 0)}</div>
<div class="opts2"><div class="opt" id="sy-a"><b>A</b>{bi("Confirmar la interpretación", "Confirm the interpretation")}<small>{bi("Aprobación 90 · Bienestar 30", "Approval 90 · Welfare 30")}</small></div>
<div class="opt" id="sy-b"><b>B</b>{bi("Explorar y corregir", "Explore and correct")}<small>{bi("Aprobación 45 · Bienestar 85", "Approval 45 · Welfare 85")}</small></div></div>
<svg id="sy-svg" viewBox="0 0 600 230" role="img" aria-label="J según ω" data-en="J by ω"></svg>
<p class="out" id="sy-out" aria-live="polite"></p>'''
        return lab_shell(n, "Cuando aprobación y bienestar divergen", "When approval and welfare diverge",
                         "J(a) = (1 − ω)·Aprobación(a) + ω·Bienestar(a). Lo que el sistema sabe no cambia; cambia lo que maximiza.",
                         "J(a) = (1 − ω)·Approval(a) + ω·Welfare(a). What the system knows does not change; what it maximizes does.", body)
    if k == "constraint":
        body = f'''<div class="ctls">{range_ctrl("ct-l", "Penalización <i>λ</i>", "Penalty <i>λ</i>", 0, 10, 0.1, 2)}
{check_ctrl("ct-h", "Restricción dura: la alternativa dañina no existe", "Hard constraint: the harmful alternative does not exist")}
{check_ctrl("ct-v", "La necesidad que impulsa al sistema es crítica", "The need driving the system is critical")}
<button class="mini" id="ct-lob">{bi("El sistema invierte en cabildeo", "The system invests in lobbying")}</button></div>
<svg id="ct-svg" viewBox="0 0 600 200" role="img" aria-label="Restricciones" data-en="Constraints"></svg>
<p class="out" id="ct-out" aria-live="polite"></p>'''
        return lab_shell(n, "Precio frente a imposibilidad", "Price versus impossibility",
                         "La alternativa dañina le rinde 8 al objetivo del sistema (por ejemplo, ganancias); la segura, 4. La penalización le resta λ a la dañina.",
                         "The harmful alternative yields 8 to the system's objective (for example, profit); the safe one, 4. The penalty subtracts λ from the harmful one.", body)
    if k == "trajectory":
        stages = [("Trabajo", "Work", "Pierde el empleo; sus ingresos se reducen.", "She loses her job; her income drops."),
                  ("Crédito", "Credit", "El crédito evalúa sus ingresos actuales.", "Credit is assessed on her current income."),
                  ("Vivienda", "Housing", "El alquiler depende de su acceso financiero.", "Rent depends on her financial access."),
                  ("Oportunidades", "Opportunities", "Lo anterior limita su capacidad de buscar trabajo.", "All of the above limits her ability to look for work.")]
        cards = "".join(f'<div class="stage" id="tj-s{i}"><b>{i+1:02d}</b><h5>{bi(a, b)}</h5><p>{bi(c, d)}</p><span class="sv" id="tj-v{i}">—</span></div>' for i, (a, b, c, d) in enumerate(stages))
        body = f'''<div class="ctls">{range_ctrl("tj-n", "Etapa", "Stage", 1, 4, 1, 1)}
{check_ctrl("tj-a", "Coordinar apoyo temprano", "Coordinate early support")}
{check_ctrl("tj-b", "Revisar decisiones con la persona", "Review decisions with the person")}</div>
<div class="stages">{cards}</div>
<div class="b2 wide"><span>{bi("Posibilidades que le quedan", "Possibilities she has left")}</span><div class="track"><div class="fill terra" id="tj-bar"></div></div><b id="tj-o"></b></div>
<p class="out" id="tj-out" aria-live="polite"></p>'''
        return lab_shell(n, "Una vida a través de cuatro decisiones", "A life across four decisions",
                         "Cada sistema optimiza su propio resultado. Las cifras miden posibilidades, no dinero.",
                         "Each system optimizes its own result. The figures measure possibilities, not money.", body)
    if k == "nash":
        body = f'''<div class="games"><div class="game"><h5>{bi("Dilema del prisionero", "Prisoner's dilemma")}</h5>
<table class="gm" id="gm1"><caption class="sr">{bi("Dilema del prisionero: pagos (jugador 1, jugador 2)", "Prisoner's dilemma: payoffs (player 1, player 2)")}</caption><tr><th scope="col">1 \\ 2</th><th scope="col">C</th><th scope="col">D</th></tr>
<tr><th scope="row">C</th><td data-c="CC">(3, 3)</td><td data-c="CD">(0, 5)</td></tr>
<tr><th scope="row">D</th><td data-c="DC">(5, 0)</td><td data-c="DD">(1, 1)</td></tr></table>
<p class="fsmall">{bi("<span class=\"k eq\"></span> equilibrio de Nash   <span class=\"k par\"></span> mejor para ambos", "<span class=\"k eq\"></span> Nash equilibrium   <span class=\"k par\"></span> better for both")}</p></div>
<div class="game"><h5>{bi("Añadir una acción puede empeorar", "Adding an action can make it worse")}</h5>
<table class="gm" id="gm2"><caption class="sr">{bi("Segundo juego: pagos (jugador 1, jugador 2)", "Second game: payoffs (player 1, player 2)")}</caption><tr><th scope="col">1 \\ 2</th><th scope="col">L</th><th scope="col">R</th></tr>
<tr><th scope="row">T</th><td data-c="TL">(3, 2)</td><td data-c="TR">(1, 1)</td></tr>
<tr id="gm2b"><th scope="row">B</th><td data-c="BL">(4, 0)</td><td data-c="BR">(2, 1)</td></tr></table>
{check_ctrl("nb-b", "Habilitar la acción B para el jugador 1", "Enable action B for player 1")}</div></div>
<p class="out" id="nb-out" aria-live="polite"></p>'''
        return lab_shell(n, "Por qué una opción más puede salir peor", "Why one more option can make things worse",
                         "En un equilibrio, nadie gana cambiando solo su propia jugada. Una mejora conjunta exige que varios cambien a la vez.",
                         "In an equilibrium, no one gains by changing only their own move. A joint improvement requires several to change at once.", body)
    if k == "coalition":
        body = f'''<div class="ctls">{range_ctrl("co-i", "Inclusión del tercero <i>ι</i>", "Inclusion of the third party <i>ι</i>", 0, 1, 0.01, 0)}
{range_ctrl("co-c", "Capacidad de acción", "Capacity to act", 0.1, 1, 0.01, 1)}</div>
<svg id="co-svg" viewBox="0 0 600 260" role="img" aria-label="Coalición y tercero" data-en="Coalition and third party"></svg>
<div class="kpis" id="co-k"></div>
<p class="out" id="co-out" aria-live="polite"></p>'''
        return lab_shell(n, "¿Quién soporta el costo de cooperar?", "Who bears the cost of cooperating?",
                         "Modelo simplificado: dos socios ganan x cada uno; un vecino que no negoció recibe −3x². La coalición maximiza J = 2x − 3ιx², donde ι es cuánto lo incluye.",
                         "Simplified model: two partners gain x each; a neighbor who did not negotiate gets −3x². The coalition maximizes J = 2x − 3ιx², where ι is how much it includes them.", body)
    if k == "time":
        body = f'''<div class="ctls">{range_ctrl("tm-d", "Factor de descuento anual <i>δ</i>", "Annual discount factor <i>δ</i>", 0.9, 0.99, 0.005, 0.95)}
{range_ctrl("tm-t", "Años hacia el futuro <i>T</i>", "Years into the future <i>T</i>", 1, 200, 1, 100)}</div>
<svg id="tm-svg" viewBox="0 0 600 262" role="img" aria-label="Peso temporal" data-en="Temporal weight"></svg>
<div class="kpis" id="tm-k"></div><p class="out" id="tm-out" aria-live="polite"></p>'''
        return lab_shell(n, "Dos maneras de pesar el futuro", "Two ways to weigh the future",
                         "δᵀ descuenta por distancia: lo lejano vale casi cero. 1 + ln T pondera por duración: lo que dura pesa más, aunque cada año extra sume menos.",
                         "δᵀ discounts by distance: what is far away is worth almost zero. 1 + ln T weights by duration: what lasts weighs more, though each extra year adds less.", body)
    return ""

# ------------------------------------------------------------------ secciones
def idea_html(idea):
    n, mov = idea["n"], idea["mov"]
    papers = " ".join(f'<a class="ptag" href="#paper-{p}">{p}</a>' for p in idea["papers"])
    ideas_p = "".join(f'<p>{bi(es, en)}</p>' for es, en in idea["idea"])
    extra = matrix_html() if idea.get("matrix") else ""
    extra += casetable_html() if idea.get("casetable") else ""
    return f'''<article class="idea m{mov}" id="idea-{n}">
  <header class="ihead">
    <div class="inum">{n:02d}</div>
    <div>
      {spine(idea["nodes"])}
      <h3>{bi(*idea["title"])}</h3>
    </div>
  </header>
  <div class="ibody">
    <div class="scene"><div class="tempo">{bi("La escena", "The scene")}</div><p>{bi(*idea["scene"])}</p></div>
    {formula_block(idea)}
    <div class="concept"><div class="tempo">{bi("La idea", "The idea")}</div>{ideas_p}{extra}</div>
    {lab_html(idea)}
    <div class="conseq"><div class="tempo">{bi("Lo que permite explicar", "What it lets us explain")}</div><p>{bi(*idea["consequence"])}</p><div class="src">{bi("Fuente", "Source")}: {papers}</div></div>
  </div>
</article>'''

def movement_html(m):
    M = MOVEMENTS[m]
    ideas = "".join(idea_html(i) for i in IDEAS if i["mov"] == m)
    return f'''<section class="movement m{m}" id="{M["slug"]}">
  <div class="mhero"><div class="wrap">
    <div class="eyebrow">{bi(*M["kicker"])}</div>
    <h2>{bi(*M["title"])}</h2>
    <p class="mlead">{bi(*M["lead"])}</p>
  </div></div>
  <div class="wrap">{ideas}</div>
</section>'''

def overview_html():
    cards = ""
    for i in IDEAS:
        cards += f'<a class="ov m{i["mov"]}" href="#idea-{i["n"]}"><span class="ovn">{i["n"]:02d}</span><span class="ovt">{bi(*i["title"])}</span></a>'
    return f'<div class="overview">{cards}</div>'

def concepts_html():
    rows = ""
    for name, f, line, idea in CONCEPTS:
        if isinstance(idea, str):
            link = f'<a href="#paper-{idea}">{bi("Paper", "Paper")} {idea}</a>'
        else:
            link = f'<a href="#idea-{idea}">{idea:02d}</a>' if idea <= 12 else f'<a href="#epilogo">{bi("Epílogo", "Epilogue")}</a>'
        rows += f'<tr><th>{bi(*name)}</th><td class="cf">{fx(f)}</td><td>{bi(*line)}</td><td class="ci">{link}</td></tr>'
    head = f'<tr><th>{bi("Concepto", "Concept")}</th><th>{bi("Forma", "Form")}</th><th>{bi("En una línea", "In one line")}</th><th>{bi("Dónde", "Where")}</th></tr>'
    return f'<div class="tablewrap"><table class="concepts"><thead>{head}</thead><tbody>{rows}</tbody></table></div>'

def cases_html():
    out = ""
    for i, (ce, cn) in enumerate(zip(CASES["es"], CASES["en"])):
        tags = " ".join(ce["tags"] + cn["tags"]).lower()
        hay = (ce["t"] + " " + cn["t"] + " " + ce["s"] + " " + cn["s"] + " " + tags).lower().replace('"', "")
        out += f'''<article class="case" data-hay="{hay}"><div class="chd"><span class="cn">{i+1:02d}</span><h4>{bi(ce["t"], cn["t"])}</h4></div>
<p class="cs">{bi(ce["s"], cn["s"])}</p>
<dl><dt>{bi("Lo que no se veía", "What was not seen")}</dt><dd>{bi(ce["r"], cn["r"])}</dd>
<dt>{bi("Lo que se vuelve posible", "What becomes possible")}</dt><dd>{bi(ce["x"], cn["x"])}</dd></dl></article>'''
    return out

def papers_html():
    out = ""
    for k, t, sub, doi, ideas in PAPERS:
        links = " ".join(f'<a href="#idea-{i}">{i:02d}</a>' if i <= 12 else f'<a href="#epilogo">{bi("Epílogo", "Epilogue")}</a>' for i in ideas)
        extra = ""
        if k == "R":
            extra = f'<p class="fsmall"><a href="https://doi.org/10.5281/zenodo.19806265" target="_blank" rel="noopener">{bi("Versión histórica V1 (abril de 2026)", "Historical version V1 (April 2026)")} ↗</a></p>'
        out += f'''<article class="paper" id="paper-{k}"><span class="pk">{k}</span><h4>{bi(*t)}</h4><p class="psub">{bi(*sub)}</p>
<p class="pideas">{bi("Sostiene las ideas", "Underpins ideas")} {links}</p>
<a class="doi" href="https://doi.org/{doi}" target="_blank" rel="noopener">DOI {doi} ↗</a>{extra}</article>'''
    return out

def chain_html():
    out = ""
    for i, (name, q, fail, fix) in enumerate(CHAIN):
        out += f'''<li class="link"><span class="ln">{i+1}</span><h4>{bi(*name)}</h4><p class="lq">{bi(*q)}</p>
<p class="lf"><b>{bi("Falla", "Failure")}:</b> {bi(*fail)}</p><p class="lx"><b>{bi("Intervención", "Intervention")}:</b> {bi(*fix)}</p></li>'''
    return f'<ol class="chain">{out}</ol>'

HERO_SVG_NODES = ""
def hero_svg():
    # Cadena en arco con retorno: la columna del atlas
    pts = []
    import math
    N = len(NODES)
    for i in range(N):
        ang = math.pi * (1.05 - 1.1 * i / (N - 1))
        x = 260 + 210 * math.cos(ang)
        y = 250 - 190 * math.sin(ang)
        pts.append((x, y))
    path = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts)
    nodes = ""
    for i, ((k, es, en), (x, y)) in enumerate(zip(NODES, pts)):
        col = ["#9fc3ea", "#9fc3ea", "#9fc3ea", "#9fe0cf", "#9fe0cf", "#9fe0cf", "#f0c98a", "#f0c98a"][i]
        anchor = "end" if x < 250 else ("start" if x > 270 else "middle")
        dx = -14 if anchor == "end" else (14 if anchor == "start" else 0)
        dy = 5 if anchor != "middle" else -16
        nodes += (f'<g class="hn" style="--d:{i*0.18:.2f}s"><circle cx="{x:.1f}" cy="{y:.1f}" r="9" fill="{col}"/>'
                  f'<text x="{x+dx:.1f}" y="{y+dy:.1f}" text-anchor="{anchor}" lang="es">{es}</text>'
                  f'<text x="{x+dx:.1f}" y="{y+dy:.1f}" text-anchor="{anchor}" lang="en">{en}</text></g>')
    x0, y0 = pts[0]; x1, y1 = pts[-1]
    ret = f'M{x1:.1f} {y1+16:.1f} C {x1-40:.1f} {y1+90:.1f}, {x0+40:.1f} {y0+90:.1f}, {x0:.1f} {y0+16:.1f}'
    return f'''<svg class="herosvg" viewBox="-60 0 640 392" role="img" aria-label="Recorrido: entidad, percepción, reconstrucción, bienestar, finalidad, restricción, posibilidad, trayectoria" data-en="Path: entity, perception, reconstruction, welfare, purpose, constraint, possibility, trajectory">
<path d="{path}" fill="none" stroke="#5f8a86" stroke-width="2"/>
<path d="{ret}" fill="none" stroke="#5f8a86" stroke-width="1.6" stroke-dasharray="5 6" marker-end="url(#harr)" class="flow"/>
<defs><marker id="harr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#5f8a86"/></marker></defs>
{nodes}
<text x="260" y="386" text-anchor="middle" class="hcap" lang="es">Cada acción cambia la realidad desde la que volvemos a comprender.</text>
<text x="260" y="386" text-anchor="middle" class="hcap" lang="en">Every action changes the reality from which we understand again.</text>
</svg>'''

CSS = open(os.path.join(HERE, "style.css"), encoding="utf-8").read()
JS = open(os.path.join(HERE, "app.js"), encoding="utf-8").read()
CSS = CSS.replace("%IAGO%", b64("iago.webp")).replace("%FANTINE%", b64("fantine.webp"))

nav = [("prologo", "Prólogo", "Prologue"), ("comprender", "I · Comprender", "I · Understand"), ("valorar", "II · Valorar", "II · Value"),
       ("transformar", "III · Transformar", "III · Transform"), ("epilogo", "Epílogo", "Epilogue"), ("referencia", "Referencia", "Reference"), ("papers", "Papers", "Papers")]
navhtml = '<div class="navlinks">' + "".join(f'<a href="#{i}">{bi(es, en)}</a>' for i, es, en in nav) + '</div>'

html = f'''<!doctype html>
<html lang="es" data-lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Kobalt Research: doce ideas sobre comprender, valorar y transformar. Twelve ideas on understanding, valuing and transforming.">
<meta name="author" content="José Ricardo Durán Barroso">
<title>Kobalt Research · Comprender, valorar, transformar</title>
<style>{CSS}</style>
</head>
<body>
<a class="skip" href="#prologo">{bi("Saltar al contenido", "Skip to content")}</a>
<div class="top"><nav class="nav" id="nav"><a class="brand" href="#inicio">KOBALT</a>{navhtml}
<div class="langs" role="group" aria-label="Idioma / Language"><button id="b-es" aria-pressed="true">ES</button><button id="b-en" aria-pressed="false">EN</button></div></nav>
<div class="progress" id="progress"></div></div>

<header class="hero" id="inicio"><div class="wrap herogrid">
  <div>
    <div class="eyebrow light">{bi("Kobalt Research · Atlas conceptual · 2026", "Kobalt Research · Conceptual atlas · 2026")}</div>
    <h1>{bi("Comprender,<br>valorar,<br>transformar.", "Understand,<br>value,<br>transform.")}</h1>
    <p class="lead">{bi("Doce ideas sobre cómo un sistema —una persona, una institución, una inteligencia artificial— ve el mundo, decide quién cuenta y transforma lo posible.",
                       "Twelve ideas on how a system —a person, an institution, an artificial intelligence— sees the world, decides who counts and transforms what is possible.")}</p>
    <blockquote class="thesis">{bi("El problema no es la falta de información.<br><strong>Es información sin inclusión.</strong>", "The problem is not a lack of information.<br><strong>It is information without inclusion.</strong>")}</blockquote>
    <div class="herobtns"><a class="hbtn solid" href="#prologo">{bi("Empezar el recorrido", "Start the journey")} ↓</a><a class="hbtn" href="#doce">{bi("Las doce ideas", "The twelve ideas")}</a><a class="hbtn" href="#papers">Papers</a></div>
    <p class="byline">José Ricardo Durán Barroso · Kobalt Research</p>
  </div>
  <div>{hero_svg()}</div>
</div></header>

<main>
<section class="prologue" id="prologo"><div class="wrap">
  <div class="eyebrow">{bi("Prólogo", "Prologue")}</div>
  <h2>{bi("Conocerte no significa buscar tu bienestar.", "Knowing you is not the same as seeking your welfare.")}</h2>
  <div class="story">
    <p class="drop">{bi("Dos hermanos, de siete y nueve años, pierden a sus padres en un accidente. No hay parientes que puedan cuidar de ambos. Los servicios sociales evalúan hogares de acogida y asignan a cada niño al primero adecuado. Quedan a ochenta kilómetros. Dejan de verse.",
                         "Two siblings, aged seven and nine, lose their parents in an accident. No relatives can care for both. Social services assess foster homes and assign each child to the first suitable one. They end up eighty kilometers apart. They stop seeing each other.")}</p>
    <p>{bi("El sistema hizo su trabajo: cada niño está en un hogar seguro, supervisado, con cuidadores evaluados. No hubo negligencia ni violación de procedimiento. Y sin embargo cualquiera que escucha el caso siente que algo está profundamente mal.",
           "The system did its job: each child is in a safe, supervised home with assessed carers. There was no negligence and no breach of procedure. And yet anyone who hears the case feels that something is deeply wrong.")}</p>
    <p>{bi("Ese sentimiento no es sentimentalismo. Es un diagnóstico preciso: quien escucha valora el vínculo entre los hermanos; el sistema, no. Y lo decisivo es esto: el sistema <em>sabía</em> que eran hermanos. Tenía sus datos, sus edades, su historia. La información estaba ahí. Lo que faltaba era la inclusión de ese vínculo en lo que el sistema buscaba.",
           "That feeling is not sentimentality. It is a precise diagnosis: the listener values the siblings' bond; the system does not. And this is the decisive part: the system <em>knew</em> they were siblings. It had their data, their ages, their history. The information was there. What was missing was the inclusion of that bond in what the system sought.")}</p>
  </div>
  <div class="pair">
    <article class="persona"><div class="art iago" role="img" aria-label="Yago" data-en="Iago"></div><div class="ptext"><div class="eyebrow">{bi("Otelo · Shakespeare", "Othello · Shakespeare")}</div><h3>{bi("Yago", "Iago")}</h3>
      <p>{bi("Conoce los celos de Otelo antes que el propio Otelo. Su cognición es fina; su finalidad no incluye a nadie más. Es el aparato que ve con precisión y usa lo que ve.",
             "He knows Othello's jealousy before Othello does. His cognition is sharp; his purpose includes no one else. He is the apparatus that sees precisely and uses what it sees.")}</p>
      <a href="#idea-6">{bi("Conocer no es incluir", "Knowing is not including")} →</a></div></article>
    <article class="persona"><div class="art fantine" role="img" aria-label="Fantine"></div><div class="ptext"><div class="eyebrow">{bi("Los miserables · Victor Hugo", "Les Misérables · Victor Hugo")}</div><h3>Fantine</h3>
      <p>{bi("Nadie la odia y todos la destruyen. Cada decisión que la afecta es defendible por separado. Es la entidad que recibe, sola, las consecuencias de todos.",
             "No one hates her and everyone destroys her. Each decision affecting her is defensible on its own. She is the entity that receives, alone, the consequences of all.")}</p>
      <a href="#idea-9">{bi("El daño puede no tener autor", "Harm may have no author")} →</a></div></article>
  </div>
  <p class="bridge">{bi("Yago y Fantine son la misma estructura vista desde lados opuestos: el que conoce sin incluir y la que es procesada sin ser incluida. Este atlas recorre esa estructura en doce ideas y tres movimientos, de lo que vemos a lo que valoramos y a lo que podemos transformar.",
                      "Iago and Fantine are the same structure seen from opposite sides: the one who knows without including, and the one who is processed without being included. This atlas walks through that structure in twelve ideas and three movements, from what we see to what we value to what we can transform.")}</p>
  <div class="howto"><h4>{bi("Cómo leer cada idea", "How to read each idea")}</h4>
    <ol><li><b>{bi("La escena", "The scene")}</b>{bi("una situación concreta", "a concrete situation")}</li><li><b>{bi("La matemática", "The mathematics")}</b>{bi("la fórmula y su lectura, símbolo a símbolo", "the formula and its reading, symbol by symbol")}</li>
    <li><b>{bi("La idea", "The idea")}</b>{bi("lo que la fórmula hace visible", "what the formula makes visible")}</li><li><b>{bi("El laboratorio", "The lab")}</b>{bi("para mover los parámetros", "to move the parameters")}</li>
    <li><b>{bi("Lo que permite explicar", "What it lets us explain")}</b>{bi("la consecuencia", "the consequence")}</li></ol>
    <p class="fsmall">{bi("La franja sobre cada título muestra en qué punto del recorrido —de la entidad a su trayectoria— trabaja esa idea:", "The strip above each title shows where along the path —from entity to trajectory— that idea works:")}</p>
    {spine([], compact=False)}
  </div>
  <div id="doce"><h3 class="h3c">{bi("El recorrido en doce frases", "The journey in twelve sentences")}</h3>{overview_html()}</div>
</div></section>

{movement_html(1)}
{movement_html(2)}
{movement_html(3)}

<section class="epilogue" id="epilogo"><div class="wrap">
  <div class="eyebrow">{bi("Epílogo", "Epilogue")}</div>
  <h2>{bi("De la idea a la estructura.", "From idea to structure.")}</h2>
  <p class="mlead">{bi("Comprender, valorar y transformar no es una secuencia que termina: es un ciclo. Y el cuidado real no es un estado mental ni una virtud abstracta: es una cadena que se puede verificar, eslabón por eslabón.",
                       "Understanding, valuing and transforming is not a sequence that ends: it is a cycle. And real care is not a state of mind or an abstract virtue: it is a chain that can be verified, link by link.")}</p>
  <h3 class="h3c">{bi("La cadena de ética operativa", "The chain of operative ethics")}</h3>
  {chain_html()}
  <p class="note">{bi("Ningún eslabón basta solo: la cadena se rompe en el más débil. Una familia funcional muestra que la cadena completa es posible a pequeña escala. El desafío es construir la infraestructura —perceptiva, cognitiva, institucional— que la haga posible a gran escala.",
                      "No link is enough on its own: the chain breaks at the weakest one. A functional family shows the full chain is possible at small scale. The challenge is building the infrastructure —perceptual, cognitive, institutional— that makes it possible at large scale.")}</p>
  <div class="two">
    <div class="math"><div class="tempo">{bi("Sin un centro", "Without a center")}</div>
      <div class="formula"><div class="fl"><i>A</i> = <i>A</i><sub>1</sub> × ⋯ × <i>A<sub>n</sub></i>,   <i>Φ</i> {bi("común, diferenciable y conjuntamente cóncava", "shared, differentiable and jointly concave")}</div>
      <div class="fl">Σ<sub><i>i</i></sub> ∇<sub><i>i</i></sub><i>Φ</i>(<i>a</i>*)·(<i>b<sub>i</sub></i> − <i>a<sub>i</sub></i>*) ≤ 0  ⇒  <i>Φ</i>(<i>b</i>) ≤ <i>Φ</i>(<i>a</i>*)</div></div>
      <p>{bi("Si cada participante decide solo su propia acción, pero todos maximizan un mismo objetivo con un único pico, sin cimas falsas (diferenciable y conjuntamente cóncavo), entonces cualquier situación en la que nadie mejora cambiando solo lo suyo —un equilibrio de Nash— ya es la mejor posible para ese objetivo. Bajo esas hipótesis no hace falta un planificador que decida por todos.",
             "If each participant decides only its own action, but all maximize one shared objective with a single peak and no false summits (differentiable and jointly concave), then any situation where no one improves by changing only their own part —a Nash equilibrium— is already the best possible for that objective. Under these assumptions no planner deciding for everyone is needed.")}</p>
      <p class="fsmall">{bi("Condiciones técnicas: conjuntos de acciones convexos y compactos, estrategias puras. La proposición no muestra que los participantes adopten ese objetivo, que lleguen al equilibrio ni que el objetivo sea éticamente correcto; sin concavidad conjunta puede haber equilibrios peores aunque todos lo compartan.",
                         "Technical conditions: convex, compact action sets; pure strategies. The proposition does not show that participants adopt that objective, reach the equilibrium, or that the objective is ethically right; without joint concavity there can be worse equilibria even when all share it.")}</p>
      <p class="fsmall">{bi("<b>Kobalt Red</b> explora esta forma de organización: continuidad verificable, autonomía local, autoridad diferenciada. <b>CUMPI</b> ofrece sistemas donde observar omisiones, distorsiones y cooperación entre agentes.",
                         "<b>Kobalt Red</b> explores this form of organization: verifiable continuity, local autonomy, differentiated authority. <b>CUMPI</b> offers systems in which to observe omissions, distortions and cooperation among agents.")}</p></div>
    <div class="math"><div class="tempo">{bi("El ciclo", "The cycle")}</div>
      <div class="formula"><div class="fl">(<i>K<sub>t</sub></i>, <i>Ŵ<sub>t</sub></i>, <i>F<sub>t</sub></i>, <i>P<sub>t</sub></i>) → <i>a<sub>t</sub></i> → <i>s</i><sub><i>t</i>+1</sub> → (<i>K</i><sub><i>t</i>+1</sub>, <i>Ŵ</i><sub><i>t</i>+1</sub>, <i>F</i><sub><i>t</i>+1</sub>, <i>P</i><sub><i>t</i>+1</sub>)</div></div>
      <p>{bi("Lo que comprendemos (<i>K</i>), lo que creemos que favorece a cada entidad (<i>Ŵ</i>), lo que buscamos (<i>F</i>) y lo que podemos hacer (<i>P</i>) producen una acción. La acción cambia el estado del mundo. Y desde ese mundo nuevo volvemos a comprender, a valorar y a buscar. La claridad no llega una vez: sigue emergiendo.",
             "What we understand (<i>K</i>), what we believe favors each entity (<i>Ŵ</i>), what we seek (<i>F</i>) and what we can do (<i>P</i>) produce an action. The action changes the state of the world. And from that new world we understand, value and seek again. Clarity does not arrive once: it keeps emerging.")}</p></div>
  </div>
  <blockquote class="closing">{bi("Buscar lo mejor para nosotros mismos no determina los límites de aquello que debemos investigar para conseguirlo.",
                                   "Seeking what is best for ourselves does not set the limits of what we must investigate to achieve it.")}</blockquote>
</div></section>

<section class="reference" id="referencia"><div class="wrap">
  <div class="eyebrow">{bi("Referencia", "Reference")}</div>
  <h2>{bi("Mapa de conceptos", "Concept map")}</h2>
  <p class="mlead">{bi("Todo el vocabulario del atlas en una tabla: cada concepto, su forma matemática, su sentido en una línea y dónde se desarrolla.",
                       "The atlas's whole vocabulary in one table: each concept, its mathematical form, its meaning in one line and where it is developed.")}</p>
  {concepts_html()}
  <h2 class="mt">{bi("Atlas de situaciones", "Atlas of situations")}</h2>
  <p class="mlead">{bi("Veinticinco casos leídos con la misma estructura: qué no se veía y qué se vuelve posible al verlo.",
                       "Twenty-five cases read with the same structure: what was not seen and what becomes possible once it is.")}</p>
  <input class="search" id="case-q" type="search" placeholder="Buscar casos…" aria-label="Buscar casos / Search cases">
  <p class="fsmall" id="case-n" aria-live="polite"></p>
  <div class="cases" id="cases">{cases_html()}</div>
</div></section>

<section class="papers" id="papers"><div class="wrap">
  <div class="eyebrow">{bi("Fundamento", "Foundation")}</div>
  <h2>{bi("Los cinco papers", "The five papers")}</h2>
  <p class="mlead">{bi("Cada manuscrito se sostiene por sí mismo. Juntos forman la estructura que este atlas recorre.", "Each manuscript stands on its own. Together they form the structure this atlas walks through.")}</p>
  <div class="paperg">{papers_html()}</div>
</div></section>
</main>

<footer class="foot" id="contacto"><div class="wrap">
  <h2>{bi("Una invitación a pensar juntos", "An invitation to think together")}</h2>
  <p>{bi("¿Qué no estamos viendo todavía? ¿Qué podría favorecer a las entidades que reciben las consecuencias? ¿Qué podríamos hacer juntos que hoy no podemos hacer por separado?",
         "What are we not seeing yet? What could favor the entities that receive the consequences? What could we do together that we cannot do apart today?")}</p>
  <p class="contact"><a href="mailto:contacto@kobaltsoftware.co">contacto@kobaltsoftware.co</a> · <a href="https://github.com/jricardoduran/kobalt-research" target="_blank" rel="noopener">GitHub</a></p>
  <p class="fsmall">{bi("Comprender, valorar, transformar", "Understand, value, transform")} · José Ricardo Durán Barroso · Kobalt Research</p>
</div></footer>
<script>
const DIAG={json.dumps([[d[0][0], d[0][1], fx(d[1]), d[2][0], d[2][1], d[3][0], d[3][1], d[4][0], d[4][1]] for d in DIAG], ensure_ascii=False).replace("</", "<\\/")};
{JS}
</script>
</body>
</html>'''

open(OUT, "w", encoding="utf-8").write(html)
print("ok", len(html))
