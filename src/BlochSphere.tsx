import React from 'react';
import { BlochVector } from './quantumMath';

interface BlochSphereProps {
  vector: BlochVector;
  title: string;
}

export const BlochSphere: React.FC<BlochSphereProps> = ({ vector, title }) => {
  const r = 70; // Radius in pixels
  const cx = 100;
  const cy = 100;

  // Classic 3D isometric angles: X points down-left, Y points down-right, Z points up
  const az = -2 * Math.PI / 3; // -120 degrees
  const el = Math.PI / 9;      // 20 degrees elevation

  // Orthographic 3D projection mapping
  const project = (vx: number, vy: number, vz: number) => {
    // 1. Rotate around Z (azimuth)
    const xr = vx * Math.cos(az) - vy * Math.sin(az);
    const yr = vx * Math.sin(az) + vy * Math.cos(az);
    const zr = vz;

    // 2. Rotate around X (elevation)
    const x3d = xr;
    const y3d = yr * Math.cos(el) - zr * Math.sin(el);
    const z3d = yr * Math.sin(el) + zr * Math.cos(el);

    return {
      x: cx + x3d * r,
      y: cy - z3d * r, // subtract because SVG y increases downwards
      z: y3d // Depth indicator
    };
  };

  const center = { x: cx, y: cy };
  const statePos = project(vector.x, vector.y, vector.z);
  
  // Project key points on the sphere for labels (slightly outside r)
  const zPlus = project(0, 0, 1.25);
  const zMinus = project(0, 0, -1.25);
  const xPlus = project(1.25, 0, 0);
  const xMinus = project(-1.25, 0, 0);
  const yPlus = project(0, 1.25, 0);
  const yMinus = project(0, -1.25, 0);

  // Project axes lines
  const axisZ = { p1: project(0, 0, 1), p2: project(0, 0, -1) };
  const axisX = { p1: project(1, 0, 0), p2: project(-1, 0, 0) };
  const axisY = { p1: project(0, 1, 0), p2: project(0, -1, 0) };

  // Calculate length of the Bloch vector (degree of pureness)
  const len = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);

  return (
    <div style={{ textAlign: 'center', padding: '16px' }} className="glass-panel">
      <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--accent-cyan)' }}>
        {title}
      </h4>
      <div className="bloch-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <svg width="200" height="200" style={{ overflow: 'visible' }}>
          <defs>
            <radialGradient id="sphereGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsla(186, 100%, 50%, 0.02)" />
              <stop offset="80%" stopColor="hsla(222, 40%, 14%, 0.15)" />
              <stop offset="100%" stopColor="hsla(186, 100%, 50%, 0.1)" />
            </radialGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer Sphere Boundary */}
          <circle 
            cx={cx} 
            cy={cy} 
            r={r} 
            fill="url(#sphereGrad)" 
            stroke="var(--border-muted)" 
            strokeWidth="1.2" 
          />

          {/* Equatorial Ellipse (dashed backdrop) */}
          <ellipse 
            cx={cx} 
            cy={cy} 
            rx={r} 
            ry={r * Math.sin(el)} 
            fill="none" 
            stroke="var(--border-muted)" 
            strokeDasharray="3 3" 
            strokeWidth="1" 
          />

          {/* Axis X (diagonal, down-left) */}
          <line 
            x1={axisX.p1.x} y1={axisX.p1.y} 
            x2={axisX.p2.x} y2={axisX.p2.y} 
            stroke="hsla(330, 100%, 65%, 0.4)" 
            strokeWidth="1" 
            strokeDasharray="2 2"
          />
          
          {/* Axis Y (diagonal, down-right) */}
          <line 
            x1={axisY.p1.x} y1={axisY.p1.y} 
            x2={axisY.p2.x} y2={axisY.p2.y} 
            stroke="hsla(210, 100%, 55%, 0.4)" 
            strokeWidth="1" 
            strokeDasharray="2 2"
          />
          
          {/* Axis Z (vertical) */}
          <line 
            x1={axisZ.p1.x} y1={axisZ.p1.y} 
            x2={axisZ.p2.x} y2={axisZ.p2.y} 
            stroke="hsla(186, 100%, 50%, 0.5)" 
            strokeWidth="1.2" 
          />

          {/* Axis Labels (Standard Quantum States) */}
          <text x={zPlus.x} y={zPlus.y} fill="var(--accent-cyan)" fontSize="11" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">|0⟩</text>
          <text x={zMinus.x} y={zMinus.y} fill="var(--text-secondary)" fontSize="11" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">|1⟩</text>
          <text x={xPlus.x} y={xPlus.y} fill="var(--accent-pink)" fontSize="10" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">|+⟩</text>
          <text x={xMinus.x} y={xMinus.y} fill="var(--text-muted)" fontSize="10" textAnchor="middle" alignmentBaseline="middle">|-⟩</text>
          <text x={yPlus.x} y={yPlus.y} fill="var(--accent-blue)" fontSize="10" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">|+i⟩</text>
          <text x={yMinus.x} y={yMinus.y} fill="var(--text-muted)" fontSize="10" textAnchor="middle" alignmentBaseline="middle">|-i⟩</text>

          {/* State Vector Line */}
          <line 
            x1={center.x} 
            y1={center.y} 
            x2={statePos.x} 
            y2={statePos.y} 
            stroke="var(--accent-cyan)" 
            strokeWidth="2.5" 
            filter="url(#glow)"
            strokeLinecap="round"
          />

          {/* State Vector Dot */}
          <circle 
            cx={statePos.x} 
            cy={statePos.y} 
            r="4" 
            fill="var(--text-primary)" 
            stroke="var(--accent-cyan)" 
            strokeWidth="1.5" 
            filter="url(#glow)"
          />
        </svg>
      </div>

      <div style={{ marginTop: '12px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
        <div style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
          x: {vector.x.toFixed(3)} | y: {vector.y.toFixed(3)} | z: {vector.z.toFixed(3)}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '4px' }}>
          Длина: {len.toFixed(3)} ({len > 0.99 ? 'Чистое' : 'Смешанное'})
        </div>
      </div>
    </div>
  );
};
