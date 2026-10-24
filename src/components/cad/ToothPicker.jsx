// ===========================================================================
// Eva Clinic — Seletor Clínico de Dente (FDI) via Clique no Modelo 3D (ToothPicker)
// Calcula o dente estimado pela posição anatômica no arco (ângulo polar)
// e exibe confirmação em 1 clique para sincronizar diretamente com o prontuário.
// ===========================================================================
import React, { useState, useEffect } from 'react';
import { Check, Crosshair, Plus, Sparkles, X, FileText } from 'lucide-react';
import { toothName, PERMANENT, PROCEDURES } from '../../lib/dental';

/**
 * Estima o número FDI do dente a partir da coordenada 3D (x, y) no arco
 * @param {THREE.Vector3} hitPoint 
 * @param {string} archRole - 'inferior' ou 'superior'
 * @returns {number} Número FDI (11..48)
 */
export function estimateFdiTooth(hitPoint, archRole = 'inferior') {
  const x = hitPoint.x;
  const y = hitPoint.y; // Em odontologia digital no plano oclusal

  const isUpper = archRole === 'superior';
  const isRight = x < 0; // Lado direito do paciente (X negativo)

  // Ângulo polar relativo ao plano sagital médio
  const angle = Math.abs(Math.atan2(x, y + 10)); // radianos

  // Mapeamento angular aproximado para os 8 dentes do hemiarco
  let toothIdx = 1; // 1 = Central, ..., 8 = Siso
  if (angle < 0.18) toothIdx = 1; // Incisivo central
  else if (angle < 0.35) toothIdx = 2; // Incisivo lateral
  else if (angle < 0.55) toothIdx = 3; // Canino
  else if (angle < 0.78) toothIdx = 4; // 1º Pré-molar
  else if (angle < 1.05) toothIdx = 5; // 2º Pré-molar
  else if (angle < 1.35) toothIdx = 6; // 1º Molar
  else if (angle < 1.65) toothIdx = 7; // 2º Molar
  else toothIdx = 8; // 3º Molar (siso)

  let quadrant = 1;
  if (isUpper) {
    quadrant = isRight ? 1 : 2;
  } else {
    quadrant = isRight ? 4 : 3;
  }

  return quadrant * 10 + toothIdx;
}

export default function ToothPicker({
  selectedPoint, // { point: THREE.Vector3, normal: THREE.Vector3, screenPos: { x, y }, archRole }
  onConfirm,
  onCancel,
  patients = [],
  selectedPatientId,
}) {
  if (!selectedPoint) return null;

  const estimatedTooth = estimateFdiTooth(selectedPoint.point, selectedPoint.archRole);
  const [tooth, setTooth] = useState(estimatedTooth);
  const [procedureId, setProcedureId] = useState('p_imp_1');
  const [clinicalNotes, setClinicalNotes] = useState(
    `Planejamento de implante no dente #${estimatedTooth} a partir de clique direto na malha e tomografia.`
  );

  useEffect(() => {
    const est = estimateFdiTooth(selectedPoint.point, selectedPoint.archRole);
    setTooth(est);
    setClinicalNotes(`Planejamento de implante no dente #${est} a partir de clique direto na malha e tomografia.`);
  }, [selectedPoint]);

  const archTeeth = selectedPoint.archRole === 'superior'
    ? [...PERMANENT.upper[0].reverse(), ...PERMANENT.upper[1]]
    : [...PERMANENT.lower[0].reverse(), ...PERMANENT.lower[1]];

  const handleConfirm = (placeImplant = true) => {
    onConfirm({
      tooth,
      procedureId,
      clinicalNotes,
      placeImplant,
      hitPoint: selectedPoint.point,
      hitNormal: selectedPoint.normal,
    });
  };

  // Posiciona a janela próxima ao clique, mantendo dentro dos limites da tela
  const top = Math.max(20, Math.min(window.innerHeight - 380, selectedPoint.screenPos.y - 40));
  const left = Math.max(20, Math.min(window.innerWidth - 380, selectedPoint.screenPos.x + 20));

  return (
    <div
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 9999,
        width: 340,
        background: 'var(--surface-solid)',
        border: '1px solid var(--brand)',
        borderRadius: 12,
        boxShadow: '0 16px 36px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backdropFilter: 'blur(8px)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 14px',
          background: 'rgba(13, 148, 136, 0.12)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={16} color="var(--brand)" />
          <strong style={{ fontSize: 13 }}>Dente Sugerido: #{tooth}</strong>
        </div>
        <button
          onClick={onCancel}
          style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 2 }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Conteúdo */}
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)', marginBottom: 2 }}>
            #{tooth} — {toothName(tooth)}
          </div>
          <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
            Clique abaixo para trocar se necessário:
          </span>
        </div>

        {/* Mini Seletor de Dentes em Linha */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: 4,
            background: 'var(--surface-2)',
            padding: 6,
            borderRadius: 6,
          }}
        >
          {archTeeth.map((t) => (
            <button
              key={t}
              onClick={() => setTooth(t)}
              style={{
                padding: '4px 0',
                fontSize: 10.5,
                fontWeight: 700,
                borderRadius: 4,
                cursor: 'pointer',
                border: tooth === t ? '1px solid var(--brand)' : '1px solid transparent',
                background: tooth === t ? 'var(--brand)' : 'rgba(255,255,255,0.05)',
                color: tooth === t ? '#fff' : 'var(--text-2)',
                textAlign: 'center',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Procedimento */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
            PROCEDIMENTO NO PRONTUÁRIO
          </label>
          <select
            value={procedureId}
            onChange={(e) => setProcedureId(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--surface-2)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '6px 8px',
              fontSize: 12,
            }}
          >
            <option value="p_imp_1">Implantodontia — Instalação de Implante</option>
            <option value="p_imp_2">Implantodontia — Enxerto Ósseo + Membrana</option>
            <option value="p_cir_aprf">Cirurgia — Fibrina Leucoplaquetária (APRF)</option>
            <option value="p_cir_apic">Cirurgia — Apicectomia</option>
            <option value="p_prot_coroa">Prótese — Coroa sobre Implante</option>
          </select>
        </div>

        {/* Observações */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
            OBSERVAÇÕES CLÍNICAS
          </label>
          <input
            type="text"
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--surface-2)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '6px 8px',
              fontSize: 12,
            }}
          />
        </div>

        {/* Botões de Ação */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          <button
            onClick={() => handleConfirm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '9px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              background: '#0d9488',
              color: '#ffffff',
              border: 'none',
              boxShadow: '0 2px 8px rgba(13, 148, 136, 0.4)',
            }}
          >
            <Crosshair size={14} /> Posicionar Implante & Marcar no Prontuário
          </button>

          <button
            onClick={() => handleConfirm(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 6,
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              background: 'var(--surface-2)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          >
            <Check size={13} /> Apenas Marcar Dente no Prontuário
          </button>
        </div>
      </div>
    </div>
  );
}
