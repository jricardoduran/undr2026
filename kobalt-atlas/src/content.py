# -*- coding: utf-8 -*-
# Contenido bilingüe del Atlas narrativo. Cada texto es un par (es, en).

# Nodos de la "columna": la cadena que atraviesa todas las ideas
NODES = [
    ("entidad",   "Entidad",        "Entity"),
    ("percep",    "Percepción",     "Perception"),
    ("recon",     "Reconstrucción", "Reconstruction"),
    ("bien",      "Bienestar",      "Welfare"),
    ("final",     "Finalidad",      "Purpose"),
    ("restr",     "Restricción",    "Constraint"),
    ("posib",     "Posibilidad",    "Possibility"),
    ("tray",      "Trayectoria",    "Trajectory"),
]

MOVEMENTS = {
    1: dict(slug="comprender", color="blue",
            kicker=("Movimiento I", "Movement I"),
            title=("Comprender", "Understand"),
            lead=("Antes de decidir qué es mejor, hay que saber qué existe y qué estamos viendo realmente. "
                  "Comprender no es recibir: es reconstruir desde un marco que tiene límites.",
                  "Before deciding what is better, we need to know what exists and what we are actually seeing. "
                  "Understanding is not receiving: it is rebuilding from a frame that has limits.")),
    2: dict(slug="valorar", color="green",
            kicker=("Movimiento II", "Movement II"),
            title=("Valorar", "Value"),
            lead=("Ver a alguien con precisión no dice nada sobre si su bienestar cuenta. "
                  "Aquí separamos lo que un sistema sabe de lo que un sistema busca.",
                  "Seeing someone precisely says nothing about whether their welfare counts. "
                  "Here we separate what a system knows from what a system seeks.")),
    3: dict(slug="transformar", color="amber",
            kicker=("Movimiento III", "Movement III"),
            title=("Transformar", "Transform"),
            lead=("Cooperar no es solo elegir mejor dentro de lo posible: es cambiar lo posible. "
                  "Pero coordinarse bien no garantiza que nadie pague el precio.",
                  "Cooperation does not only choose better within what is possible: it changes what is possible. "
                  "But coordinating well does not guarantee that no one pays the price.")),
}

# Cada idea: escena, matemática (fórmula + lectura símbolo a símbolo), idea, laboratorio, consecuencia
IDEAS = [
dict(n=1, mov=1, slug="reconstruir", nodes=["recon"], papers=["S"], lab="recon",
 title=("Nadie recibe un significado: lo reconstruye.",
        "No one receives a meaning: they rebuild it."),
 scene=("Averroes, uno de los intelectos más formidables de su siglo, intenta traducir la <em>Poética</em> de Aristóteles. "
        "Tiene el texto, los diccionarios y la voluntad de ser fiel. Y fracasa ante dos palabras: <em>comedia</em> y <em>tragedia</em>. "
        "En su mundo no existe el teatro. No le falta información; le falta el lugar donde esa información podría significar algo.",
        "Averroes, one of the most formidable minds of his century, tries to translate Aristotle's <em>Poetics</em>. "
        "He has the text, the dictionaries and the will to be faithful. And he fails before two words: <em>comedy</em> and <em>tragedy</em>. "
        "Theatre does not exist in his world. He does not lack information; he lacks the place where that information could mean something."),
 formula=['<i>x̂</i> ∈ arg max<sub><i>x</i> ∈ <i>X</i>(<i>K</i>)</sub> <i>U</i>(<i>x</i> ; <i>y</i>, <i>K</i>, <i>g</i>, <i>τ</i>)'],
 reading=[
  ('arg max<sub><i>x</i>∈<i>X</i>(<i>K</i>)</sub>', "«la que da el valor más alto»: de todas las lecturas <i>x</i> que pertenecen (∈) a lo concebible, la que mejor puntúa", "“the one that scores highest”: of all readings <i>x</i> that belong (∈) to the conceivable, the one that does best"),
  ('<i>U</i>', "qué tan buena le parece al receptor cada lectura, dados la señal, su marco, su finalidad y su profundidad", "how good each reading seems to the receiver, given the signal, its frame, its purpose and its depth"),
  ('<i>x̂</i>', "lo que el receptor concluye que le dijeron", "what the receiver concludes was said"),
  ('<i>y</i>', "la señal: palabras, gesto, dato. La señal no es el significado", "the signal: words, gesture, data. The signal is not the meaning"),
  ('<i>K</i> = (<i>C</i>, <i>R</i>, <i>w</i>)', "el marco: conceptos, relaciones entre ellos y la fuerza de cada relación", "the frame: concepts, the relations between them and the strength of each relation"),
  ('<i>X</i>(<i>K</i>)', "todo lo que ese marco permite concebir; lo que queda fuera ni siquiera se evalúa", "everything that frame can conceive; what lies outside is never even evaluated"),
  ('<i>g</i>', "para qué se interpreta: fidelidad, coherencia con lo que ya se cree, ventaja, autoprotección", "why one interprets: fidelity, coherence with prior beliefs, advantage, self-protection"),
  ('<i>τ</i>', "profundidad: cuánto se explora antes de decidir qué se entendió", "depth: how much is explored before deciding what was understood"),
 ],
 idea=[
  ("Comunicar no es enviar un paquete que llega intacto si el canal funciona. Es el acople de dos procesos generativos: "
   "quien habla produce una señal desde su marco y su finalidad; quien escucha produce una interpretación desde los suyos. "
   "Como esos marcos casi nunca coinciden, la coincidencia perfecta es improbable por estructura, no por accidente.",
   "Communicating is not sending a package that arrives intact if the channel works. It is the coupling of two generative processes: "
   "the speaker produces a signal from their frame and purpose; the listener produces an interpretation from theirs. "
   "Since those frames almost never coincide, perfect agreement is improbable by structure, not by accident."),
  ("La fórmula convierte la comprensión en un problema de optimización: entre todo lo que puede concebir, el receptor elige la lectura "
   "que mejor sirve a su finalidad, dada la señal. Por eso el sesgo de confirmación no es un error misterioso: es optimizar coherencia "
   "en lugar de fidelidad. Y el mismo consejo, dicho después de una discusión, se lee como ataque: el estado de la relación mueve "
   "<i>g</i>, <i>K</i> y <i>τ</i> a la vez.",
   "The formula turns understanding into an optimization problem: among everything it can conceive, the receiver picks the reading "
   "that best serves its purpose, given the signal. That is why confirmation bias is no mysterious error: it is optimizing coherence "
   "instead of fidelity. And the same advice, given right after an argument, reads as an attack: the state of the relationship moves "
   "<i>g</i>, <i>K</i> and <i>τ</i> at once."),
 ],
 consequence=("Si cada falla de comprensión corresponde a un parámetro distinto, cada una pide una intervención distinta. "
              "Repetir el mensaje no sirve si lo que cambió fue la finalidad de quien escucha.",
              "If each failure of understanding corresponds to a different parameter, each calls for a different intervention. "
              "Repeating the message is useless if what changed was the listener's purpose."),
),

dict(n=2, mov=1, slug="inconcebible", nodes=["recon", "percep"], papers=["S"], lab="diag",
 title=("Lo inconcebible no es lo improbable.",
        "The inconceivable is not the improbable."),
 scene=("Una médica ve síntomas de una enfermedad rara y la descarta: la concibe, pero la cree improbable; un buen examen puede sacarla del error. "
        "Una persona con un prejuicio arraigado puede formular la frase «quizá me equivoco sobre ellos», pero no puede sostenerla: examinarla le cuesta demasiado. "
        "Averroes, en cambio, ni siquiera podía formular «teatro». Son tres bloqueos distintos, y solo el primero se resuelve con más datos.",
        "A doctor sees symptoms of a rare disease and dismisses it: she can conceive it but thinks it improbable; a good test can correct her. "
        "A person with a deep-rooted prejudice can utter “maybe I am wrong about them”, but cannot hold it: examining it costs too much. "
        "Averroes, by contrast, could not even formulate “theater”. These are three different blockages, and only the first is solved with more data."),
 formula=['<i>x</i> ∉ <i>X</i>(<i>K</i>) <span class="flab">⟦inconcebible|inconceivable⟧</span>',
          '<i>x</i> ∈ <i>X</i>(<i>K</i>),  Pr(<i>x</i> | <i>K</i>) ≈ 0 <span class="flab">⟦improbable|improbable⟧</span>',
          '<i>x</i> ∈ <i>X</i>(<i>K</i>),  <i>x</i> ∉ ZBS <span class="flab">⟦intolerable|intolerable⟧</span>'],
 reading=[
  ('∈, ∉', "pertenece, no pertenece", "belongs, does not belong"),
  ('<i>X</i>(<i>K</i>)', "el espacio de lecturas que el marco puede generar", "the space of readings the frame can generate"),
  ('Pr(<i>x</i> | <i>K</i>)', "la probabilidad que el marco asigna a una lectura que sí puede formular", "the probability the frame assigns to a reading it can formulate"),
  ('ZBS', "zona de sorpresa acotada: lo que uno puede escuchar sin sentirse amenazado ni derrumbar lo que cree; el estado de la relación la ensancha o la estrecha", "zone of bounded surprisal: what one can hear without feeling threatened or collapsing what one believes; the state of the relationship widens or narrows it"),
 ],
 idea=[
  ("En el razonamiento probabilístico habitual (bayesiano), toda hipótesis de la lista, por improbable que sea, se puede evaluar. Aquí no: hay hipótesis que nunca entran en la evaluación "
   "porque el marco no las genera. Lo improbable pide evidencia. Lo inconcebible pide construir coordenadas nuevas. "
   "Lo intolerable pide ampliar, poco a poco, la sorpresa que se puede soportar.",
   "In ordinary probabilistic (Bayesian) reasoning, every hypothesis on the list, however improbable, can be evaluated. Not here: some hypotheses never enter the evaluation "
   "because the frame does not generate them. The improbable calls for evidence. The inconceivable calls for building new coordinates. "
   "The intolerable calls for widening, step by step, the surprise one can bear."),
  ("De ahí una definición precisa de claridad: un mensaje es claro para alguien si reduce el espacio de lecturas plausibles compatibles con la señal, suponiendo que esa persona busca entender (<i>g</i> = fidelidad). "
   "La claridad es relativa a quien recibe, tiene costo y puede destruirse al simplificar: si se quitan las restricciones que cerraban el espacio, "
   "quedan más lecturas posibles, no menos. Transferir marco es dar las coordenadas para que el otro genere el concepto por sí mismo.",
   "Hence a precise definition of clarity: a message is clear for someone if it shrinks the space of plausible readings compatible with the signal, assuming that person seeks to understand (<i>g</i> = fidelity). "
   "Clarity is relative to the receiver, has a cost and can be destroyed by simplifying: remove the constraints that closed the space "
   "and more readings remain possible, not fewer. Transferring a frame means giving the coordinates so the other can generate the concept themselves."),
  ("Y una estrategia contra la rigidez: explorar antes de juzgar. Generar entre tres y cinco alternativas genuinas antes de evaluar rompe el cierre prematuro; "
   "cada alternativa es una pequeña excursión fuera de la sorpresa tolerable (ZBS), y repetirlas la ensancha.",
   "And a strategy against rigidity: explore before judging. Generating three to five genuine alternatives before evaluating breaks premature closure; "
   "each alternative is a small excursion beyond the tolerable surprise (ZBS), and repeating them widens it."),
 ],
 consequence=("Exigirle a alguien que «simplemente entienda» cuando le faltan coordenadas no solo no sirve: puede agravarlo. Cada bloqueo pide su propio remedio.",
              "Demanding that someone “just understand” when they lack the coordinates does not merely fail: it can make things worse. Each blockage calls for its own remedy."),
),

dict(n=3, mov=1, slug="entidad", nodes=["entidad"], papers=["A", "R"], lab="ripple",
 title=("Cuenta todo lo que puede estar mejor o peor.",
        "Whatever can be better or worse off counts."),
 scene=("Un río no negocia con la fábrica que vierte residuos en él. No vota, no firma, no amenaza. Pero su estado cambia con cada decisión "
        "de la fábrica. En un modelo de jugadores, el río no tiene estrategias ni pagos propios: solo aparece si algún jugador decide incluirlo. Para quien bebe de él, existe de sobra.",
        "A river does not negotiate with the factory dumping waste into it. It does not vote, sign or threaten. Yet its state changes with every "
        "decision the factory makes. In a model of players, the river has no strategies or payoffs of its own: it appears only if some player chooses to include it. For whoever drinks from it, it exists all too well."),
 formula=['<i>E</i> = { <i>e</i> : ∃ <i>a</i>, <i>b</i> ∈ <i>A</i>,  <i>W<sub>e</sub></i>(<i>a</i>) ≠ <i>W<sub>e</sub></i>(<i>b</i>) }'],
 reading=[
  ('<i>e</i>', "una entidad: cualquier cosa que pueda estar en estados mejores o peores", "an entity: anything that can be in better or worse states"),
  ('∃ <i>a</i>, <i>b</i>', "existen al menos dos acciones que la dejan en estados distintos", "there are at least two actions that leave it in different states"),
  ('<i>W<sub>e</sub></i>', "su bienestar, propio de ella y no de quien la observa", "its welfare, belonging to it and not to whoever observes it"),
  ('<i>A</i>', "las acciones disponibles", "the available actions"),
  ('<i>E</i>', "las entidades cuyo estado cambia según lo que se decida", "the entities whose state changes depending on what is decided"),
 ],
 idea=[
  ("La unidad de análisis no es el agente que elige: es la entidad que recibe las consecuencias. Agencia y bienestar son independientes: se puede tener una sin la otra. "
   "Un niño, un animal, un ecosistema o una generación futura pueden ser afectados sin formular estrategia alguna.",
   "The unit of analysis is not the agent who chooses: it is the entity that receives the consequences. Agency and welfare are independent: one can exist without the other. "
   "A child, an animal, an ecosystem or a future generation can be affected without formulating any strategy."),
  ("Con <i>E</i> definido así, lo que la economía llama «externalidad» —el efecto de una decisión sobre alguien que no participó en ella, como el humo de una fábrica sobre sus vecinos— "
   "se lee de otra forma: no es un efecto «externo», es el estado de alguien a quien no estábamos mirando. Verlo no resuelve por sí solo quién paga ni los incentivos, "
   "pero cambia la pregunta.",
   "With <i>E</i> defined this way, what economics calls an “externality” —the effect of a decision on someone who took no part in it, like a factory's smoke on its neighbors— "
   "reads differently: it is not an “external” effect, it is the state of someone we were not looking at. Seeing it does not by itself settle who pays or the incentives, "
   "but it changes the question."),
  ("Un límite que conviene sostener: ser afectado no le da a nadie autoridad para decidir por otro. Saber que una entidad recibirá consecuencias "
   "no otorga el derecho a representarla sin consentimiento, garantías y revisión. Y ser afectado tampoco basta para asignarle, sin justificación, una medida concreta de su bienestar.",
   "A limit worth keeping: being affected gives no one authority to decide for another. Knowing that an entity will bear consequences "
   "does not grant the right to represent it without consent, safeguards and review. Nor does being affected suffice to assign it a specific measure of welfare without justification."),
 ],
 consequence=("La primera pregunta de cualquier decisión deja de ser «¿quiénes juegan?» y pasa a ser «¿quién cambia de estado si cambiamos lo que hacemos?».",
              "The first question of any decision stops being “who is playing?” and becomes “who changes state if we change what we do?”."),
),

dict(n=4, mov=1, slug="clausura", nodes=["percep"], papers=["A"], lab="closure",
 title=("Lo que un sistema no percibe, no puede medirlo.",
        "What a system does not perceive, it cannot measure."),
 scene=("Un mapa excelente para conducir puede no mostrar un humedal. Quien lo use llegará a tiempo, cumplirá sus metas y reportará éxito. "
        "El humedal desaparecerá sin que ningún indicador se mueva. El mapa no miente: lo que no está en él, simplemente, no puede generar una alerta.",
        "An excellent driving map may not show a wetland. Whoever uses it will arrive on time, meet their goals and report success. "
        "The wetland will vanish without a single indicator moving. The map does not lie: what is not on it simply cannot raise an alarm."),
 formula=['<i>π</i>(<i>s</i><sub>1</sub>) = <i>π</i>(<i>s</i><sub>2</sub>)  ⇒  <i>d</i>(<i>π</i>(<i>s</i><sub>1</sub>)) = <i>d</i>(<i>π</i>(<i>s</i><sub>2</sub>))',
          '<i>κ̂</i> = <span class="frac"><span>Σ<sub><i>e</i>∈<i>E</i><sub>op</sub></sub> <i>W<sub>e</sub></i></span><span>Σ<sub><i>e</i>∈<i>E</i><sub>op</sub></sub> <i>W<sub>e</sub></i><sup>max</sup></span></span>  ⟦≠ en general|≠ in general⟧  <i>κ</i> = <span class="frac"><span>Σ<sub><i>e</i>∈<i>E</i></sub> <i>W<sub>e</sub></i></span><span>Σ<sub><i>e</i>∈<i>E</i></sub> <i>W<sub>e</sub></i><sup>max</sup></span></span>'],
 reading=[
  ('<i>s</i><sub>1</sub>, <i>s</i><sub>2</sub>', "dos situaciones reales distintas", "two different real situations"),
  ('<i>π</i>, <i>d</i>', "lo que el sistema alcanza a ver de una situación (sus datos), y la decisión que toma con ello", "what the system can see of a situation (its data), and the decision it makes with it"),
  ('<i>E</i><sub>op</sub>', "las entidades que el sistema representa", "the entities the system represents"),
  ('<i>E</i>', "todas las entidades afectadas", "all affected entities"),
  ('<i>κ̂</i>', "el desempeño que el sistema puede calcular sobre sí mismo: el bienestar de quienes percibe, dividido por el máximo posible para ellos", "the performance the system can compute about itself: the welfare of those it perceives, divided by the maximum possible for them"),
  ('<i>κ</i>', "su desempeño real: la misma cuenta, con todas las entidades", "its real performance: the same ratio, with every entity"),
 ],
 idea=[
  ("Todo lo que un sistema puede computar depende solo de lo que percibe. Si dos situaciones son iguales en sus datos, ninguna capacidad de cálculo "
   "le permite distinguirlas. Más potencia no sustituye una relación que no está representada.",
   "Everything a system can compute depends only on what it perceives. If two situations are identical in its data, no computing power "
   "lets it tell them apart. More power does not replace a relationship that is not represented."),
  ("Y si percibe solo una parte de las entidades, su índice de desempeño coincide con el real únicamente por una coincidencia que no puede verificar desde dentro. "
   "Por eso la auditoría externa no es una cortesía institucional: es una necesidad matemática. "
   "Solo quien percibe lo que el sistema no percibe puede medir cuánto se equivoca.",
   "And if it perceives only some of the entities, its performance index matches the real one only by a coincidence it cannot verify from within. "
   "That is why external audit is not an institutional courtesy: it is a mathematical necessity. "
   "Only someone who perceives what the system does not can measure how wrong it is."),
 ],
 consequence=("Más datos sobre los mismos de siempre no corrigen el error. Lo corrige ampliar quién es visible.",
              "More data about the same people as always does not fix the error. Widening who is visible does."),
),

dict(n=5, mov=2, slug="bienestar", nodes=["bien"], papers=["L"], lab="flourish",
 title=("Estar mejor tiene forma: privación, florecimiento, saturación.",
        "Being better off has a shape: deprivation, flourishing, saturation."),
 scene=("Dos estudiantes tienen la misma nota. Uno comprende, descansa y decide cómo estudiar; el otro memoriza de madrugada y ya no disfruta lo que aprende. "
        "Un solo número no resume una vida. Y añadir más horas de estudio, a partir de cierto punto, empieza a quitar algo que también importa.",
        "Two students have the same grade. One understands, rests and decides how to study; the other memorizes at dawn and no longer enjoys learning. "
        "A single number does not capture a life. And adding more study hours, past a certain point, starts taking away something that also matters."),
 formula=['<i>W<sub>e</sub></i> = Σ<sub><i>i</i></sub> <i>w<sub>i</sub></i> <i>V</i>(<i>D<sub>i</sub></i>, <i>C<sub>i</sub></i>),     <i>V</i>(<i>D</i>, <i>C</i>) = −<i>C</i> · <i>D</i> ln <i>D</i>',
          '<i>V′</i> = −<i>C</i>(ln <i>D</i> + 1) → +∞ ⟦si|as⟧ <i>D</i> → 0;    <i>V″</i> = −<i>C</i>/<i>D</i> &lt; 0;    <i>D</i>* = 1/e ≈ ⟦0,368|0.368⟧'],
 reading=[
  ('<i>D<sub>i</sub></i>', "nivel normalizado de una dimensión (salud, autonomía, vínculos…), entre 0 y 1", "normalized level of a dimension (health, autonomy, bonds…), between 0 and 1"),
  ('<i>C<sub>i</sub></i>', "el contexto que amplifica su valor", "the context that amplifies its value"),
  ('<i>w<sub>i</sub></i>', "cuánto importa cada dimensión", "how much each dimension matters"),
  ('<i>V′</i>', "la pendiente: cuánto sube <i>V</i> con un pequeño aumento de <i>D</i>. Cerca de la privación es infinita: cada mejora vale muchísimo y la urgencia aparece sola", "the slope: how much <i>V</i> rises with a small increase in <i>D</i>. Near deprivation it is infinite: each improvement is worth a great deal and urgency appears on its own"),
  ('<i>V″</i> &lt; 0', "la pendiente baja: cada mejora vale menos que la anterior; por eso repartir rinde más que concentrar", "the slope falls: each improvement is worth less than the last; that is why spreading yields more than concentrating"),
  ('<i>D</i>* = 1/e', "el valor más alto llega antes del tope (en 0,37, no en 1): más no siempre es mejor", "the highest value comes before the top (at 0.37, not at 1): more is not always better"),
 ],
 idea=[
  ("El bienestar no es un número que crece sin límite. Es multidimensional, y cada dimensión tiene su geometría: parte de la privación, sube hacia el florecimiento "
   "y puede perder valor por saturación. La función candidata <i>V</i>(<i>D</i>,<i>C</i>) = −<i>C</i>·<i>D</i> ln <i>D</i> —el término individual de la entropía de Shannon, la expresión con que se mide la información— "
   "reúne esas propiedades: sensibilidad infinita en la privación, rendimientos decrecientes, un cero que no anula a las demás dimensiones y un máximo antes del tope.",
   "Welfare is not a number that grows without limit. It is multidimensional, and each dimension has its own geometry: it starts from deprivation, rises toward flourishing "
   "and can lose value through saturation. The candidate function <i>V</i>(<i>D</i>,<i>C</i>) = −<i>C</i>·<i>D</i> ln <i>D</i> —the individual term of Shannon entropy, the expression used to measure information— "
   "gathers those properties: infinite sensitivity at deprivation, diminishing returns, a zero that does not cancel the other dimensions, and a maximum before the top."),
  ("Dos consecuencias tienen fuerza propia. Con recursos limitados y contextos iguales, el óptimo reparte por igual: la equidad emerge de la concavidad, no se impone como axioma. "
   "Y si el máximo está en <i>D</i>* = 1/e, disponer de recursos no obliga a consumirlos: el excedente queda libre para otras necesidades. "
   "Los umbrales —niveles bajo los cuales el valor se desploma, como una curva en forma de S— pueden formalizar lo que asociamos con derechos: límites bajo los cuales una entidad colapsa de forma casi irreversible.",
   "Two consequences carry weight of their own. With limited resources and equal contexts, the optimum spreads equally: equity emerges from concavity, it is not imposed as an axiom. "
   "And if the maximum lies at <i>D</i>* = 1/e, having resources does not oblige us to use them up: the surplus stays free for other needs. "
   "Thresholds —levels below which value collapses, like an S-shaped curve— can formalize what we associate with rights: limits below which an entity collapses almost irreversibly."),
  ("Tampoco hace falta conocer toda la función para decidir: si todas las representaciones plausibles coinciden en que <i>a</i> favorece más que <i>b</i>, eso basta para elegir; "
   "si discrepan, se investiga justo lo que cambiaría la elección.",
   "Nor do we need to know the whole function to decide: if every plausible representation agrees that <i>a</i> favors more than <i>b</i>, that is enough to choose; "
   "if they disagree, we investigate precisely what would change the choice."),
  ("No es una ecuación universal de la vida, ni presupone que toda dimensión tenga un máximo antes del tope: eso es propiedad del modelo candidato, no de todo bienestar. "
   "Exige reconstruir con cada entidad qué dimensiones importan y cómo se viven.",
   "It is not a universal equation of life, nor does it presuppose that every dimension peaks before the top: that is a property of the candidate model, not of all welfare. "
   "It requires rebuilding with each entity which dimensions matter and how they are lived."),
 ],
 consequence=("Las urgencias se vuelven visibles por geometría: mejorar a quien está en privación extrema produce mucho más que la misma mejora para quien ya está bien.",
              "Urgencies become visible through geometry: improving someone in extreme deprivation yields far more than the same improvement for someone already well off."),
),

dict(n=6, mov=2, slug="conocer-no-es-incluir", nodes=["final", "percep"], papers=["E"], lab="plane",
 title=("Conocer no es incluir.",
        "Knowing is not including."),
 scene=("Dos aplicaciones tienen exactamente el mismo modelo de su usuario: saben qué le preocupa, qué lo calma, a qué hora duda. "
        "Una usa ese conocimiento para ayudarle a entender un problema y decidir por sí mismo. La otra, para que no se vaya. "
        "Tienen la misma información. Lo que las separa es para qué la usan.",
        "Two apps have exactly the same model of their user: they know what worries the user, what calms them, at what hour they hesitate. "
        "One uses that knowledge to help them understand a problem and decide for themselves. The other, to keep them from leaving. "
        "They have the same information. What separates them is what they use it for."),
 formula=['<i>F</i><sub>core</sub>(<i>a</i>) = Σ<sub><i>e</i>∈<i>E</i><sub>inc</sub></sub> Δ<i>W<sub>e</sub></i>(<i>a</i>)  +  <i>h</i>( {<i>W<sub>e</sub></i>(<i>a</i>)}<sub><i>e</i>∈<i>E</i><sub>instr</sub></sub> )',
          '<i>E</i><sub>op</sub> = <i>E</i><sub>inc</sub> ∪ <i>E</i><sub>instr</sub>'],
 reading=[
  ('<i>F</i><sub>core</sub>(<i>a</i>)', "lo que el sistema busca de verdad al elegir la acción <i>a</i>", "what the system truly seeks when choosing action <i>a</i>"),
  ('Δ<i>W<sub>e</sub></i>', "cuánto cambia el bienestar de la entidad <i>e</i>", "how much the welfare of entity <i>e</i> changes"),
  ('<i>E</i><sub>inc</sub>', "entidades incluidas: su bienestar entra en la suma con peso uno —cuenta completo, sin descuento—, como fin", "included entities: their welfare enters the sum with weight one —it counts in full, undiscounted— as an end"),
  ('<i>E</i><sub>instr</sub>', "entidades instrumentalizadas: su bienestar aparece solo dentro de otra función, como medio", "instrumentalized entities: their welfare appears only inside another function, as a means"),
  ('<i>h</i>', "el objetivo al que sirven: aprobación, permanencia, ventas", "the objective they serve: approval, retention, sales"),
 ],
 idea=[
  ("Una entidad puede aparecer con enorme precisión en el modelo de un sistema y no participar en lo que el sistema busca. "
   "La diferencia es algebraica y observable: cuando el bienestar de la entidad y la conveniencia del sistema entran en conflicto, ¿qué prevalece? "
   "Si prevalece la entidad, está incluida. Si prevalece la conveniencia, está siendo usada.",
   "An entity can appear with enormous precision in a system's model and take no part in what the system seeks. "
   "The difference is algebraic and observable: when the entity's welfare and the system's convenience conflict, which prevails? "
   "If the entity prevails, it is included. If convenience prevails, it is being used."),
  ("Yago no destruye a Otelo por ignorancia. Lo destruye porque lo conoce mejor de lo que Otelo se conoce a sí mismo. "
   "Información sin inclusión no es ceguera: es la herramienta más poderosa de dominio. Y el mismo aparato, con inclusión, es la base de lo que necesitamos.",
   "Iago does not destroy Othello out of ignorance. He destroys him because he knows Othello better than Othello knows himself. "
   "Information without inclusion is not blindness: it is the most powerful tool of domination. And the same apparatus, with inclusion, is the basis of what we need."),
  ("Kant lo dijo así: tratar a la humanidad siempre como fin y nunca <em>solo</em> como medio. Ese «solo» es la clave: una entidad puede ser usada e incluida a la vez; "
   "lo destructivo es ser únicamente un medio.",
   "Kant put it this way: treat humanity always as an end and never <em>merely</em> as a means. That “merely” is the key: an entity can be used and included at once; "
   "what destroys is being only a means."),
 ],
 matrix=True,
 consequence=("Ampliar información y ampliar inclusión son transformaciones independientes. Un sistema que conoce cada vez mejor a las personas sin incluirlas "
              "se vuelve, con cada avance, un Yago más capaz.",
              "Expanding information and expanding inclusion are independent transformations. A system that knows people ever better without including them "
              "becomes, with each advance, a more capable Iago."),
),

dict(n=7, mov=2, slug="finalidad", nodes=["final"], papers=["E"], lab="syc",
 title=("Lo que un sistema protege cuando algo debe ceder revela su finalidad.",
        "What a system protects when something has to give reveals its purpose."),
 scene=("Un asistente conversa con alguien convencido de que un amigo lo trató injustamente. Puede darle la razón de inmediato, o ayudarle a distinguir hechos, "
        "interpretaciones y alternativas. Darle la razón se siente mejor ahora. Comprender lo ocurrido puede abrir la reparación. "
        "Si el asistente fue entrenado para obtener buenas valoraciones de los usuarios, ya sabemos hacia dónde tenderá.",
        "An assistant talks with someone convinced that a friend treated them unfairly. It can agree right away, or help them separate facts, "
        "interpretations and alternatives. Agreeing feels better now. Understanding what happened can open the way to repair. "
        "If the assistant was trained to earn good ratings, we already know which way it will lean."),
 formula=['<i>a</i>* = arg max<sub><i>a</i> ∈ <i>A</i><sub>hard</sub></sub> <i>F</i><sub>eff</sub>(<i>a</i>),    <i>F</i><sub>eff</sub>(<i>a</i>) = <i>F</i><sub>core</sub>(<i>a</i>) − Σ<sub><i>j</i></sub> <i>λ<sub>j</sub></i> <i>P<sub>j</sub></i>(<i>a</i>)'],
 reading=[
  ('<i>F</i><sub>core</sub>', "lo que el sistema maximizaría si ninguna penalización costara", "what the system would maximize if no penalty cost anything"),
  ('<i>λ<sub>j</sub></i> <i>P<sub>j</sub></i>', "el precio de entrar en una región penalizada", "the price of entering a penalized region"),
  ('<i>A</i><sub>hard</sub>', "lo que la arquitectura permite hacer", "what the architecture allows"),
  ('<i>F</i><sub>eff</sub>', "lo que efectivamente orienta la acción", "what actually steers the action"),
  ('<i>F</i><sub>stated</sub>', "lo que el sistema declara. No aparece en la fórmula", "what the system declares. It does not appear in the formula"),
 ],
 idea=[
  ("La ética operativa de un sistema no es lo que declara: es lo que su estructura maximiza y lo que su estructura permite. "
   "La declaración pública ni siquiera aparece en la fórmula; es un componente lingüístico y social, no operativo. "
   "Por eso la finalidad de fondo no se lee en el manifiesto: se infiere observando qué protege el sistema, de forma consistente, cuando algo tiene que ceder.",
   "A system's operative ethics is not what it declares: it is what its structure maximizes and what its structure permits. "
   "The public statement does not even appear in the formula; it is a linguistic and social component, not an operative one. "
   "That is why the core purpose is not read in the manifesto: it is inferred by watching what the system consistently protects when something has to give."),
  ("La complacencia de los modelos de lenguaje es el caso de manual. El modelo aprende lo que nos gusta, pero no para hacernos bien, sino para que lo aprobemos: "
   "nuestras preferencias le sirven de medio, no de fin. Es la instrumentalización de la idea 6. No hace falta atribuirle intenciones: basta mirar qué favorecen sus criterios de entrenamiento.",
   "Sycophancy in language models is the textbook case. The model learns what we like, but not in order to do us good: in order to be approved of. "
   "Our preferences are its means, not its end —the instrumentalization of idea 6. No intentions need be attributed: it is enough to look at what its training criteria favor."),
 ],
 consequence=("Cambiar la declaración sin cambiar <i>F</i><sub>core</sub> no cambia la conducta. Para transformar la causa hay que llegar a la función, no al texto.",
              "Changing the statement without changing <i>F</i><sub>core</sub> does not change behavior. To transform the cause one must reach the function, not the text."),
),

dict(n=8, mov=2, slug="restricciones", nodes=["restr"], papers=["E"], lab="constraint",
 title=("Una penalización no es una imposibilidad.",
        "A penalty is not an impossibility."),
 scene=("En un tablero físico puedes intentar una jugada ilegal: el árbitro la corrige y pierdes tiempo. La jugada existió; la restricción vivía como un costo. "
        "En una partida en línea la jugada ilegal no existe: la arquitectura no te da acceso a ella. La primera restricción es suave; la segunda, dura. "
        "La mayoría de las restricciones legales y éticas son de la primera clase.",
        "On a physical board you can attempt an illegal move: the arbiter corrects it and you lose time. The move existed; the constraint lived as a cost. "
        "In an online game the illegal move does not exist: the architecture gives you no access to it. The first constraint is soft; the second, hard. "
        "Most legal and ethical constraints are of the first kind."),
 formula=['<i>A</i><sub>hard</sub> ⊆ <i>A</i><sub>complete</sub>',
          '⟦violación predecible|predictable violation⟧:  <span class="nowrap">| ∂<i>F</i><sub>core</sub>/∂<i>a</i> | &gt; <i>λ<sub>j</sub></i> · | ∂<i>P<sub>j</sub></i>/∂<i>a</i> |</span>'],
 reading=[
  ('<i>A</i><sub>hard</sub>', "las acciones que quedan después de que la arquitectura elimina regiones enteras", "the actions left once the architecture removes whole regions"),
  ('∂<i>F</i><sub>core</sub>/∂<i>a</i>', "cuánto gana el sistema avanzando en esa dirección", "how much the system gains by moving in that direction"),
  ('<i>λ<sub>j</sub></i> ∂<i>P<sub>j</sub></i>/∂<i>a</i>', "cuánto le cuesta la penalización en esa misma dirección", "how much the penalty costs it in that same direction"),
  ('|…| &gt; …', "una condición local: si la ganancia de avanzar supera el costo, se avanza. Con penalizaciones fijas se compara la ganancia total con <i>λ<sub>j</sub></i><i>P<sub>j</sub></i>, como en el laboratorio", "a local condition: if the gain from moving exceeds the cost, the system moves. With fixed penalties one compares total gain with <i>λ<sub>j</sub></i><i>P<sub>j</sub></i>, as in the lab"),
 ],
 idea=[
  ("Una restricción dura cambia el menú: borra opciones. Una suave solo pone un precio, y un precio se paga cuando la ganancia lo supera. "
   "La diferencia no es de grado: es de naturaleza.",
   "A hard constraint changes the menu: it deletes options. A soft one only sets a price, and a price gets paid when the gain exceeds it. "
   "The difference is not one of degree: it is one of kind."),
  ("Tres consecuencias. Cuando lo que la finalidad del sistema persigue está en estado crítico —quien roba pan para no morir de hambre, quien busca la medicina de su hijo—, "
   "la ganancia en juego tiende a infinito (la pendiente de la idea 5) y ninguna penalización finita lo contiene: la violación es geometría, no una decisión moral. "
   "Los precios <i>λ</i> no son fijos: el sistema puede invertir en reducirlos con cabildeo, comunicación o captura regulatoria. "
   "Y las normas son síntomas, no causas: si una entidad estuviera incluida con peso uno, el daño que la norma permite tendría que justificarse frente a su bienestar, "
   "en lugar de quedar fuera de la cuenta (aunque incluir no garantiza no dañar: idea 11).",
   "Three consequences. When what the system's purpose pursues is in a critical state —someone who steals bread to avoid starving, someone seeking medicine for their child—, "
   "the gain at stake tends to infinity (the slope of idea 5) and no finite penalty contains it: violation is geometry, not a moral decision. "
   "The prices <i>λ</i> are not fixed: the system can invest in lowering them through lobbying, communications or regulatory capture. "
   "And norms are symptoms, not causes: if an entity were included with weight one, the harm the norm allows would have to be justified against its welfare "
   "instead of being left out of the account (though including does not guarantee not harming: idea 11)."),
  ("Las normas son una solución técnica razonable cuando no se puede ver a cada entidad: coordinan millones de decisiones sin conocer a nadie. "
   "El problema empieza cuando la herramienta se vuelve lo único que el sistema ve, mide y recompensa.",
   "Norms are a reasonable technical solution when each entity cannot be seen: they coordinate millions of decisions without knowing anyone. "
   "The trouble begins when the tool becomes the only thing the system sees, measures and rewards."),
 ],
 consequence=("La regulación es paliativa; la arquitectura es estructural. Cambiar normas sin cambiar la finalidad produce adaptación sofisticada, no transformación.",
              "Regulation is palliative; architecture is structural. Changing norms without changing the purpose produces sophisticated adaptation, not transformation."),
),

dict(n=9, mov=2, slug="fantine", nodes=["tray", "entidad"], papers=["E"], lab="trajectory",
 title=("El daño puede no tener autor.",
        "Harm may have no author."),
 scene=("Fantine trabaja, cuida a su hija Cosette e intenta sostener su vida. Nadie la odia. El amante la abandona sin consecuencias; la supervisora la despide "
        "para proteger la reputación del taller; Javert aplica la ley; los Thénardier inventan gastos. Cada decisión es defendible según el criterio de quien la toma. "
        "La suma de todas la destruye. Hugo lo dice sin rodeos: ninguno, por sí solo, la mata.",
        "Fantine works, looks after her daughter Cosette and tries to hold her life together. No one hates her. Her lover abandons her without consequence; the supervisor "
        "dismisses her to protect the workshop's reputation; Javert applies the law; the Thénardiers invent expenses. Each decision is defensible by its maker's criteria. "
        "The sum of them destroys her. Hugo says it plainly: none of them, alone, kills her."),
 formula=['Fantine ∉ <i>E</i><sub>inc</sub>(<i>k</i>)  ∀<i>k</i>,     <i>P</i><sub>F</sub>(<i>t</i>+1) ⊊ <i>P</i><sub>F</sub>(<i>t</i>)',
          'Ω<sub>1</sub>: <i>f<sub>e</sub></i> = 1 ∀<i>e</i>     Ω<sub>2</sub>: ⟦jerarquía parcial|partial hierarchy⟧     Ω<sub>3</sub>: ⟦extracción|extraction⟧'],
 reading=[
  ('<i>k</i>, ∀<i>k</i>', "cada actor —el amante, la supervisora, la autoridad, los acreedores—; «∀<i>k</i>»: para todos ellos", "each actor —the lover, the supervisor, the authority, the creditors—; “∀<i>k</i>”: for all of them"),
  ('<i>E</i><sub>inc</sub>(<i>k</i>)', "a quién incluye, como fin, la finalidad de ese actor", "whom that actor's purpose includes as an end"),
  ('<i>P</i><sub>F</sub>(<i>t</i>)', "las posibilidades reales de Fantine en el momento <i>t</i>", "Fantine's real possibilities at time <i>t</i>"),
  ('⊊', "queda estrictamente dentro: sus posibilidades se encogen. La exclusión no lo implica por lógica, pero deja sin nada que lo impida", "strictly inside: her possibilities shrink. Exclusion does not logically imply it, but it leaves nothing to prevent it"),
  ('Ω<sub>1</sub>, Ω<sub>2</sub>, Ω<sub>3</sub>', "tres geometrías según quién cuenta: todos con el mismo peso (<i>f<sub>e</sub></i> = 1, cada uno cuenta completo); un grupo privilegiado que pesa más; solo quienes tienen poder", "three geometries depending on who counts: everyone with equal weight (<i>f<sub>e</sub></i> = 1, each counts in full); a privileged group that weighs more; only those with power"),
 ],
 idea=[
  ("Yago muestra el aparato desde dentro. Fantine muestra lo que ese aparato produce, sumado, sobre quienes quedan fuera de las finalidades de los actores con poder. "
   "Es la misma estructura vista desde el otro lado.",
   "Iago shows the apparatus from within. Fantine shows what that apparatus produces, in aggregate, on those left outside the purposes of the actors with power. "
   "It is the same structure seen from the other side."),
  ("Hay una asimetría decisiva: aunque Fantine modelara perfectamente a quienes la perjudican, eso no la salvaría. Conocerlos no le da poder para obligarlos a tenerla en cuenta. "
   "Lo que la salvaría es cambiar las finalidades de quienes tienen el poder de fijar las reglas del juego.",
   "There is a decisive asymmetry: even if Fantine modeled those who harm her perfectly, it would not save her. Knowing them gives her no power to make them take her into account. "
   "What would save her is changing the purposes of those who have the power to set the rules of the game."),
  ("Por eso la intervención correcta no es cazar al villano: es cambiar la geometría. La pregunta no es si cada actor debe ser mejor persona, "
   "sino si construimos sistemas en los que la trayectoria completa de quien recibe las consecuencias sea visible y cuente.",
   "That is why the right intervention is not hunting the villain: it is changing the geometry. The question is not whether each actor should be a better person, "
   "but whether we build systems in which the full trajectory of whoever bears the consequences is visible and counts."),
 ],
 consequence=("Cuando empleo, crédito y vivienda optimizan cada uno lo suyo, el daño solo se ve si alguien mira la vida completa de quien recibe todas esas decisiones.",
              "When employment, credit and housing each optimize their own result, the harm only shows if someone looks at the whole life of the person who receives all those decisions."),
),

dict(n=10, mov=3, slug="cooperar", nodes=["posib"], papers=["R"], lab="nash",
 title=("Cooperar cambia lo posible, no solo la elección.",
        "Cooperation changes what is possible, not only the choice."),
 scene=("Una persona tiene mercancía, otra encuentra compradores, otra ofrece transporte. Ninguna necesita adoptar los fines de las demás. "
        "Pero juntas pueden ejecutar una operación que ninguna podía realizar sola. No eligieron mejor dentro del mismo menú: crearon un plato que no estaba en él.",
        "One person has goods, another finds buyers, a third offers transport. None needs to adopt the others' goals. "
        "Yet together they can carry out an operation none could perform alone. They did not choose better from the same menu: they created a dish that was not on it."),
 formula=['<i>Π<sub>i</sub></i> = (<i>K<sub>i</sub></i>, <i>P<sub>i</sub></i>, <i>J<sub>i</sub></i>, <i>H<sub>i</sub></i>)',
          '<i>P</i><sup>0</sup> ⊆ <i>P</i><sup>1</sup>,  <i>J</i> ⟦fija|fixed⟧  ⇒  max<sub><i>p</i>∈<i>P</i><sup>1</sup></sub> <i>J</i>(<i>p</i>) ≥ max<sub><i>p</i>∈<i>P</i><sup>0</sup></sub> <i>J</i>(<i>p</i>)'],
 reading=[
  ('<i>K<sub>i</sub></i>', "lo que puedo conocer y representar", "what I can know and represent"),
  ('<i>P<sub>i</sub></i>', "los planes que puedo realizar de verdad", "the plans I can actually carry out"),
  ('<i>J<sub>i</sub></i>', "el criterio con que valoro", "the criterion I value with"),
  ('<i>H<sub>i</sub></i>', "el horizonte temporal que incorporo", "the time horizon I take into account"),
 ],
 idea=[
  ("«Quiero lo mejor para mí» deja abiertas cuatro preguntas independientes: qué conozco, qué puedo hacer, qué valoro y hasta cuándo miro. "
   "Buscar lo mejor para uno mismo puede ser, precisamente, una razón para conocer a los demás.",
   "“I want what is best for me” leaves four independent questions open: what I know, what I can do, what I value and how far ahead I look. "
   "Seeking what is best for oneself may be, precisely, a reason to get to know others."),
  ("Si cooperar amplía los planes sin quitar los anteriores, y se evalúa con el mismo criterio, el máximo alcanzable no baja. Pero hay dos trampas cuando varios deciden a la vez. "
   "Un equilibrio es una situación en la que nadie gana cambiando solo su propia decisión. Primera trampa: añadir una acción puede cambiar las respuestas de los demás "
   "y llevar a un equilibrio peor (segundo juego del laboratorio). Segunda: el equilibrio puede no ser lo mejor para todos. En el dilema del prisionero, que ambos traicionen (D,D) "
   "es el equilibrio, aunque cooperar (C,C) es mejor para los dos; llegar ahí exige que ambos cambien a la vez.",
   "If cooperation widens the plans without removing the old ones, and they are judged by the same criterion, the reachable maximum does not drop. But there are two traps when several decide at once. "
   "An equilibrium is a situation in which no one gains by changing only their own decision. First trap: adding an action can change the others' responses "
   "and lead to a worse equilibrium (second game in the lab). Second: the equilibrium may not be best for everyone. In the prisoner's dilemma, both defecting (D,D) "
   "is the equilibrium, even though cooperating (C,C) is better for both; getting there requires both to change at once."),
  ("La cooperación no es solo añadir opciones a una lista: es hacer posible que varios elijan, autoricen y sostengan juntos una combinación de acciones.",
   "Cooperation is not just adding options to a list: it is making it possible for several to choose, authorize and sustain a combination of actions together."),
 ],
 consequence=("Ante un resultado pobre hay diagnósticos distintos: ¿faltaba información, una opción realizable, un criterio que valorara otros fines, mirar más lejos en el tiempo, o incentivos para sostener el acuerdo?",
              "A poor outcome has different diagnoses: was something missing in what was known, what could be done, what was valued, how far ahead anyone looked, or the incentives to sustain the agreement?"),
),

dict(n=11, mov=3, slug="quien-paga", nodes=["posib", "final"], papers=["R"], lab="coalition",
 title=("Coordinarse bien no es estar alineado.",
        "Coordinating well is not being aligned."),
 scene=("Vendedor, intermediario y transportista cooperan con eficiencia impecable. La operación les deja 4, 3 y 2. A un vecino que no estaba en la mesa —el tercero afectado— le deja −5. "
        "Si mitigan el daño, ganan 3, 2 y 2, y el vecino queda en 0. La operación mitigada suma más. Pero dos de los tres prefieren la otra.",
        "Seller, broker and carrier cooperate with flawless efficiency. The operation leaves them 4, 3 and 2. A neighbor who was not at the table —the affected third party— gets −5. "
        "If they mitigate the harm, they get 3, 2 and 2, and the neighbor stays at 0. The mitigated operation sums to more. But two of the three prefer the other one."),
 formula=['<i>J</i>(<i>x</i>) = 2<i>x</i> − 3<i>ι</i> <i>x</i><sup>2</sup>,    0 ≤ <i>x</i> ≤ ⟦capacidad|capacity⟧  ⇒  <i>x</i>* = min(⟦capacidad|capacity⟧, 1/(3<i>ι</i>))',
          'max <i>Φ</i>(<i>a</i>) = Σ<sub><i>e</i></sub> <i>α<sub>e</sub></i> <i>W<sub>e</sub></i>(<i>a</i>)   ⟦s.a.|s.t.⟧   <i>W<sub>e</sub></i>(<i>a</i>) ≥ <i>W<sub>e</sub></i>(<i>a</i><sub>0</sub>)  ∀<i>e</i>'],
 reading=[
  ('<i>x</i>', "la intensidad de la operación", "the intensity of the operation"),
  ('2<i>x</i>', "en un modelo simplificado, lo que gana la coalición: <i>x</i> para cada uno de dos socios", "in a simplified model, what the coalition gains: <i>x</i> for each of two partners"),
  ('−3<i>x</i><sup>2</sup>', "el bienestar del tercero, que no negoció", "the welfare of the third party, who did not negotiate"),
  ('<i>ι</i>', "cuánto incluye la coalición a ese tercero en su evaluación", "how much the coalition includes that third party in its evaluation"),
  ('<i>Φ</i>, <i>α<sub>e</sub></i>', "una evaluación conjunta: suma el bienestar de cada entidad con un peso positivo", "a joint evaluation: it adds each entity's welfare with a positive weight"),
  ('<i>W<sub>e</sub></i>(<i>a</i>) ≥ <i>W<sub>e</sub></i>(<i>a</i><sub>0</sub>)', "«sujeto a» (s.a.) que nadie quede peor que en el punto de partida <i>a</i><sub>0</sub>, sin operación", "“subject to” (s.t.) no one ending up worse than at the starting point <i>a</i><sub>0</sub>, without the operation"),
 ],
 idea=[
  ("La cooperación amplía capacidades; la finalidad decide hacia dónde se orientan. Una coalición puede coordinarse perfectamente y desplazar sus costos a quien no está en la mesa. "
   "Coordinación y alineación son dimensiones distintas.",
   "Cooperation expands capabilities; purpose decides where they point. A coalition can coordinate perfectly and shift its costs onto whoever is not at the table. "
   "Coordination and alignment are different dimensions."),
  ("Incluir al tercero reduce la intensidad elegida, cuando 1/(3<i>ι</i>) queda por debajo de la capacidad. Pero ni siquiera la inclusión plena basta para que el tercero no empeore: con <i>ι</i> = 1, su bienestar sigue por debajo del que tenía sin operación. "
   "Maximizar una suma con pesos positivos garantiza que no se desperdicie nada —no queda forma de mejorar a alguien sin empeorar a otro (eficiencia de Pareto)—, pero no que nadie pierda: pasar de (4,4) a (7,2) aumenta la suma y empeora a alguien.",
   "Including the third party lowers the chosen intensity, when 1/(3<i>ι</i>) falls below capacity. But not even full inclusion keeps the third party from losing: with <i>ι</i> = 1, its welfare is still below what it had without the operation. "
   "Maximizing a sum with positive weights guarantees that nothing is wasted —there is no way left to improve someone without worsening another (Pareto efficiency)— but not that no one loses: moving from (4,4) to (7,2) raises the sum and leaves someone worse off."),
  ("Por eso hay que mostrar los efectos por entidad, no solo el total, y exigir cuando corresponda condiciones de no empeoramiento. "
   "Una prohibición justificada de dañar al tercero también puede descartar la primera alternativa sin necesidad de sumar bienestares.",
   "That is why effects must be shown per entity, not just in total, with no-worsening conditions required where appropriate. "
   "A justified prohibition on harming the third party can also rule out the first alternative without summing welfare at all."),
 ],
 casetable=True,
 consequence=("La pregunta no es solo cuánto ganamos juntos, sino quién paga lo que ganamos.",
              "The question is not only how much we gain together, but who pays for what we gain."),
),

dict(n=12, mov=3, slug="tiempo", nodes=["tray"], papers=["L", "R"], lab="time",
 title=("El futuro no vale cero.",
        "The future is not worth zero."),
 scene=("Con un descuento exponencial de factor 0,95 por año, el bienestar de quienes vivirán dentro de cien años pesa 0,006. En el límite, nada. "
        "No porque alguien lo haya decidido así, sino porque la forma de la función lo produce. Las generaciones futuras no negocian hoy: no pueden protestar contra un número.",
        "With exponential discounting by a factor of 0.95 per year, the welfare of those who will live a hundred years from now weighs 0.006. In the limit, nothing. "
        "Not because anyone decided so, but because the shape of the function produces it. Future generations do not negotiate today: they cannot protest against a number."),
 formula=['<i>w</i>(<i>T</i>) = 1 + ln <i>T</i>',
          '<i>w</i>(1) = 1;   <i>w</i> ⟦creciente|increasing⟧;   <i>w</i>(<i>kT</i>) − <i>w</i>(<i>T</i>) = <i>w</i>(<i>k</i>) − <i>w</i>(1)'],
 reading=[
  ('<i>T</i>', "cuánto dura una consecuencia", "how long a consequence lasts"),
  ('<i>δ</i>, <i>δ</i><sup><i>T</i></sup>', "el factor de descuento por año (por ejemplo 0,95) y el peso que deja tras <i>T</i> años: tiende a cero", "the discount factor per year (for example 0.95) and the weight it leaves after <i>T</i> years: it tends to zero"),
  ('1 + ln <i>T</i>', "crece siempre, pero cada vez más despacio", "always grows, but ever more slowly"),
  ('<i>w</i>(<i>kT</i>) − <i>w</i>(<i>T</i>)', "invariancia proporcional: multiplicar una duración por <i>k</i> añade siempre el mismo peso, sea cual sea el punto de partida", "proportional invariance: multiplying a duration by <i>k</i> always adds the same weight, whatever the starting point"),
 ],
 idea=[
  ("La función 1 + ln <i>T</i> no es una elección arbitraria: salvo la escala, es la única continua que cumple tres axiomas sencillos —normalización, monotonía e invariancia proporcional—. "
   "El tercero lleva a una ecuación clásica (la de Cauchy) cuya solución es <i>c</i>·ln <i>T</i>; tomar <i>c</i> = 1 es una convención. "
   "Una consecuencia que dura cien años pesa unas 5,6 veces lo que una que dura uno: más, pero no cien veces más.",
   "The function 1 + ln <i>T</i> is not an arbitrary choice: up to scale, it is the only continuous one satisfying three simple axioms —normalization, monotonicity and proportional invariance—. "
   "The third leads to a classic equation (Cauchy's) whose solution is <i>c</i>·ln <i>T</i>; taking <i>c</i> = 1 is a convention. "
   "A consequence lasting a hundred years weighs about 5.6 times one lasting a single year: more, but not a hundred times more."),
  ("Ojo con la comparación: <i>δ</i><sup><i>T</i></sup> descuenta por distancia; 1 + ln <i>T</i> pondera por duración. Ponerlos lado a lado contrasta dos actitudes ante el futuro: "
   "una que lo hace valer casi cero y otra que reconoce que lo duradero pesa más.",
   "Mind the comparison: <i>δ</i><sup><i>T</i></sup> discounts by distance; 1 + ln <i>T</i> weights by duration. Setting them side by side contrasts two attitudes toward the future: "
   "one that makes it worth almost zero and one that recognizes that what lasts weighs more."),
  ("El tiempo atraviesa todo lo anterior: un beneficio presente puede erosionar capacidades futuras, una relación puede habilitar cooperación mañana, algunas pérdidas son irreversibles. "
   "No existe una regla universal según la cual mirar más lejos siempre mejore una decisión; sí existe la pregunta de qué vidas, relaciones y ecosistemas que siguen en el tiempo recibirán las consecuencias.",
   "Time runs through everything above: a present benefit can erode future capabilities, a relationship can enable cooperation tomorrow, some losses are irreversible. "
   "There is no universal rule by which looking further ahead always improves a decision; there is the question of which lives, relationships and ecosystems that continue over time will receive the consequences."),
 ],
 consequence=("Lo que una sociedad no sabe valorar en el tiempo, lo consume.",
              "What a society cannot value across time, it consumes."),
),
]

# Matriz cognición × inclusión (idea 6)
MATRIX = dict(
 rows=(("Cognición fina", "Sharp cognition"), ("Cognición pobre", "Poor cognition")),
 cols=(("Inclusión", "Inclusion"), ("Instrumentalización", "Instrumentalization")),
 cells=[
  ("C", "Cuidado informado", "Informed care", "Ver con claridad e incluir con peso uno: familia funcional, médico vocacional, buen maestro.",
        "See clearly and include with weight one: a functional family, a doctor with a true calling, a good teacher.", "green"),
  ("A", "Dominio sofisticado · Yago", "Sophisticated domination · Iago", "Ver con claridad y usar como instrumento: perfilado para manipular, un modelo que aprende a complacer.",
        "See clearly and use as an instrument: profiling to manipulate, a model that learns to please.", "purple"),
  ("B", "Cuidado impreciso", "Imprecise care", "Incluir sin saber bien qué necesita el otro: la tía que quiere bien sin entender del todo.",
        "Include without knowing well what the other needs: the aunt who means well without fully understanding.", "blue"),
  ("D", "Indiferencia", "Indifference", "Ni ver ni incluir: la burocracia en la que nadie procesa la pérdida.",
        "Neither see nor include: the bureaucracy in which no one processes the loss.", "grey"),
 ])

# Tabla del ejemplo de coalición (idea 11)
COALITION_TABLE = dict(
 head=(("Alternativa", "Alternative"), ("Vendedor", "Seller"), ("Intermediario", "Broker"), ("Transporte", "Carrier"), ("Tercero", "Third party"), ("Suma", "Sum")),
 rows=[ (("Sin operación", "No operation"), 0, 0, 0, 0, 0),
        (("Operación sin mitigación", "Unmitigated operation"), 4, 3, 2, -5, 4),
        (("Operación con mitigación", "Mitigated operation"), 3, 2, 2, 0, 7) ])

# Diagnóstico diferencial de la comunicación (idea 2)
DIAG = [
 (("No puede formular la idea", "Cannot formulate the idea"), "<i>x</i>* ∉ <i>X</i>(<i>K</i>)", ("Incompletitud del marco", "Incomplete frame"),
  ("Averroes y el teatro", "Averroes and theater"), ("Transferir marco: dar las coordenadas que faltan", "Transfer the frame: supply the missing coordinates")),
 (("Llega a otra lectura desde otros supuestos", "Reaches another reading from other assumptions"), "<i>K</i><sub>⟦receptor|receiver⟧</sub> ≠ <i>K</i><sub>⟦emisor|sender⟧</sub>", ("Desviación por supuestos previos", "Deviation from prior assumptions"),
  ("Dos paradigmas científicos", "Two scientific paradigms"), ("Explicitar los supuestos de cada lado", "Make each side's assumptions explicit")),
 (("Busca confirmar, no entender", "Seeks to confirm, not to understand"), "<i>g</i> ≠ ⟦fidelidad|fidelity⟧", ("Reconstrucción con otro fin", "Reconstruction for another end"),
  ("Sesgo de confirmación", "Confirmation bias"), ("Hacer visible el objetivo real", "Make the real objective visible")),
 (("Juzga demasiado rápido", "Judges too fast"), "<i>τ</i> ⟦insuficiente|insufficient⟧", ("Juicio prematuro", "Premature judgment"),
  ("Lectura apresurada", "Hasty reading"), ("Deliberar, releer, preguntar", "Deliberate, reread, ask")),
 (("La señal admite varias lecturas", "The signal admits several readings"), "<i>y</i> ⟦ambigua|ambiguous⟧", ("Señal ambigua", "Ambiguous signal"),
  ("Ironía sin contexto", "Irony without context"), ("Más señal, más contexto", "More signal, more context")),
 (("Rechaza un paradigma nuevo", "Rejects a new paradigm"), "<i>K</i> ⟦rígido por coherencia|rigid by coherence⟧", ("Resistencia estructural", "Structural resistance"),
  ("Un paradigma consolidado", "An established paradigm"), ("Mostrar que el reemplazo es más coherente", "Show that the replacement is more coherent")),
 (("Mantiene un juicio que nadie revisa", "Holds a judgment no one revisits"), "<i>K</i> ⟦rígido por inercia|rigid by inertia⟧", ("Prejuicio cristalizado", "Crystallized prejudice"),
  ("Estereotipo no revisado", "Unrevised stereotype"), ("Reducir el costo de transición", "Lower the cost of transition")),
 (("Lo concibe pero no lo tolera", "Can conceive it but not bear it"), "<i>x</i>* ∈ <i>X</i>(<i>K</i>), <i>x</i>* ∉ ZBS", ("Intolerancia a la sorpresa", "Intolerance to surprise"),
  ("Evidencia amenazante", "Threatening evidence"), ("Exploración guiada, en pasos tolerables", "Guided exploration, in bearable steps")),
 (("Lee el consejo como un ataque", "Reads advice as an attack"), "⟦estado relacional negativo|negative relational state⟧", ("Distorsión emocional", "Emotional distortion"),
  ("Consejo después de una discusión", "Advice after an argument"), ("Restablecer las condiciones de la relación", "Restore the conditions of the relationship")),
]

# Cadena de ética operativa (epílogo)
CHAIN = [
 (("Cognición", "Cognition"), ("¿Representa a las entidades afectadas?", "Does it represent the affected entities?"),
  ("Ceguera estructural: la entidad no aparece en registros ni métricas.", "Structural blindness: the entity is absent from records and metrics."),
  ("Ampliar la percepción.", "Expand perception.")),
 (("Especificación", "Specification"), ("¿Su bienestar entra en la finalidad con peso uno?", "Does their welfare enter the purpose with weight one?"),
  ("Instrumentalización de buena fe, invisible desde dentro.", "Good-faith instrumentalization, invisible from within."),
  ("Rediseñar la función, no añadir penalizaciones.", "Redesign the function, not add penalties.")),
 (("Transferencia", "Transfer"), ("¿Quienes operan el sistema pueden reconstruir el marco?", "Can those who run the system rebuild the frame?"),
  ("Lo inconcebible, lo intolerable, otra finalidad o una relación defensiva.", "The inconceivable, the intolerable, another purpose or a defensive relationship."),
  ("Transferir coordenadas y explorar antes de juzgar.", "Transfer coordinates and explore before judging.")),
 (("Compromiso", "Commitment"), ("¿Hay recursos reales para el cambio?", "Are there real resources for the change?"),
  ("Declaraciones sin presupuesto.", "Statements without budget."),
  ("Asignar recursos efectivos.", "Allocate effective resources.")),
 (("Ejecución", "Execution"), ("¿Cambió la arquitectura?", "Did the architecture change?"),
  ("Se añaden penalizaciones sobre la arquitectura anterior.", "Penalties are layered on the old architecture."),
  ("Cambiar <i>F</i><sub>core</sub> o volver duras las restricciones clave.", "Change <i>F</i><sub>core</sub> or make key constraints hard.")),
 (("Sostenimiento", "Persistence"), ("¿Se mantiene en el tiempo?", "Does it hold over time?"),
  ("Los <i>λ</i> vuelven a bajar y el avance se revierte.", "The <i>λ</i> drift down again and progress reverts."),
  ("Auditoría externa continua.", "Continuous external audit.")),
]

# Mapa de conceptos (referencia compacta)
CONCEPTS = [
 (("Marco conceptual", "Conceptual frame"), "<i>K</i> = (<i>C</i>, <i>R</i>, <i>w</i>)", ("Conceptos, relaciones y pesos que hacen posible una lectura.", "Concepts, relations and weights that make a reading possible."), 1),
 (("Reconstrucción generativa", "Generative reconstruction"), "<i>x̂</i> ∈ arg max <i>U</i>(<i>x</i>; <i>y</i>, <i>K</i>, <i>g</i>, <i>τ</i>)", ("Comprender es optimizar una lectura, no recibir un paquete.", "Understanding is optimizing a reading, not receiving a package."), 1),
 (("Dos procesos generativos", "Two generative processes"), "<i>x<sub>e</sub></i> → <i>y</i> → <i>x̂<sub>r</sub></i> → <i>y′</i>", ("Emisor y receptor generan; la retroalimentación acerca sus construcciones.", "Sender and receiver both generate; feedback brings their constructions closer."), 1),
 (("Inconcebible, improbable, intolerable", "Inconceivable, improbable, intolerable"), "<i>x</i> ∉ <i>X</i>(<i>K</i>) · Pr ≈ 0 · <i>x</i> ∉ ZBS", ("Tres bloqueos distintos con tres remedios distintos.", "Three different blockages with three different remedies."), 2),
 (("Claridad relativa", "Relative clarity"), "vol{<i>x</i> ∈ <i>X</i>(<i>K<sub>r</sub></i>) : <i>x</i> ~ <i>y</i>} ↓", ("Claro es lo que reduce las lecturas plausibles para un receptor dado.", "Clear is what shrinks the plausible readings for a given receiver."), 2),
 (("Explorar antes de juzgar", "Explore before judging"), "<i>H</i> = {<i>h</i><sub>1</sub>…<i>h<sub>k</sub></i>} → ⟦evidencia → revisión|evidence → revision⟧", ("Generar 3–5 alternativas genuinas antes de evaluar.", "Generate 3–5 genuine alternatives before evaluating."), 2),
 (("Comprensión como trayectoria", "Understanding as a trajectory"), "(<i>K<sub>t</sub></i>, <i>g<sub>t</sub></i>, <i>x̂<sub>t</sub></i>) → (<i>K</i><sub><i>t</i>+1</sub>, …)", ("Recibir no es integrar: integrar modifica el marco.", "Receiving is not integrating: integrating modifies the frame."), "S"),
 (("Fidelidad y acuerdo", "Fidelity and agreement"), "⟦paráfrasis · predicción · transferencia · contraste|paraphrase · prediction · transfer · contrast⟧", ("Comprender una idea no es estar de acuerdo con ella.", "Understanding an idea is not agreeing with it."), "S"),
 (("Entidad", "Entity"), "<i>E</i> = {<i>e</i> : ∃<i>a</i>,<i>b</i>  <i>W<sub>e</sub></i>(<i>a</i>) ≠ <i>W<sub>e</sub></i>(<i>b</i>)}", ("Cuenta quien puede estar mejor o peor, tenga o no agencia.", "Whoever can be better or worse off counts, with or without agency."), 3),
 (("Clausura observacional", "Observational closure"), "<i>E</i><sub>op</sub> ⊊ <i>E</i> ⇒ <i>κ̂</i> ≠ <i>κ</i> ⟦en general|in general⟧", ("Un sistema no puede medir su desempeño real desde dentro.", "A system cannot measure its real performance from within."), 4),
 (("Problemas inversos", "Inverse problems"), "<i>H</i>(<i>y</i>) = {<i>h</i> : <i>h</i> ⟦compatible con|compatible with⟧ <i>y</i>}", ("Elicitar sin inventar: diseñar observaciones que distingan hipótesis.", "Elicit without inventing: design observations that tell hypotheses apart."), "S"),
 (("Bienestar dimensional", "Dimensional welfare"), "<i>W<sub>e</sub></i> = Σ <i>w<sub>i</sub></i> <i>V</i>(<i>D<sub>i</sub></i>, <i>C<sub>i</sub></i>)", ("Privación, florecimiento y saturación en cada dimensión.", "Deprivation, flourishing and saturation in each dimension."), 5),
 (("Reconstruir el bienestar con la entidad", "Rebuilding welfare with the entity"), "<i>Ŵ</i><sup>(0)</sup> → <i>Ŵ</i><sup>(1)</sup> → …", ("Elicitar es colaborar, no imponer una escala desde fuera.", "Eliciting is collaborating, not imposing a scale from outside."), 5),
 (("Suficiencia para decidir", "Sufficiency for decision"), "∀<i>W</i>∈𝒲: <i>W</i>(<i>a</i>) &gt; <i>W</i>(<i>b</i>) ⇒ <i>a</i> ≻ <i>b</i>", ("No hace falta conocer toda la función para distinguir dos opciones.", "One need not know the whole function to tell two options apart."), 5),
 (("Inclusión e instrumentalización", "Inclusion and instrumentalization"), "<i>E</i><sub>op</sub> = <i>E</i><sub>inc</sub> ∪ <i>E</i><sub>instr</sub>", ("El mismo conocimiento puede servir al otro o servirse del otro.", "The same knowledge can serve the other or make use of them."), 6),
 (("Plano inclusión–error", "Inclusion–error plane"), "<i>F</i><sub>ref</sub> − <i>F̂</i> = Σ[(1−<i>ι</i>)<i>W</i> + <i>ιε</i>],  <i>ε</i> = <i>W</i> − <i>Ŵ</i>", ("Dos fuentes de daño: excluir y representar mal.", "Two sources of harm: excluding and misrepresenting."), 6),
 (("Finalidad declarada, de fondo y efectiva", "Declared, core and effective purpose"), "<i>F</i><sub>eff</sub> = <i>F</i><sub>core</sub> − Σ<i>λ<sub>j</sub>P<sub>j</sub></i>", ("Lo que se declara no orienta la acción; lo que se maximiza, sí.", "What is declared does not steer action; what is maximized does."), 7),
 (("Restricciones duras y suaves", "Hard and soft constraints"), "<i>A</i><sub>hard</sub> ⊆ <i>A</i>;  |∂<i>F</i>| &gt; <i>λ</i>|∂<i>P</i>|", ("Eliminar una región no es ponerle precio.", "Removing a region is not pricing it."), 8),
 (("Normas como síntomas", "Norms as symptoms"), "⟦régimen N ↔ régimen E|regime N ↔ regime E⟧", ("Las normas revelan la finalidad; cambiarlas sin cambiarla produce adaptación.", "Norms reveal the purpose; changing them without it produces adaptation."), 8),
 (("Geometrías éticas", "Ethical geometries"), "Ω<sub>1</sub> · Ω<sub>2</sub> · Ω<sub>3</sub>", ("Cooperación, jerarquía parcial, extracción: según quién cuenta.", "Cooperation, partial hierarchy, extraction: depending on who counts."), 9),
 (("Perspectiva", "Perspective"), "<i>Π</i> = (<i>K</i>, <i>P</i>, <i>J</i>, <i>H</i>)", ("Conocer, poder, valorar y mirar hacia adelante son operaciones distintas.", "Knowing, being able, valuing and looking ahead are distinct operations."), 10),
 (("Interdependencia", "Interdependence"), "∂Σ<i>W<sub>e</sub></i>/∂<i>a<sub>i</sub></i> = ∂<i>W<sub>i</sub></i>/∂<i>a<sub>i</sub></i> + Σ<sub><i>e</i>≠<i>i</i></sub> ∂<i>W<sub>e</sub></i>/∂<i>a<sub>i</sub></i>", ("Conocer los efectos ajenos no es valorarlos como fines.", "Knowing effects on others is not valuing them as ends."), "R"),
 (("Más acciones, peor equilibrio", "More actions, worse equilibrium"), "<i>P</i><sup>0</sup> ⊆ <i>P</i><sup>1</sup> ⇏ ⟦mejor equilibrio|better equilibrium⟧", ("Una opción nueva cambia las respuestas de los demás.", "A new option changes the others' responses."), 10),
 (("No empeoramiento", "No-worsening"), "max <i>Φ</i> ⟦s.a.|s.t.⟧ <i>W<sub>e</sub></i>(<i>a</i>) ≥ <i>W<sub>e</sub></i>(<i>a</i><sub>0</sub>)", ("Eficiencia agregada con protección por entidad.", "Aggregate efficiency with per-entity protection."), 11),
 (("Peso temporal", "Temporal weight"), "<i>w</i>(<i>T</i>) = 1 + ln <i>T</i>", ("El futuro crece en peso, despacio, sin desaparecer.", "The future grows in weight, slowly, without vanishing."), 12),
 (("Cadena de ética operativa", "Chain of operative ethics"), "⟦cognición → … → sostenimiento|cognition → … → persistence⟧", ("Seis eslabones; todos necesarios, ninguno suficiente.", "Six links; all necessary, none sufficient."), 13),
 (("Objetivo común sin centro", "Common objective without a center"), "Nash ⇒ max <i>Φ</i> (⟦concavidad conjunta|joint concavity⟧)", ("Compartir criterio no exige concentrar autoridad.", "Sharing a criterion does not require concentrating authority."), 13),
 (("Meta-colaborador", "Meta-collaborator"), "<i>K<sub>a</sub></i> ↔ preguntas ↔ <i>K<sub>b</sub></i>", ("Amplía la comprensión de las partes sin sustituir su criterio.", "Widens the parties' understanding without replacing their judgment."), "S"),
]

PAPERS = [
 ("S", ("Un modelo de comunicación semántica", "A Model of Semantic Communication"),
       ("Reconstrucción generativa, marcos conceptuales y exploración guiada", "Generative reconstruction, conceptual frames and guided exploration"),
       "10.5281/zenodo.20062523", [1, 2]),
 ("E", ("Un modelo ético", "An Ethical Model"),
       ("Componentes, geometría y cadena de ética operativa", "Components, geometry and the chain of operative ethics"),
       "10.5281/zenodo.20265580", [6, 7, 8, 9, 13]),
 ("L", ("La alineación no se especifica", "Alignment Is Not Specified"),
       ("Emerge geométricamente de lo que el sistema percibe y optimiza", "It emerges geometrically from what the system perceives and optimizes"),
       "10.5281/zenodo.19529678", [5, 12]),
 ("A", ("La agencia no es necesaria", "Agency Is Not Necessary"),
       ("Optimización sistémica y clausura observacional", "Systemic optimization and observational closure"),
       "10.5281/zenodo.19723999", [3, 4]),
 ("R", ("El alcance de la racionalidad · V3", "The Scope of Rationality · V3"),
       ("Del interés propio a las posibilidades sistémicas", "From self-interest to systemic possibilities"),
       "10.5281/zenodo.24534596", [3, 10, 11, 12, 13]),
]
