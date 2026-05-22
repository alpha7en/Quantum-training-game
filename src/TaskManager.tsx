import React, { useState, useMemo, useEffect } from 'react';
import { Ticket, ticketsData } from './ticketsData';
import {
  Complex, StateVector, DensityMatrix,
  cZero, cOne, cMul, cConj,
  getDensityMatrixFromState, applyUnitaryToState, applyUnitaryToDensityMatrix,
  gateH, gateX, gateY, gateZ, gateRx, gateRy, gateRz, gateP,
  createUnitaryForGate,
  computeFidelity,
  tensorProductVectors, tensorProductMatrices, matrixMul,
  applyH1, applyCNOT
} from './quantumMath';
import { GateInstance, QubitInitialState } from './CircuitBuilder';

export interface ChallengeTask {
  id: string;
  name: string;
  description: string;
  numQubits: number;
  initialPreset: QubitInitialState['preset'][];
  targetType: 'state' | 'unitary';
  targetState?: StateVector;
  targetUnitary?: Complex[][];
  allowedGates?: string[];
  fixedGates?: { row: number; col: number; gate: GateInstance }[];
  lockInitialStates?: boolean;
  lockQubits?: boolean;
  allowedParams?: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  explanationMarkdown: string;
  numColumns?: number;
}

// ── TARGET GENERATOR HELPERS FOR NEW TASKS ───────────────────────────────────
export const generateQft3Matrix = (): Complex[][] => {
  const N = 8;
  const root = 1 / Math.sqrt(N);
  const matrix: Complex[][] = [];
  for (let j = 0; j < N; j++) {
    const row: Complex[] = [];
    for (let k = 0; k < N; k++) {
      const angle = (2 * Math.PI * j * k) / N;
      row.push({
        re: root * Math.cos(angle),
        im: root * Math.sin(angle)
      });
    }
    matrix.push(row);
  }
  return matrix;
};

export const generateEntanglementSwappingTarget = (): StateVector => {
  const state = Array.from({ length: 16 }, () => cZero());
  const amp = 1 / Math.sqrt(8);
  const indices = [0, 2, 4, 6, 9, 11, 13, 15];
  indices.forEach(idx => {
    state[idx] = { re: amp, im: 0 };
  });
  return state;
};

export const generateQecTargetState = (): StateVector => {
  const state = Array.from({ length: 32 }, () => cZero());
  state[2] = { re: Math.sqrt(3)/2, im: 0 };
  state[30] = { re: 0.5, im: 0 };
  return state;
}

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
};;

export const challengeTasks: ChallengeTask[] = [

  {
    id: 'hadamard-sandwich',
    name: 'Эффект сэндвича Адамара',
    description: 'Преобразуйте вращение вокруг оси Y (Ry(π/2)) во вращение вокруг оси X (Rx(π/2)) с помощью гейтов Адамара H, расположенных по обе стороны от Ry.',
    numQubits: 1,
    initialPreset: ['0'],
    targetType: 'unitary',
    targetUnitary: [
      [{re: 1/Math.sqrt(2), im: 0}, {re: 0, im: -1/Math.sqrt(2)}],
      [{re: 0, im: -1/Math.sqrt(2)}, {re: 1/Math.sqrt(2), im: 0}]
    ],
    allowedGates: ['H', 'Ry'],
    allowedParams: ['pi/2', '-pi/2'],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'easy',
    explanationMarkdown: `### Сэндвич Адамара (Hadamard Sandwich)

Гейт Адамара совершает переход между базисами $X$ и $Z$. Это позволяет изменять направление вращения параметрических вентилей.

#### Математическое тождество:
Поскольку $H = H^\\dagger$ и $H Z H = X$, сопряжение вращения $Rz(\\theta)$ гейтами Адамара дает вращение $Rx(\\theta)$:\n$$H Rz(\\theta) H = Rx(\\theta)$$\nАналогично, для вращения вокруг оси $Y$ выполняется:\n$$H Ry(\\theta) H = Ry(-\\theta)$$\nНо подождите, как получить $Rx(\\theta)$ из $Ry$? Вспомните, что сэндвич Адамара позволяет перенаправлять вращения. Попробуйте скомбинировать $H$ и $Ry(\\pi/2)$ или $Ry(-\\pi/2)$, чтобы получить такую унитарную матрицу $Rx(\\pi/2)$:\n$$R_x(\\pi/2) = \\frac{1}{\\sqrt{2}}\\begin{pmatrix} 1 & -i \\\\ -i & 1 \\end{pmatrix}$$`
  },

  {
    id: 'quantum-fourier-1',
    name: 'Однокубитовый QFT',
    description: 'Реализуйте квантовое преобразование Фурье (QFT) для одного кубита. QFT для 1 кубита эквивалентен гейту Адамара.',
    numQubits: 1,
    initialPreset: ['0'],
    targetType: 'unitary',
    targetUnitary: [
      [{re: 1/Math.sqrt(2), im: 0}, {re: 1/Math.sqrt(2), im: 0}],
      [{re: 1/Math.sqrt(2), im: 0}, {re: -1/Math.sqrt(2), im: 0}]
    ],
    allowedGates: ['H'],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'easy',
    explanationMarkdown: `### Однокубитовый QFT

Дискретное преобразование Фурье для $N=2^1=2$ состояний имеет матрицу:
$$F_2 = \\frac{1}{\\sqrt{2}} \\begin{pmatrix} 1 & 1 \\\\ 1 & -1 \\end{pmatrix}$$
Это в точности совпадает с матрицей гейта Адамара ($H$).

#### Решение:
Просто примените гейт $H$ к кубиту $Q_0$.`
  },

  {
    id: 'bell-singlet',
    name: 'Синглетное состояние Белля |Ψ⁻⟩',
    description: 'Создайте синглетное состояние максимального запутывания |Ψ⁻⟩ = 1/√2 (|01⟩ - |10⟩) на двух кубитах, начав с состояния |00⟩.',
    numQubits: 2,
    initialPreset: ['0', '0'],
    targetType: 'state',
    targetState: [
      cZero(),
      { re: 1/Math.sqrt(2), im: 0 },
      { re: -1/Math.sqrt(2), im: 0 },
      cZero()
    ],
    allowedGates: ['H', 'X', 'Z', 'C'],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'easy',
    explanationMarkdown: `### Синглетное состояние Белля $|\\Psi^-\\rangle$

Синглетное состояние является одним из четырех максимально запутанных двухкубитовых состояний (состояний Белля). Оно имеет вид:
$$|\\Psi^-\\rangle = \\frac{|01\\rangle - |10\\rangle}{\\sqrt{2}}$$

#### Свойства и применение:
* **Антисимметрия**: При перестановке кубитов местами состояние меняет знак ($|\\Psi^-\\rangle \\to -|\\Psi^-\\rangle$).
* **Ротационная инвариантность**: Это состояние сохраняет свой вид при любом одинаковом повороте обоих кубитов на сфере Блоха.
* **Применение**: Используется в протоколе квантовой криптографии Экерта (E91) и при создании свободных от декогерентности подпространств (DFS), поскольку сингулярная симметрия компенсирует одинаковые фазовые шумы на обоих кубитах.

#### Как собрать схему:
1. Переведите первый кубит в суперпозицию с помощью гейта Адамара ($H$).
2. Примените CNOT (управляющий $Q_0$, цель $Q_1$), чтобы запутать кубиты.
3. Добавьте фазовые/битовые перевороты ($X$, $Z$), чтобы превратить стандартное состояние $|\\Phi^+\\rangle$ в синглетное $|\\Psi^-\\rangle$.`
  },

  {
    id: 'ghz-state',
    name: 'Состояние GHZ (3 кубита)',
    description: 'Создайте состояние Гринбергера — Хорна — Цайлингера (GHZ) на трех кубитах: |GHZ⟩ = 1/√2 (|000⟩ + |111⟩), начав с состояния |000⟩.',
    numQubits: 3,
    initialPreset: ['0', '0', '0'],
    targetType: 'state',
    targetState: [
      { re: 1/Math.sqrt(2), im: 0 },
      cZero(),
      cZero(),
      cZero(),
      cZero(),
      cZero(),
      cZero(),
      { re: 1/Math.sqrt(2), im: 0 }
    ],
    allowedGates: ['H', 'C', 'X'],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'easy',
    explanationMarkdown: `### Состояние GHZ (Гринбергера — Хорна — Цайлингера)

Состояние GHZ представляет собой обобщение состояния Белля на случай трех и более кубитов:
$$|\\text{GHZ}\\rangle = \\frac{|000\\rangle + |111\\rangle}{\\sqrt{2}}$$

#### Значение и применение:
* **Максимальное запутывание**: Это состояние демонстрирует квантовую нелокальность, которая не может быть объяснена скрытыми параметрами, более ярко, чем классические двухкубитовые состояния.
* **Чувствительность**: Если измерить хотя бы один кубит, запутанность полностью разрушается (в отличие от состояния W).
* **Применение**: Используется в протоколах квантового разделения секрета и квантового консенсуса.

#### Порядок сборки:
1. Переведите кубит $Q_0$ в суперпозицию с помощью гейта Адамара $H$.\n2. Распространите запутанность на кубиты $Q_1$ и $Q_2$ с помощью последовательных CNOT-гейтов ($Q_0 \\to Q_1$ и $Q_1 \\to Q_2$ или $Q_0 \\to Q_2$).`
  },

  {
    id: 'phase-kickback',
    name: 'Эффект фазового отскока (Phase Kickback)',
    description: 'Продемонстрируйте фазовый отскок: перенесите фазу целевого кубита Q₁ (находящегося в состоянии |-⟩) на управляющий кубит Q₀ (находящийся в состоянии |+⟩), переведя его в состояние |-⟩.',
    numQubits: 2,
    initialPreset: ['+', '-'],
    targetType: 'state',
    targetState: [
      { re: 0.5, im: 0 },
      { re: -0.5, im: 0 },
      { re: -0.5, im: 0 },
      { re: 0.5, im: 0 }
    ],
    allowedGates: ['Z', 'C'],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'easy',
    explanationMarkdown: `### Фазовый отскок (Phase Kickback)

Эффект фазового отскока — это фундаментальный механизм, лежащий в основе большинства квантовых алгоритмов (таких как алгоритмы Дойча-Джозы, Шора и оценка фазы).

#### Математический принцип:
Если целевой кубит $|t\\rangle$ является собственным состоянием унитарного оператора $U$ с собственным значением $e^{i\\phi}$ (то есть $U|t\\rangle = e^{i\\phi}|t\\rangle$), то при подаче контролируемой операции $C_U$ фазовый сдвиг $e^{i\\phi}$ «отскакивает» на управляющий кубит:
$$C_U \\left( \\frac{|0\\rangle + |1\\rangle}{\\sqrt{2}} \\otimes |t\\rangle \\right) = \\frac{|0\\rangle|t\\rangle + |1\\rangle U|t\\rangle}{\\sqrt{2}} = \\left( \\frac{|0\\rangle + e^{i\\phi}|1\\rangle}{\\sqrt{2}} \\right) \\otimes |t\\rangle$$

В этой задаче:
* Управляющий кубит $Q_0$ находится в состоянии $|+\\rangle = \\frac{|0\\rangle + |1\\rangle}{\\sqrt{2}}$.
* Целевой кубит $Q_1$ находится в состоянии $|-\\rangle = \\frac{|0\\rangle - |1\\rangle}{\\sqrt{2}}$, которое является собственным состоянием гейта $Z$ с собственным значением $-1 = e^{i\\pi}$.
* Применив контролируемый гейт CZ, фаза $-1$ перенесется на $Q_0$, превращая его из $|+\\rangle$ в $|-\\rangle = \\frac{|0\\rangle - |1\\rangle}{\\sqrt{2}}.$`
  },

  {
    id: 'swap-state-transfer',
    name: 'Квантовый перенос состояния (SWAP)',
    description: 'Перенесите состояние |1⟩ с кубита Q₀ на кубит Q₂ через промежуточный кубит Q₁ с помощью последовательности CNOT-гейтов.',
    numQubits: 3,
    initialPreset: ['1', '0', '0'],
    targetType: 'state',
    targetState: [
      cZero(),
      { re: 1, im: 0 }, // |001> (Q0=0, Q1=0, Q2=1)
      cZero(),
      cZero(),
      cZero(),
      cZero(),
      cZero(),
      cZero()
    ],
    allowedGates: ['C', 'X'],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'easy',
    explanationMarkdown: `### Квантовый перенос состояния (SWAP)

В реальных квантовых процессорах кубиты часто связаны физически только с ближайшими соседями. Для выполнения операций между удаленными кубитами информацию приходится последовательно переносить через промежуточные узлы.

#### Декомпозиция SWAP:
Операция SWAP меняет местами состояния двух кубитов и может быть реализована с помощью 3 гейтов CNOT:
1. CNOT из $Q_0$ в $Q_1$ (управляющий $Q_0$, цель $Q_1$)
2. CNOT из $Q_1$ в $Q_0$
3. CNOT из $Q_0$ в $Q_1$

Выполните SWAP($Q_0$, $Q_1$), а затем SWAP($Q_1$, $Q_2$), чтобы доставить единичное состояние на $Q_2$.`
  },

  {
    id: 'bell-triplet-ghz',
    name: 'Асимметричный триплет Белля',
    description: 'Создайте запутанное состояние |Ψ⟩ = 1/√2 (|001⟩ + |110⟩), начав с трехкубитового вакуума |000⟩.',
    numQubits: 3,
    initialPreset: ['0', '0', '0'],
    targetType: 'state',
    targetState: [
      cZero(),
      { re: 1/Math.sqrt(2), im: 0 },
      cZero(),
      cZero(),
      cZero(),
      cZero(),
      { re: 1/Math.sqrt(2), im: 0 },
      cZero()
    ],
    allowedGates: ['H', 'X', 'C'],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'medium',
    explanationMarkdown: `### Асимметричный триплет

Эта задача предлагает вам создать запутанное трехкубитовое состояние, являющееся одной из вариаций базиса GHZ:
$$|\\Psi\\rangle = \\frac{|001\\rangle + |110\\rangle}{\\sqrt{2}}$$

#### Подсказка по реализации:
1. Начните с создания стандартного двухкубитового состояния Белля $|\\Phi^+\\rangle = \\frac{|00\\rangle+|11\\rangle}{\\sqrt{2}}$ на кубитах $Q_1$ и $Q_2$.
2. Используйте гейт $X$ на кубите $Q_2$, чтобы превратить состояние в $|\\Psi^+\\rangle = \\frac{|01\\rangle+|10\\rangle}{\\sqrt{2}}$.
3. С помощью CNOT-гейтов перенесите запутанность на $Q_0$ или скорректируйте индексы так, чтобы при $Q_1=1, Q_2=1$ кубит $Q_0$ оставался в $|0\\rangle$, а при других раскладах менялся.`
  },

  {
    id: 'deutsch-jozsa',
    name: 'Алгоритм Дойча-Джозы',
    description: 'Определите свойства встроенного оракула (сбалансированная функция f(x) = x). Используйте только гейты Адамара H, чтобы перевести измеряемый кубит Q₀ в состояние |1⟩ за один запрос.',
    numQubits: 2,
    initialPreset: ['0', '1'],
    targetType: 'state',
    targetState: [
      cZero(),
      cZero(),
      { re: 1/Math.sqrt(2), im: 0 },
      { re: -1/Math.sqrt(2), im: 0 }
    ],
    allowedGates: ['H'],
    fixedGates: [
      { row: 0, col: 2, gate: { type: 'C', fixed: true } },
      { row: 1, col: 2, gate: { type: 'X', fixed: true } }
    ],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'medium',
    explanationMarkdown: `### Алгоритм Дойча-Джозы (Deutsch-Jozsa)

Алгоритм Дойча-Джозы исторически стал первым примером квантового алгоритма, демонстрирующего экспоненциальное ускорение по сравнению с классическими алгоритмами.

#### Описание задачи:
Дана функция $f: \\{0,1\\}^n \\to \\{0,1\\}$ («оракул»). Известно, что функция либо **константна** (выдает всегда 0 или всегда 1), либо **сбалансирована** (на половине входов выдает 0, на другой — 1).
Классическому компьютеру в худшем случае требуется $2^{n-1} + 1$ запросов к оракулу. Квантовый компьютер решает задачу ровно за **1 запрос**.

В данном задании:
* Оракул встроен в колонку 3 (гейт CNOT, соответствующий сбалансированной функции $f(x) = x$).
* Целевой кубит $Q_1$ инициализирован в состоянии $|1\\rangle$.
* Переведите $Q_1$ в состояние $|-\\rangle$ и $Q_0$ в состояние $|+\\rangle$ с помощью гейтов Адамара перед оракулом.
* Фазовый отскок от оракула изменит состояние $Q_0$ на $|-\\rangle$.
* Примените гейт Адамара на $Q_0$ после оракула, чтобы перевести его в состояние $|1\\rangle$. Измерение $Q_0$ покажет $|1\\rangle$, что гарантирует сбалансированность функции.`
  },

  {
    id: 'bernstein-vazirani',
    name: 'Алгоритм Бернштейна — Вазирани',
    description: 'Определите скрытую битовую строку s = 10 на двух кубитах. Оракул встроен в схему. Добавьте гейты Адамара H, чтобы за 1 запрос получить результат |10⟩ на входах Q₀, Q₁.',
    numQubits: 3,
    initialPreset: ['0', '0', '1'],
    targetType: 'state',
    targetState: [
      { re: 1/Math.sqrt(2), im: 0 },
      { re: -1/Math.sqrt(2), im: 0 },
      cZero(),
      cZero(),
      cZero(),
      cZero(),
      cZero(),
      cZero()
    ],
    allowedGates: ['H'],
    fixedGates: [
      // Oracle encoding s = 10 (CNOT from Q0 to Q2)
      { row: 0, col: 2, gate: { type: 'C', fixed: true } },
      { row: 2, col: 2, gate: { type: 'X', fixed: true } }
    ],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'medium',
    explanationMarkdown: `### Алгоритм Бернштейна — Вазирани

Алгоритм Бернштейна — Вазирани решает задачу поиска скрытой битовой строки $s \\in \\{0,1\\}^n$. Классическому компьютеру требуется $n$ запросов, в то время как квантовому — ровно один запрос!

#### Описание схемы:
* Вспомогательный кубит $Q_2$ инициализирован в состоянии $|1\\rangle$.\n* Переведите все кубиты в суперпозицию с помощью гейтов $H$ до оракула (колонки 0-1).\n* Оракул (CNOT $Q_0 \\to Q_2$) выполнит фазовый отскок на $Q_0$, оставив $Q_1$ нетронутым.\n* Примените гейты Адамара $H$ после оракула на измеряемые кубиты $Q_0$ и $Q_1$.\n* В результате на кубитах $Q_0, Q_1$ возникнет скрытая строка $s = 10$ (состояние $|10\\rangle$ на управляющих кубитах).`
  },

  {
    id: 'superdense-coding',
    name: 'Суперплотное кодирование (Superdense Coding)',
    description: 'Закодируйте классическую строку "11" в один кубит запутанной пары и передайте её Бобу. Боб должен выполнить декодирование и получить состояние |11⟩.',
    numQubits: 2,
    initialPreset: ['0', '0'],
    targetType: 'state',
    targetState: [
      cZero(),
      cZero(),
      cZero(),
      { re: 1, im: 0 }
    ],
    allowedGates: ['X', 'Z'],
    fixedGates: [
      // Bell preparation by Bob/Alice beforehand (columns 0, 1)
      { row: 0, col: 0, gate: { type: 'H', fixed: true } },
      { row: 0, col: 1, gate: { type: 'C', fixed: true } },
      { row: 1, col: 1, gate: { type: 'X', fixed: true } },
      // Decoding by Bob at the end (columns 5, 6)
      { row: 0, col: 5, gate: { type: 'C', fixed: true } },
      { row: 1, col: 5, gate: { type: 'X', fixed: true } },
      { row: 0, col: 6, gate: { type: 'H', fixed: true } }
    ],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'medium',
    explanationMarkdown: `### Суперплотное кодирование (Superdense Coding)

Суперплотное кодирование позволяет передать два классических бита информации, отправив всего один физический кубит, при условии, что отправитель и получатель заранее разделили запутанную пару.

#### Алгоритм:
1. **Запуск**: Сначала готовится пара Белля $|\\Phi^+\\rangle = \\frac{|00\\rangle + |11\\rangle}{\\sqrt{2}}$ (уже создана в колонках 0-1).
2. **Кодирование (Алиса)**: Для передачи строки "11" Алиса должна применить операторы $X$ и $Z$ на своём кубите $Q_0$ (вы можете разместить их в свободных колонках 2-4).
3. **Декодирование (Боб)**: Получив кубит, Боб применяет CNOT $Q_0 \\to Q_1$ and гейт Адамара на $Q_0$ (колонки 5-6).

В результате на выходе должно получиться строго состояние $|11\\rangle$.`
  },

  {
    id: 'qft-2',
    name: 'Квантовое преобразование Фурье (QFT, 2 кубита)',
    description: 'Реализуйте матрицу 2-кубитового QFT. Используйте гейты H, контролируемые фазовые сдвиги P(π/2) и операцию SWAP для изменения порядка кубитов.',
    numQubits: 2,
    initialPreset: ['0', '0'],
    targetType: 'unitary',
    targetUnitary: [
      [{re: 0.5, im: 0}, {re: 0.5, im: 0}, {re: 0.5, im: 0}, {re: 0.5, im: 0}],
      [{re: 0.5, im: 0}, {re: 0, im: 0.5}, {re: -0.5, im: 0}, {re: 0, im: -0.5}],
      [{re: 0.5, im: 0}, {re: -0.5, im: 0}, {re: 0.5, im: 0}, {re: -0.5, im: 0}],
      [{re: 0.5, im: 0}, {re: 0, im: -0.5}, {re: -0.5, im: 0}, {re: 0, im: 0.5}]
    ],
    allowedGates: ['H', 'P', 'X', 'C'],
    allowedParams: ['pi/2'],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'medium',
    explanationMarkdown: `### Квантовое преобразование Фурье (QFT)

QFT — это квантовый аналог дискретного преобразования Фурье. Оно переводит состояния из вычислительного базиса в базис фаз и является ключевым ускоряющим шагом в алгоритме Шора.

#### Алгоритм для 2 кубитов:
Матрица QFT для двух кубитов имеет вид:
$$F_4 = \\frac{1}{2} \\begin{pmatrix} 1 & 1 & 1 & 1 \\\\ 1 & i & -1 & -i \\\\ 1 & -1 & 1 & -1 \\\\ 1 & -i & -1 & i \\end{pmatrix}$$

Схема QFT для $N=2$:
1. Примените гейт Адамара ($H$) на $Q_0$.
2. Примените контролируемый фазовый гейт $CP(\\pi/2)$ (гейт $P$ с параметром \`pi/2\` на $Q_0$, управляемый кубитом $Q_1$).
3. Примените гейт Адамара ($H$) на $Q_1$.
4. Выполните операцию SWAP между $Q_0$ и $Q_1$, чтобы восстановить правильный порядок разрядов на выходе.
   *(SWAP можно собрать из трех последовательных CNOT: CNOT $Q_0\\to Q_1$, CNOT $Q_1\\to Q_0$, CNOT $Q_0\\to Q_1$)*.`
  },

  {
    id: 'toffoli-cnot-target',
    name: 'Запутывание Toffoli + CNOT',
    description: 'Создайте состояние |GHZ⟩ = 1/√2 (|000⟩ + |111⟩), начав с состояния суперпозиции управляющих кубитов |++0⟩ и используя вентиль Тоффоли (CCNOT).',
    numQubits: 3,
    initialPreset: ['+', '+', '0'],
    targetType: 'state',
    targetState: [
      { re: 1/Math.sqrt(2), im: 0 },
      cZero(),
      cZero(),
      cZero(),
      cZero(),
      cZero(),
      cZero(),
      { re: 1/Math.sqrt(2), im: 0 }
    ],
    allowedGates: ['C', 'X', 'H'],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'medium',
    explanationMarkdown: `### Запутывание через вентиль Тоффоли

Вентиль Тоффоли (CCNOT) является универсальным для классических вычислений. В квантовых вычислениях он позволяет создавать сложные запутанные состояния.

#### Порядок решения:
* Начальное состояние системы: $|\\psi\\rangle = |++0\\rangle = \\frac{1}{2}(|000\\rangle + |010\\rangle + |100\\rangle + |110\\rangle)$.
* Наша цель: получить $|\\text{GHZ}\\rangle = \\frac{|000\\rangle + |111\\rangle}{\\sqrt{2}}$.
* Примените Тоффоли (CCNOT, управляющие $Q_0, Q_1$, цель $Q_2$) и дополнительные CNOT-гейты, чтобы скорректировать суперпозицию и отсеять лишние состояния, оставив только корреляцию $|000\\rangle$ и $|111\\rangle$.`
  },

  {
    id: 'quantum-teleportation',
    name: 'Квантовая телепортация состояния',
    description: 'Перенесите неизвестное квантовое состояние с кубита Q₀ (подготовленное гейтом Ry(π/3)) на удаленный кубит Q₂. Используйте запутанную пару на Q₁-Q₂ и корректирующие гейты.',
    numQubits: 3,
    initialPreset: ['0', '0', '0'],
    targetType: 'state',
    targetState: [
      { re: Math.sqrt(3)/4, im: 0 },
      { re: 0.25, im: 0 },
      { re: Math.sqrt(3)/4, im: 0 },
      { re: 0.25, im: 0 },
      { re: Math.sqrt(3)/4, im: 0 },
      { re: 0.25, im: 0 },
      { re: Math.sqrt(3)/4, im: 0 },
      { re: 0.25, im: 0 }
    ],
    allowedGates: ['H', 'X', 'Z', 'C'],
    fixedGates: [
      { row: 0, col: 0, gate: { type: 'Ry', param: 'pi/3', paramVal: Math.PI/3, fixed: true } }
    ],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'hard',
    explanationMarkdown: `### Протокол квантовой телепортации

Квантовая телепортация позволяет передавать неизвестное квантовое состояние (кубит) с одного узла на другой, используя классический канал связи и предварительно распределенный квантовый ресурс (запутанную пару Белля).

#### Схема протокола:
1. **Распределение запутанности**: Создайте состояние Белля $|\\Phi^+\\rangle = \\frac{|00\\rangle+|11\\rangle}{\\sqrt{2}}$ между кубитами $Q_1$ (у Алисы) и $Q_2$ (у Боба). Для этого примените $H$ на $Q_1$ и CNOT с управляющим $Q_1$ и целью $Q_2$.
2. **Измерение Белля**: Алиса проецирует свой кубит $Q_0$ (состояние которого надо телепортировать) и кубит $Q_1$ на базис Белля. Для этого примените CNOT ($Q_0 \\to Q_1$) и гейт Адамара $H$ на $Q_0$.
3. **Коррекция (классический перенос)**: В соответствии с принципом отложенного измерения, классически контролируемые операции можно заменить квантовыми контролируемыми гейтами:
   * Если $Q_1 = 1$, Боб должен применить гейт $X$ на $Q_2$ (CNOT $Q_1 \\to Q_2$).
   * Если $Q_0 = 1$, Боб должен применить гейт $Z$ на $Q_2$ (контролируемый CZ с управляющим $Q_0$ и целью $Z$ на $Q_2$).

В результате состояние кубита $Q_2$ в точности совпадет с исходным состоянием $Q_0$.`
  },

  {
    id: 'swap-test',
    name: 'Тест Свопа (SWAP Test)',
    description: 'Определите степень перекрытия (взаимную проекцию) состояний кубитов Q₁=|1⟩ и Q₂=|+⟩, собрав схему контролируемого обмена CSWAP на CNOT и Toffoli.',
    numQubits: 3,
    initialPreset: ['0', '1', '+'],
    targetType: 'state',
    targetState: [
      cZero(),
      { re: 1/(2*Math.sqrt(2)), im: 0 },
      { re: 1/(2*Math.sqrt(2)), im: 0 },
      { re: 1/Math.sqrt(2), im: 0 },
      cZero(),
      { re: -1/(2*Math.sqrt(2)), im: 0 },
      { re: 1/(2*Math.sqrt(2)), im: 0 },
      cZero()
    ],
    allowedGates: ['H', 'X', 'C'],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'hard',
    explanationMarkdown: `### Тест Свопа (SWAP Test)

Тест Свопа — это фундаментальный квантовый алгоритм, используемый для сравнения двух неизвестных квантовых состояний $|a\\rangle$ и $|b\\rangle$ без необходимости выполнения полной томографии состояний.

#### Принцип работы:
Вспомогательный кубит (ancilla) $Q_0$ инициализируется в состоянии $|0\\rangle$, а два исследуемых состояния подаются на кубиты $Q_1$ и $Q_2$.
После применения схемы вероятность получить исходы измерения на $Q_0$ равна:
$$P(Q_0 = 0) = \\frac{1 + |\\langle a|b \\rangle|^2}{2}$$

Если состояния ортогональны, то $P(0) = 0.5$. Если они идентичны, то $P(0) = 1.0$.

#### Декомпозиция CSWAP (вентиля Фредкина):
Вентиль CSWAP выполняет обмен состояниями $Q_1$ и $Q_2$, если управляющий кубит $Q_0 = 1$. Его можно собрать из трех стандартных вентилей:
1. CNOT из $Q_2$ в $Q_1$.
2. Toffoli (CCNOT, управляющие на $Q_0$ и $Q_1$, цель $X$ на $Q_2$).
3. CNOT из $Q_2$ в $Q_1$.

Добавьте гейты Адамара на $Q_0$ перед и после CSWAP, чтобы измерить результат интерференции фаз.`
  },

  {
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

Расширение алгоритма Дойча-Джозы для $n=2$ входных (запросы) кубитов ($Q_0, Q_1$) и одного целевого ($Q_2$). Функция оракула сбалансирована и имеет вид $f(x_0, x_1) = x_0 \\oplus x_1$.

#### Схема реализации:
1. Входные кубиты $Q_0, Q_1$ инициализированы в $|0\\rangle$, целевой $Q_2$ — в $|1\\rangle$.
2. Примените гейты Адамара ко всем кубитам ($Q_0, Q_1, Q_2$) перед оракулом.
3. Оракул выполняет CNOT с $Q_0$ на $Q_2$ и CNOT с $Q_1$ на $Q_2$ в колонках 2 и 3.
4. После действия оракула фазовый отскок переводит входные кубиты в состояние $|-\\rangle \\otimes |-\\rangle$.
5. Снова примените гейты Адамара к $Q_0$ и $Q_1$, чтобы вернуть их в вычислительный базис $|11\\rangle$.`
  },

  {
    id: 'bit-flip-code',
    name: 'Защита от переворота бита (Bit Flip Code)',
    description: 'Закодируйте состояние Q₀ на 3 кубита. После воздействия ошибки X на Q₀ в такте t=3, соберите схему исправления с Toffoli гейтом для восстановления исходной информации.',
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
    allowedGates: ['X', 'C'],
    fixedGates: [
      { row: 0, col: 0, gate: { type: 'Ry', param: 'pi/3', paramVal: Math.PI/3, fixed: true } },
      { row: 0, col: 3, gate: { type: 'X', fixed: true } }
    ],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'medium',
    explanationMarkdown: `### 3-кубитовый код коррекции ошибок (Bit Flip Code)

Квантовые компьютеры крайне чувствительны к шумам окружающей среды, вызывающим квантовые ошибки. Простейший код коррекции защищает от переворота бита ($X$-ошибки).

#### Этапы работы кода:
1. **Кодирование (Encoding)**: Состояние кубита $|\\psi\\rangle = a|0\\rangle + b|1\\rangle$ запутывается с двумя вспомогательными кубитами в состояние $a|000\\rangle + b|111\\rangle$. Сделайте это с помощью CNOT из $Q_0$ в $Q_1$ и $Q_2$.
2. **Шум (Шумовой канал)**: Происходит ошибка $X$ на кубите $Q_0$ (уже размещена в колонке 4 в виде фиксированного гейта $X$).
3. **Декодирование и исправление (Decoding & Correction)**:
   * Направьте CNOT-гейты из $Q_0$ в $Q_1$ и $Q_2$. Это запишет синдромы ошибок во вспомогательные кубиты.
   * Примените трехкубитовый гейт Тоффоли (CCNOT) с управляющими кубитами на $Q_1, Q_2$ и целью на изначальный кубит $Q_0$. Если оба синдрома показывают ошибку, вентиль Тоффоли автоматически перевернет бит обратно, полностью восстанавливая $Q_0$.`
  },

  {
    id: 'chsh-correlation',
    name: 'Состояние нарушения Белля (CHSH)',
    description: 'Подготовьте состояние |Ψ⟩ = cos(π/8)|00⟩ + sin(π/8)|11⟩ для проверки максимального нарушения неравенств Белла (неравенства CHSH). Используйте только разрешенные углы.',
    numQubits: 2,
    initialPreset: ['0', '0'],
    targetType: 'state',
    targetState: [
      { re: Math.cos(Math.PI/8), im: 0 },
      cZero(),
      cZero(),
      { re: Math.sin(Math.PI/8), im: 0 }
    ],
    allowedGates: ['Ry', 'C', 'X'],
    allowedParams: ['pi/4', '-pi/4'],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'medium',
    explanationMarkdown: `### Состояние CHSH

Для демонстрации квантовой нелокальности в регионе нарушения неравенств Клаузера — Хорна — Шимони — Хольта (CHSH) используется состояние:
$$|\\Psi\\rangle = \\cos(\\pi/8)|00\\rangle + \\sin(\\pi/8)|11\\rangle$$

#### Как его получить:
1. Примените гейт $Ry(\\pi/4)$ к первому кубиту $Q_0$. Поскольку угол деления на сфере Блоха равен половине угла поворота, это даст амплитуды $\\cos(\\pi/8)$ и $\\sin(\\pi/8)$.
2. Примените CNOT из $Q_0$ в $Q_1$, чтобы связать состояние $|1\\rangle$ первого кубита с состоянием $|1\\rangle$ второго кубита.`
  },

  {
    id: 'w-state-prep',
    name: 'Создание W-состояния (3 кубита)',
    description: 'Соберите 3-кубитовое W-состояние |W⟩ = 1/√3 (|100⟩ + |010⟩ + |001⟩). Понадобятся точные углы параметрических Ry гейтов и CNOT.',
    numQubits: 3,
    initialPreset: ['0', '0', '0'],
    targetType: 'state',
    targetState: [
      cZero(),
      { re: 1/Math.sqrt(3), im: 0 },
      { re: 1/Math.sqrt(3), im: 0 },
      cZero(),
      { re: 1/Math.sqrt(3), im: 0 },
      cZero(),
      cZero(),
      cZero()
    ],
    allowedGates: ['H', 'Ry', 'C', 'X'],
    allowedParams: ['1.231', 'pi/2'],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'hard',
    explanationMarkdown: `### Подготовка W-состояния

W-состояние — это важный класс многочастичных запутанных состояний, который имеет вид:
$$|W\\rangle = \\frac{|100\\rangle + |010\\rangle + |001\\rangle}{\\sqrt{3}}$$

В отличие от GHZ-состояний, W-состояние более устойчиво к потере отдельных кубитов: если один кубит теряется (измеряется), оставшиеся два кубита сохраняют запутанность.

#### Пошаговый рецепт сборки:
1. Примените вращение $Ry(\\theta_1)$ на первом кубите $Q_0$, чтобы разделить амплитуды вероятности. Угол $\\theta_1$ выбирается так, чтобы $\\cos(\\theta_1/2) = \\sqrt{2/3}$, откуда $\\theta_1 = 2\\arccos(\\sqrt{2/3}) \\approx 1.231$ радиан (или $\\approx 70.53^\\circ$).
2. Добавьте контролируемый гейт $Ry(\\theta_2)$ (управляющий $Q_0$, цель $Q_1$) с углом $\\theta_2 = 2\\arccos(\\sqrt{1/2}) = \\pi/2 \\approx 1.5708$ радиан (или $90^\\circ$).
3. Проведите каскад CNOT-гейтов для распределения возбуждения:
   * CNOT с $Q_1$ на $Q_0$.
   * CNOT с $Q_0$ на $Q_2$.
   * CNOT с $Q_2$ на $Q_1$.
4. В результате вы получите строго симметричное распределение амплитуд $1/\\sqrt{3}$.`
  },

  {
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
$$U_s = 2|s\\rangle\\langle s| - I$$
Где $|s\\rangle$ — состояние равномерной суперпозиции. С точностью до глобальной фазы, это эквивалентно:
$$U_s \\equiv I - 2|s\\rangle\\langle s| = (H^{\\otimes 2}) (I - 2|00\\rangle\\langle 00|) (H^{\\otimes 2})$$

#### Схема реализации:
1. Нанесите гейты Адамара на оба кубита.
2. Нанесите гейты $X$ на оба кубита (для перевода $|00\\rangle$ в $|11\\rangle$).
3. Примените контролируемый гейт $CZ$ (или CNOT с предварительным и последующим переходом целевого кубита в базис X), создающий фазовый сдвиг $-1$ для состояния $|11\\rangle$.
4. Верните кубиты обратно гейтами $X$ и гейтами Адамара $H$.`
  },

  {
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
  },

  {
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
  },

  {
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

Алгоритм оценки фазы (QPE) предназначен для нахождения фазы $\varphi$ собственного значения $e^{2\pi i \varphi}$ некоторого унитарного оператора $U$. Здесь $U = P(\pi/2)$, что соответствует $\varphi = 1/4 = 0.01_2$.

#### Схема реализации:
1. Подготовьте целевой кубит $Q_2$ в состоянии $|1\rangle$ (с помощью гейта $X$).
2. Нанесите гейты Адамара на измеряемые кубиты $Q_0, Q_1$.
3. Примените контролируемые операции:
   - Контролируемый-$U^{2^0}$ ($CP(\pi/2)$) с управляющим $Q_1$ на мишень $Q_2$.
   - Контролируемый-$U^{2^1}$ ($CP(\pi) = CZ$) с управляющим $Q_0$ на мишень $Q_2$.
4. Выполните обратное преобразование Фурье (QFT⁻¹) на измеряемых кубитах $Q_0, Q_1$:
   - Гейт Адамара на $Q_0$.
   - Контролируемый фазовый гейт $CP(-\pi/2)$ с управляющим $Q_1$ на мишень $Q_0$.
   - Гейт Адамара на $Q_1$.`
  },

  {
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
$$|\\Psi(\\theta)\\rangle = \\cos(\\theta/2)|01\\rangle - \\sin(\\theta/2)|10\\rangle$$

#### Схема реализации (для $\\theta = \\pi/3$):
1. Кубиты инициализированы в состоянии $|01\\rangle$ (входной кубит $Q_1$ в $|1\\rangle$).
2. Примените вращение $Ry(\\pi/3)$ на кубит $Q_0$.
3. Примените контролируемый гейт CNOT с $Q_0$ (контроль) на $Q_1$ (цель). Это переведет $|11\\rangle$ в $|10\\rangle$.
4. Примените фазовый гейт $Z$ к кубиту $Q_0$, чтобы скорректировать знак у состояния $|10\\rangle$ на отрицательный.`
  },

  {
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
* 3 кубита данных ($Q_0, Q_1, Q_2$) инициализированы в состоянии $|+-+\\rangle$.
* 2 вспомогательные анциллы ($Q_3, Q_4$) инициализированы в состоянии $|00\\rangle$.
* Наша цель — измерить синдромы фазовых ошибок $X_0 X_1$ на $Q_3$ и $X_1 X_2$ на $Q_4$.

#### Схема реализации:
1. Переведите кубиты данных в вычислительный базис, применив гейты $H$ на $Q_0, Q_1, Q_2$.
2. Измерьте четность (синдром) соседних кубитов с помощью CNOT гейтов на анциллы:
   * Синдром первой пары: CNOT с $Q_0$ на $Q_3$ и с $Q_1$ на $Q_3$.
   * Синдром второй пары: CNOT с $Q_1$ на $Q_4$ и с $Q_2$ на $Q_4$.
3. Верните кубиты данных в базис Адамара с помощью гейтов $H$ на $Q_0, Q_1, Q_2$.`
  },

  {
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

Квантовое преобразование Фурье для $N=2^3=8$ состояний переводит состояния из вычислительного базиса в частотный. Матрица перехода $F_8$ имеет элементы $(F_8)_{j,k} = \frac{1}{\sqrt{8}} e^{2\pi i j k / 8}$.

#### Инструкция к построению схемы:
1. Примените гейт Адамара $H$ на кубит $Q_0$.
2. Примените контролируемый фазовый гейт $CP(\pi/2)$ с управляющим $Q_1$ на цель $Q_0$.
3. Примените контролируемый фазовый гейт $CP(\pi/4)$ с управляющим $Q_2$ на цель $Q_0$.
4. Примените гейт Адамара $H$ на кубит $Q_1$.
5. Примените контролируемый фазовый гейт $CP(\pi/2)$ с управляющим $Q_2$ на цель $Q_1$.
6. Примените гейт Адамара $H$ на кубит $Q_2$.
7. Переставьте кубиты с помощью SWAP гейтов (или CNOT-эквивалентов) $Q_0 \\leftrightarrow Q_2$ для завершения преобразования.`
  },

  {
    id: 'toffoli-decomposition',
    name: 'Декомпозиция Toffoli (CCNOT)',
    description: 'Постройте трехкубитовый вентиль Тоффоли (CCNOT), используя только двухкубитовые гейты (CNOT, контролируемые фазовые сдвиги P, гейты H и T (P(π/4))).',
    numQubits: 3,
    initialPreset: ['0', '0', '0'],
    targetType: 'unitary',
    targetUnitary: [
      [cOne(), cZero(), cZero(), cZero(), cZero(), cZero(), cZero(), cZero()],
      [cZero(), cOne(), cZero(), cZero(), cZero(), cZero(), cZero(), cZero()],
      [cZero(), cZero(), cOne(), cZero(), cZero(), cZero(), cZero(), cZero()],
      [cZero(), cZero(), cZero(), cOne(), cZero(), cZero(), cZero(), cZero()],
      [cZero(), cZero(), cZero(), cZero(), cOne(), cZero(), cZero(), cZero()],
      [cZero(), cZero(), cZero(), cZero(), cZero(), cOne(), cZero(), cZero()],
      [cZero(), cZero(), cZero(), cZero(), cZero(), cZero(), cZero(), cOne()],
      [cZero(), cZero(), cZero(), cZero(), cZero(), cZero(), cOne(), cZero()]
    ],
    allowedGates: ['H', 'P', 'C', 'X'],
    allowedParams: ['pi/4', '-pi/4'],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'extreme',
    numColumns: 14,
    explanationMarkdown: `### Декомпозиция гейта Тоффоли (CCNOT)

Вентиль Тоффоли является универсальным трехкубитовым вентилем, однако в физических квантовых чипах обычно реализуются только однокубитовые и двухкубитовые гейты. Декомпозиция Toffoli на CNOT и $T$ ($P(\\pi/4)$) / $T^\\dagger$ ($P(-\\pi/4)$) вентили является классической задачей теории квантовой компиляции.

#### Стандартная схема декомпозиции (управляющие $Q_0, Q_1$, цель $Q_2$):
1. Гейт $H$ на $Q_2$.
2. CNOT с $Q_1$ на $Q_2$.
3. $P(-\\pi/4)$ на $Q_2$.
4. CNOT с $Q_0$ на $Q_2$.
5. $P(\\pi/4)$ на $Q_2$.
6. CNOT с $Q_1$ на $Q_2$.
7. $P(-\\pi/4)$ на $Q_2$.
8. CNOT с $Q_0$ на $Q_2$.
9. Гейты $P(\\pi/4)$ на $Q_1$ и $P(\\pi/4)$ на $Q_2$ в одном шаге.
10. CNOT с $Q_0$ на $Q_1$.
11. Гейт $H$ на $Q_2$.
12. Гейт $P(\\pi/4)$ на $Q_0$ и $P(-\\pi/4)$ на $Q_1$.
13. CNOT с $Q_0$ на $Q_1$.

*Используйте 14 тактов сетки для сборки этой схемы.*`
  },

  {
    id: 'autonomous-qec-bit',
    name: 'Автономная коррекция ошибок (Bit Flip, 5 кубитов)',
    description: 'Защитите состояние Q₀ от случайной X-ошибки на Q₀, используя два вспомогательных кубика (Q₁, Q₂) для кодирования и два дополнительных кубика (Q₃, Q₄) в качестве синдромных анцилл для автоматического исправления без разрушения суперпозиции.',
    numQubits: 5,
    initialPreset: ['0', '0', '0', '0', '0'],
    targetType: 'state',
    targetState: generateQecTargetState(),
    allowedGates: ['X', 'C'],
    fixedGates: [
      { row: 0, col: 0, gate: { type: 'Ry', param: 'pi/3', paramVal: Math.PI/3, fixed: true } },
      { row: 0, col: 3, gate: { type: 'X', fixed: true } }
    ],
    lockInitialStates: true,
    lockQubits: true,
    difficulty: 'extreme',
    numColumns: 8,
    explanationMarkdown: `### Автономная коррекция ошибок (Bit Flip Code)

В классической квантовой коррекции ошибок синдромы измеряются и обрабатываются классическим компьютером, который затем посылает сигнал коррекции. В автономной коррекции ошибок (Autonomous Quantum Error Correction) исправление происходит автоматически за счет когерентных взаимодействий (обратной связи через квантовые вентили).

В этой задаче:
* Кубит $Q_0$ инициализирован в состоянии $Ry(\\pi/3)$ (амплитуды $\\frac{\\sqrt{3}}{2}|0\\rangle + 0.5|1\\rangle$).
* В колонке 3 происходит ошибка $X$ (переворот бита) на кубите $Q_0$.
* Кубиты $Q_3$ и $Q_4$ — это вспомогательные анциллы для сбора синдромов $Z_0 Z_1$ и $Z_1 Z_2$ соответственно.

#### Шаги реализации:
1. **Кодирование**: Запутайте $Q_0$ с $Q_1$ и $Q_2$ с помощью двух CNOT ($Q_0 \\to Q_1$ и $Q_0 \\to Q_2$) до ошибки.
2. **Измерение синдромов**:
   * Снимите синдром $Z_0 Z_1$ на анциллу $Q_3$: CNOT с $Q_0$ на $Q_3$, затем CNOT с $Q_1$ на $Q_3$.
   * Снимите синдром $Z_1 Z_2$ на анциллу $Q_4$: CNOT с $Q_1$ на $Q_4$, затем CNOT с $Q_2$ на $Q_4$.
3. **Автономное исправление**:
   * Ошибка на $Q_0$ соответствует синдромам $Q_3 = 1$ и $Q_4 = 0$.
   * Чтобы исправить $Q_0$ при таких условиях, инвертируйте $Q_4$ гейтом $X$, примените трехкубитовый Тоффоли (CCNOT, управляющие на $Q_3, Q_4$, цель $X$ на $Q_0$), и верните $Q_4$ обратно гейтом $X$.`
  },

  {
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

Алгоритм оценки фазы (QPE) для 3 бит позволяет оценить фазу оператора $U = P(\\pi/4)$ с точностью до $2^{-3} = 1/8$. Фаза составляет $\\varphi = 1/8$, что соответствует двоичной дроби $0.001_2$.

#### Схема реализации:
1. Подготовьте целевой кубит $Q_3$ в состоянии $|1\\rangle$ гейтом $X$.
2. Примените гейты Адамара к измеряемым кубитам $Q_0, Q_1, Q_2$.
3. Примените контролируемые операции:
   - Контролируемый-$U^{2^0} = CP(\\pi/4)$ с управляющим $Q_2$ на цель $Q_3$.
   - Контролируемый-$U^{2^1} = CP(\\pi/2)$ с управляющим $Q_1$ на цель $Q_3$.
   - Контролируемый-$U^{2^2} = CP(\\pi) = CZ$ с управляющим $Q_0$ на цель $Q_3$.
4. Выполните обратное квантовое преобразование Фурье (QFT⁻¹) на измеряемых кубитах $Q_0, Q_1, Q_2$:
   - Гейт $H$ на $Q_0$.
   - Контролируемый фазовый гейт $CP(-\\pi/2)$ с управляющим $Q_1$ на цель $Q_0$.
   - Контролируемый фазовый гейт $CP(-\\pi/4)$ с управляющим $Q_2$ на цель $Q_0$.
   - Гейт $H$ на $Q_1$.
   - Контролируемый фазовый гейт $CP(-\\pi/2)$ с управляющим $Q_2$ на цель $Q_1$.
   - Гейт $H$ на $Q_2$.

*Обратите внимание: без SWAP-гейтов биты считываются в обратном порядке (Q₀ = 1, Q₁ = 0, Q₂ = 0), что соответствует результирующему состоянию |1001⟩.*`
  },

  ];

// Helper to simulate the quantum circuit and return outcomes
export const runCircuit = (
  numQubits: number,
  initialStates: QubitInitialState[],
  grid: (GateInstance | null)[][]
): {
  stepsStateVectors: (StateVector | null)[];
  stepsDensityMatrices: DensityMatrix[];
  finalUnitary: Complex[][];
} => {
  const numColumns = grid[0]?.length || 8;
  const D = 1 << numQubits;

  // 1. Build composite initial state
  // If all pure, we can build composite state vector.
  // Otherwise, we build composite density matrix.
  const isAllPure = initialStates.every(s => s.type === 'pure');
  
  // Single-qubit state vectors
  const qubitVectors: StateVector[] = initialStates.map(s => {
    if (s.type === 'pure') {
      return [s.alpha, s.beta];
    } else {
      // Mixed state represented as pure vector is invalid, but let's provide a fallback
      const s0 = Math.sqrt(s.p0);
      const s1 = Math.sqrt(s.p1);
      return [{ re: s0, im: 0 }, { re: s1, im: 0 }];
    }
  });

  // composite vector via tensor products
  let compositeVector: StateVector | null = null;
  if (isAllPure) {
    compositeVector = qubitVectors[0];
    for (let i = 1; i < numQubits; i++) {
      compositeVector = tensorProductVectors(compositeVector, qubitVectors[i]);
    }
  }

  // Composite density matrix
  // For each qubit, build 2x2 density matrix
  const qubitDMs: Complex[][][] = initialStates.map(s => {
    if (s.type === 'pure') {
      return [
        [cMul(s.alpha, cConj(s.alpha)), cMul(s.alpha, cConj(s.beta))],
        [cMul(s.beta, cConj(s.alpha)), cMul(s.beta, cConj(s.beta))]
      ];
    } else {
      return [
        [{ re: s.p0, im: 0 }, cZero()],
        [cZero(), { re: s.p1, im: 0 }]
      ];
    }
  });

  let compositeDM: DensityMatrix = qubitDMs[0];
  for (let i = 1; i < numQubits; i++) {
    compositeDM = tensorProductMatrices(compositeDM, qubitDMs[i]);
  }

  const stepsStateVectors: (StateVector | null)[] = [compositeVector];
  const stepsDensityMatrices: DensityMatrix[] = [compositeDM];

  // Initialize circuit accumulated unitary as identity
  let finalUnitary: Complex[][] = Array.from({ length: D }, (_, i) =>
    Array.from({ length: D }, (_, j) => i === j ? cOne() : cZero())
  );

  let currentVector = compositeVector ? [...compositeVector] : null;
  let currentDM = compositeDM.map(row => [...row]);

  // Apply column operations step-by-step
  for (let c = 0; c < numColumns; c++) {
    // Check elements in column c
    const colGates = grid.map((r, ri) => ({ gate: r[c], rowIndex: ri })).filter(g => g.gate !== null);
    
    let colUnitary: Complex[][] = Array.from({ length: D }, (_, i) =>
      Array.from({ length: D }, (_, j) => i === j ? cOne() : cZero())
    );

    if (colGates.length > 0) {
      // Find controls and target
      const controls = colGates.filter(g => g.gate!.type === 'C').map(g => g.rowIndex);

      const targets = colGates.filter(g => g.gate!.type !== 'C');
      for (const target of targets) {
        // Build unitary for the target gate
        let gateMat: Complex[][] = [
          [cOne(), cZero()],
          [cZero(), cOne()]
        ];
        
        const gType = target.gate!.type;
        const rad = target.gate!.paramVal ?? 0;

        if (gType === 'H') gateMat = gateH();
        else if (gType === 'X') gateMat = gateX();
        else if (gType === 'Y') gateMat = gateY();
        else if (gType === 'Z') gateMat = gateZ();
        else if (gType === 'Rx') gateMat = gateRx(rad);
        else if (gType === 'Ry') gateMat = gateRy(rad);
        else if (gType === 'Rz') gateMat = gateRz(rad);
        else if (gType === 'P') gateMat = gateP(rad);
        // measurements act as identity for the unitary/state propagation

        const targetUnitary = createUnitaryForGate(numQubits, target.rowIndex, controls, gateMat);
        colUnitary = matrixMul(targetUnitary, colUnitary);
      }
    }

    // Accumulate unitary (colUnitary * finalUnitary)
    finalUnitary = matrixMul(colUnitary, finalUnitary);

    // Evolve states
    if (currentVector) {
      currentVector = applyUnitaryToState(colUnitary, currentVector);
      stepsStateVectors.push(currentVector);
      stepsDensityMatrices.push(getDensityMatrixFromState(currentVector));
    } else {
      currentDM = applyUnitaryToDensityMatrix(colUnitary, currentDM);
      stepsStateVectors.push(null);
      stepsDensityMatrices.push(currentDM);
    }
  }

  return { stepsStateVectors, stepsDensityMatrices, finalUnitary };
};

// ── TASK MANAGER COMPONENT ───────────────────────────────────────────────────
interface TaskManagerProps {
  grid: (GateInstance | null)[][];
  numQubits: number;
  initialStates: QubitInitialState[];
  currentTicket: Ticket;
  onSelectTicket: (id: number) => void;
}

export const TaskManager: React.FC<TaskManagerProps> = ({
  grid,
  numQubits,
  initialStates,
  currentTicket,
  onSelectTicket,
}) => {
  // Shots simulator states
  const [shotsCount, setShotsCount] = useState<number>(1000);
  const [shotsResults, setShotsResults] = useState<{ [state: string]: number } | null>(null);
  
  // MIPT ticket answers form
  const [studentTheory, setStudentTheory] = useState('');
  const [studentP0, setStudentP0] = useState('');
  const [studentP1, setStudentP1] = useState('');
  const [gradingResult, setGradingResult] = useState<{
    score: number; // 2 to 5 MIPT scale
    comment: string;
    passed: boolean;
    details: string[];
  } | null>(null);

  // Re-evaluate circuit math
  const simResults = useMemo(() => {
    return runCircuit(numQubits, initialStates, grid);
  }, [numQubits, initialStates, grid]);

  // Reset results when grid or ticket is modified
  useEffect(() => {
    setShotsResults(null);
    setGradingResult(null);
  }, [grid, currentTicket]);

  // Run statistical shots simulation
  const handleRunShots = () => {
    const D = 1 << numQubits;
    const finalDM = simResults.stepsDensityMatrices[simResults.stepsDensityMatrices.length - 1];

    // Read measurement bases for each qubit
    const measurementBases = Array.from({ length: numQubits }, () => 'Z');
    
    // Scan grid from left to right for measurement gates
    for (let c = 0; c < grid[0].length; c++) {
      for (let r = 0; r < numQubits; r++) {
        const gate = grid[r][c];
        if (gate && gate.type.startsWith('M_')) {
          measurementBases[r] = gate.type[2].toUpperCase(); // Z, X, or Y
        }
      }
    }

    // To measure in base X/Y, we apply a rotation.
    let compositeBasisUnitary: Complex[][] = [
      [cOne(), cZero()],
      [cZero(), cOne()]
    ];

    const getBasisUnitary = (basis: string): Complex[][] => {
      if (basis === 'X') return gateH();
      if (basis === 'Y') return gateRx(-Math.PI / 2);
      return [
        [cOne(), cZero()],
        [cZero(), cOne()]
      ];
    };

    compositeBasisUnitary = getBasisUnitary(measurementBases[0]);
    for (let i = 1; i < numQubits; i++) {
      compositeBasisUnitary = tensorProductMatrices(compositeBasisUnitary, getBasisUnitary(measurementBases[i]));
    }

    // Apply basis change to the final density matrix
    const DM_measured = applyUnitaryToDensityMatrix(compositeBasisUnitary, finalDM);

    // Diagonal elements of DM_measured are the probabilities of outcomes in measured basis!
    const probabilities = Array.from({ length: D }, (_, i) => Math.max(0, DM_measured[i][i].re));
    const sumProbs = probabilities.reduce((a, b) => a + b, 0);
    const normalizedProbs = sumProbs > 0 ? probabilities.map(p => p / sumProbs) : probabilities;

    // Simulate shots
    const results: { [state: string]: number } = {};
    for (let s = 0; s < shotsCount; s++) {
      const rand = Math.random();
      let cumulative = 0;
      let selectedIndex = 0;
      for (let i = 0; i < D; i++) {
        cumulative += normalizedProbs[i];
        if (rand <= cumulative) {
          selectedIndex = i;
          break;
        }
      }
      const binStr = selectedIndex.toString(2).padStart(numQubits, '0');
      results[binStr] = (results[binStr] || 0) + 1;
    }

    setShotsResults(results);
  };

  // Grade student exam ticket
  const handleGradeTicket = () => {
    const details: string[] = [];
    let correctParts = 0;

    // 1. Verify theory question answer length
    if (studentTheory.trim().length < 30) {
      details.push("✗ Теоретический ответ слишком короткий или не предоставлен.");
    } else {
      details.push("✓ Теоретический ответ сохранен.");
      correctParts += 1;
    }

    // 2. Compute correct simulation values
    const u: [Complex, Complex] = [currentTicket.uVec[0], currentTicket.uVec[1]];
    // Ideal sequence: H on Q1, CNOT, H on Q1
    const s0: StateVector = [u[0], u[1], cZero(), cZero()];
    const s1: StateVector = applyH1(s0);
    const s2: StateVector = applyCNOT(s1);
    const sIdeal: StateVector = applyH1(s2);

    // Compute student's final state
    const studentDM = simResults.stepsDensityMatrices[simResults.stepsDensityMatrices.length - 1];
    
    // Compute fidelity
    const fidelity = computeFidelity(studentDM, sIdeal);
    
    if (fidelity > 0.999) {
      details.push(`✓ Квантовая схема собрана верно! Fidelity = ${fidelity.toFixed(4)}`);
      correctParts += 2;
    } else {
      details.push(`✗ Квантовая схема не соответствует требуемой схеме билета (H ⊗ I, затем CNOT, затем H ⊗ I). Fidelity = ${fidelity.toFixed(4)}`);
    }

    // 3. Verify student calculations: P(0) and P(1)
    const idealP0 = (sIdeal[0].re ** 2 + sIdeal[0].im ** 2) + (sIdeal[1].re ** 2 + sIdeal[1].im ** 2);
    const idealP1 = (sIdeal[2].re ** 2 + sIdeal[2].im ** 2) + (sIdeal[3].re ** 2 + sIdeal[3].im ** 2);

    const userP0 = parseFloat(studentP0);
    const userP1 = parseFloat(studentP1);

    if (!isNaN(userP0) && Math.abs(userP0 - idealP0) < 0.02) {
      details.push(`✓ Вероятность P(Q₁=0) рассчитана верно: ${(userP0*100).toFixed(1)}%`);
      correctParts += 1;
    } else {
      details.push(`✗ Ошибка в расчете P(Q₁=0). Ожидалось: ${(idealP0*100).toFixed(1)}%`);
    }

    if (!isNaN(userP1) && Math.abs(userP1 - idealP1) < 0.02) {
      details.push(`✓ Вероятность P(Q₁=1) рассчитана верно: ${(userP1*100).toFixed(1)}%`);
      correctParts += 1;
    } else {
      details.push(`✗ Ошибка в расчете P(Q₁=1). Ожидалось: ${(idealP1*100).toFixed(1)}%`);
    }

    // Compute MIPT grade (out of 5)
    let score = 2;
    if (correctParts >= 5) score = 5;
    else if (correctParts >= 4) score = 4;
    else if (correctParts >= 2) score = 3;

    let comment = "Неудовлетворительно (2). Пожалуйста, повторите теорию и перепроверьте схему.";
    if (score === 5) comment = "Отлично (5)! Квантовая схема собрана идеально, теоретические ответы и расчеты верны.";
    else if (score === 4) comment = "Хорошо (4). Мелкие недочеты в расчете вероятностей или теории.";
    else if (score === 3) comment = "Удовлетворительно (3). Схема собрана, но допущены ошибки в теории или расчетах.";

    setGradingResult({
      score,
      comment,
      passed: score >= 3,
      details
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>
        
        {/* Theory answer & Probability forms */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--accent-cyan)' }}>
            ✍️ Ответ на экзаменационный билет
          </h3>

          {/* Ticket Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>Выберите билет:</span>
            <select
              value={currentTicket.id}
              onChange={e => onSelectTicket(parseInt(e.target.value))}
              style={{
                background: 'rgba(0,0,0,0.3)', border: '1px solid var(--accent-cyan)',
                borderRadius: '6px', padding: '6px 12px', color: 'var(--accent-cyan)', fontSize: '13px',
                outline: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', width: '100%', maxWidth: '280px'
              }}
            >
              {ticketsData.map(t => (
                <option key={t.id} value={t.id}>{t.title}: {t.theoryQuestion.substring(0, 30)}...</option>
              ))}
            </select>
          </div>

          {/* Essay response */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              1. Изложите краткий теоретический ответ на вопрос:
            </label>
            <textarea
              value={studentTheory}
              onChange={e => setStudentTheory(e.target.value)}
              style={{
                width: '100%', height: '140px', background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-muted)', borderRadius: '10px',
                padding: '12px', color: 'var(--text-primary)', fontSize: '13px',
                lineHeight: '1.5', outline: 'none', resize: 'vertical'
              }}
              placeholder="Напишите физические свойства, формулы и практическое применение темы билета..."
            />
          </div>

          {/* Calculations input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              2. Запишите теоретически рассчитанные вероятности измерения Q₁:
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>P(0):</span>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={studentP0}
                  onChange={e => setStudentP0(e.target.value)}
                  style={{
                    flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-muted)',
                    borderRadius: '6px', padding: '8px', color: 'var(--accent-cyan)', fontSize: '13px',
                    fontFamily: 'var(--font-mono)'
                  }}
                  placeholder="e.g. 0.500"
                />
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>P(1):</span>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={studentP1}
                  onChange={e => setStudentP1(e.target.value)}
                  style={{
                    flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-muted)',
                    borderRadius: '6px', padding: '8px', color: 'var(--accent-cyan)', fontSize: '13px',
                    fontFamily: 'var(--font-mono)'
                  }}
                  placeholder="e.g. 0.500"
                />
              </div>
            </div>
          </div>

          {/* Grading result button and card */}
          <div style={{ marginTop: '10px' }}>
            <button 
              onClick={handleGradeTicket}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              🔬 Проверить ответы и поставить оценку
            </button>

            {gradingResult && (
              <div style={{
                marginTop: '16px', padding: '16px',
                borderRadius: '10px',
                background: gradingResult.score >= 4 ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${gradingResult.score >= 4 ? 'var(--accent-cyan)' : 'var(--accent-pink)'}`,
                boxShadow: 'var(--shadow-neon)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Результаты проверки МФТИ:
                  </h4>
                  <span style={{
                    fontSize: '20px', fontWeight: '800',
                    color: gradingResult.score >= 4 ? 'var(--accent-cyan)' : 'var(--accent-pink)'
                  }}>
                    {gradingResult.score} / 5
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  {gradingResult.comment}
                </p>
                <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {gradingResult.details.map((d, i) => (
                    <div key={i} style={{ color: d.startsWith('✓') ? '#4ade80' : '#f87171' }}>{d}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Ticket Information summary sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              Параметры симуляции билета
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '10px' }}>
              Соберите схему, переводящую состояние $|0\rangle \otimes |u\rangle$ в запутанное состояние путем применения $H \otimes I$ и последующего $CNOT$ (управляющий - Q1, целевой - Q2).
            </p>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '12px',
              padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px',
              border: '1px solid var(--border-muted)', color: 'var(--accent-cyan)'
            }}>
              Начальный Q₂ (u) = {currentTicket.uName}
            </div>
          </div>

          {/* Shots simulator controls */}
          <ShotsPanel 
            shotsCount={shotsCount} 
            setShotsCount={setShotsCount}
            onRun={handleRunShots}
            results={shotsResults}
          />

        </div>

      </div>
    </div>
  );
};

// ── SHOTS PANELS COMPONENT ───────────────────────────────────────────────────
export interface ShotsPanelProps {
  shotsCount: number;
  setShotsCount: (n: number) => void;
  onRun: () => void;
  results: { [state: string]: number } | null;
}

export const ShotsPanel: React.FC<ShotsPanelProps> = ({
  shotsCount,
  setShotsCount,
  onRun,
  results,
}) => {
  // Sort outcomes binary-wise
  const sortedOutcomes = useMemo(() => {
    if (!results) return [];
    return Object.entries(results).sort((a, b) => a[0].localeCompare(b[0]));
  }, [results]);

  // Find max count for graph scaling
  const maxCount = useMemo(() => {
    if (sortedOutcomes.length === 0) return 1;
    return Math.max(...sortedOutcomes.map(o => o[1]));
  }, [sortedOutcomes]);

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <h4 style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '12px', fontWeight: '700' }}>
        📊 Статистика измерений (Shots)
      </h4>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '14px' }}>
        Запускает квантовую схему указанное количество раз, симулируя физические измерения с коллапсом волновой функции.
      </p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <select
          value={shotsCount}
          onChange={e => setShotsCount(parseInt(e.target.value))}
          style={{
            flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-muted)',
            borderRadius: '6px', padding: '8px', color: 'var(--accent-cyan)', fontSize: '12px',
            outline: 'none'
          }}
        >
          <option value="100">100 запусков</option>
          <option value="500">500 запусков</option>
          <option value="1000">1000 запусков</option>
          <option value="8000">8000 запусков</option>
        </select>
        <button 
          onClick={onRun}
          className="btn-primary"
          style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '6px' }}
        >
          Запустить
        </button>
      </div>

      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sortedOutcomes.map(([state, count]) => {
            const prob = count / shotsCount;
            return (
              <div key={state} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>|{state}⟩</span>
                  <span style={{ color: 'var(--text-muted)' }}>{count} ({ (prob * 100).toFixed(1) }%)</span>
                </div>
                <div style={{ height: '14px', background: 'rgba(0,0,0,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(count / maxCount) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))',
                    boxShadow: '0 0 6px var(--accent-cyan)44',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
