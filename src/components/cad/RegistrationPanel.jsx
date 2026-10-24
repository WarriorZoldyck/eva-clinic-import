// ===========================================================================
// Eva Clinic — Painel de Alinhamento Rígido por Pontos (STL x Tomografia CBCT)
// Algoritmo de Kabsch (SVD 3x3) com validação de Erro Médio (TRE) e Desfazer
// ===========================================================================
import React, { useState } from 'react';
import * as THREE from 'three';
import { Target, CheckCircle2, RotateCcw, AlertTriangle, ArrowRight, Trash2 } from 'lucide-react';
import { computeKabschAlignment } from '../../lib/registration';

export default function RegistrationPanel({
  stlModel,
  boneModel,
  onApplyTransform,
  onResetTransform,
  isRegistering,
  setIsRegistering,
  activeTarget, // 'stl' | 'tomografia'
  setActiveTarget,
  stlPoints = [],
  bonePoints = [],
  onClearPoints,
  toast = () => {},
}) {
  const [alignmentResult, setAlignmentResult] = useState(null);

  const handleCompute = () => {
    if (stlPoints.length < 3 || bonePoints.length < 3) {
      toast('Marque ao menos 3 pontos no STL e os mesmos 3 pontos na Tomografia para alinhar.', 'warn');
      return;
    }

    try {
      const vecP = stlPoints.map((p) => new THREE.Vector3(...p.pos));
      const vecQ = bonePoints.map((p) => new THREE.Vector3(...p.pos));

      const result = computeKabschAlignment(vecP, vecQ);
      setAlignmentResult(result);

      onApplyTransform(result.transform);
      setIsRegistering(false);

      const errorMsg = result.errorMm < 0.5
        ? `Alinhamento excelente! Erro médio: ${result.errorMm.toFixed(2)} mm`
        : `Alinhamento concluído com erro de ${result.errorMm.toFixed(2)} mm.`;
      toast(errorMsg, result.errorMm < 0.8 ? 'success' : 'warn');
    } catch (err) {
      toast(`Falha no alinhamento: ${err.message}`, 'error');
    }
  };

  const handleReset = () => {
    onResetTransform();
    setAlignmentResult(null);
    onClearPoints();
    toast('Modelo retornado ao eixo zero original do escaneador.', 'info');
  };

  return (
    <div
      style={{
        background: 'var(--surface-solid)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 12,
        fontSize: 12.5,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Target size={15} color="var(--brand)" />
          <strong style={{ fontSize: 13 }}>Alinhamento STL ↔ Tomografia (Kabsch)</strong>
        </div>
        {alignmentResult && (
          <span className="badge b-ok small" style={{ fontSize: 11, fontWeight: 700 }}>
            TRE: {alignmentResult.errorMm.toFixed(2)} mm
          </span>
        )}
      </div>

      <p style={{ margin: '0 0 10px', color: 'var(--text-3)', fontSize: 11.5, lineHeight: 1.4 }}>
        O scanner intraoral e o tomógrafo possuem coordenadas diferentes. Marque 3 cúspides anatômicas correspondentes no STL e no Osso/TC para encaixar perfeitamente.
      </p>

      {/* Botões de Seleção de Alvo de Marcação de Pontos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
        <button
          onClick={() => {
            setIsRegistering(true);
            setActiveTarget('stl');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '7px 8px',
            borderRadius: 6,
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer',
            border: `1px solid ${isRegistering && activeTarget === 'stl' ? 'var(--brand)' : 'var(--border)'}`,
            background: isRegistering && activeTarget === 'stl' ? 'var(--brand-soft)' : 'var(--surface-2)',
            color: isRegistering && activeTarget === 'stl' ? 'var(--brand)' : 'var(--text)',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8' }} />
          1. Pontos no STL ({stlPoints.length})
        </button>

        <button
          onClick={() => {
            setIsRegistering(true);
            setActiveTarget('tomografia');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '7px 8px',
            borderRadius: 6,
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer',
            border: `1px solid ${isRegistering && activeTarget === 'tomografia' ? '#fed7aa' : 'var(--border)'}`,
            background: isRegistering && activeTarget === 'tomografia' ? 'rgba(254, 215, 170, 0.15)' : 'var(--surface-2)',
            color: isRegistering && activeTarget === 'tomografia' ? '#fed7aa' : 'var(--text)',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fed7aa' }} />
          2. Pontos na TC ({bonePoints.length})
        </button>
      </div>

      {/* Lista de Pares Marcados */}
      {(stlPoints.length > 0 || bonePoints.length > 0) && (
        <div style={{ background: 'var(--surface-2)', borderRadius: 6, padding: 8, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)' }}>PARES DE PONTOS CORRESPONDENTES</span>
            <button
              onClick={onClearPoints}
              style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
            >
              <Trash2 size={12} /> Limpar
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Array.from({ length: Math.max(stlPoints.length, bonePoints.length) }).map((_, idx) => {
              const p = stlPoints[idx];
              const q = bonePoints[idx];
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}>
                  <span style={{ color: p ? '#38bdf8' : 'var(--text-3)', fontWeight: 600 }}>
                    P{idx + 1}: {p ? `(${p.pos[0].toFixed(1)}, ${p.pos[1].toFixed(1)}, ${p.pos[2].toFixed(1)})` : 'Pendente...'}
                  </span>
                  <ArrowRight size={12} style={{ color: 'var(--text-3)', margin: '0 4px' }} />
                  <span style={{ color: q ? '#fed7aa' : 'var(--text-3)', fontWeight: 600 }}>
                    Q{idx + 1}: {q ? `(${q.pos[0].toFixed(1)}, ${q.pos[1].toFixed(1)}, ${q.pos[2].toFixed(1)})` : 'Pendente...'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ações */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={handleCompute}
          disabled={stlPoints.length < 3 || bonePoints.length < 3}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            cursor: stlPoints.length >= 3 && bonePoints.length >= 3 ? 'pointer' : 'not-allowed',
            background: stlPoints.length >= 3 && bonePoints.length >= 3 ? '#0d9488' : 'var(--surface-3)',
            color: '#ffffff',
            border: 'none',
            opacity: stlPoints.length >= 3 && bonePoints.length >= 3 ? 1 : 0.5,
          }}
        >
          <CheckCircle2 size={14} /> Calcular Alinhamento (Kabsch)
        </button>

        <button
          onClick={handleReset}
          title="Restaura a orientação original do escaneamento STL"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '8px 10px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            border: '1px solid var(--border)',
            background: 'var(--surface-2)',
            color: 'var(--text)',
          }}
        >
          <RotateCcw size={13} /> Eixo Zero
        </button>
      </div>
    </div>
  );
}
