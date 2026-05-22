import React, { useState, useMemo, useEffect } from 'react';
import { ticketsData } from './ticketsData';
import {
  Complex, StateVector, DensityMatrix4x4,
  getInitialState, applyH1, applyCNOT, getDensityMatrix,
  getReducedDensityMatrix1, getReducedDensityMatrix2,
  getBlochVector, checkUnitarity, cToString, cOne, cZero,
  gateH, gateRx, tensorProductMatrices, applyUnitaryToDensityMatrix,
  cMul, cConj, computeFidelity, computeUnitaryFidelity,
  cScale
} from './quantumMath';
import { MatrixDisplay, ComplexMatrixDisplay, StateVectorDisplay } from './MatrixDisplay';
import { BlochSphere } from './BlochSphere';
import { CircuitBuilder, GateInstance, QubitInitialState } from './CircuitBuilder';
import { TaskManager, challengeTasks, runCircuit, ShotsPanel } from './TaskManager';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Latex } from './GateHelp';

declare global {
  interface Window {
    renderMathInElement?: (elem: HTMLElement, options: any) => void;
  }
}

// ── Sidebar Multi-Mode Component ──────────────────────────────────────────────
interface SidebarProps {
  appMode: 'exam' | 'challenges' | 'sandbox';
  onModeChange: (mode: 'exam' | 'challenges' | 'sandbox') => void;
  selectedTicketId: number;
  onSelectTicket: (id: number) => void;
  selectedChallengeId: string | null;
  onSelectChallenge: (id: string) => void;
  completedChallenges: string[];
  isOpen?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  appMode,
  onModeChange,
  selectedTicketId,
  onSelectTicket,
  selectedChallengeId,
  onSelectChallenge,
  completedChallenges,
  isOpen = false,
}) => {
  return (
    <aside className={`app-sidebar${isOpen ? ' open' : ''}`} style={{
      background: 'hsla(222, 40%, 8%, 0.95)',
      borderRight: '1px solid var(--border-muted)',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      backdropFilter: 'blur(16px)',
      flexShrink: 0,
    }}>
      <div style={{
        padding: '24px 20px 16px',
        borderBottom: '1px solid var(--border-muted)',
        position: 'sticky',
        top: 0,
        background: 'hsla(222, 40%, 8%, 0.98)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <span style={{ fontSize: '24px' }}>⚛️</span>
          <h1 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--accent-cyan)', lineHeight: 1.3 }}>
            Quantum Simulator
          </h1>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '16px' }}>
          МФТИ · Квантовые Вычисления · 2026
        </p>

        {/* Mode Selector Toggle */}
        <div style={{
          display: 'flex',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '10px',
          padding: '4px',
          border: '1px solid var(--border-muted)',
        }}>
          <button
            onClick={() => onModeChange('exam')}
            style={{
              flex: 1,
              padding: '8px 4px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              border: 'none',
              background: appMode === 'exam'
                ? 'linear-gradient(135deg, hsla(186,100%,50%,0.15) 0%, hsla(265,100%,65%,0.1) 100%)'
                : 'transparent',
              color: appMode === 'exam' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
            }}
          >
            🎓 Экзамен
          </button>
          <button
            onClick={() => onModeChange('challenges')}
            style={{
              flex: 1,
              padding: '8px 4px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              border: 'none',
              background: appMode === 'challenges'
                ? 'linear-gradient(135deg, hsla(186,100%,50%,0.15) 0%, hsla(265,100%,65%,0.1) 100%)'
                : 'transparent',
              color: appMode === 'challenges' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
            }}
          >
            🎮 Задачи
          </button>
          <button
            onClick={() => onModeChange('sandbox')}
            style={{
              flex: 1,
              padding: '8px 4px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              border: 'none',
              background: appMode === 'sandbox'
                ? 'linear-gradient(135deg, hsla(186,100%,50%,0.15) 0%, hsla(265,100%,65%,0.1) 100%)'
                : 'transparent',
              color: appMode === 'sandbox' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
            }}
          >
            🛠️ Песочница
          </button>
        </div>
      </div>

      <div style={{ padding: '12px 10px', flex: 1 }}>
        {appMode === 'exam' ? (
          <>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '0 8px 10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Экзаменационные Билеты
            </p>
            {ticketsData.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectTicket(t.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: selectedTicketId === t.id
                    ? 'linear-gradient(135deg, hsla(186,100%,50%,0.15) 0%, hsla(265,100%,65%,0.1) 100%)'
                    : 'transparent',
                  border: `1px solid ${selectedTicketId === t.id ? 'var(--border-glow)' : 'transparent'}`,
                  color: selectedTicketId === t.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  marginBottom: '2px',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
                onMouseEnter={e => { if (selectedTicketId !== t.id) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (selectedTicketId !== t.id) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0,
                  background: selectedTicketId === t.id ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.08)',
                  color: selectedTicketId === t.id ? 'var(--bg-deep)' : 'var(--text-muted)',
                  fontSize: '11px', fontWeight: '700',
                }}>
                  {t.id}
                </span>
                <span style={{ fontSize: '12px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.theoryQuestion.length > 30 ? t.theoryQuestion.slice(0, 27) + '…' : t.theoryQuestion}
                </span>
              </button>
            ))}
          </>
        ) : appMode === 'challenges' ? (
          <>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '0 8px 10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Игровые Задачи
            </p>
            {(['easy', 'medium', 'hard', 'extreme'] as const).map((difficulty) => {
              const tasksInDiff = challengeTasks.filter(c => c.difficulty === difficulty);
              if (tasksInDiff.length === 0) return null;
              
              const diffGroupColors = {
                easy: { text: '#4ade80', title: 'Легкие задачи' },
                medium: { text: '#fbbf24', title: 'Средние задачи' },
                hard: { text: '#f87171', title: 'Сложные задачи' },
                extreme: { text: '#ec4899', title: 'Экстремальные задачи' },
              };
              const group = diffGroupColors[difficulty];

              return (
                <div key={difficulty} style={{ marginBottom: '16px' }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: group.text,
                    padding: '8px 8px 6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{group.title}</span>
                    <span style={{
                      fontSize: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '1px 6px',
                      borderRadius: '8px',
                      color: 'var(--text-muted)'
                    }}>{tasksInDiff.length}</span>
                  </div>
                  {tasksInDiff.map((c) => {
                    const isCompleted = completedChallenges.includes(c.id);
                    const isSelected = selectedChallengeId === c.id;
                    const diffColors = {
                      easy: { bg: 'rgba(74, 222, 128, 0.1)', text: '#4ade80', border: 'rgba(74, 222, 128, 0.2)', label: 'легко' },
                      medium: { bg: 'rgba(251, 191, 36, 0.1)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.2)', label: 'средне' },
                      hard: { bg: 'rgba(248, 113, 113, 0.1)', text: '#f87171', border: 'rgba(248, 113, 113, 0.2)', label: 'сложно' },
                      extreme: { bg: 'hsla(330, 100%, 65%, 0.1)', text: '#ec4899', border: 'hsla(330, 100%, 65%, 0.2)', label: 'экстрим' },
                    };
                    const diff = diffColors[c.difficulty as keyof typeof diffColors] || diffColors.easy;

                    return (
                      <button
                        key={c.id}
                        onClick={() => onSelectChallenge(c.id)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: isSelected
                            ? 'linear-gradient(135deg, hsla(186,100%,50%,0.15) 0%, hsla(265,100%,65%,0.1) 100%)'
                            : 'transparent',
                          border: `1px solid ${isSelected ? 'var(--border-glow)' : 'transparent'}`,
                          color: isSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                          marginBottom: '4px',
                          cursor: 'pointer',
                          transition: 'var(--transition-fast)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            lineHeight: 1.3,
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)',
                          }}>
                            {c.name}
                          </span>
                          {isCompleted && (
                            <span style={{ color: '#4ade80', fontSize: '14px', fontWeight: 'bold' }}>✓</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '9px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: diff.bg,
                            color: diff.text,
                            border: `1px solid ${diff.border}`,
                            fontWeight: '700',
                          }}>
                            {diff.label}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            кубитов: {c.numQubits}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </>
        ) : (
          <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
              🛠️ Песочница Схем
            </p>
            
            <div className="glass-panel" style={{
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-muted)',
              borderRadius: '12px',
              fontSize: '12px',
              lineHeight: '1.6',
              color: 'var(--text-secondary)'
            }}>
              <p style={{ margin: '0 0 12px 0', color: 'var(--accent-cyan)', fontWeight: '700' }}>
                Добро пожаловать!
              </p>
              В этом режиме вы можете проектировать любые квантовые цепи размерностью от 1 до 6 кубитов.
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Возможности:
              </div>
              <ul style={{ paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>
                  <strong style={{ color: 'var(--accent-cyan)' }}>Матрица U:</strong> в результатах симуляции отображается полная унитарная матрица, описывающая схему.
                </li>
                <li>
                  <strong style={{ color: 'var(--accent-cyan)' }}>Проверка билетов:</strong> схема из песочницы автоматически используется при проверке билетов на вкладке «Проверка билета» экзаменационного режима.
                </li>
                <li>
                  <strong style={{ color: 'var(--accent-cyan)' }}>Свободный выбор:</strong> нет ограничений на типы гейтов или параметры.
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

const CircuitDiagram: React.FC<{ step: number; isSimulating?: boolean }> = ({ step, isSimulating }) => {
  const gateStyle = (active: boolean, color: string) => ({
    fill: active ? color : 'rgba(255,255,255,0.05)',
    transition: 'all 0.4s ease',
    filter: active ? `drop-shadow(0 0 8px ${color})` : 'none',
  });

  return (
    <svg width="100%" viewBox="0 0 460 120" style={{ maxHeight: '120px', overflow: 'visible' }}>
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="var(--border-muted)" />
        </marker>
        <style>{`
          @keyframes wave-flow {
            to {
              stroke-dashoffset: -20;
            }
          }
        `}</style>
      </defs>

      {/* Q1 wire */}
      <line x1="20" y1="35" x2="440" y2="35" stroke="var(--border-muted)" strokeWidth="1.5" markerEnd="url(#arrow)" />
      {isSimulating && (
        <line x1="20" y1="35" x2="440" y2="35" stroke="var(--accent-cyan)" strokeWidth="2.5" strokeDasharray="6 4"
          style={{ animation: 'wave-flow 1.5s linear infinite', filter: 'drop-shadow(0 0 4px var(--accent-cyan))' }}
        />
      )}

      {/* Q2 wire */}
      <line x1="20" y1="85" x2="440" y2="85" stroke="var(--border-muted)" strokeWidth="1.5" markerEnd="url(#arrow)" />
      {isSimulating && (
        <line x1="20" y1="85" x2="440" y2="85" stroke="var(--accent-purple)" strokeWidth="2.5" strokeDasharray="6 4"
          style={{ animation: 'wave-flow 1.5s linear infinite', filter: 'drop-shadow(0 0 4px var(--accent-purple))' }}
        />
      )}

      {/* Labels */}
      <text x="16" y="35" fill="var(--text-secondary)" fontSize="12" textAnchor="end" alignmentBaseline="middle">|0⟩</text>
      <text x="16" y="85" fill="var(--accent-cyan)" fontSize="12" textAnchor="end" alignmentBaseline="middle">|u⟩</text>
      <text x="445" y="35" fill="var(--text-muted)" fontSize="10" textAnchor="start" alignmentBaseline="middle">Q₁</text>
      <text x="445" y="85" fill="var(--text-muted)" fontSize="10" textAnchor="start" alignmentBaseline="middle">Q₂</text>

      {/* Step 0: Initial state label */}
      <text x="60" y="15" fill="var(--text-muted)" fontSize="10" textAnchor="middle">t=0</text>

      {/* Hadamard gate on Q1 */}
      <rect x="100" y="20" width="40" height="30" rx="6" {...gateStyle(step >= 1, '#00f2fe')} stroke="var(--accent-cyan)" strokeWidth="1.5" />
      <text x="120" y="38" fill={step >= 1 ? '#00101a' : 'var(--text-muted)'} fontSize="13" fontWeight="700" textAnchor="middle" alignmentBaseline="middle">H</text>
      <text x="120" y="15" fill="var(--text-muted)" fontSize="10" textAnchor="middle">t=1</text>

      {/* CNOT gate */}
      {/* Control dot on Q1 */}
      <circle cx="240" cy="35" r="6" {...gateStyle(step >= 2, '#a855f7')} stroke="var(--accent-purple)" strokeWidth="1.5" />
      {/* Vertical line of CNOT */}
      <line x1="240" y1="41" x2="240" y2="79"
        stroke={step >= 2 ? 'var(--accent-purple)' : 'var(--border-muted)'}
        strokeWidth="1.5"
        style={{ filter: step >= 2 ? 'drop-shadow(0 0 6px var(--accent-purple))' : 'none', transition: 'all 0.4s ease' }}
      />
      {/* Target circle on Q2 */}
      <circle cx="240" cy="85" r="14" fill="none" stroke={step >= 2 ? 'var(--accent-purple)' : 'var(--border-muted)'} strokeWidth="1.5"
        style={{ filter: step >= 2 ? 'drop-shadow(0 0 8px var(--accent-purple))' : 'none', transition: 'all 0.4s ease' }}
      />
      <line x1="226" y1="85" x2="254" y2="85" stroke={step >= 2 ? 'var(--accent-purple)' : 'var(--border-muted)'} strokeWidth="1.5" />
      <line x1="240" y1="71" x2="240" y2="99" stroke={step >= 2 ? 'var(--accent-purple)' : 'var(--border-muted)'} strokeWidth="1.5" />
      <text x="240" y="15" fill="var(--text-muted)" fontSize="10" textAnchor="middle">t=2</text>

      {/* Measurement symbol on Q1 */}
      <rect x="360" y="20" width="40" height="30" rx="6"
        fill={step >= 3 ? 'rgba(255, 200, 50, 0.1)' : 'rgba(255,255,255,0.03)'}
        stroke={step >= 3 ? '#ffc832' : 'var(--border-muted)'}
        strokeWidth="1.5"
        style={{ filter: step >= 3 ? 'drop-shadow(0 0 8px #ffc832)' : 'none', transition: 'all 0.4s ease' }}
      />
      <text x="380" y="38" fill={step >= 3 ? '#ffc832' : 'var(--text-muted)'} fontSize="16" textAnchor="middle" alignmentBaseline="middle">M</text>
      <text x="380" y="15" fill="var(--text-muted)" fontSize="10" textAnchor="middle">Измерение</text>
    </svg>
  );
};

// ── Complex Matrix Comparison Display ─────────────────────────────────────────
const ComplexMatrixComparisonDisplay: React.FC<{
  expected: Complex[][];
  actual: Complex[][];
  size: number;
}> = ({ expected, actual, size }) => {
  return (
    <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginTop: '16px', maxWidth: '100%' }}>
      {/* Expected Matrix */}
      <div style={{ textAlign: 'center', maxWidth: '100%' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Ожидаемая матрица U
        </div>
        <div style={{ overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch', border: '2px solid var(--border-muted)', borderTop: 'none', borderBottom: 'none', borderRadius: '2px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${size}, 1fr)`,
            gap: '6px 12px',
            padding: '12px 18px',
            background: 'rgba(0,0,0,0.2)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            alignItems: 'center',
            justifyItems: 'center',
          }}>
            {expected.flatMap((row, i) =>
              row.map((entry, j) => (
                <span key={`${i}-${j}`} style={{ color: 'var(--accent-cyan)', minWidth: '65px', padding: '2px', textAlign: 'center' }}>
                  {cToString(entry, 3)}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '20px', color: 'var(--text-muted)' }}>➔</div>

      {/* Actual Matrix with feedback */}
      <div style={{ textAlign: 'center', maxWidth: '100%' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Текущая матрица U (фазово-выравненная)
        </div>
        <div style={{ overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch', border: '2px solid var(--border-muted)', borderTop: 'none', borderBottom: 'none', borderRadius: '2px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${size}, 1fr)`,
            gap: '6px 12px',
            padding: '12px 18px',
            background: 'rgba(0,0,0,0.2)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            alignItems: 'center',
            justifyItems: 'center',
          }}>
            {actual.flatMap((row, i) =>
              row.map((entry, j) => {
                const expectedVal = expected[i][j];
                const error = Math.sqrt((expectedVal.re - entry.re)**2 + (expectedVal.im - entry.im)**2);
                const isMatch = error < 0.05;
                const border = isMatch ? '1px solid rgba(74,222,128,0.25)' : '1px solid rgba(248,113,113,0.45)';
                const bg = isMatch ? 'rgba(74,222,128,0.04)' : 'rgba(248,113,113,0.06)';
                const color = isMatch ? 'var(--text-primary)' : 'var(--accent-pink)';
                return (
                  <span
                    key={`${i}-${j}`}
                    style={{
                      color,
                      minWidth: '65px',
                      padding: '2px',
                      textAlign: 'center',
                      border,
                      borderRadius: '4px',
                      background: bg,
                    }}
                    title={`Ожидалось: ${cToString(expectedVal, 3)}, Получено: ${cToString(entry, 3)}`}
                  >
                    {cToString(entry, 3)}
                  </span>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Math Helpers for Phase Alignment ──────────────────────────────────────────
const alignStateVectorPhase = (student: StateVector, target: StateVector): StateVector => {
  let maxIndex = 0;
  let maxMag = 0;
  for (let i = 0; i < target.length; i++) {
    const mag = target[i].re * target[i].re + target[i].im * target[i].im;
    if (mag > maxMag) {
      maxMag = mag;
      maxIndex = i;
    }
  }
  
  const tVal = target[maxIndex];
  const sVal = student[maxIndex];
  const sMag = Math.sqrt(sVal.re * sVal.re + sVal.im * sVal.im);
  const tMag = Math.sqrt(tVal.re * tVal.re + tVal.im * tVal.im);
  
  if (sMag < 1e-8 || tMag < 1e-8) {
    return student;
  }
  
  const num = cMul(tVal, cConj(sVal));
  const den = tMag * sMag;
  const factor = cScale(num, 1 / den);
  
  return student.map(val => cMul(val, factor));
};

const alignUnitaryPhase = (student: Complex[][], target: Complex[][]): Complex[][] => {
  let maxRow = 0;
  let maxCol = 0;
  let maxMag = 0;
  const n = target.length;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const mag = target[r][c].re * target[r][c].re + target[r][c].im * target[r][c].im;
      if (mag > maxMag) {
        maxMag = mag;
        maxRow = r;
        maxCol = c;
      }
    }
  }
  
  const tVal = target[maxRow][maxCol];
  const sVal = student[maxRow][maxCol];
  const sMag = Math.sqrt(sVal.re * sVal.re + sVal.im * sVal.im);
  const tMag = Math.sqrt(tVal.re * tVal.re + tVal.im * tVal.im);
  
  if (sMag < 1e-8 || tMag < 1e-8) {
    return student;
  }
  
  const num = cMul(tVal, cConj(sVal));
  const den = tMag * sMag;
  const factor = cScale(num, 1 / den);
  
  return student.map(row => row.map(val => cMul(val, factor)));
};

const formatComplexVal = (c: Complex) => {
  const re = c.re;
  const im = c.im;
  if (Math.abs(re) < 1e-4 && Math.abs(im) < 1e-4) return '0';
  if (Math.abs(im) < 1e-4) return re.toFixed(3);
  if (Math.abs(re) < 1e-4) return `${im > 0 ? '' : '-'}${Math.abs(im).toFixed(3)}i`;
  return `${re.toFixed(3)} ${im > 0 ? '+' : '-' } ${Math.abs(im).toFixed(3)}i`;
};

const getQubitInitialStateFromPreset = (preset: '0' | '1' | '+' | '-'): QubitInitialState => {
  const root2 = 1 / Math.sqrt(2);
  if (preset === '1') {
    return { type: 'pure', preset: '1', alpha: cZero(), beta: cOne(), p0: 0, p1: 1 };
  } else if (preset === '+') {
    return { type: 'pure', preset: '+', alpha: { re: root2, im: 0 }, beta: { re: root2, im: 0 }, p0: 0.5, p1: 0.5 };
  } else if (preset === '-') {
    return { type: 'pure', preset: '-', alpha: { re: root2, im: 0 }, beta: { re: -root2, im: 0 }, p0: 0.5, p1: 0.5 };
  } else {
    return { type: 'pure', preset: '0', alpha: cOne(), beta: cZero(), p0: 1, p1: 0 };
  }
};

// ── Main App ──────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  // App Mode State
  const [appMode, setAppMode] = useState<'exam' | 'challenges' | 'sandbox'>('exam');
  
  // Selected IDs
  const [selectedId, setSelectedId] = useState(1);
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);

  // Mobile sidebar state
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Completed Challenges
  const [completedChallenges, setCompletedChallenges] = useState<string[]>(() => {
    const saved = localStorage.getItem('completedChallenges');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('completedChallenges', JSON.stringify(completedChallenges));
  }, [completedChallenges]);

  // Caching states for Exam mode
  const [ticketGrids, setTicketGrids] = useState<{ [id: number]: (GateInstance | null)[][] }>({});
  const [ticketInitialStates, setTicketInitialStates] = useState<{ [id: number]: QubitInitialState[] }>({});
  const [ticketNumQubits, setTicketNumQubits] = useState<{ [id: number]: number }>({});

  // Caching states for Challenges mode
  const [challengeGrids, setChallengeGrids] = useState<{ [id: string]: (GateInstance | null)[][] }>({});
  const [challengeInitialStates, setChallengeInitialStates] = useState<{ [id: string]: QubitInitialState[] }>({});
  const [challengeNumQubits, setChallengeNumQubits] = useState<{ [id: string]: number }>({});

  // Caching states for Sandbox mode
  const [sandboxGrid, setSandboxGrid] = useState<(GateInstance | null)[][]>(() =>
    Array.from({ length: 3 }, () => Array.from({ length: 8 }, () => null))
  );
  const [sandboxNumQubits, setSandboxNumQubits] = useState<number>(3);
  const [sandboxInitialStates, setSandboxInitialStates] = useState<QubitInitialState[]>(() =>
    Array.from({ length: 3 }, () => ({ type: 'pure', preset: '0', alpha: cOne(), beta: cZero(), p0: 1, p1: 0 }))
  );

  // Current builder canvas state
  const [grid, setGrid] = useState<(GateInstance | null)[][]>(() =>
    Array.from({ length: 2 }, () => Array.from({ length: 8 }, () => null))
  );
  const [numQubits, setNumQubits] = useState(2);
  const [initialStates, setInitialStates] = useState<QubitInitialState[]>(() => {
    const tk = ticketsData.find(t => t.id === 1)!;
    return [
      { type: 'pure', preset: '0', alpha: cOne(), beta: cZero(), p0: 1, p1: 0 },
      {
        type: 'pure',
        preset: 'custom-pure',
        alpha: tk.uVec[0],
        beta: tk.uVec[1],
        p0: tk.uVec[0].re**2 + tk.uVec[0].im**2,
        p1: tk.uVec[1].re**2 + tk.uVec[1].im**2,
        label: '|u⟩',
      }
    ];
  });

  // Verification states for challenges
  const [isChecking, setIsChecking] = useState(false);
  const [verifiedResult, setVerifiedResult] = useState<{
    passed: boolean;
    fidelity: number;
  } | null>(null);

  // Shots states for challenges
  const [challengeShotsCount, setChallengeShotsCount] = useState<number>(1000);
  const [challengeShotsResults, setChallengeShotsResults] = useState<{ [state: string]: number } | null>(null);

  // Active Challenge computing
  const activeChallenge = useMemo(() => {
    if (!activeChallengeId) return null;
    return challengeTasks.find(c => c.id === activeChallengeId) || null;
  }, [activeChallengeId]);

  const deepClone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

  // Handle switching active items (saving to and loading from cache)
  const switchActiveItem = (
    nextMode: 'exam' | 'challenges' | 'sandbox',
    nextTicketId: number | null,
    nextChallengeId: string | null
  ) => {
    // Guard: do nothing if switching to the exact same mode and item
    if (nextMode === appMode) {
      if (nextMode === 'exam' && (nextTicketId === null || nextTicketId === selectedId)) {
        return;
      }
      if (nextMode === 'challenges' && (nextChallengeId === null || nextChallengeId === activeChallengeId)) {
        return;
      }
      if (nextMode === 'sandbox') {
        return;
      }
    }

    // 1. Save current state to cache
    if (appMode === 'exam') {
      setTicketGrids(prev => ({ ...prev, [selectedId]: deepClone(grid) }));
      setTicketInitialStates(prev => ({ ...prev, [selectedId]: deepClone(initialStates) }));
      setTicketNumQubits(prev => ({ ...prev, [selectedId]: numQubits }));
    } else if (appMode === 'challenges') {
      if (activeChallengeId) {
        setChallengeGrids(prev => ({ ...prev, [activeChallengeId]: deepClone(grid) }));
        setChallengeInitialStates(prev => ({ ...prev, [activeChallengeId]: deepClone(initialStates) }));
        setChallengeNumQubits(prev => ({ ...prev, [activeChallengeId]: numQubits }));
      }
    } else if (appMode === 'sandbox') {
      setSandboxGrid(deepClone(grid));
      setSandboxInitialStates(deepClone(initialStates));
      setSandboxNumQubits(numQubits);
    }

    // 2. Load next state from cache, or initialize
    if (nextMode === 'exam') {
      const targetId = nextTicketId ?? selectedId;
      const cachedGrid = ticketGrids[targetId];
      const cachedInitialStates = ticketInitialStates[targetId];
      const cachedNumQubits = ticketNumQubits[targetId];

      if (cachedGrid && cachedInitialStates && cachedNumQubits) {
        setGrid(deepClone(cachedGrid));
        setInitialStates(deepClone(cachedInitialStates));
        setNumQubits(cachedNumQubits);
      } else {
        const tk = ticketsData.find(t => t.id === targetId)!;
        const initialGrid = Array.from({ length: 2 }, () => Array.from({ length: 8 }, () => null));
        const states = [
          { type: 'pure', preset: '0', alpha: cOne(), beta: cZero(), p0: 1, p1: 0 } as QubitInitialState,
          {
            type: 'pure',
            preset: 'custom-pure',
            alpha: tk.uVec[0],
            beta: tk.uVec[1],
            p0: tk.uVec[0].re**2 + tk.uVec[0].im**2,
            p1: tk.uVec[1].re**2 + tk.uVec[1].im**2,
            label: '|u⟩',
          } as QubitInitialState
        ];
        setGrid(initialGrid);
        setInitialStates(states);
        setNumQubits(2);
      }
      if (nextTicketId !== null) setSelectedId(nextTicketId);
    } else if (nextMode === 'challenges') {
      const targetId = nextChallengeId ?? activeChallengeId ?? challengeTasks[0].id;
      const cachedGrid = challengeGrids[targetId];
      const cachedInitialStates = challengeInitialStates[targetId];
      const cachedNumQubits = challengeNumQubits[targetId];

      if (cachedGrid && cachedInitialStates && cachedNumQubits) {
        setGrid(deepClone(cachedGrid));
        setInitialStates(deepClone(cachedInitialStates));
        setNumQubits(cachedNumQubits);
      } else {
        const ch = challengeTasks.find(c => c.id === targetId)!;
        const initialGrid: (GateInstance | null)[][] = Array.from({ length: ch.numQubits }, () => Array.from({ length: 8 }, () => null));
        if (ch.fixedGates) {
          ch.fixedGates.forEach(fg => {
            if (fg.row < ch.numQubits && fg.col < 8) {
              initialGrid[fg.row][fg.col] = deepClone(fg.gate);
            }
          });
        }
        const states = ch.initialPreset.map(p => getQubitInitialStateFromPreset(p as any));
        setGrid(initialGrid);
        setInitialStates(states);
        setNumQubits(ch.numQubits);
      }
      if (nextChallengeId !== null) setActiveChallengeId(nextChallengeId);
    } else if (nextMode === 'sandbox') {
      setGrid(deepClone(sandboxGrid));
      setInitialStates(deepClone(sandboxInitialStates));
      setNumQubits(sandboxNumQubits);
    }

    // Update Mode
    setAppMode(nextMode);
    
    // Automatically set valid active tab for target mode
    if (nextMode === 'challenges') {
      if (activeTab !== 'constructor' && activeTab !== 'theory') {
        setActiveTab('constructor');
      }
    } else if (nextMode === 'exam') {
      if (activeTab === 'constructor') {
        setActiveTab('theory');
      }
    }
    
    // Close mobile drawer on switch
    setSidebarOpen(false);
  };

  // Reset verification results on grid or challenge changes
  useEffect(() => {
    setVerifiedResult(null);
    setChallengeShotsResults(null);
  }, [grid, activeChallengeId]);

  // Verify challenge
  const handleVerifyChallenge = () => {
    if (!activeChallenge) return;
    setIsChecking(true);
    setVerifiedResult(null);

    setTimeout(() => {
      try {
        const res = runCircuit(numQubits, initialStates, grid);
        let passed = false;
        let fidelity = 0;

        if (activeChallenge.targetType === 'state') {
          const finalDM = res.stepsDensityMatrices[res.stepsDensityMatrices.length - 1];
          fidelity = computeFidelity(finalDM, activeChallenge.targetState!);
          passed = fidelity > 0.999;
        } else {
          fidelity = computeUnitaryFidelity(res.finalUnitary, activeChallenge.targetUnitary!);
          passed = fidelity > 0.999;
        }

        setVerifiedResult({ passed, fidelity });

        if (passed) {
          setCompletedChallenges(prev => {
            if (prev.includes(activeChallenge.id)) return prev;
            return [...prev, activeChallenge.id];
          });
        }
      } catch (err) {
        console.error("Verification failed:", err);
      } finally {
        setIsChecking(false);
      }
    }, 1000);
  };

  // Run statistical shots simulator for challenges
  const handleRunChallengeShots = () => {
    try {
      const simResults = runCircuit(numQubits, initialStates, grid);
      const D = 1 << numQubits;
      const finalDM = simResults.stepsDensityMatrices[simResults.stepsDensityMatrices.length - 1];

      const measurementBases = Array.from({ length: numQubits }, () => 'Z');
      for (let c = 0; c < grid[0].length; c++) {
        for (let r = 0; r < numQubits; r++) {
          const gate = grid[r][c];
          if (gate && gate.type.startsWith('M_')) {
            measurementBases[r] = gate.type[2].toUpperCase();
          }
        }
      }

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

      const DM_measured = applyUnitaryToDensityMatrix(compositeBasisUnitary, finalDM);
      const probabilities = Array.from({ length: D }, (_, i) => Math.max(0, DM_measured[i][i].re));
      const sumProbs = probabilities.reduce((a, b) => a + b, 0);
      const normalizedProbs = sumProbs > 0 ? probabilities.map(p => p / sumProbs) : probabilities;

      const results: { [state: string]: number } = {};
      for (let s = 0; s < challengeShotsCount; s++) {
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

      setChallengeShotsResults(results);
    } catch (err) {
      console.error("Shots simulation failed:", err);
    }
  };

  const [activeTab, setActiveTab] = useState<'theory' | 'simulator' | 'results' | 'constructor' | 'grading'>('theory');
  const [circuitStep, setCircuitStep] = useState(0);
  const [showUnitary, setShowUnitary] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const runTicketSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setCircuitStep(0);
    
    setTimeout(() => setCircuitStep(1), 600);
    setTimeout(() => setCircuitStep(2), 1200);
    setTimeout(() => setCircuitStep(3), 1800);
    
    setTimeout(() => {
      setIsSimulating(false);
      setActiveTab('results');
    }, 2400);
  };


  const ticket = useMemo(() => ticketsData.find(t => t.id === selectedId)!, [selectedId]);

  // Run the ticket simulation math
  const sim = useMemo(() => {
    const u: [Complex, Complex] = [ticket.uVec[0], ticket.uVec[1]];
    const s0: StateVector = getInitialState(u);
    const s1: StateVector = applyH1(s0);
    const s2: StateVector = applyCNOT(s1);
    const rho: DensityMatrix4x4 = getDensityMatrix(s2);
    const rho1 = getReducedDensityMatrix1(rho);
    const rho2 = getReducedDensityMatrix2(rho);
    const bloch1 = getBlochVector(rho1);
    const bloch2 = getBlochVector(rho2);

    const p0 = (s2[0].re ** 2 + s2[0].im ** 2) + (s2[1].re ** 2 + s2[1].im ** 2);
    const p1 = (s2[2].re ** 2 + s2[2].im ** 2) + (s2[3].re ** 2 + s2[3].im ** 2);

    const unitarity = checkUnitarity(ticket.matrixA);

    return { s0, s1, s2, rho, rho1, rho2, bloch1, bloch2, p0, p1, unitarity };
  }, [ticket]);

  const displayedState = useMemo(() => {
    if (circuitStep === 0) return sim.s0;
    if (circuitStep === 1) return sim.s1;
    return sim.s2;
  }, [circuitStep, sim]);

  const tabBtn = (tab: typeof activeTab, label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      style={{
        padding: '8px 20px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        border: '1px solid',
        borderColor: activeTab === tab ? 'var(--accent-cyan)' : 'var(--border-muted)',
        background: activeTab === tab
          ? 'linear-gradient(135deg, hsla(186,100%,50%,0.2), hsla(265,100%,65%,0.15))'
          : 'transparent',
        color: activeTab === tab ? 'var(--accent-cyan)' : 'var(--text-muted)',
        cursor: 'pointer',
        transition: 'var(--transition-fast)',
      }}
    >
      {label}
    </button>
  );

  // Render Verification Panel JSX helper
  const renderVerificationPanel = () => {
    if (!activeChallenge) return null;

    const simResults = runCircuit(numQubits, initialStates, grid);
    const currentVector = simResults.stepsStateVectors[simResults.stepsStateVectors.length - 1];

    let alignedVector: StateVector | null = null;
    let alignedUnitary: Complex[][] | null = null;

    if (activeChallenge.targetType === 'state' && currentVector) {
      alignedVector = alignStateVectorPhase(currentVector, activeChallenge.targetState!);
    } else if (activeChallenge.targetType === 'unitary') {
      alignedUnitary = alignUnitaryPhase(simResults.finalUnitary, activeChallenge.targetUnitary!);
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
        
        {/* Verification Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                🔬 Верификация решения
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Сравнение результатов работы вашей схемы с целевыми требованиями задачи.
              </p>
            </div>
            
            <button
              onClick={handleVerifyChallenge}
              disabled={isChecking}
              className="btn-primary"
              style={{
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
                boxShadow: '0 0 15px var(--accent-cyan)44',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                fontSize: '13px',
                fontWeight: '700',
                color: '#00101a',
                cursor: 'pointer',
                borderRadius: '8px',
                opacity: isChecking ? 0.7 : 1,
                transition: 'var(--transition-smooth)',
              }}
            >
              {isChecking ? (
                <>
                  <span className="spinner" style={{
                    display: 'inline-block', width: '12px', height: '12px',
                    border: '2px solid rgba(0,0,0,0.1)', borderTopColor: '#00101a',
                    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                  }} />
                  Проверка...
                </>
              ) : (
                <>⚡ Проверить решение</>
              )}
            </button>
          </div>

          {isChecking && (
            <div style={{
              padding: '24px',
              borderRadius: '10px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--border-muted)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '3px solid rgba(0, 242, 254, 0.1)',
                borderTopColor: 'var(--accent-cyan)',
                animation: 'spin 1s linear infinite, pulse 1.5s ease-in-out infinite',
                boxShadow: '0 0 15px rgba(0, 242, 254, 0.3)',
              }} />
              <div style={{ color: 'var(--accent-cyan)', fontSize: '13px', fontWeight: '600', letterSpacing: '0.05em' }}>
                СИМУЛЯЦИЯ КВАНТОВОГО СОСТОЯНИЯ...
              </div>
            </div>
          )}

          {verifiedResult && !isChecking && (
            <div style={{
              padding: '16px 20px',
              borderRadius: '10px',
              background: verifiedResult.passed ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${verifiedResult.passed ? 'rgba(74,222,128,0.4)' : 'rgba(239,68,68,0.4)'}`,
              boxShadow: verifiedResult.passed 
                ? '0 0 20px rgba(74,222,128,0.15)' 
                : '0 0 20px rgba(239,68,68,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: verifiedResult.passed ? '#4ade80' : '#f87171',
                color: 'var(--bg-deep)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: '800',
              }}>
                {verifiedResult.passed ? '✓' : '✗'}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  {verifiedResult.passed 
                    ? 'Задание успешно выполнено!' 
                    : 'Схема собрана неверно.'}
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  Fidelity (точность соответствия):{' '}
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: '700',
                    color: verifiedResult.passed ? 'var(--accent-cyan)' : 'var(--accent-pink)',
                  }}>
                    {verifiedResult.fidelity.toFixed(6)}
                  </span>{' '}
                  (требуется {'>'} 0.999)
                </p>
              </div>
            </div>
          )}

          {/* Comparison table */}
          <div>
            <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '600' }}>
              📊 Анализ расхождений в квантовом состоянии
            </h4>
            
            {activeChallenge.targetType === 'state' && alignedVector && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-muted)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600' }}>Базис</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600' }}>Целевая амплитуда</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600' }}>Ваша амплитуда (выравненная)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600' }}>Совпадает</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 1 << numQubits }).map((_, idx) => {
                      const basis = `|${idx.toString(2).padStart(numQubits, '0')}⟩`;
                      const expected = activeChallenge.targetState![idx];
                      const actual = alignedVector![idx];
                      const error = Math.sqrt((expected.re - actual.re)**2 + (expected.im - actual.im)**2);
                      const isMatch = error < 0.05;
                      
                      const expectedMagSq = expected.re**2 + expected.im**2;
                      const actualMagSq = actual.re**2 + actual.im**2;

                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid var(--border-muted)',
                            background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                          }}
                        >
                          <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {basis}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                              {formatComplexVal(expected)}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Вероятность: {(expectedMagSq * 100).toFixed(1)}%
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{
                              fontFamily: 'var(--font-mono)',
                              color: isMatch ? 'var(--text-secondary)' : 'var(--accent-pink)',
                              fontWeight: isMatch ? '400' : '600',
                            }}>
                              {formatComplexVal(actual)}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Вероятность: {(actualMagSq * 100).toFixed(1)}%
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {isMatch ? (
                              <span style={{ color: '#4ade80', fontSize: '14px', fontWeight: 'bold' }}>✓</span>
                            ) : (
                              <span style={{ color: '#f87171', fontSize: '14px', fontWeight: 'bold' }}>✗</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeChallenge.targetType === 'unitary' && alignedUnitary && (
              <ComplexMatrixComparisonDisplay
                expected={activeChallenge.targetUnitary!}
                actual={alignedUnitary}
                size={1 << numQubits}
              />
            )}
          </div>
        </div>

        {/* Shots panel */}
        <ShotsPanel
          shotsCount={challengeShotsCount}
          setShotsCount={setChallengeShotsCount}
          onRun={handleRunChallengeShots}
          results={challengeShotsResults}
        />
      </div>
    );
  };

  const getGradingGrid = (sGrid: (GateInstance | null)[][]): (GateInstance | null)[][] => {
    const colsCount = sGrid[0]?.length || 8;
    const result: (GateInstance | null)[][] = [];
    for (let r = 0; r < 2; r++) {
      if (r < sGrid.length) {
        result.push(sGrid[r].map(gate => gate ? { ...gate } : null));
      } else {
        result.push(Array.from({ length: colsCount }, () => null));
      }
    }
    return result;
  };

  const getGradingInitialStates = (t: typeof ticketsData[0]): QubitInitialState[] => {
    return [
      { type: 'pure', preset: '0', alpha: cOne(), beta: cZero(), p0: 1, p1: 0 },
      {
        type: 'pure',
        preset: 'custom-pure',
        alpha: t.uVec[0],
        beta: t.uVec[1],
        p0: t.uVec[0].re**2 + t.uVec[0].im**2,
        p1: t.uVec[1].re**2 + t.uVec[1].im**2,
        label: '|u⟩',
      }
    ];
  };

  return (
    <div className="dashboard-grid">
      {/* Multi-mode Sidebar */}
      <Sidebar
        appMode={appMode}
        onModeChange={(mode) => {
          if (mode === 'exam') {
            switchActiveItem('exam', selectedId, null);
          } else if (mode === 'challenges') {
            switchActiveItem('challenges', null, activeChallengeId ?? challengeTasks[0].id);
          } else if (mode === 'sandbox') {
            switchActiveItem('sandbox', null, null);
          }
        }}
        selectedTicketId={selectedId}
        onSelectTicket={(id) => switchActiveItem('exam', id, null)}
        selectedChallengeId={activeChallengeId}
        onSelectChallenge={(id) => switchActiveItem('challenges', null, id)}
        completedChallenges={completedChallenges}
        isOpen={isSidebarOpen}
      />

      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <main className="app-main-content" style={{ overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <button
              className="mobile-only"
              onClick={() => setSidebarOpen(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-muted)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '20px',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ☰
            </button>
            <div>
            {appMode === 'exam' ? (
              <>
                <div style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  background: 'hsla(186,100%,50%,0.12)',
                  border: '1px solid var(--border-glow)',
                  borderRadius: '20px',
                  fontSize: '11px',
                  color: 'var(--accent-cyan)',
                  fontWeight: '600',
                  letterSpacing: '0.05em',
                  marginBottom: '8px',
                }}>
                  БИЛЕТ №{ticket.id}
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.4, maxWidth: '700px' }}>
                  {ticket.theoryQuestion}
                </h2>
              </>
            ) : appMode === 'challenges' ? (
              activeChallenge && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                      border: '1px solid var(--border-glow)',
                      borderRadius: '20px',
                      fontSize: '11px',
                      color: 'var(--accent-purple)',
                      fontWeight: '700',
                      letterSpacing: '0.05em',
                    }}>
                      ИГРОВАЯ ЗАДАЧА
                    </div>
                    {completedChallenges.includes(activeChallenge.id) && (
                      <span style={{
                        fontSize: '11px',
                        color: '#4ade80',
                        fontWeight: '700',
                        background: 'rgba(74, 222, 128, 0.1)',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        border: '1px solid rgba(74, 222, 128, 0.3)',
                      }}>
                        ✓ Выполнено
                      </span>
                    )}
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.4, maxWidth: '700px', margin: '0 0 6px' }}>
                    {activeChallenge.name}
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, maxWidth: '800px', lineHeight: 1.5 }}>
                    {activeChallenge.description}
                  </p>
                </>
              )
            ) : (
              <>
                <div style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  background: 'hsla(186,100%,50%,0.12)',
                  border: '1px solid var(--border-glow)',
                  borderRadius: '20px',
                  fontSize: '11px',
                  color: 'var(--accent-cyan)',
                  fontWeight: '600',
                  letterSpacing: '0.05em',
                  marginBottom: '8px',
                }}>
                  СВОБОДНЫЙ РЕЖИМ
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.4, maxWidth: '700px', margin: '0 0 6px' }}>
                  Песочница Квантовых Цепей
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, maxWidth: '800px', lineHeight: 1.5 }}>
                  Конструируйте произвольные квантовые схемы размерностью от 1 до 6 кубитов, исследуйте их унитарные матрицы, векторы состояний и Bloch-сферы. Сконструированная здесь схема автоматически используется для проверки экзаменационных билетов.
                </p>
              </>
            )}
            </div>
          </div>
          <div className="tabs-container">
            {appMode === 'exam' ? (
              <>
                {tabBtn('theory', '📖 Теория')}
                {tabBtn('simulator', '⚙️ Схема Билета')}
                {tabBtn('results', '📊 Результаты Билета')}
                {tabBtn('grading', '🎓 Проверка билета')}
              </>
            ) : appMode === 'challenges' ? (
              <>
                {tabBtn('constructor', '🛠️ Конструктор')}
                {tabBtn('theory', '📖 Описание Задачи')}
              </>
            ) : null}
          </div>
        </div>

        {/* ── THEORY TAB ────────────────────────────────── */}
        {activeTab === 'theory' && appMode !== 'sandbox' && (
          appMode === 'exam' ? (
            <div className="responsive-theory-grid">
              <div className="glass-panel" style={{ padding: '28px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
                  📘 Теоретический материал
                </h3>
                <div style={{
                  color: 'var(--text-secondary)',
                  lineHeight: '1.8',
                  fontSize: '14px',
                  fontFamily: 'var(--font-sans)',
                }}>
                  <MarkdownRenderer content={ticket.theoryMarkdown} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Initial vector u */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Вектор u
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: '14px',
                      color: 'var(--accent-cyan)', padding: '10px',
                      background: 'rgba(0,0,0,0.3)', borderRadius: '8px',
                      border: '1px solid var(--border-glow)',
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                      u = <Latex math={ticket.uName} />
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {ticket.uDesc}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                      {ticket.uVec.map((c, i) => (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between',
                          padding: '4px 8px', background: 'rgba(0,0,0,0.2)',
                          borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '12px',
                        }}>
                          <span style={{ color: 'var(--text-muted)' }}>u[{i}]</span>
                          <span style={{ color: 'var(--text-primary)' }}>{cToString(c, 4)}</span>
                          <span style={{ color: 'var(--text-muted)' }}>|²= {(c.re**2 + c.im**2).toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Matrix A */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Матрица A
                    </h4>
                    <button
                      onClick={() => setShowUnitary(!showUnitary)}
                      style={{
                        fontSize: '11px', padding: '3px 8px',
                        background: 'transparent',
                        border: '1px solid var(--border-muted)',
                        borderRadius: '4px', color: 'var(--text-muted)', cursor: 'pointer',
                      }}
                    >
                      {showUnitary ? 'Скрыть AA†' : 'Проверить'}
                    </button>
                  </div>
                  <MatrixDisplay matrix={ticket.matrixA} highlighted />
                  <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '12px' }}>
                    <span style={{
                      color: sim.unitarity.unitary ? '#4ade80' : '#f87171',
                      background: sim.unitarity.unitary ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                      padding: '3px 10px', borderRadius: '20px',
                      border: `1px solid ${sim.unitarity.unitary ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
                    }}>
                      {sim.unitarity.unitary ? '✓ Унитарная' : '✗ Не унитарная'} · err = {sim.unitarity.maxErr.toExponential(1)}
                    </span>
                  </div>
                  {showUnitary && (
                    <div style={{ marginTop: '16px' }}>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textAlign: 'center' }}>
                        A · A† (должна быть ≈ I)
                      </p>
                      <ComplexMatrixDisplay matrix={sim.unitarity.product} size={4} digits={2} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '28px', width: '100%', maxWidth: '900px', margin: '0 auto' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
                📖 Описание задачи и теория
              </h3>
              <div style={{
                color: 'var(--text-secondary)',
                lineHeight: '1.8',
                fontSize: '14px',
                fontFamily: 'var(--font-sans)',
              }}>
                <MarkdownRenderer content={activeChallenge?.explanationMarkdown || ''} />
              </div>
            </div>
          )
        )}

        {/* ── SIMULATOR TAB ─────────────────────────────── */}
        {activeTab === 'simulator' && appMode === 'exam' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-panel quantum-glow" style={{ padding: '24px 32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--accent-cyan)', margin: 0 }}>
                  🔬 Квантовая Схема
                </h3>
                <button
                  onClick={runTicketSimulation}
                  disabled={isSimulating}
                  className="btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
                    boxShadow: '0 0 15px var(--accent-cyan)44',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#00101a',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    opacity: isSimulating ? 0.7 : 1,
                    transition: 'var(--transition-smooth)',
                  }}
                >
                  {isSimulating ? (
                    <>
                      <span className="spinner" style={{
                        display: 'inline-block', width: '10px', height: '10px',
                        border: '2px solid rgba(0,0,0,0.1)', borderTopColor: '#00101a',
                        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                      }} />
                      Выполнение...
                    </>
                  ) : (
                    <>⚡ Запустить схему</>
                  )}
                </button>
              </div>
              <CircuitDiagram step={circuitStep} isSimulating={isSimulating} />
              <div style={{ display: 'flex', gap: '10px', marginTop: '24px', flexWrap: 'wrap' }}>
                {[
                  { step: 0, label: '⏮ Начальное состояние' },
                  { step: 1, label: '① После H ⊗ I' },
                  { step: 2, label: '② После CNOT' },
                  { step: 3, label: '③ Измерение Q₁' },
                ].map(({ step, label }) => (
                  <button
                    key={step}
                    onClick={() => setCircuitStep(step)}
                    className={circuitStep === step ? 'btn-primary' : 'btn-secondary'}
                    style={{ fontSize: '12px', padding: '8px 16px' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="responsive-two-column-grid">
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>
                  Вектор Состояния |ψ⟩
                  {circuitStep === 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '12px' }}> — начальное |0⟩|u⟩</span>}
                  {circuitStep === 1 && <span style={{ color: 'var(--accent-cyan)', fontWeight: 400, fontSize: '12px' }}> — после H⊗I</span>}
                  {circuitStep >= 2 && <span style={{ color: 'var(--accent-purple)', fontWeight: 400, fontSize: '12px' }}> — после CNOT</span>}
                </h4>
                <StateVectorDisplay state={displayedState} />
              </div>
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>
                  Вероятности Измерения Q₁
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'P(Q₁ = 0)', val: sim.p0, color: 'var(--accent-cyan)' },
                    { label: 'P(Q₁ = 1)', val: sim.p1, color: 'var(--accent-purple)' },
                  ].map(({ label, val, color }) => (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color, fontWeight: '600' }}>
                          {(val * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--border-muted)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${val * 100}%`, height: '100%',
                          background: `linear-gradient(90deg, ${color}, hsla(265,100%,65%,0.8))`,
                          borderRadius: '4px', transition: 'width 0.6s ease',
                          boxShadow: `0 0 10px ${color}`,
                        }} />
                      </div>
                    </div>
                  ))}
                  <div style={{
                    marginTop: '8px', padding: '12px', background: 'rgba(0,0,0,0.2)',
                    borderRadius: '8px', border: '1px solid var(--border-muted)',
                    fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)',
                  }}>
                    Наиболее вероятный результат: Q₁ = {sim.p0 >= sim.p1 ? '0' : '1'}{' '}
                    ({(Math.max(sim.p0, sim.p1) * 100).toFixed(2)}%)
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── RESULTS TAB ──────────────────────────────── */}
        {activeTab === 'results' && appMode === 'exam' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px' }}>
                📐 Матрица плотности ρ = |ψ⟩⟨ψ|
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <ComplexMatrixDisplay matrix={sim.rho} size={4} digits={3} />
              </div>
            </div>

            <div className="responsive-two-column-grid">
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>
                  ρ⁽¹⁾ = Tr₂(ρ) <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '400' }}>— Кубит 1</span>
                </h4>
                <ComplexMatrixDisplay matrix={sim.rho1 as Complex[][]} size={2} digits={4} />
                <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Tr(ρ⁽¹⁾) = {(sim.rho1[0][0].re + sim.rho1[1][1].re).toFixed(4)}
                </div>
              </div>
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>
                  ρ⁽²⁾ = Tr₁(ρ) <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '400' }}>— Кубит 2</span>
                </h4>
                <ComplexMatrixDisplay matrix={sim.rho2 as Complex[][]} size={2} digits={4} />
                <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Tr(ρ⁽²⁾) = {(sim.rho2[0][0].re + sim.rho2[1][1].re).toFixed(4)}
                </div>
              </div>
            </div>

            <div className="responsive-two-column-grid">
              <BlochSphere vector={sim.bloch1} title="Сфера Блоха: Кубит 1" />
              <BlochSphere vector={sim.bloch2} title="Сфера Блоха: Кубит 2" />
            </div>

            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>
                📋 Сводка результатов
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
                      {['Параметр', 'Значение'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Матрица A унитарна', sim.unitarity.unitary ? '✅ Да' : '❌ Нет'],
                      ['P(Q₁ = |0⟩)', `${(sim.p0 * 100).toFixed(4)}%`],
                      ['P(Q₁ = |1⟩)', `${(sim.p1 * 100).toFixed(4)}%`],
                      ['Результат измерения', `Q₁ = ${sim.p0 >= sim.p1 ? '|0⟩' : '|1⟩'}`],
                      ['Вектор Блоха Q₁', `(${sim.bloch1.x.toFixed(3)}, ${sim.bloch1.y.toFixed(3)}, ${sim.bloch1.z.toFixed(3)})`],
                      ['Вектор Блоха Q₂', `(${sim.bloch2.x.toFixed(3)}, ${sim.bloch2.y.toFixed(3)}, ${sim.bloch2.z.toFixed(3)})`],
                      ['|Блох Q₁|', Math.sqrt(sim.bloch1.x**2 + sim.bloch1.y**2 + sim.bloch1.z**2).toFixed(4)],
                      ['|Блох Q₂|', Math.sqrt(sim.bloch2.x**2 + sim.bloch2.y**2 + sim.bloch2.z**2).toFixed(4)],
                    ].map(([param, val], i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-muted)', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{param}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── CONSTRUCTOR TAB ───────────────────────────── */}
        {activeTab === 'constructor' && appMode !== 'sandbox' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <CircuitBuilder
                grid={grid}
                setGrid={setGrid}
                numQubits={numQubits}
                setNumQubits={setNumQubits}
                initialStates={initialStates}
                setInitialStates={setInitialStates}
                allowedGates={appMode === 'challenges' ? activeChallenge?.allowedGates : undefined}
                lockQubits={appMode === 'challenges' ? activeChallenge?.lockQubits : undefined}
                lockInitialStates={appMode === 'challenges' ? activeChallenge?.lockInitialStates : undefined}
                allowedParams={appMode === 'challenges' ? activeChallenge?.allowedParams : undefined}
                appMode={appMode}
              />
            </div>
            {appMode === 'challenges' && renderVerificationPanel()}
          </div>
        )}

        {/* ── SANDBOX MODE CONTENT ─────────────────────────── */}
        {appMode === 'sandbox' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <CircuitBuilder
                grid={grid}
                setGrid={setGrid}
                numQubits={numQubits}
                setNumQubits={setNumQubits}
                initialStates={initialStates}
                setInitialStates={setInitialStates}
                appMode={appMode}
              />
            </div>
          </div>
        )}

        {/* ── GRADING & TASKS TAB ───────────────────────── */}
        {activeTab === 'grading' && appMode === 'exam' && (
          <TaskManager
            grid={getGradingGrid(sandboxGrid)}
            numQubits={2}
            initialStates={getGradingInitialStates(ticket)}
            currentTicket={ticket}
            onSelectTicket={(id) => {
              switchActiveItem('exam', id, null);
              setActiveTab('grading');
            }}
          />
        )}
      </main>
    </div>
  );
};

export default App;
