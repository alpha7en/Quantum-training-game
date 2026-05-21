import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { parseExpression } from './quantumMath';

interface GateConfigProps {
  gateType: string;
  initialParam: string;
  onSave: (paramStr: string, paramVal: number) => void;
  onCancel: () => void;
  allowedParams?: string[];
}

export const GateConfigBottomSheet: React.FC<GateConfigProps> = ({
  gateType,
  initialParam,
  onSave,
  onCancel,
  allowedParams,
}) => {
  const [expr, setExpr] = useState(initialParam || '0');
  const [val, setVal] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Re-evaluate whenever the expression text changes
  useEffect(() => {
    try {
      const parsed = parseExpression(expr);
      setVal(parsed);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Ошибка парсинга');
    }
  }, [expr]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sliderVal = parseFloat(e.target.value);
    // Convert slider float back to an expression string
    // If it's a multiple of pi, format nicely, else standard decimal
    const stepPi = Math.PI / 12; // 15 degrees increments
    const multiplier = Math.round(sliderVal / stepPi);
    
    if (Math.abs(sliderVal - multiplier * stepPi) < 1e-4 && multiplier !== 0) {
      // It's a nice fraction of pi!
      const denom = 12;
      const num = multiplier;
      const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
      const common = Math.abs(gcd(num, denom));
      const finalNum = num / common;
      const finalDenom = denom / common;
      
      let exprStr = '';
      if (finalDenom === 1) {
        exprStr = finalNum === 1 ? 'pi' : finalNum === -1 ? '-pi' : `${finalNum}*pi`;
      } else {
        const top = finalNum === 1 ? 'pi' : finalNum === -1 ? '-pi' : `${finalNum}*pi`;
        exprStr = `${top}/${finalDenom}`;
      }
      setExpr(exprStr);
    } else {
      setExpr(sliderVal.toFixed(3));
    }
  };

  const handlePreset = (presetExpr: string) => {
    setExpr(presetExpr);
  };

  const handleSave = () => {
    if (error === null) {
      onSave(expr, val);
    }
  };

  const allPresets = [
    { label: '0', expr: '0' },
    { label: 'π/6', expr: 'pi/6' },
    { label: 'π/4', expr: 'pi/4' },
    { label: 'π/3', expr: 'pi/3' },
    { label: 'π/2', expr: 'pi/2' },
    { label: '2π/3', expr: '2*pi/3' },
    { label: '3π/4', expr: '3*pi/4' },
    { label: 'π', expr: 'pi' },
    { label: '3π/2', expr: '3*pi/2' },
    { label: '2π', expr: '2*pi' },
    { label: '-π/6', expr: '-pi/6' },
    { label: '-π/4', expr: '-pi/4' },
    { label: '-π/3', expr: '-pi/3' },
    { label: '-π/2', expr: '-pi/2' },
    { label: '-2π/3', expr: '-2*pi/3' },
    { label: '-π', expr: '-pi' },
  ];

  // When allowedParams is set, show only those presets (anti-cheat)
  const isLocked = allowedParams && allowedParams.length > 0;
  const presets = isLocked
    ? allPresets.filter(p => allowedParams!.includes(p.expr))
    : allPresets;

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed',
      left: 0, right: 0, bottom: 0, top: 0,
      background: 'rgba(5,10,22,0.6)',
      backdropFilter: 'blur(8px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
    }} onClick={onCancel}>
      <div 
        style={{
          width: '100%',
          maxWidth: '500px',
          background: 'var(--bg-surface)',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          border: '1px solid var(--border-glow)',
          borderBottom: 'none',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
          padding: '28px 24px 36px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          animation: 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes slide-up {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}} />
        
        {/* Handle bar for bottom sheet visual */}
        <div style={{
          width: '40px',
          height: '4px',
          background: 'var(--border-muted)',
          borderRadius: '2px',
          alignSelf: 'center',
          marginBottom: '-8px',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-cyan)' }}>
            Параметры гейта {gateType}
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Вращение (радиан)
          </span>
        </div>

        {isLocked && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 12px', borderRadius: '8px',
            background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.25)',
            fontSize: '11px', color: '#fbbf24',
          }}>
            🔒 Доступны только фиксированные углы (защита от подбора)
          </div>
        )}

        {/* Math expression input — hidden when locked */}
        {!isLocked && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Выражение (формула, например: 2*pi/3)
            </label>
            <input
              type="text"
              value={expr}
              onChange={e => setExpr(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.3)',
                border: `1px solid ${error ? 'var(--accent-pink)' : 'var(--border-muted)'}`,
                borderRadius: '10px',
                padding: '12px 16px',
                fontSize: '15px',
                fontFamily: 'var(--font-mono)',
                color: error ? 'var(--accent-pink)' : 'var(--accent-cyan)',
                outline: 'none',
                transition: 'var(--transition-fast)',
              }}
              placeholder="Введите угол, e.g., pi/2"
              autoFocus
            />
            {error ? (
              <span style={{ fontSize: '11px', color: 'var(--accent-pink)' }}>
                ⚠ {error}
              </span>
            ) : (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                = {val.toFixed(6)} рад. (~ {((val * 180) / Math.PI).toFixed(1)}°)
              </span>
            )}
          </div>
        )}

        {/* Slider — hidden when locked */}
        {!isLocked && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span>-2π (-360°)</span>
              <span>0</span>
              <span>2π (360°)</span>
            </div>
            <input
              type="range"
              min={-2 * Math.PI}
              max={2 * Math.PI}
              step={Math.PI / 12} // 15 deg steps
              value={error ? 0 : val}
              onChange={handleSliderChange}
              style={{
                width: '100%',
                accentColor: 'var(--accent-cyan)',
                background: 'var(--border-muted)',
                height: '6px',
                borderRadius: '3px',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
          </div>
        )}

        {/* Fast presets buttons */}
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Быстрые пресеты
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {presets.map(p => (
              <button
                key={p.label}
                onClick={() => handlePreset(p.expr)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: expr === p.expr ? 'rgba(0,242,254,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${expr === p.expr ? 'var(--accent-cyan)' : 'var(--border-muted)'}`,
                  color: expr === p.expr ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
          <button
            onClick={onCancel}
            className="btn-secondary"
            style={{ flex: 1, padding: '12px', fontSize: '14px', borderRadius: '10px' }}
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={error !== null}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '14px',
              borderRadius: '10px',
              opacity: error ? 0.5 : 1,
              cursor: error ? 'not-allowed' : 'pointer',
              justifyContent: 'center'
            }}
          >
            Сохранить
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
