import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Complex, StateVector, DensityMatrix, cZero, cOne, getReducedDensityMatrix, getBlochVector } from './quantumMath';
import { GateConfigBottomSheet } from './GateConfig';
import { GateHelpModal } from './GateHelp';
import { runCircuit } from './TaskManager';
import { ComplexMatrixDisplay, StateVectorDisplay } from './MatrixDisplay';
import { BlochSphere } from './BlochSphere';

export interface GateInstance {
  type: string;        // 'H', 'X', 'Y', 'Z', 'Rx', 'Ry', 'Rz', 'P', 'C', 'M_z', 'M_x', 'M_y'
  param?: string;      // math expression like 'pi/2'
  paramVal?: number;   // evaluated value in radians
  fixed?: boolean;     // if true, this gate cannot be moved, edited, or deleted
}

export interface QubitInitialState {
  type: 'pure' | 'mixed';
  preset: '0' | '1' | '+' | '-' | 'custom-pure' | 'custom-mixed';
  alpha: Complex;      // for pure
  beta: Complex;       // for pure
  p0: number;          // for mixed
  p1: number;          // for mixed
  label?: string;      // custom display label
}

interface CircuitBuilderProps {
  numQubits: number;
  setNumQubits: (n: number) => void;
  grid: (GateInstance | null)[][]; // numQubits x numColumns
  setGrid: React.Dispatch<React.SetStateAction<(GateInstance | null)[][]>>;
  initialStates: QubitInitialState[];
  setInitialStates: React.Dispatch<React.SetStateAction<QubitInitialState[]>>;
  allowedGates?: string[];
  allowedParams?: string[];
  lockQubits?: boolean;
  lockInitialStates?: boolean;
  appMode?: 'exam' | 'challenges';
}

export const CircuitBuilder: React.FC<CircuitBuilderProps> = ({
  numQubits,
  setNumQubits,
  grid,
  setGrid,
  initialStates,
  setInitialStates,
  allowedGates,
  allowedParams,
  lockQubits,
  lockInitialStates,
  appMode = 'challenges',
}) => {
  const isGateFixed = (gate: GateInstance | null | undefined): boolean => {
    return appMode === 'challenges' && !!gate?.fixed;
  };

  const numColumns = grid[0]?.length || 8;
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{
    stepsStateVectors: (StateVector | null)[];
    stepsDensityMatrices: DensityMatrix[];
    finalUnitary: Complex[][];
  } | null>(null);
  const [simStep, setSimStep] = useState(0);

  // Clear simulation results when grid or initialStates are modified
  useEffect(() => {
    setSimulationResult(null);
  }, [grid, initialStates]);

  const handleRunSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    
    setTimeout(() => {
      try {
        const res = runCircuit(numQubits, initialStates, grid);
        setSimulationResult(res);
        setSimStep(res.stepsDensityMatrices.length - 1); // default to final step
      } catch (err) {
        console.error("Simulation failed:", err);
      } finally {
        setIsSimulating(false);
      }
    }, 800);
  };
  const [draggedGate, setDraggedGate] = useState<{
    type: string;
    source: 'palette' | { row: number; col: number };
  } | null>(null);

  // Modal states
  const [configGate, setConfigGate] = useState<{ row: number; col: number; type: string; param: string } | null>(null);
  const [helpGateType, setHelpGateType] = useState<string | null>(null);
  const [editingInitialQubit, setEditingInitialQubit] = useState<number | null>(null);
  
  // Context menu for cell click
  const [activeCellMenu, setActiveCellMenu] = useState<{ row: number; col: number } | null>(null);

  // Pointer dragging position (for floating preview)
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const paletteGates = [
    { type: 'H', label: 'H', color: 'var(--accent-cyan)' },
    { type: 'X', label: 'X', color: 'var(--accent-blue)' },
    { type: 'Y', label: 'Y', color: 'var(--accent-purple)' },
    { type: 'Z', label: 'Z', color: 'var(--accent-pink)' },
    { type: 'Rx', label: 'Rx', color: 'var(--accent-cyan)', isParam: true },
    { type: 'Ry', label: 'Ry', color: 'var(--accent-blue)', isParam: true },
    { type: 'Rz', label: 'Rz', color: 'var(--accent-purple)', isParam: true },
    { type: 'P', label: 'P', color: 'var(--accent-pink)', isParam: true },
    { type: 'C', label: '●', color: 'var(--text-primary)' },
    { type: 'M_z', label: 'Mz', color: 'hsl(45, 100%, 60%)' },
    { type: 'M_x', label: 'Mx', color: 'hsl(45, 100%, 60%)' },
    { type: 'M_y', label: 'My', color: 'hsl(45, 100%, 60%)' },
  ];

  // Drag start from palette
  const handlePaletteDragStart = (e: React.PointerEvent, type: string) => {
    e.preventDefault();
    setDraggedGate({ type, source: 'palette' });
    setDragPos({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
  };

  // Drag start from grid cell
  const handleGridDragStart = (e: React.PointerEvent, row: number, col: number, type: string) => {
    const gate = grid[row]?.[col];
    if (isGateFixed(gate)) return; // Block dragging fixed gates!
    e.preventDefault();
    setDraggedGate({ type, source: { row, col } });
    setDragPos({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
  };

  // Handle drag move and drop on window level to avoid event capture bugs
  useEffect(() => {
    if (!isDragging || !draggedGate) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      setDragPos({ x: e.clientX, y: e.clientY });
    };

    const handleWindowPointerUp = (e: PointerEvent) => {
      setIsDragging(false);

      if (gridRef.current) {
        const gridRect = gridRef.current.getBoundingClientRect();
        
        if (
          e.clientX >= gridRect.left &&
          e.clientX <= gridRect.right &&
          e.clientY >= gridRect.top &&
          e.clientY <= gridRect.bottom
        ) {
          const relativeX = e.clientX - gridRect.left;
          const relativeY = e.clientY - gridRect.top;

          // Exact pixel grid offsets (initial state indicator width = 85px, col = 55px, row = 60px)
          const col = Math.floor((relativeX - 85) / 55);
          const row = Math.floor(relativeY / 60);

          if (row >= 0 && row < numQubits && col >= 0 && col < numColumns) {
            const targetCellGate = grid[row]?.[col];
            if (isGateFixed(targetCellGate)) {
              setDraggedGate(null);
              return;
            }

            const originalGate = draggedGate.source !== 'palette'
              ? grid[draggedGate.source.row]?.[draggedGate.source.col]
              : null;

            const targetGate = paletteGates.find(pg => pg.type === draggedGate.type);
            const newGate: GateInstance = {
              type: draggedGate.type,
              param: originalGate ? originalGate.param : (targetGate?.isParam ? 'pi/2' : undefined),
              paramVal: originalGate ? originalGate.paramVal : (targetGate?.isParam ? Math.PI / 2 : undefined),
            };

            setGrid(prev => {
              const next = prev.map(r => [...r]);
              if (draggedGate.source !== 'palette') {
                const src = draggedGate.source;
                if (!isGateFixed(next[src.row][src.col])) {
                  next[src.row][src.col] = null;
                }
              }
              next[row][col] = newGate;
              return next;
            });

            // Trigger param editor immediately for Rx/Ry/Rz/P if dragged from palette
            if (targetGate?.isParam && draggedGate.source === 'palette') {
              setConfigGate({ row, col, type: draggedGate.type, param: 'pi/2' });
            }
          }
        } else {
          // Dropped outside grid - delete if it came from grid
          if (draggedGate.source !== 'palette') {
            const src = draggedGate.source;
            const gate = grid[src.row]?.[src.col];
            if (!isGateFixed(gate)) {
              setGrid(prev => {
                const next = prev.map(r => [...r]);
                next[src.row][src.col] = null;
                return next;
              });
            }
          }
        }
      }

      setDraggedGate(null);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [isDragging, draggedGate, numQubits, numColumns]);

  const handleCellClick = (row: number, col: number, gate: GateInstance | null) => {
    if (!gate) {
      setActiveCellMenu(null);
      return;
    }
    if (isGateFixed(gate)) {
      setActiveCellMenu(null);
      return;
    }
    // Toggle menu
    if (activeCellMenu?.row === row && activeCellMenu?.col === col) {
      setActiveCellMenu(null);
    } else {
      setActiveCellMenu({ row, col });
    }
  };

  const deleteGate = (row: number, col: number) => {
    const gate = grid[row]?.[col];
    if (isGateFixed(gate)) return;
    setGrid(prev => {
      const next = prev.map(r => [...r]);
      next[row][col] = null;
      return next;
    });
    setActiveCellMenu(null);
  };

  const editGateParam = (row: number, col: number, gate: GateInstance) => {
    setConfigGate({ row, col, type: gate.type, param: gate.param || '0' });
    setActiveCellMenu(null);
  };

  const viewGateHelp = (gateType: string) => {
    setHelpGateType(gateType);
    setActiveCellMenu(null);
  };

  const handleSaveParam = (expr: string, val: number) => {
    if (configGate) {
      setGrid(prev => {
        const next = prev.map(r => [...r]);
        const cell = next[configGate.row][configGate.col];
        if (cell) {
          cell.param = expr;
          cell.paramVal = val;
        }
        return next;
      });
      setConfigGate(null);
    }
  };

  const addColumn = () => {
    setGrid(prev => prev.map(row => [...row, null]));
  };

  const removeColumn = () => {
    if (grid[0].length <= 2) return;
    setGrid(prev => prev.map(row => row.slice(0, -1)));
  };

  const addQubit = () => {
    if (numQubits >= 6) return;
    setNumQubits(numQubits + 1);
    setInitialStates(prev => [...prev, {
      type: 'pure',
      preset: '0',
      alpha: cOne(),
      beta: cZero(),
      p0: 1,
      p1: 0
    }]);
    setGrid(prev => [...prev, Array.from({ length: numColumns }, () => null)]);
  };

  const removeQubit = () => {
    if (numQubits <= 1) return;
    setNumQubits(numQubits - 1);
    setInitialStates(prev => prev.slice(0, -1));
    setGrid(prev => prev.slice(0, -1));
  };

  // Render connection lines for controlled gates in column `c`
  const renderColumnConnections = (c: number) => {
    const colGates = grid.map((r, ri) => ({ gate: r[c], rowIndex: ri })).filter(g => g.gate !== null);
    if (colGates.length <= 1) return null;

    // Find if there is a target and controls
    const controls = colGates.filter(g => g.gate!.type === 'C');
    const target = colGates.find(g => g.gate!.type !== 'C');

    if (controls.length === 0 || !target) return null;

    // Calculate vertical boundaries
    const rows = colGates.map(g => g.rowIndex);
    const minRow = Math.min(...rows);
    const maxRow = Math.max(...rows);

    const cellWidth = 55; // width of col cell in pixels
    const cellHeight = 60; // height of row cell in pixels
    const startX = 85 + c * cellWidth + cellWidth / 2;
    const startY = minRow * cellHeight + cellHeight / 2;
    const endY = maxRow * cellHeight + cellHeight / 2;

    const targetColor = target.gate!.type === 'X' ? 'var(--accent-purple)' : 'var(--accent-cyan)';

    return (
      <line
        key={`line-col-${c}`}
        x1={startX}
        y1={startY}
        x2={startX}
        y2={endY}
        stroke={targetColor}
        strokeWidth="2"
        style={{ filter: `drop-shadow(0 0 6px ${targetColor})`, pointerEvents: 'none' }}
      />
    );
  };

  // Toggle quick presets for initial state badge click
  const handleInitialBadgeClick = (qubitIdx: number) => {
    setEditingInitialQubit(qubitIdx);
  };

  const saveInitialState = (qubitIdx: number, state: QubitInitialState) => {
    setInitialStates(prev => {
      const next = [...prev];
      next[qubitIdx] = state;
      return next;
    });
    setEditingInitialQubit(null);
  };

  const visiblePaletteGates = allowedGates
    ? paletteGates.filter(g => allowedGates.includes(g.type))
    : paletteGates;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ── GATE PALETTE ────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Панель элементов (Перетащите на схему)
            {allowedGates && (
              <span style={{
                fontSize: '9px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(251,191,36,0.1)',
                border: '1px solid rgba(251,191,36,0.3)',
                color: '#fbbf24',
                fontWeight: '600',
                textTransform: 'none',
                letterSpacing: 'normal'
              }}>
                🔒 Ограниченный набор
              </span>
            )}
          </h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="btn-primary"
              style={{
                fontSize: '11px', padding: '4px 12px', borderRadius: '6px',
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
                boxShadow: '0 0 10px var(--accent-cyan)44',
                border: 'none', color: '#00101a', fontWeight: '700', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
                opacity: isSimulating ? 0.7 : 1, transition: 'var(--transition-smooth)'
              }}
            >
              {isSimulating ? (
                <>
                  <span className="spinner" style={{
                    display: 'inline-block', width: '8px', height: '8px',
                    border: '1.5px solid rgba(0,0,0,0.1)', borderTopColor: '#00101a',
                    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                  }} />
                  Запуск...
                </>
              ) : (
                <>⚡ Запустить схему</>
              )}
            </button>
            <button 
              onClick={() => setGrid(prev => prev.map(row => row.map(cell => isGateFixed(cell) ? cell : null)))}
              style={{
                fontSize: '11px', padding: '4px 10px', borderRadius: '6px',
                background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                color: '#f87171', cursor: 'pointer', fontWeight: '500'
              }}
            >
              🗑️ Очистить
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {visiblePaletteGates.map(g => (
            <div
              key={g.type}
              onPointerDown={e => handlePaletteDragStart(e, g.type)}
              draggable="false"
              onDragStart={e => e.preventDefault()}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid var(--border-muted)`,
                borderRadius: '8px',
                padding: '8px 12px',
                minWidth: '46px',
                height: '46px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'grab',
                userSelect: 'none',
                touchAction: 'none',
                position: 'relative',
                transition: 'var(--transition-fast)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = g.color;
                e.currentTarget.style.boxShadow = `0 0 8px ${g.color}33`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-muted)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: '800', color: g.color }}>
                {g.label}
              </span>
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  viewGateHelp(g.type);
                }}
                style={{
                  position: 'absolute',
                  top: '2px', right: '4px',
                  fontSize: '9px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                ⓘ
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── CIRCUIT GRID ────────────────────────────────── */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '24px 20px', 
          overflowX: 'auto',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--accent-cyan)' }}>
            🔬 Конструктор Квантовых Цепей
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!lockQubits && (
              <>
                <button onClick={removeQubit} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}>- Кубит</button>
                <button onClick={addQubit} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}>+ Кубит</button>
              </>
            )}
            <button onClick={removeColumn} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}>- Шаг</button>
            <button onClick={addColumn} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}>+ Шаг</button>
          </div>
        </div>

        {/* Board */}
        <div 
          ref={gridRef}
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            width: `${85 + numColumns * 55}px`,
            height: `${numQubits * 60}px`,
            background: 'rgba(0,0,0,0.15)',
            borderRadius: '12px',
            border: '1px solid var(--border-muted)',
          }}
        >
          {/* SVG Connection Lines layer */}
          <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
            {Array.from({ length: numColumns }).map((_, c) => renderColumnConnections(c))}
          </svg>

          {/* Rows (Qubits) */}
          {Array.from({ length: numQubits }).map((_, r) => {
            const initState = initialStates[r] || { type: 'pure', preset: '0' };
            let initStateLabel = '|0⟩';
            if (initState.label) initStateLabel = initState.label;
            else if (initState.preset === '0') initStateLabel = '|0⟩';
            else if (initState.preset === '1') initStateLabel = '|1⟩';
            else if (initState.preset === '+') initStateLabel = '|+⟩';
            else if (initState.preset === '-') initStateLabel = '|−⟩';
            else if (initState.type === 'mixed') initStateLabel = `ρ(p₀=${initState.p0.toFixed(2)})`;
            else initStateLabel = 'Custom';

            return (
              <div 
                key={`row-${r}`}
                style={{
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                }}
              >
                {/* Horizontal wire passing through middle */}
                <div style={{
                  position: 'absolute',
                  left: '80px',
                  right: 0,
                  height: '1px',
                  background: 'var(--border-muted)',
                  zIndex: 0,
                }} />

                {/* Left side Initial State selector badge */}
                <div 
                  onClick={() => !lockInitialStates && handleInitialBadgeClick(r)}
                  style={{
                    width: '75px',
                    height: '36px',
                    flexShrink: 0,
                    borderRadius: '8px',
                    background: lockInitialStates ? 'rgba(255,255,255,0.02)' : 'hsla(186, 100%, 50%, 0.1)',
                    border: `1px solid ${lockInitialStates ? 'var(--border-muted)' : 'var(--accent-cyan)'}`,
                    boxShadow: lockInitialStates ? 'none' : 'var(--shadow-neon)',
                    color: lockInitialStates ? 'var(--text-muted)' : 'var(--accent-cyan)',
                    fontSize: '11px',
                    fontWeight: '700',
                    fontFamily: 'var(--font-mono)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: lockInitialStates ? 'not-allowed' : 'pointer',
                    zIndex: 2,
                    marginLeft: '5px',
                    transition: 'var(--transition-fast)',
                    opacity: lockInitialStates ? 0.7 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!lockInitialStates) {
                      e.currentTarget.style.background = 'hsla(186, 100%, 50%, 0.2)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!lockInitialStates) {
                      e.currentTarget.style.background = 'hsla(186, 100%, 50%, 0.1)';
                    }
                  }}
                >
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    Q_{r} init {lockInitialStates && '🔒'}
                  </span>
                  <span>{initStateLabel}</span>
                </div>

                {/* Grid cells */}
                <div style={{ display: 'flex', marginLeft: '5px', zIndex: 2, flexShrink: 0 }}>
                  {Array.from({ length: numColumns }).map((_, c) => {
                    const gate = grid[r]?.[c] || null;
                    const isParam = gate && ['Rx', 'Ry', 'Rz', 'P'].includes(gate.type);
                    const isControl = gate && gate.type === 'C';
                    const isMeas = gate && gate.type.startsWith('M_');

                    return (
                      <div
                        key={`cell-${r}-${c}`}
                        onClick={() => handleCellClick(r, c, gate)}
                        style={{
                          width: '55px',
                          height: '60px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          flexShrink: 0,
                        }}
                      >
                        {gate && (
                          <div
                            onPointerDown={e => handleGridDragStart(e, r, c, gate.type)}
                            draggable="false"
                            onDragStart={e => e.preventDefault()}
                            style={{
                              width: isControl ? '14px' : '40px',
                              height: isControl ? '14px' : '40px',
                              borderRadius: isControl ? '50%' : '6px',
                              background: isControl 
                                ? (isGateFixed(gate) ? 'var(--text-muted)' : 'var(--accent-cyan)')
                                : isMeas 
                                ? 'hsl(45, 90%, 20%)'
                                : isGateFixed(gate)
                                ? 'rgba(255, 255, 255, 0.05)'
                                : 'var(--bg-deep)',
                              border: `1.5px ${isGateFixed(gate) ? 'dashed' : 'solid'} ${
                                isControl 
                                  ? (isGateFixed(gate) ? 'var(--text-muted)' : 'var(--accent-cyan)')
                                  : isMeas 
                                  ? 'hsl(45, 100%, 50%)'
                                  : isGateFixed(gate)
                                  ? 'var(--text-muted)'
                                  : 'var(--accent-purple)'
                              }`,
                              color: isGateFixed(gate) ? 'var(--text-muted)' : isControl ? 'transparent' : 'var(--text-primary)',
                              boxShadow: isControl && !isGateFixed(gate) ? '0 0 8px var(--accent-cyan)' : 'none',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: '800',
                              fontFamily: 'var(--font-mono)',
                              cursor: isGateFixed(gate) ? 'not-allowed' : 'grab',
                              userSelect: 'none',
                              touchAction: 'none',
                              zIndex: 3,
                              opacity: isGateFixed(gate) ? 0.75 : 1,
                            }}
                          >
                            {!isControl && (
                              <>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                  {gate.type.startsWith('M_') ? 'M' + gate.type[2] : gate.type}
                                  {isGateFixed(gate) && <span style={{ fontSize: '10px', opacity: 0.8 }}>🔒</span>}
                                </span>
                                {isParam && (
                                  <span style={{ fontSize: '8px', fontWeight: '500', color: isGateFixed(gate) ? 'var(--text-muted)' : 'var(--accent-cyan)' }}>
                                    {gate.param || '0'}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {/* Cell click context menu */}
                        {activeCellMenu?.row === r && activeCellMenu?.col === c && (
                          <div style={{
                            position: 'absolute',
                            bottom: '50px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--accent-cyan)',
                            borderRadius: '8px',
                            boxShadow: 'var(--shadow-neon)',
                            padding: '4px',
                            display: 'flex',
                            gap: '4px',
                            zIndex: 100,
                          }}>
                            {isParam && (
                              <button
                                onClick={() => editGateParam(r, c, gate)}
                                style={{
                                  fontSize: '10px', padding: '4px 6px', borderRadius: '4px',
                                  background: 'rgba(0,242,254,0.1)', border: 'none', color: 'var(--accent-cyan)'
                                }}
                              >
                                ⚙️ Настр
                              </button>
                            )}
                            <button
                              onClick={() => viewGateHelp(gate!.type)}
                              style={{
                                fontSize: '10px', padding: '4px 6px', borderRadius: '4px',
                                background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-secondary)'
                              }}
                            >
                              ⓘ Справка
                            </button>
                            <button
                              onClick={() => deleteGate(r, c)}
                              style={{
                                fontSize: '10px', padding: '4px 6px', borderRadius: '4px',
                                background: 'rgba(248,113,113,0.1)', border: 'none', color: '#f87171'
                              }}
                            >
                              🗑️ Удал
                            </button>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* ── SIMULATION RESULTS PANEL ────────────────────── */}
      {simulationResult && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-muted)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--accent-cyan)', margin: 0 }}>
              📊 Результаты Симуляции Конструктора
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Сетка: {numQubits} куб. × {numColumns} тактов
            </span>
          </div>

          {/* Step selection slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-muted)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                Шаг симуляции (такт t): <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>t = {simStep}</span>
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {simStep === 0 ? 'Начальное состояние' : `После такта ${simStep}`}
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="range"
                min="0"
                max={numColumns}
                value={simStep}
                onChange={e => setSimStep(parseInt(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setSimStep(prev => Math.max(0, prev - 1))}
                  disabled={simStep === 0}
                  className="btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                  ◀
                </button>
                <button
                  onClick={() => setSimStep(prev => Math.min(numColumns, prev + 1))}
                  disabled={simStep === numColumns}
                  className="btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                  ▶
                </button>
              </div>
            </div>
            
            {/* Step markers indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', fontSize: '10px', color: 'var(--text-muted)' }}>
              {Array.from({ length: numColumns + 1 }).map((_, stepIdx) => (
                <span 
                  key={stepIdx} 
                  onClick={() => setSimStep(stepIdx)}
                  style={{ 
                    cursor: 'pointer', 
                    color: simStep === stepIdx ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    fontWeight: simStep === stepIdx ? '700' : '400'
                  }}
                >
                  t={stepIdx}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
            {/* Left Column: State representation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {simulationResult.stepsStateVectors[simStep] ? (
                <div className="glass-panel" style={{ padding: '16px', background: 'rgba(0,0,0,0.1)' }}>
                  <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '600' }}>
                    Вектор Состояния |ψ⟩ (Чистое состояние)
                  </h4>
                  <StateVectorDisplay state={simulationResult.stepsStateVectors[simStep]!} />
                </div>
              ) : (
                <div className="glass-panel" style={{ padding: '16px', background: 'rgba(0,0,0,0.1)', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--accent-pink)' }}>
                    ⚠️ Смешанное состояние (Вектор состояния не определен)
                  </span>
                </div>
              )}

              <div className="glass-panel" style={{ padding: '16px', background: 'rgba(0,0,0,0.1)', overflowX: 'auto' }}>
                <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '600' }}>
                  Матрица плотности ρ
                </h4>
                <ComplexMatrixDisplay 
                  matrix={simulationResult.stepsDensityMatrices[simStep]} 
                  size={1 << numQubits} 
                  digits={3} 
                />
              </div>
            </div>

            {/* Right Column: Measurement Probabilities & Bloch Spheres */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Measurement Probabilities */}
              <div className="glass-panel" style={{ padding: '16px', background: 'rgba(0,0,0,0.1)' }}>
                <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '600' }}>
                  Вероятности Измерения Всей Системы
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(() => {
                    const rho = simulationResult.stepsDensityMatrices[simStep];
                    const D = 1 << numQubits;
                    const probs = Array.from({ length: D }, (_, idx) => {
                      const prob = rho[idx]?.[idx]?.re || 0;
                      const label = `|${idx.toString(2).padStart(numQubits, '0')}⟩`;
                      return { label, prob };
                    });

                    return probs.map(({ label, prob }) => (
                      <div key={label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{label}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', color: prob > 0.001 ? 'var(--accent-cyan)' : 'var(--text-muted)', fontWeight: '600' }}>
                            {(prob * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${prob * 100}%`, height: '100%',
                            background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))',
                            borderRadius: '3px', transition: 'width 0.4s ease',
                          }} />
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Bloch Spheres Grid */}
              <div className="glass-panel" style={{ padding: '16px', background: 'rgba(0,0,0,0.1)' }}>
                <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', fontWeight: '600' }}>
                  Сферы Блоха для каждого кубита
                </h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: numQubits > 1 ? '1fr 1fr' : '1fr', 
                  gap: '12px' 
                }}>
                  {Array.from({ length: numQubits }).map((_, qubitIdx) => {
                    const rho = simulationResult.stepsDensityMatrices[simStep];
                    const rho_q = getReducedDensityMatrix(rho, qubitIdx, numQubits);
                    const bloch = getBlochVector(rho_q);

                    return (
                      <div key={qubitIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '100%', maxWidth: '160px' }}>
                          <BlochSphere 
                            vector={bloch} 
                            title={`Кубит Q_${qubitIdx}`} 
                          />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                          x: {bloch.x.toFixed(2)}, y: {bloch.y.toFixed(2)}, z: {bloch.z.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── DRAGGED FLOATING PREVIEW ────────────────────── */}
      {isDragging && draggedGate && createPortal(
        <div style={{
          position: 'fixed',
          left: `${dragPos.x - 20}px`,
          top: `${dragPos.y - 20}px`,
          width: draggedGate.type === 'C' ? '14px' : '40px',
          height: draggedGate.type === 'C' ? '14px' : '40px',
          borderRadius: draggedGate.type === 'C' ? '50%' : '6px',
          background: draggedGate.type === 'C' ? 'var(--accent-cyan)' : 'var(--bg-surface)',
          border: `1.5px solid var(--accent-cyan)`,
          boxShadow: 'var(--shadow-neon)',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: '800',
          fontFamily: 'var(--font-mono)',
          pointerEvents: 'none',
          zIndex: 10000,
          opacity: 0.85
        }}>
          {draggedGate.type !== 'C' && (draggedGate.type.startsWith('M_') ? 'M' + draggedGate.type[2] : draggedGate.type)}
        </div>,
        document.body
      )}

      {/* ── MODALS & BOTTOM SHEETS ──────────────────────── */}
      {configGate && (
        <GateConfigBottomSheet
          gateType={configGate.type}
          initialParam={configGate.param}
          onSave={handleSaveParam}
          onCancel={() => setConfigGate(null)}
          allowedParams={allowedParams}
        />
      )}

      {helpGateType && (
        <GateHelpModal
          gateType={helpGateType}
          onClose={() => setHelpGateType(null)}
        />
      )}

      {/* Initial state configuration modal */}
      {editingInitialQubit !== null && (
        <InitialStateModal
          qubitIdx={editingInitialQubit}
          initialState={initialStates[editingInitialQubit]}
          onSave={saveInitialState}
          onClose={() => setEditingInitialQubit(null)}
        />
      )}

    </div>
  );
};

// ── INITIAL STATE CONFIGURATION MODAL ─────────────────
interface InitialStateModalProps {
  qubitIdx: number;
  initialState: QubitInitialState;
  onSave: (qubitIdx: number, state: QubitInitialState) => void;
  onClose: () => void;
}

const InitialStateModal: React.FC<InitialStateModalProps> = ({
  qubitIdx,
  initialState,
  onSave,
  onClose
}) => {
  const [type, setType] = useState<'pure' | 'mixed'>(initialState.type);
  const [preset, setPreset] = useState<QubitInitialState['preset']>(initialState.preset);
  
  // Custom pure state coordinates
  const [theta, setTheta] = useState(0); // angle in radians [0, pi]
  const [phi, setPhi] = useState(0);   // angle in radians [0, 2pi]

  // Mixed state probability p0
  const [p0, setP0] = useState(initialState.p0);

  // Initialize values if state is custom
  useEffect(() => {
    if (initialState.preset === 'custom-pure') {
      // Reconstruct theta and phi from alpha/beta if possible
      // Let's assume standard values, or just set to 0.
      // Qubit state = cos(theta/2)|0> + e^{i phi}sin(theta/2)|1>
      // |alpha| = cos(theta/2) => theta = 2 * acos(|alpha|)
      const absAlpha = Math.sqrt(initialState.alpha.re**2 + initialState.alpha.im**2);
      const angleTheta = 2 * Math.acos(Math.max(0, Math.min(1, absAlpha)));
      setTheta(angleTheta);

      // Phase phi = arg(beta) - arg(alpha)
      const arg = (c: Complex) => Math.atan2(c.im, c.re);
      let anglePhi = arg(initialState.beta) - arg(initialState.alpha);
      if (anglePhi < 0) anglePhi += 2 * Math.PI;
      setPhi(anglePhi);
    }
  }, [initialState]);

  const handleSave = () => {
    if (type === 'pure') {
      if (preset === '0') {
        onSave(qubitIdx, { type: 'pure', preset: '0', alpha: cOne(), beta: cZero(), p0: 1, p1: 0 });
      } else if (preset === '1') {
        onSave(qubitIdx, { type: 'pure', preset: '1', alpha: cZero(), beta: cOne(), p0: 0, p1: 1 });
      } else if (preset === '+') {
        const s = 1/Math.sqrt(2);
        onSave(qubitIdx, { type: 'pure', preset: '+', alpha: {re: s, im: 0}, beta: {re: s, im: 0}, p0: 0.5, p1: 0.5 });
      } else if (preset === '-') {
        const s = 1/Math.sqrt(2);
        onSave(qubitIdx, { type: 'pure', preset: '-', alpha: {re: s, im: 0}, beta: {re: -s, im: 0}, p0: 0.5, p1: 0.5 });
      } else {
        // Custom pure (Bloch Sphere angles)
        const alpha = { re: Math.cos(theta / 2), im: 0 };
        const beta = {
          re: Math.sin(theta / 2) * Math.cos(phi),
          im: Math.sin(theta / 2) * Math.sin(phi),
        };
        const p0Val = Math.cos(theta / 2)**2;
        onSave(qubitIdx, {
          type: 'pure',
          preset: 'custom-pure',
          alpha,
          beta,
          p0: p0Val,
          p1: 1 - p0Val
        });
      }
    } else {
      // Mixed state p0|0><0| + p1|1><1|
      onSave(qubitIdx, {
        type: 'mixed',
        preset: 'custom-mixed',
        alpha: cZero(),
        beta: cZero(),
        p0,
        p1: 1 - p0
      });
    }
  };

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(5, 10, 20, 0.8)',
      backdropFilter: 'blur(8px)',
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
        padding: '24px',
        maxWidth: '450px',
        width: '100%',
        boxShadow: 'var(--shadow-neon-lg)',
        position: 'relative'
      }} onClick={e => e.stopPropagation()}>
        
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
          Начальное состояние кубита Q_{qubitIdx}
        </h3>

        {/* Pure vs Mixed tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-muted)', marginBottom: '16px' }}>
          <button
            onClick={() => { setType('pure'); if(preset==='custom-mixed') setPreset('0'); }}
            style={{
              flex: 1, padding: '10px', background: 'transparent',
              borderBottom: type === 'pure' ? '2px solid var(--accent-cyan)' : 'none',
              color: type === 'pure' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              fontSize: '13px', fontWeight: '600'
            }}
          >
            Чистое состояние (Pure)
          </button>
          <button
            onClick={() => { setType('mixed'); setPreset('custom-mixed'); }}
            style={{
              flex: 1, padding: '10px', background: 'transparent',
              borderBottom: type === 'mixed' ? '2px solid var(--accent-cyan)' : 'none',
              color: type === 'mixed' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              fontSize: '13px', fontWeight: '600'
            }}
          >
            Смешанное состояние (Mixed)
          </button>
        </div>

        {/* Content */}
        {type === 'pure' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Presets */}
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                Пресеты
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['0', '1', '+', '-'].map(p => (
                  <button
                    key={p}
                    onClick={() => setPreset(p as any)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '6px',
                      background: preset === p ? 'rgba(0,242,254,0.1)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${preset === p ? 'var(--accent-cyan)' : 'var(--border-muted)'}`,
                      color: preset === p ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)', fontSize: '12px'
                    }}
                  >
                    |{p === '+' || p === '-' ? p : p}⟩
                  </button>
                ))}
                <button
                  onClick={() => setPreset('custom-pure')}
                  style={{
                    flex: 1.5, padding: '8px', borderRadius: '6px',
                    background: preset === 'custom-pure' ? 'rgba(0,242,254,0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${preset === 'custom-pure' ? 'var(--accent-cyan)' : 'var(--border-muted)'}`,
                    color: preset === 'custom-pure' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    fontSize: '11px'
                  }}
                >
                  Свой вектор
                </button>
              </div>
            </div>

            {/* Custom pure inputs (Bloch Sphere angles) */}
            {preset === 'custom-pure' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>Угол θ (полярный): {((theta * 180) / Math.PI).toFixed(0)}°</span>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{(theta).toFixed(3)} рад.</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.PI}
                    step="0.01"
                    value={theta}
                    onChange={e => setTheta(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>Угол φ (азимутальный): {((phi * 180) / Math.PI).toFixed(0)}°</span>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{(phi).toFixed(3)} рад.</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={2 * Math.PI}
                    step="0.01"
                    value={phi}
                    onChange={e => setPhi(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
                  {"|ψ⟩ = cos(θ/2)|0⟩ + e^{i φ}sin(θ/2)|1⟩"}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Задает диагональную смесь чистых состояний $|0\rangle$ и $|1\rangle$.
              $\rho = p_0 |0\rangle\langle0| + (1-p_0)|1\rangle\langle1|$
            </p>
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                <span>Вероятность p₀ (|0⟩): <b style={{ color: 'var(--accent-cyan)' }}>{(p0 * 100).toFixed(0)}%</b></span>
                <span>Вероятность p₁ (|1⟩): <b style={{ color: 'var(--accent-purple)' }}>{((1 - p0) * 100).toFixed(0)}%</b></span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={p0}
                onChange={e => setP0(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
              />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1, padding: '10px', fontSize: '13px' }}>Отмена</button>
          <button onClick={handleSave} className="btn-primary" style={{ flex: 1, padding: '10px', fontSize: '13px', justifyContent: 'center' }}>Применить</button>
        </div>

      </div>
    </div>,
    document.body
  );
};
