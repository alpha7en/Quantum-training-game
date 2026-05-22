import React from 'react';
import { Complex, cToString } from './quantumMath';

interface MatrixProps {
  matrix: string[][];
  scale?: string;
  title?: string;
  highlighted?: boolean;
}

const entryColor = (entry: string) => {
  if (entry.includes('i')) return 'var(--accent-purple)';
  if (entry.includes('-')) return 'var(--accent-pink)';
  return 'var(--text-primary)';
};

export const MatrixDisplay: React.FC<MatrixProps> = ({ matrix, scale, title, highlighted }) => {
  return (
    <div style={{ textAlign: 'center', maxWidth: '100%' }}>
      {title && (
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          {title}
        </div>
      )}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {scale && (
          <span style={{ fontSize: '18px', marginRight: '4px', color: 'var(--text-secondary)' }}>
            {scale}
          </span>
        )}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${matrix[0].length}, 1fr)`,
          gap: '6px 14px',
          padding: '14px 20px',
          border: `2px solid ${highlighted ? 'var(--accent-cyan)' : 'var(--text-secondary)'}`,
          borderTop: 'none',
          borderBottom: 'none',
          boxShadow: highlighted ? 'inset 0 0 20px rgba(0,242,254,0.05)' : 'none',
          borderRadius: '2px',
          background: 'rgba(0,0,0,0.25)',
          fontFamily: 'var(--font-mono)',
          fontSize: '14px',
          alignItems: 'center',
          justifyItems: 'center',
          position: 'relative',
        }}>
          {/* Left bracket */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: '2px',
            background: highlighted ? 'var(--accent-cyan)' : 'var(--text-secondary)',
          }}/>
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '2px',
            background: highlighted ? 'var(--accent-cyan)' : 'var(--text-secondary)',
          }}/>
          {matrix.flatMap((row, i) =>
            row.map((entry, j) => (
              <span
                key={`${i}-${j}`}
                style={{
                  minWidth: '28px',
                  textAlign: 'center',
                  color: entryColor(entry),
                  fontWeight: (entry !== '1' && entry !== '1/2') ? '600' : '400',
                }}
              >
                {entry}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

interface ComplexMatrixDisplayProps {
  matrix: Complex[][];
  size?: number;
  title?: string;
  digits?: number;
}

export const ComplexMatrixDisplay: React.FC<ComplexMatrixDisplayProps> = ({
  matrix, size = 2, title, digits = 3
}) => {
  return (
    <div style={{ textAlign: 'center', maxWidth: '100%' }}>
      {title && (
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          {title}
        </div>
      )}
      <div style={{ display: 'inline-block', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gap: '6px 12px',
          padding: '12px 18px',
          border: '2px solid var(--border-muted)',
          borderTop: 'none',
          borderBottom: 'none',
          borderRadius: '2px',
          background: 'rgba(0,0,0,0.2)',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          alignItems: 'center',
          justifyItems: 'center',
          minWidth: `${size * 80}px`,
        }}>
          {matrix.flatMap((row, i) =>
            row.map((entry, j) => {
              const isImag = Math.abs(entry.re) < 1e-6;
              const isZero = Math.abs(entry.re) < 1e-6 && Math.abs(entry.im) < 1e-6;
              const color = isZero
                ? 'var(--text-muted)'
                : isImag
                ? 'var(--accent-purple)'
                : 'var(--text-primary)';
              return (
                <span key={`${i}-${j}`} style={{ color, minWidth: '60px', textAlign: 'center' }}>
                  {cToString(entry, digits)}
                </span>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

interface VectorDisplayProps {
  vector: [Complex, Complex];
  title?: string;
}

export const VectorDisplay: React.FC<VectorDisplayProps> = ({ vector, title }) => {
  const components = [
    { label: '|0⟩', val: vector[0] },
    { label: '|1⟩', val: vector[1] },
  ];

  return (
    <div style={{ textAlign: 'center' }}>
      {title && (
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          {title}
        </div>
      )}
      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '6px' }}>
        {components.map(({ label, val }) => {
          const prob = val.re * val.re + val.im * val.im;
          return (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '6px 12px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '6px',
              border: '1px solid var(--border-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
            }}>
              <span style={{ color: 'var(--text-muted)', minWidth: '24px' }}>{label}</span>
              <span style={{ color: 'var(--text-primary)', minWidth: '90px' }}>
                {cToString(val, 4)}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>P = {prob.toFixed(4)}</span>
                <div style={{
                  width: '80px',
                  height: '4px',
                  background: 'var(--border-muted)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${prob * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))',
                    borderRadius: '2px',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface StateVectorDisplayProps {
  state: Complex[];
  title?: string;
}

export const StateVectorDisplay: React.FC<StateVectorDisplayProps> = ({ state, title }) => {
  const numQubits = Math.round(Math.log2(state.length)) || 1;
  const labels = Array.from({ length: state.length }, (_, i) => {
    return `|${i.toString(2).padStart(numQubits, '0')}⟩`;
  });
  return (
    <div>
      {title && (
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          {title}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {labels.map((label, i) => {
          const val = state[i];
          const prob = val ? (val.re * val.re + val.im * val.im) : 0;
          return (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '6px 12px',
              background: prob > 0.001 ? 'rgba(0, 242, 254, 0.05)' : 'rgba(0,0,0,0.15)',
              borderRadius: '6px',
              border: `1px solid ${prob > 0.001 ? 'var(--border-glow)' : 'var(--border-muted)'}`,
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              transition: 'all 0.3s ease',
            }}>
              <span style={{ color: 'var(--text-muted)', minWidth: '32px' }}>{label}</span>
              <span style={{ color: prob > 0.001 ? 'var(--accent-cyan)' : 'var(--text-muted)', minWidth: '110px' }}>
                {val ? cToString(val, 4) : '0'}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>P = {(prob * 100).toFixed(2)}%</span>
                <div style={{
                  height: '4px',
                  background: 'var(--border-muted)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${prob * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))',
                    borderRadius: '2px',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
