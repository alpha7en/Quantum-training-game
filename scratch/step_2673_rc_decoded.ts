"#### Схема реализации:
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

Фазовые ошибки ($Z$) являются специфически квантовыми и не имеют аналогов в классических компьютерах. Однако их можно исправить с помощью того же трехкубитового кода
<truncated 8956 bytes>