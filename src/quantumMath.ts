export interface Complex {
  re: number;
  im: number;
}

export const cZero = (): Complex => ({ re: 0, im: 0 });
export const cOne = (): Complex => ({ re: 1, im: 0 });
export const cI = (): Complex => ({ re: 0, im: 1 });

export const cAdd = (a: Complex, b: Complex): Complex => ({
  re: a.re + b.re,
  im: a.im + b.im,
});

export const cSub = (a: Complex, b: Complex): Complex => ({
  re: a.re - b.re,
  im: a.im - b.im,
});

export const cMul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});

export const cConj = (a: Complex): Complex => ({
  re: a.re,
  im: -a.im,
});

export const cScale = (a: Complex, s: number): Complex => ({
  re: a.re * s,
  im: a.im * s,
});

export const cNormSq = (a: Complex): number => a.re * a.re + a.im * a.im;
export const cNorm = (a: Complex): number => Math.sqrt(cNormSq(a));

export const cToString = (a: Complex, digits: number = 3): string => {
  if (Math.abs(a.re) < 1e-6 && Math.abs(a.im) < 1e-6) return "0";
  if (Math.abs(a.im) < 1e-6) return a.re.toFixed(digits);
  if (Math.abs(a.re) < 1e-6) {
    if (Math.abs(a.im - 1) < 1e-6) return "i";
    if (Math.abs(a.im + 1) < 1e-6) return "-i";
    return `${a.im.toFixed(digits)}i`;
  }
  const sign = a.im > 0 ? "+" : "-";
  const imVal = Math.abs(a.im);
  const imStr = Math.abs(imVal - 1) < 1e-6 ? "i" : `${imVal.toFixed(digits)}i`;
  return `${a.re.toFixed(digits)} ${sign} ${imStr}`;
};

export type StateVector = Complex[];
export type DensityMatrix = Complex[][];

export interface BlochVector {
  x: number;
  y: number;
  z: number;
}

export type DensityMatrix2x2 = [
  [Complex, Complex],
  [Complex, Complex]
];

// Tensor products
export const tensorProductVectors = (A: Complex[], B: Complex[]): Complex[] => {
  const C: Complex[] = [];
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < B.length; j++) {
      C.push(cMul(A[i], B[j]));
    }
  }
  return C;
};

export const tensorProductMatrices = (A: Complex[][], B: Complex[][]): Complex[][] => {
  const rA = A.length;
  const cA = A[0].length;
  const rB = B.length;
  const cB = B[0].length;
  const C: Complex[][] = Array.from({ length: rA * rB }, () => Array.from({ length: cA * cB }, () => cZero()));
  for (let i = 0; i < rA; i++) {
    for (let j = 0; j < cA; j++) {
      for (let k = 0; k < rB; k++) {
        for (let l = 0; l < cB; l++) {
          C[i * rB + k][j * cB + l] = cMul(A[i][j], B[k][l]);
        }
      }
    }
  }
  return C;
};

// Compute density matrix rho = |\psi><\psi|
export const getDensityMatrixFromState = (state: StateVector): DensityMatrix => {
  const D = state.length;
  const rho: DensityMatrix = [];
  for (let i = 0; i < D; i++) {
    const row: Complex[] = [];
    for (let j = 0; j < D; j++) {
      row.push(cMul(state[i], cConj(state[j])));
    }
    rho.push(row);
  }
  return rho;
};

// Matrix operations
export const matrixMul = (A: Complex[][], B: Complex[][]): Complex[][] => {
  const D = A.length;
  const C: Complex[][] = Array.from({ length: D }, () => Array.from({ length: D }, () => cZero()));
  for (let i = 0; i < D; i++) {
    for (let j = 0; j < D; j++) {
      let sum = cZero();
      for (let k = 0; k < D; k++) {
        sum = cAdd(sum, cMul(A[i][k], B[k][j]));
      }
      C[i][j] = sum;
    }
  }
  return C;
};

export const matrixConjTranspose = (A: Complex[][]): Complex[][] => {
  const D = A.length;
  const C: Complex[][] = Array.from({ length: D }, () => Array.from({ length: D }, () => cZero()));
  for (let i = 0; i < D; i++) {
    for (let j = 0; j < D; j++) {
      C[j][i] = cConj(A[i][j]);
    }
  }
  return C;
};

// Apply unitary
export const applyUnitaryToState = (U: Complex[][], state: StateVector): StateVector => {
  const D = state.length;
  const next: StateVector = Array.from({ length: D }, () => cZero());
  for (let i = 0; i < D; i++) {
    let sum = cZero();
    for (let j = 0; j < D; j++) {
      sum = cAdd(sum, cMul(U[i][j], state[j]));
    }
    next[i] = sum;
  }
  return next;
};

export const applyUnitaryToDensityMatrix = (U: Complex[][], rho: DensityMatrix): DensityMatrix => {
  const U_dagger = matrixConjTranspose(U);
  return matrixMul(matrixMul(U, rho), U_dagger);
};

// Gate definitions (2x2 matrices)
export const gateH = (): Complex[][] => {
  const s = 1 / Math.sqrt(2);
  return [
    [{ re: s, im: 0 }, { re: s, im: 0 }],
    [{ re: s, im: 0 }, { re: -s, im: 0 }]
  ];
};

export const gateX = (): Complex[][] => [
  [cZero(), cOne()],
  [cOne(), cZero()]
];

export const gateY = (): Complex[][] => [
  [cZero(), { re: 0, im: -1 }],
  [{ re: 0, im: 1 }, cZero()]
];

export const gateZ = (): Complex[][] => [
  [cOne(), cZero()],
  [cZero(), { re: -1, im: 0 }]
];

export const gateRx = (theta: number): Complex[][] => {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [{ re: c, im: 0 }, { re: 0, im: -s }],
    [{ re: 0, im: -s }, { re: c, im: 0 }]
  ];
};

export const gateRy = (theta: number): Complex[][] => {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [{ re: c, im: 0 }, { re: -s, im: 0 }],
    [{ re: s, im: 0 }, { re: c, im: 0 }]
  ];
};

export const gateRz = (theta: number): Complex[][] => {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [{ re: c, im: -s }, cZero()],
    [cZero(), { re: c, im: s }]
  ];
};

export const gateP = (theta: number): Complex[][] => [
  [cOne(), cZero()],
  [cZero(), { re: Math.cos(theta), im: Math.sin(theta) }]
];

// Unitary builder for controlled single-qubit gates
export const createUnitaryForGate = (
  numQubits: number,
  target: number,
  controls: number[],
  gateMatrix: Complex[][]
): Complex[][] => {
  const D = 1 << numQubits;
  const U: Complex[][] = Array.from({ length: D }, () => Array.from({ length: D }, () => cZero()));

  // Map qubit index to bit index (MSB-first):
  const targetBit = numQubits - 1 - target;
  const controlBits = controls.map(c => numQubits - 1 - c);

  for (let r = 0; r < D; r++) {
    let controlsPass = true;
    for (const cb of controlBits) {
      if (((r >> cb) & 1) === 0) {
        controlsPass = false;
        break;
      }
    }

    if (controlsPass) {
      const bitVal = (r >> targetBit) & 1;
      const rFlipped = r ^ (1 << targetBit);

      U[r][r] = gateMatrix[bitVal][bitVal];
      U[r][rFlipped] = gateMatrix[bitVal][1 - bitVal];
    } else {
      U[r][r] = cOne();
    }
  }

  return U;
};

// Reduced density matrix (trace out all qubits except target qubit k)
export const getReducedDensityMatrix = (
  rho: DensityMatrix,
  k: number,
  numQubits: number
): DensityMatrix2x2 => {
  const result: DensityMatrix2x2 = [
    [cZero(), cZero()],
    [cZero(), cZero()]
  ];
  const D = 1 << numQubits;
  // Bit position corresponding to qubit k (MSB-first):
  const targetBit = numQubits - 1 - k;

  for (let a = 0; a < 2; a++) {
    for (let b = 0; b < 2; b++) {
      let sum = cZero();
      for (let r = 0; r < D; r++) {
        const bitK = (r >> targetBit) & 1;
        if (bitK === a) {
          const rPrime = (r & ~(1 << targetBit)) | (b << targetBit);
          sum = cAdd(sum, rho[r][rPrime]);
        }
      }
      result[a][b] = sum;
    }
  }
  return result;
};

// Bloch vector coordinate computation
export const getBlochVector = (rho: DensityMatrix2x2): BlochVector => {
  // x = 2 * Re(rho_01)
  // y = -2 * Im(rho_01)
  // z = rho_00 - rho_11
  return {
    x: 2 * rho[0][1].re,
    y: -2 * rho[0][1].im,
    z: rho[0][0].re - rho[1][1].re
  };
};

// Fidelity calculations
// 1. Fidelity between a density matrix and a pure target state vector
export const computeFidelity = (rho: DensityMatrix, targetState: StateVector): number => {
  const D = rho.length;
  let sum = cZero();
  for (let i = 0; i < D; i++) {
    for (let j = 0; j < D; j++) {
      const term1 = cMul(cConj(targetState[i]), rho[i][j]);
      const term2 = cMul(term1, targetState[j]);
      sum = cAdd(sum, term2);
    }
  }
  return Math.max(0, Math.min(1, sum.re)); // Bound between 0 and 1
};

// 2. Fidelity between two pure states: |<psi|phi>|^2
export const computeStateFidelity = (psi: StateVector, phi: StateVector): number => {
  let overlap = cZero();
  for (let i = 0; i < psi.length; i++) {
    overlap = cAdd(overlap, cMul(cConj(psi[i]), phi[i]));
  }
  return cNormSq(overlap);
};

// 3. Fidelity of two unitaries (modulo global phase): |Tr(U1^\dagger * U2)| / D
export const computeUnitaryFidelity = (U1: Complex[][], U2: Complex[][]): number => {
  const D = U1.length;
  let sum = cZero();
  for (let i = 0; i < D; i++) {
    for (let j = 0; j < D; j++) {
      // (U1^\dagger)_{ij} = (U1_{ji})^*
      sum = cAdd(sum, cMul(cConj(U1[j][i]), U2[j][i]));
    }
  }
  return cNorm(sum) / D;
};

// Mathematical expression parser
export const parseExpression = (expr: string): number => {
  const s = expr.replace(/\s+/g, "").toLowerCase();
  let pos = 0;

  const peek = () => s[pos] || "";
  const consume = () => s[pos++];

  const parseExpr = (): number => {
    let val = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = consume();
      const right = parseTerm();
      if (op === "+") val += right;
      else val -= right;
    }
    return val;
  };

  const parseTerm = (): number => {
    let val = parseFactor();
    while (peek() === "*" || peek() === "/") {
      const op = consume();
      const right = parseFactor();
      if (op === "*") val *= right;
      else val /= right;
    }
    return val;
  };

  const parseFactor = (): number => {
    const next = peek();
    if (next === "-") {
      consume();
      return -parseFactor();
    }
    if (next === "+") {
      consume();
      return parseFactor();
    }
    if (next === "(") {
      consume();
      const val = parseExpr();
      if (consume() !== ")") throw new Error("Mismatched parentheses");
      return val;
    }

    if (s.startsWith("pi", pos)) {
      pos += 2;
      return Math.PI;
    }

    const start = pos;
    while (/[0-9.]/.test(peek())) {
      consume();
    }
    if (pos === start) {
      throw new Error(`Unexpected token at position ${pos}: ${peek()}`);
    }
    const numStr = s.slice(start, pos);
    const val = parseFloat(numStr);
    if (isNaN(val)) throw new Error(`Invalid number: ${numStr}`);
    return val;
  };

  const res = parseExpr();
  if (pos < s.length) {
    throw new Error(`Unexpected trailing characters at position ${pos}`);
  }
  return res;
};

export const parseComplexString = (s: string): Complex => {
  const trimmed = s.trim();
  if (trimmed === '1') return { re: 1, im: 0 };
  if (trimmed === '-1') return { re: -1, im: 0 };
  if (trimmed === 'i') return { re: 0, im: 1 };
  if (trimmed === '-i') return { re: 0, im: -1 };
  if (trimmed === '0') return { re: 0, im: 0 };
  const val = parseFloat(trimmed);
  if (!isNaN(val)) return { re: val, im: 0 };
  return { re: 0, im: 0 };
};

// Check if a matrix is unitary (supports complex and string representations)
export const checkUnitarity = (m: Complex[][] | string[][]): { unitary: boolean; maxErr: number; product: Complex[][] } => {
  const D = m.length;
  const parsedMatrix: Complex[][] = Array.from({ length: D }, () => []);
  for (let i = 0; i < D; i++) {
    for (let j = 0; j < D; j++) {
      const val = m[i][j];
      if (typeof val === 'string') {
        parsedMatrix[i].push(parseComplexString(val));
      } else {
        parsedMatrix[i].push(val as Complex);
      }
    }
  }

  const mDagger = matrixConjTranspose(parsedMatrix);
  const product = matrixMul(parsedMatrix, mDagger);
  let maxErr = 0;

  for (let i = 0; i < D; i++) {
    for (let j = 0; j < D; j++) {
      const targetRe = i === j ? 1.0 : 0.0;
      const targetIm = 0.0;
      const err = Math.sqrt(Math.pow(product[i][j].re - targetRe, 2) + Math.pow(product[i][j].im - targetIm, 2));
      if (err > maxErr) {
        maxErr = err;
      }
    }
  }

  return {
    unitary: maxErr < 1e-4,
    maxErr,
    product
  };
};

// ── 2-QUBIT COMPATIBILITY HELPERS FOR APP.TSX ───────────────────────────
export type DensityMatrix4x4 = Complex[][];

export const getInitialState = (u: [Complex, Complex]): StateVector => {
  return [u[0], u[1], cZero(), cZero()];
};

export const applyH1 = (S: StateVector): StateVector => {
  const inv = 1 / Math.sqrt(2);
  return [
    cScale(cAdd(S[0], S[2]), inv),
    cScale(cAdd(S[1], S[3]), inv),
    cScale(cSub(S[0], S[2]), inv),
    cScale(cSub(S[1], S[3]), inv)
  ];
};

export const applyCNOT = (S: StateVector): StateVector => {
  return [S[0], S[1], S[3], S[2]];
};

export const getDensityMatrix = (S: StateVector): DensityMatrix => {
  return getDensityMatrixFromState(S);
};

export const getReducedDensityMatrix1 = (rho: DensityMatrix): DensityMatrix2x2 => {
  // Trace out second qubit (index 1 in binary, which corresponds to row/col 1 and 3)
  return [
    [cAdd(rho[0][0], rho[1][1]), cAdd(rho[0][2], rho[1][3])],
    [cAdd(rho[2][0], rho[3][1]), cAdd(rho[2][2], rho[3][3])]
  ];
};

export const getReducedDensityMatrix2 = (rho: DensityMatrix): DensityMatrix2x2 => {
  // Trace out first qubit (index 0 in binary, which corresponds to row/col 2 and 3)
  return [
    [cAdd(rho[0][0], rho[2][2]), cAdd(rho[0][1], rho[2][3])],
    [cAdd(rho[1][0], rho[3][2]), cAdd(rho[1][1], rho[3][3])]
  ];
};
