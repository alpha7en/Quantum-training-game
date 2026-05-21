import re
import os

def extract_tasks_from_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the challengeTasks block
    start_marker = 'export const challengeTasks: ChallengeTask[] = ['
    start_pos = content.find(start_marker)
    if start_pos == -1:
        raise ValueError("Could not find start of challengeTasks array")
    
    array_content = content[start_pos + len(start_marker):]
    
    # We will search for id: '...' and extract the surrounding brace block
    tasks = {}
    matches = list(re.finditer(r"id:\s*'([^']+)'", array_content))
    for match in matches:
        t_id = match.group(1)
        start = match.start()
        
        # Find the opening brace before this ID
        brace_open_idx = array_content.rfind('{', 0, start)
        if brace_open_idx == -1:
            continue
            
        # Find the matching closing brace
        depth = 0
        brace_close_idx = -1
        for idx in range(brace_open_idx, len(array_content)):
            char = array_content[idx]
            if char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
                if depth == 0:
                    brace_close_idx = idx
                    break
        
        if brace_close_idx != -1:
            task_code = array_content[brace_open_idx:brace_close_idx+1]
            # Avoid corrupted/duplicated ones
            if t_id not in tasks or len(task_code) > len(tasks[t_id]):
                # If we already have it, keep the longer/correct one
                tasks[t_id] = task_code

    return tasks

def main():
    file_path = '/Users/alpha7en/Documents/development/quantum_app/src/TaskManager.tsx'
    tasks = extract_tasks_from_file(file_path)
    print("Parsed tasks from file:", list(tasks.keys()))
    
    # Custom definitions for restored and new tasks
    custom_tasks = {}
    
    custom_tasks['grover-diffuser-2'] = """{
    id: 'grover-diffuser-2',
    name: 'Диффузор Гровера (2 кубита)',
    description: 'Постройте оператор диффузии (диффузор) алгоритма Гровера на двух кубитах. Диффузор должен выполнять преобразование I - 2|s⟩⟨s|.',
    numQubits: 2,
    initialPreset: ['0', '0'],
    targetType: 'unitary',
    targetUnitary: [
      [{re: 0.5, im: 0}, {re: -0.5, im: 0}, {re: -0.5, im: 0}, {re: -0.5, im: 0}],
      [{re: -0.5, im: 0}, {re: 0.5, im: 0}, {re: -0.5, im: 0}, {re: -0.5, im: 0}],
      [{re: -0.5, im: 0}, {re: -0.5, im: 0}, {re: 0.5, im: 0}, {re: -0.5, im: 0}],
      [{re: -0.5, im: 0}, {re: -0.5, im: 0}, {re: -0.5, im: 0}, {re: 0.5, im: 0}]
    ],
    allowedGates: ['H', 'X', 'C', 'Z'],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'hard',
    explanationMarkdown: `### Диффузор Гровера (Grover Diffuser)

Диффузор Гровера осуществляет «отражение относительно среднего значения», увеличивая амплитуды правильных исходов и уменьшая все остальные.

#### Математическая структура:
Оператор диффузии имеет вид:
$$U_s = 2|s\\\\rangle\\\\langle s| - I$$
Где $|s\\\\rangle$ — состояние равномерной суперпозиции. С точностью до глобальной фазы, это эквивалентно:
$$U_s \\\\equiv I - 2|s\\\\rangle\\\\langle s| = (H^{\\\\otimes 2}) (I - 2|00\\\\rangle\\\\langle 00|) (H^{\\\\otimes 2})$$

#### Схема реализации:
1. Нанесите гейты Адамара на оба кубита.
2. Нанесите гейты $X$ на оба кубита (для перевода $|00\\\\rangle$ в $|11\\\\rangle$).
3. Примените контролируемый гейт $CZ$ (или CNOT с предварительным и последующим переходом целевого кубита в базис X), создающий фазовый сдвиг $-1$ для состояния $|11\\\\rangle$.
4. Верните кубиты обратно гейтами $X$ и гейтами Адамара $H$.`
  }"""

    custom_tasks['phase-flip-code'] = """{
    id: 'phase-flip-code',
    name: 'Защита от фазовых ошибок (Phase Flip Code)',
    description: 'Защитите состояние Q₀ от фазовой ошибки Z в колонке t=3. Используйте гейты Адамара для перехода в базис Хадамара, закодируйте и исправьте состояние вентилем Toffoli.',
    numQubits: 3,
    initialPreset: ['0', '0', '0'],
    targetType: 'state',
    targetState: [
      { re: Math.sqrt(3)/2, im: 0 },
      cZero(),
      cZero(),
      cZero(),
      { re: 0.5, im: 0 },
      cZero(),
      cZero(),
      cZero()
    ],
    allowedGates: ['H', 'X', 'C'],
    fixedGates: [
      { row: 0, col: 0, gate: { type: 'Ry', param: 'pi/3', paramVal: Math.PI/3, fixed: true } },
      { row: 0, col: 3, gate: { type: 'Z', fixed: true } }
    ],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'hard',
    explanationMarkdown: `### Код коррекции фазовых ошибок (Phase Flip Code)

Фазовые ошибки ($Z$) являются специфически квантовыми и не имеют аналогов в классических компьютерах. Однако их можно исправить с помощью того же трехкубитового кода, если перевести кубиты в базис Адамара (базис фаз).

#### Алгоритм работы:
1. **Кодирование**: Запутайте исходный кубит $Q_0$ со вспомогательными кубитами $Q_1, Q_2$ с помощью CNOT.
2. **Смена базиса**: Примените гейты $H$ ко всем трем кубитам. Ошибка $Z$ в этом базисе действует как $X$ (переворот бита).
3. **Шум**: Происходит ошибка $Z$ на первом кубите (уже добавлена в такте 3).
4. **Обратная смена базиса**: Снова примените $H$ ко всем кубитам.
5. **Декодирование и исправление**: Примените CNOT синдромы и Toffoli (CCNOT), аналогично трехкубитовому коду переворота бита.`
  }"""

    custom_tasks['entanglement-swapping'] = """{
    id: 'entanglement-swapping',
    name: 'Квантовый обмен запутанностью (Entanglement Swapping)',
    description: 'Создайте две независимые пары Белля (на Q₀-Q₁ и Q₂-Q₃). Выполните измерение в базисе Белля на кубитах Q₁ и Q₂, чтобы запутать ранее не связанные кубиты Q₀ и Q₃.',
    numQubits: 4,
    initialPreset: ['0', '0', '0', '0'],
    targetType: 'state',
    targetState: generateEntanglementSwappingTarget(),
    allowedGates: ['H', 'X', 'Z', 'C'],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'hard',
    explanationMarkdown: `### Обмен запутанностью (Entanglement Swapping)

Обмен запутанностью — это фундаментальный протокол квантовых сетей и квантовых репитеров. Он позволяет запутать две квантовые частицы, которые никогда не встречались и не взаимодействовали напрямую.

#### Алгоритм работы:
1. Подготовьте две независимые пары Белля:
   - Первую пару на кубитах $Q_0$ и $Q_1$: гейт $H$ на $Q_0$, затем CNOT с $Q_0$ на $Q_1$.
   - Вторую пару на кубитах $Q_2$ и $Q_3$: гейт $H$ на $Q_2$, затем CNOT с $Q_2$ на $Q_3$.
2. Выполните измерение в базисе Белля на кубитах $Q_1$ и $Q_2$:
   - Примените CNOT с $Q_1$ на $Q_2$.
   - Примените гейт $H$ на $Q_1$.
3. В результате этого измерения кубиты $Q_0$ и $Q_3$ окажутся запутанными, несмотря на то, что между ними не проводилось прямых квантовых операций.`
  }"""

    custom_tasks['qpe-2'] = """{
    id: 'qpe-2',
    name: 'Квантовая оценка фазы (QPE, 2 бита)',
    description: 'Оцените фазу оператора U = P(π/2) с использованием двух измеряемых кубитов Q₀, Q₁ и одного целевого Q₂. Целевой кубит переведите в состояние |1⟩. Схема должна переводить измеряемые кубиты в состояние |01⟩ (без SWAP - в |10⟩).',
    numQubits: 3,
    initialPreset: ['0', '0', '1'],
    targetType: 'state',
    targetState: [
      cZero(),
      cZero(),
      cZero(),
      cZero(),
      cZero(),
      { re: 1, im: 0 },
      cZero(),
      cZero()
    ],
    allowedGates: ['H', 'P', 'C', 'X'],
    allowedParams: ['pi/2', '-pi/2'],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'hard',
    explanationMarkdown: `### Квантовая оценка фазы (QPE, 2 бита)

Алгоритм оценки фазы (QPE) предназначен для нахождения фазы $\\varphi$ собственного значения $e^{2\\pi i \\varphi}$ некоторого унитарного оператора $U$. Здесь $U = P(\\pi/2)$, что соответствует $\\varphi = 1/4 = 0.01_2$.

#### Схема реализации:
1. Подготовьте целевой кубит $Q_2$ в состоянии $|1\\rangle$ (с помощью гейта $X$).
2. Нанесите гейты Адамара на измеряемые кубиты $Q_0, Q_1$.
3. Примените контролируемые операции:
   - Контролируемый-$U^{2^0}$ ($CP(\\pi/2)$) с управляющим $Q_1$ на мишень $Q_2$.
   - Контролируемый-$U^{2^1}$ ($CP(\\pi) = CZ$) с управляющим $Q_0$ на мишень $Q_2$.
4. Выполните обратное преобразование Фурье (QFT⁻¹) на измеряемых кубитах $Q_0, Q_1$:
   - Гейт Адамара на $Q_0$.
   - Контролируемый фазовый гейт $CP(-\\pi/2)$ с управляющим $Q_1$ на мишень $Q_0$.
   - Гейт Адамара на $Q_1$.`
  }"""

    custom_tasks['qft-3'] = """{
    id: 'qft-3',
    name: '3-кубитовое преобразование Фурье (QFT)',
    description: 'Реализуйте 3-кубитовое квантовое преобразование Фурье (QFT). Используйте гейты H, контролируемые фазовые сдвиги P(π/2), P(π/4) и CNOT для перестановки кубитов.',
    numQubits: 3,
    initialPreset: ['0', '0', '0'],
    targetType: 'unitary',
    targetUnitary: generateQft3Matrix(),
    allowedGates: ['H', 'P', 'C', 'X'],
    allowedParams: ['pi/2', 'pi/4'],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'extreme',
    explanationMarkdown: `### 3-кубитовое преобразование Фурье (QFT)

Квантовое преобразование Фурье для $N=2^3=8$ состояний переводит состояния из вычислительного базиса в частотный. Матрица перехода $F_8$ имеет элементы $(F_8)_{j,k} = \\frac{1}{\\sqrt{8}} e^{2\\pi i j k / 8}$.

#### Инструкция к построению схемы:
1. Примените гейт Адамара $H$ на кубит $Q_0$.
2. Примените контролируемый фазовый гейт $CP(\\pi/2)$ с управляющим $Q_1$ на цель $Q_0$.
3. Примените контролируемый фазовый гейт $CP(\\pi/4)$ с управляющим $Q_2$ на цель $Q_0$.
4. Примените гейт Адамара $H$ на кубит $Q_1$.
5. Примените контролируемый фазовый гейт $CP(\\pi/2)$ с управляющим $Q_2$ на цель $Q_1$.
6. Примените гейт Адамара $H$ на кубит $Q_2$.
7. Переставьте кубиты с помощью SWAP гейтов (или CNOT-эквивалентов) $Q_0 \\\\leftrightarrow Q_2$ для завершения преобразования.`
  }"""

    custom_tasks['deutsch-jozsa-3q'] = """{
    id: 'deutsch-jozsa-3q',
    name: 'Алгоритм Дойча-Джозы (3 кубита)',
    description: 'Определите свойства встроенного оракула для двух входных кубитов Q₀, Q₁ и одного целевого кубита Q₂. Сбалансированный оракул реализует f(x₀, x₁) = x₀ ⊕ x₁.',
    numQubits: 3,
    initialPreset: ['0', '0', '1'],
    targetType: 'state',
    targetState: [
      cZero(),
      cZero(),
      cZero(),
      cZero(),
      cZero(),
      cZero(),
      { re: 1/Math.sqrt(2), im: 0 },
      { re: -1/Math.sqrt(2), im: 0 }
    ],
    allowedGates: ['H'],
    fixedGates: [
      { row: 0, col: 2, gate: { type: 'C', fixed: true } },
      { row: 2, col: 2, gate: { type: 'X', fixed: true } },
      { row: 1, col: 3, gate: { type: 'C', fixed: true } },
      { row: 2, col: 3, gate: { type: 'X', fixed: true } }
    ],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'medium',
    explanationMarkdown: `### Алгоритм Дойча-Джозы (3 кубита)

Расширение алгоритма Дойча-Джозы для $n=2$ входных (запросы) кубитов ($Q_0, Q_1$) и одного целевого ($Q_2$). Функция оракула сбалансирована и имеет вид $f(x_0, x_1) = x_0 \\\\oplus x_1$.

#### Схема реализации:
1. Входные кубиты $Q_0, Q_1$ инициализированы в $|0\\\\rangle$, целевой $Q_2$ — в $|1\\\\rangle$.
2. Примените гейты Адамара ко всем кубитам ($Q_0, Q_1, Q_2$) перед оракулом.
3. Оракул выполняет CNOT с $Q_0$ на $Q_2$ и CNOT с $Q_1$ на $Q_2$ в колонках 2 и 3.
4. После действия оракула фазовый отскок переводит входные кубиты в состояние $|-\\\\rangle \\\\otimes |-\\\\rangle$.
5. Снова примените гейты Адамара к $Q_0$ и $Q_1$, чтобы вернуть их в вычислительный базис $|11\\\\rangle$.`
  }"""

    custom_tasks['vqe-h2-ansatz'] = """{
    id: 'vqe-h2-ansatz',
    name: 'VQE-анзац для молекулы H₂',
    description: 'Подготовьте однократно-возбужденный анзац Хартри-Фока для молекулы H₂: |Ψ(θ)⟩ = cos(θ/2)|01⟩ - sin(θ/2)|10⟩ с углом θ = π/3. Начните с состояния |01⟩, используйте Ry(π/3) на Q₀, CNOT и фазовую коррекцию Z.',
    numQubits: 2,
    initialPreset: ['0', '1'],
    targetType: 'state',
    targetState: [
      cZero(),
      { re: Math.sqrt(3)/2, im: 0 },
      { re: -0.5, im: 0 },
      cZero()
    ],
    allowedGates: ['Ry', 'X', 'C', 'Z'],
    allowedParams: ['pi/3'],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'hard',
    explanationMarkdown: `### VQE-анзац для молекулы H₂

Вариационный квантовый алгоритм решения собственных значений (VQE) является одним из ключевых алгоритмов квантовой химии для нахождения энергии основного состояния молекул (например, водорода $H_2$).

Однократно-возбужденное состояние Hartree-Fock (Hartree-Fock single-excitation ansatz) для двух кубитов после редукции симметрии имеет вид:
$$|\\\\Psi(\\\\theta)\\\\rangle = \\\\cos(\\\\theta/2)|01\\\\rangle - \\\\sin(\\\\theta/2)|10\\\\rangle$$

#### Схема реализации (для $\\\\theta = \\\\pi/3$):
1. Кубиты инициализированы в состоянии $|01\\\\rangle$ (входной кубит $Q_1$ в $|1\\\\rangle$).
2. Примените вращение $Ry(\\\\pi/3)$ на кубит $Q_0$.
3. Примените контролируемый гейт CNOT с $Q_0$ (контроль) на $Q_1$ (цель). Это переведет $|11\\\\rangle$ в $|10\\\\rangle$.
4. Примените фазовый гейт $Z$ к кубиту $Q_0$, чтобы скорректировать знак у состояния $|10\\\\rangle$ на отрицательный.`
  }"""

    custom_tasks['qec-syndrome-measurement'] = """{
    id: 'qec-syndrome-measurement',
    name: 'Измерение синдрома фазовой ошибки',
    description: 'Соберите синдромы фазовых ошибок для 3-кубитового кода фазового флипа на 2 синдромных анциллах Q₃, Q₄. Данные кубиты (Q₀, Q₁, Q₂) находятся в состоянии |+-+⟩, анциллы — в |00⟩.',
    numQubits: 5,
    initialPreset: ['+', '-', '+', '0', '0'],
    targetType: 'state',
    targetState: generateQecSyndromeTargetState(),
    allowedGates: ['H', 'X', 'C'],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'hard',
    explanationMarkdown: `### Измерение синдрома фазовой ошибки

В квантовой коррекции ошибок фазовые ошибки ($Z$) исправляются путем перехода в базис Хадамара (базис фаз), где они становятся битовыми ошибками ($X$).

В этой задаче:
* 3 кубита данных ($Q_0, Q_1, Q_2$) инициализированы в состоянии $|+-+\\\\rangle$.
* 2 вспомогательные анциллы ($Q_3, Q_4$) инициализированы в состоянии $|00\\\\rangle$.
* Наша цель — измерить синдромы фазовых ошибок $X_0 X_1$ на $Q_3$ и $X_1 X_2$ на $Q_4$.

#### Схема реализации:
1. Переведите кубиты данных в вычислительный базис, применив гейты $H$ на $Q_0, Q_1, Q_2$.
2. Измерьте четность (синдром) соседних кубитов с помощью CNOT гейтов на анциллы:
   * Синдром первой пары: CNOT с $Q_0$ на $Q_3$ и с $Q_1$ на $Q_3$.
   * Синдром второй пары: CNOT с $Q_1$ на $Q_4$ и с $Q_2$ на $Q_4$.
3. Верните кубиты данных в базис Адамара с помощью гейтов $H$ на $Q_0, Q_1, Q_2$.`
  }"""

    custom_tasks['qpe-3'] = """{
    id: 'qpe-3',
    name: 'Квантовая оценка фазы (QPE, 3 бита)',
    description: 'Реализуйте 3-битную оценку фазы оператора U = P(π/4) с использованием трех измеряемых кубитов Q₀, Q₁, Q₂ и одного целевого Q₃. Целевой кубит переведите в |1⟩. Без SWAP в конце биты считаются в обратном порядке.',
    numQubits: 4,
    initialPreset: ['0', '0', '0', '1'],
    targetType: 'state',
    targetState: generateQpe3TargetState(),
    allowedGates: ['H', 'P', 'C', 'X'],
    allowedParams: ['pi/2', '-pi/2', 'pi/4', '-pi/4', 'pi/8', '-pi/8'],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'extreme',
    numColumns: 14,
    explanationMarkdown: `### Квантовая оценка фазы (QPE, 3 бита)

Алгоритм оценки фазы (QPE) для 3 бит позволяет оценить фазу оператора $U = P(\\\\pi/4)$ с точностью до $2^{-3} = 1/8$. Фаза составляет $\\\\varphi = 1/8$, что соответствует двоичной дроби $0.001_2$.

#### Схема реализации:
1. Подготовьте целевой кубит $Q_3$ в состоянии $|1\\\\rangle$ гейтом $X$.
2. Примените гейты Адамара к измеряемым кубитам $Q_0, Q_1, Q_2$.
3. Примените контролируемые операции:
   - Контролируемый-$U^{2^0} = CP(\\\\pi/4)$ с управляющим $Q_2$ на цель $Q_3$.
   - Контролируемый-$U^{2^1} = CP(\\\\pi/2)$ с управляющим $Q_1$ на цель $Q_3$.
   - Контролируемый-$U^{2^2} = CP(\\\\pi) = CZ$ с управляющим $Q_0$ на цель $Q_3$.
4. Выполните обратное квантовое преобразование Фурье (QFT⁻¹) на измеряемых кубитах $Q_0, Q_1, Q_2$:
   - Гейт $H$ на $Q_0$.
   - Контролируемый фазовый гейт $CP(-\\\\pi/2)$ с управляющим $Q_1$ на цель $Q_0$.
   - Контролируемый фазовый гейт $CP(-\\\\pi/4)$ с управляющим $Q_2$ на цель $Q_0$.
   - Гейт $H$ на $Q_1$.
   - Контролируемый фазовый гейт $CP(-\\\\pi/2)$ с управляющим $Q_2$ на цель $Q_1$.
   - Гейт $H$ на $Q_2$.

*Обратите внимание: без SWAP-гейтов биты считываются в обратном порядке (Q₀ = 1, Q₁ = 0, Q₂ = 0), что соответствует результирующему состоянию |1001⟩.*`
  }"""

    # Apply custom definitions
    for t_id, t_code in custom_tasks.items():
        tasks[t_id] = t_code

    # Ordered list of all 28 tasks by difficulty
    sorted_ids = [
        # Easy
        'hadamard-sandwich',
        'quantum-fourier-1',
        'bell-singlet',
        'ghz-state',
        'phase-kickback',
        'swap-state-transfer',
        'bell-triplet-ghz',
        # Medium
        'deutsch-jozsa',
        'bernstein-vazirani',
        'superdense-coding',
        'qft-2',
        'toffoli-cnot-target',
        'quantum-teleportation',
        'swap-test',
        'deutsch-jozsa-3q',
        # Hard
        'bit-flip-code',
        'chsh-correlation',
        'w-state-prep',
        'grover-diffuser-2',
        'phase-flip-code',
        'entanglement-swapping',
        'qpe-2',
        'vqe-h2-ansatz',
        'qec-syndrome-measurement',
        # Extreme
        'qft-3',
        'toffoli-decomposition',
        'autonomous-qec-bit',
        'qpe-3'
    ]

    # Build the challengeTasks array text
    array_lines = ['export const challengeTasks: ChallengeTask[] = [']
    for idx, t_id in enumerate(sorted_ids):
        if t_id not in tasks:
            print(f"ERROR: Missing task code for {t_id}")
            continue
        
        # Clean task code indent
        task_code = tasks[t_id].strip()
        # Add comma if not present at the end
        if not task_code.endswith(','):
            # check if it ends with }
            if task_code.endswith('}'):
                task_code += ','
        
        array_lines.append(task_code)
    
    array_lines.append('];')
    array_str = '\n\n  '.join(array_lines)

    # Read original file contents
    with open(file_path, 'r', encoding='utf-8') as f:
        full_content = f.read()

    # Reconstruct the file
    # 1. Header (up to challengeTasks)
    start_pos = full_content.find('export const challengeTasks')
    if start_pos == -1:
        raise ValueError("Could not find start of challengeTasks array in file")
        
    header = full_content[:start_pos]
    
    # Let's verify if the helper functions are defined in the header.
    # We need to insert generateQecSyndromeTargetState and generateQpe3TargetState before the array!
    # Let's insert them right after generateQecTargetState definition in the header.
    qec_target_pos = header.find('export const generateQecTargetState')
    if qec_target_pos == -1:
        raise ValueError("Could not find generateQecTargetState in header")
    
    # Find the end of generateQecTargetState
    brace_count = 0
    end_qec_pos = -1
    for idx in range(qec_target_pos, len(header)):
        char = header[idx]
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                end_qec_pos = idx + 1
                break
                
    if end_qec_pos == -1:
        raise ValueError("Could not find end of generateQecTargetState")
        
    # Build the new helpers
    new_helpers = """

export const generateQecSyndromeTargetState = (): StateVector => {
  const state = Array.from({ length: 32 }, () => cZero());
  const amp = 1 / Math.sqrt(8);
  state[3] = { re: amp, im: 0 };
  state[7] = { re: amp, im: 0 };
  state[11] = { re: -amp, im: 0 };
  state[15] = { re: -amp, im: 0 };
  state[19] = { re: amp, im: 0 };
  state[23] = { re: amp, im: 0 };
  state[27] = { re: -amp, im: 0 };
  state[31] = { re: -amp, im: 0 };
  return state;
};

export const generateQpe3TargetState = (): StateVector => {
  const state = Array.from({ length: 16 }, () => cZero());
  state[9] = { re: 1, im: 0 };
  return state;
};"""

    header = header[:end_qec_pos] + new_helpers + header[end_qec_pos:]

    # 2. Rest of the file (from runCircuit onwards)
    run_circuit_pos = full_content.find('export const runCircuit =')
    if run_circuit_pos == -1:
        raise ValueError("Could not find runCircuit in file")
        
    # We want to skip any comments just before runCircuit, or start from '// Helper to simulate'
    helper_comment = '// Helper to simulate the quantum'
    comment_pos = full_content.find(helper_comment)
    if comment_pos != -1 and comment_pos < run_circuit_pos:
        rest = full_content[comment_pos:]
    else:
        rest = full_content[run_circuit_pos:]

    # Combine everything
    new_full_content = header + array_str + '\n\n' + rest

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_full_content)
        
    print("Successfully reconstructed TaskManager.tsx!")
    print("Total tasks written:", len(sorted_ids))

if __name__ == '__main__':
    main()
