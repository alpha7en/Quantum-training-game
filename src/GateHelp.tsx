import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

/** Helper: call renderMathInElement with retry if script hasn't loaded yet */
const renderMath = (el: HTMLElement) => {
  let active = true;
  const attempt = () => {
    if (!active || !el) return;
    if ((window as any).renderMathInElement) {
      try {
        (window as any).renderMathInElement(el, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false
        });
      } catch (err) {
        console.error("KaTeX rendering error:", err);
      }
    } else {
      setTimeout(attempt, 100);
    }
  };
  attempt();
  return () => { active = false; };
};

/**
 * Latex — renders a PURE math expression. Wraps content in $...$ or $$...$$ delimiters.
 * Use for: matrixFormula, basisAction — strings that are 100% LaTeX math.
 */
export const Latex: React.FC<{ math: string; block?: boolean; style?: React.CSSProperties }> = ({ math, block = false, style }) => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current) return renderMath(ref.current);
  }, [math]);

  const text = block ? `$$${math}$$` : `$${math}$`;
  return <span key={math} ref={ref} style={{ display: block ? 'block' : 'inline-block', ...style }}>{text}</span>;
};

/**
 * MathText — renders mixed text that already contains inline $...$ or $$...$$ delimiters.
 * Use for: description fields — strings like "Создает суперпозицию... $\pi$ радиан."
 * Does NOT wrap content in additional delimiters.
 */
export const MathText: React.FC<{ children: string; style?: React.CSSProperties }> = ({ children, style }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) return renderMath(ref.current);
  }, [children]);

  return <div key={children} ref={ref} style={style}>{children}</div>;
};

export interface GateDoc {
  name: string;
  symbol: string;
  matrixFormula: string;
  description: string;
  basisAction: string;
}

export const gateDocs: { [key: string]: GateDoc } = {
  H: {
    name: "Гейт Адамара (Hadamard)",
    symbol: "H",
    matrixFormula: "H = \\frac{1}{\\sqrt{2}} \\begin{pmatrix} 1 & 1 \\\\ 1 & -1 \\end{pmatrix}",
    description: "Создает суперпозицию из базисных состояний. Поворачивает сферу Блоха вокруг оси X+Z на угол $\\pi$ радиан.",
    basisAction: "H|0\\rangle = |+\\rangle, \\quad H|1\\rangle = |-\\rangle \\\\ H|+\\rangle = |0\\rangle, \\quad H|-\\rangle = |1\\rangle"
  },
  X: {
    name: "Гейт Паули-X (Pauli-X / NOT)",
    symbol: "X",
    matrixFormula: "X = \\begin{pmatrix} 0 & 1 \\\\ 1 & 0 \\end{pmatrix}",
    description: "Квантовое отрицание (NOT). Отражает состояние относительно оси X сферы Блоха. Меняет амплитуды $|0\\rangle$ и $|1\\rangle$.",
    basisAction: "X|0\\rangle = |1\\rangle, \\quad X|1\\rangle = |0\\rangle \\\\ X|+\\rangle = |+\\rangle, \\quad X|-\\rangle = -|-\\rangle"
  },
  Y: {
    name: "Гейт Паули-Y (Pauli-Y)",
    symbol: "Y",
    matrixFormula: "Y = \\begin{pmatrix} 0 & -i \\\\ i & 0 \\end{pmatrix}",
    description: "Отражает состояние относительно оси Y сферы Блоха (поворот на $\\pi$ радиан с комплексной фазой).",
    basisAction: "Y|0\\rangle = i|1\\rangle, \\quad Y|1\\rangle = -i|0\\rangle \\\\ Y|+\\rangle = i|-\\rangle, \\quad Y|-\\rangle = -i|+\\rangle"
  },
  Z: {
    name: "Гейт Паули-Z (Pauli-Z)",
    symbol: "Z",
    matrixFormula: "Z = \\begin{pmatrix} 1 & 0 \\\\ 0 & -1 \\end{pmatrix}",
    description: "Фазовый сдвиг (Phase Flip). Инвертирует знак состояния $|1\\rangle$. Отражает состояние относительно оси Z сферы Блоха.",
    basisAction: "Z|0\\rangle = |0\\rangle, \\quad Z|1\\rangle = -|1\\rangle \\\\ Z|+\\rangle = |-\\rangle, \\quad Z|-\\rangle = |+\\rangle"
  },
  Rx: {
    name: "Параметрический поворот Rx",
    symbol: "Rx(θ)",
    matrixFormula: "R_x(\\theta) = \\begin{pmatrix} \\cos\\frac{\\theta}{2} & -i\\sin\\frac{\\theta}{2} \\\\ -i\\sin\\frac{\\theta}{2} & \\cos\\frac{\\theta}{2} \\end{pmatrix}",
    description: "Поворачивает вектор состояния вокруг оси X сферы Блоха на произвольный угол $\\theta$ в радианах.",
    basisAction: "R_x(\\theta)|0\\rangle = \\cos\\frac{\\theta}{2}|0\\rangle - i\\sin\\frac{\\theta}{2}|1\\rangle \\\\ R_x(\\pi)|0\\rangle = -i|1\\rangle"
  },
  Ry: {
    name: "Параметрический поворот Ry",
    symbol: "Ry(θ)",
    matrixFormula: "R_y(\\theta) = \\begin{pmatrix} \\cos\\frac{\\theta}{2} & -\\sin\\frac{\\theta}{2} \\\\ \\sin\\frac{\\theta}{2} & \\cos\\frac{\\theta}{2} \\end{pmatrix}",
    description: "Поворачивает вектор состояния вокруг оси Y сферы Блоха на произвольный угол $\\theta$ в радианах. Дает вещественные амплитуды.",
    basisAction: "R_y(\\theta)|0\\rangle = \\cos\\frac{\\theta}{2}|0\\rangle + \\sin\\frac{\\theta}{2}|1\\rangle \\\\ R_y(\\pi/2)|0\\rangle = |+\\rangle"
  },
  Rz: {
    name: "Параметрический поворот Rz",
    symbol: "Rz(θ)",
    matrixFormula: "R_z(\\theta) = \\begin{pmatrix} e^{-i\\theta/2} & 0 \\\\ 0 & e^{i\\theta/2} \\end{pmatrix}",
    description: "Поворачивает вектор состояния вокруг оси Z сферы Блоха на произвольный угол $\\theta$ в радианах (относительный фазовый сдвиг $\\theta$).",
    basisAction: "R_z(\\theta)|0\\rangle = e^{-i\\theta/2}|0\\rangle, \\quad R_z(\\theta)|1\\rangle = e^{i\\theta/2}|1\\rangle"
  },
  P: {
    name: "Фазовый сдвиг Phase (P)",
    symbol: "P(θ)",
    matrixFormula: "P(\\theta) = \\begin{pmatrix} 1 & 0 \\\\ 0 & e^{i\\theta} \\end{pmatrix}",
    description: "Добавляет фазовый множитель $e^{i\\theta}$ к состоянию $|1\\rangle$, оставляя $|0\\rangle$ неизменным.",
    basisAction: "P(\\theta)|0\\rangle = |0\\rangle, \\quad P(\\theta)|1\\rangle = e^{i\\theta}|1\\rangle"
  },
  C: {
    name: "Точка управления (Control)",
    symbol: "●",
    matrixFormula: "\\text{Управляющее условие (С)}",
    description: "Делает другой гейт в том же столбце управляемым. Если кубиты в точках Control равны $|1\\rangle$, операция применяется к целевому кубиту. Поддерживает несколько контролей (например, Toffoli).",
    basisAction: "C \\otimes U: |1\\rangle|\\psi\\rangle \\rightarrow |1\\rangle U|\\psi\\rangle, \\quad |0\\rangle|\\psi\\rangle \\rightarrow |0\\rangle|\\psi\\rangle"
  },
  M_z: {
    name: "Измерение в базисе Z",
    symbol: "Mz",
    matrixFormula: "P_0 = |0\\rangle\\langle 0|, \\quad P_1 = |1\\rangle\\langle 1|",
    description: "Проективное измерение в стандартном базисе Z ($|0\\rangle, |1\\rangle$). Коллапсирует суперпозицию с вероятностью $p(a) = \\text{Tr}(P_a \\rho)$.",
    basisAction: "\\alpha|0\\rangle + \\beta|1\\rangle \\xrightarrow{\\text{Измерение}} 0 \\text{ (p = }|\\alpha|^2\\text{) или } 1 \\text{ (p = }|\\beta|^2\\text{)}"
  },
  M_x: {
    name: "Измерение в базисе X",
    symbol: "Mx",
    matrixFormula: "P_+ = |+\\rangle\\langle +|, \\quad P_- = |-\\rangle\\langle -|",
    description: "Проективное измерение в базисе Адамара X ($|+\\rangle, |-\\rangle$). Физически эквивалентно применению гейта H перед стандартным измерением.",
    basisAction: "\\alpha|0\\rangle + \\beta|1\\rangle \\xrightarrow{\\text{Измерение}} + \\text{ или } -"
  },
  M_y: {
    name: "Измерение в базисе Y",
    symbol: "My",
    matrixFormula: "P_{i+} = |i+\\rangle\\langle i+|, \\quad P_{i-} = |i-\\rangle\\langle i-|",
    description: "Проективное измерение в базисе Y ($|i+\\rangle, |i-\\rangle$). Физически эквивалентно применению гейта $Rx(-\\pi/2)$ перед стандартным измерением.",
    basisAction: "\\alpha|0\\rangle + \\beta|1\\rangle \\xrightarrow{\\text{Измерение}} |i+\\rangle \\text{ или } |i-\\rangle"
  }
};

interface HelpModalProps {
  gateType: string;
  onClose: () => void;
}

export const GateHelpModal: React.FC<HelpModalProps> = ({ gateType, onClose }) => {
  const doc = gateDocs[gateType];
  if (!doc) return null;

  const modal = (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(5, 10, 20, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--accent-cyan)',
        borderRadius: '16px',
        padding: '30px',
        maxWidth: '550px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-neon-lg)',
        position: 'relative'
      }} onClick={e => e.stopPropagation()}>
        
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px', right: '16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-muted)',
            color: 'var(--text-muted)',
            borderRadius: '50%',
            width: '32px', height: '32px',
            fontSize: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          ×
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{
            width: '48px', height: '48px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-blue) 100%)',
            color: 'var(--bg-deep)',
            fontSize: '20px', fontWeight: '800',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 0 10px var(--border-glow)'
          }}>
            {doc.symbol.length > 2 ? doc.symbol[0] : doc.symbol}
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {doc.name}
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              Gate: {gateType}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              Математическое представление
            </h4>
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border-muted)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflowX: 'auto'
            }}>
              <Latex math={doc.matrixFormula} block />
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
              Описание работы
            </h4>
            <MathText style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {doc.description}
            </MathText>
          </div>

          <div>
            <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
              Действие на состояния
            </h4>
            <div style={{
              fontSize: '13px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-purple)',
              background: 'rgba(0,0,0,0.15)',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid rgba(168,85,247,0.2)',
              overflowX: 'auto'
            }}>
              <Latex math={doc.basisAction} block={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Portal to document.body to escape any parent stacking contexts (glass-panel backdrop-filter)
  return ReactDOM.createPortal(modal, document.body);
};
