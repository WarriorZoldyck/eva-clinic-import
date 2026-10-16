import React, { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import {
  PERMANENT,
  DECIDUOUS,
  CONDITIONS,
  toothName,
  toothSimpleName,
  isUpper,
  toothType,
  isDeciduous,
  PROCEDURES,
} from '../lib/dental';
import { uid, todayISO, fmtDate } from '../lib/utils';
import {
  Check,
  RotateCcw,
  History,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  Sparkles,
  ExternalLink,
  Info,
  Clock,
  Layers,
  ChevronRight,
  ShieldAlert,
  Box,
} from 'lucide-react';

// ============================================================================
// COMPONENTE VETORIAL ANATÔMICO DO DENTE EM VISTA OCLUSAL (SUPERFÍCIE REAL)
// ============================================================================
function AnatomicalToothSVG({
  num,
  entries = [],
  isSelected,
  activeCondition,
  selectedFaces = [],
  onSelectTooth,
  onFaceClick,
  viewMode = 'padrao', // 'padrao' | 'superficies' | 'raizes'
}) {
  const upper = isUpper(num);
  const q = Math.floor(num / 10);
  const type = toothType(num);
  const isRightSide = [1, 4, 5, 8].includes(q);

  // Mapeamento anatômico de faces no plano oclusal:
  // V = Vestibular (topo para maxila, base para mandíbula)
  // L = Lingual / Palatina (base para maxila, topo para mandíbula)
  // M = Mesial (voltada para a linha média central)
  // D = Distal (afastada da linha média central)
  const faceTop = upper ? 'V' : 'L';
  const faceBottom = upper ? 'L' : 'V';
  const faceLeft = isRightSide ? 'D' : 'M';
  const faceRight = isRightSide ? 'M' : 'D';

  const isMissing = entries.some((e) => e.condition === 'ausente');
  const isExtracted = entries.some((e) => e.condition === 'extracao');
  const hasCanal = entries.some((e) => e.condition === 'canal' || e.condition === 'tratamento');
  const hasCrown = entries.some((e) => e.condition === 'coroa');
  const hasImplant = entries.some((e) => e.condition === 'implante');

  // Cores por face
  const getFaceColor = (faceId) => {
    if (isSelected && selectedFaces.includes(faceId)) {
      return CONDITIONS[activeCondition]?.color || '#0d9488';
    }
    const match = entries.slice().reverse().find((e) => e.faces && e.faces.includes(faceId));
    if (match) {
      return CONDITIONS[match.condition]?.color || '#0284c7';
    }
    return null;
  };

  const colorO = getFaceColor('O');
  const colorTop = getFaceColor(faceTop);
  const colorBottom = getFaceColor(faceBottom);
  const colorLeft = getFaceColor(faceLeft);
  const colorRight = getFaceColor(faceRight);

  // Dimensões anatômicas proporcionais
  let width = 48;
  let height = 52;
  if (type === 'incisor') {
    width = num % 10 === 1 ? 42 : 36;
    height = 46;
  } else if (type === 'canine') {
    width = 38;
    height = 48;
  } else if (type === 'premolar') {
    width = 44;
    height = 50;
  } else if (type === 'molar') {
    width = num % 10 === 6 ? 52 : 48;
    height = 54;
  }

  // Curvatura anatômica da arcada dentária (Curva de Spee)
  const lastDigit = num % 10;
  const curveOffsets = { 8: 9, 7: 7, 6: 5, 5: 3, 4: 1, 3: 0, 2: 2, 1: 3 };
  const archOffset = (curveOffsets[lastDigit] || 0) * (upper ? -1 : 1);

  const strokeColor = isSelected ? '#0d9488' : '#cbd5e1';
  const strokeWidth = isSelected ? 2.5 : 1.2;

  // Renderização anatômica por elemento
  const renderToothAnatomy = () => {
    if (type === 'molar') {
      return (
        <g>
          {/* Coroa Molar com 4 cúspides bem definidas e contorno anatômico */}
          <path
            d="M 14,8 
               C 22,4 34,4 42,8 
               C 51,12 53,22 52,28 
               C 53,34 51,44 42,48 
               C 34,51 22,51 14,48 
               C 5,44 3,34 4,28 
               C 3,22 5,12 14,8 Z"
            fill="url(#enamelGrad)"
            stroke={hasCrown ? '#d97706' : strokeColor}
            strokeWidth={hasCrown ? 3 : strokeWidth}
            filter="url(#subtleShadow)"
          />

          {/* Brilhos Anatômicos de Cúspides 3D */}
          <circle cx="19" cy="17" r="6" fill="url(#cuspShine)" pointerEvents="none" />
          <circle cx="37" cy="17" r="6" fill="url(#cuspShine)" pointerEvents="none" />
          <circle cx="19" cy="39" r="6" fill="url(#cuspShine)" pointerEvents="none" />
          <circle cx="37" cy="39" r="6" fill="url(#cuspShine)" pointerEvents="none" />

          {/* Cúspide Vestibular (Top) */}
          <path
            d="M 14,8 C 22,4 34,4 42,8 C 38,18 34,22 28,22 C 22,22 18,18 14,8 Z"
            fill={colorTop || 'transparent'}
            className="face-hover"
            onClick={(e) => {
              e.stopPropagation();
              onFaceClick(num, faceTop);
            }}
          />

          {/* Cúspide Lingual / Palatina (Bottom) */}
          <path
            d="M 28,34 C 34,34 38,38 42,48 C 34,51 22,51 14,48 C 18,38 22,34 28,34 Z"
            fill={colorBottom || 'transparent'}
            className="face-hover"
            onClick={(e) => {
              e.stopPropagation();
              onFaceClick(num, faceBottom);
            }}
          />

          {/* Face Mesial (Left/Right) */}
          <path
            d="M 14,8 C 18,18 20,24 20,28 C 20,32 18,38 14,48 C 5,44 3,34 4,28 C 3,22 5,12 14,8 Z"
            fill={colorLeft || 'transparent'}
            className="face-hover"
            onClick={(e) => {
              e.stopPropagation();
              onFaceClick(num, faceLeft);
            }}
          />

          {/* Face Distal (Right/Left) */}
          <path
            d="M 42,8 C 51,12 53,22 52,28 C 53,34 51,44 42,48 C 38,38 36,32 36,28 C 36,24 38,18 42,8 Z"
            fill={colorRight || 'transparent'}
            className="face-hover"
            onClick={(e) => {
              e.stopPropagation();
              onFaceClick(num, faceRight);
            }}
          />

          {/* Fissura e Fóssula Oclusal Central */}
          {colorO ? (
            /* Trevo Anatômico Preenchido (Exatamente como o dente 16 da Imagem 2!) */
            <path
              d="M 28,18 
                 C 29,14 33,14 34,18 
                 C 37,20 42,22 42,28 
                 C 42,34 37,36 34,38 
                 C 33,42 29,42 28,38 
                 C 25,36 20,34 20,28 
                 C 20,22 25,20 28,18 Z"
              fill={colorO}
              filter="drop-shadow(0 1px 2px rgba(0,0,0,0.18))"
              className="face-hover"
              onClick={(e) => {
                e.stopPropagation();
                onFaceClick(num, 'O');
              }}
            />
          ) : (
            <g
              className="face-hover"
              onClick={(e) => {
                e.stopPropagation();
                onFaceClick(num, 'O');
              }}
            >
              <circle cx="28" cy="28" r="9" fill={viewMode === 'superficies' ? 'rgba(13,148,136,0.12)' : 'transparent'} />
              {/* Sulco em Cruz Molar */}
              <path
                d="M 28,14 L 28,42 M 16,28 L 40,28 M 28,28 L 35,21 M 28,28 L 21,35"
                stroke="#cbd5e1"
                strokeWidth="1.2"
                strokeLinecap="round"
                fill="none"
                pointerEvents="none"
              />
              {/* Pontos de Cúspide */}
              <circle cx="20" cy="18" r="1.5" fill="#e2e8f0" pointerEvents="none" />
              <circle cx="36" cy="18" r="1.5" fill="#e2e8f0" pointerEvents="none" />
              <circle cx="20" cy="38" r="1.5" fill="#e2e8f0" pointerEvents="none" />
              <circle cx="36" cy="38" r="1.5" fill="#e2e8f0" pointerEvents="none" />
            </g>
          )}
        </g>
      );
    } else if (type === 'premolar') {
      return (
        <g>
          {/* Coroa Pré-Molar Bicúspide Oval */}
          <path
            d="M 12,8 C 22,5 34,5 44,8 C 51,16 51,40 44,48 C 34,51 22,51 12,48 C 5,40 5,16 12,8 Z"
            fill="url(#enamelGrad)"
            stroke={hasCrown ? '#d97706' : strokeColor}
            strokeWidth={hasCrown ? 3 : strokeWidth}
            filter="url(#subtleShadow)"
          />

          {/* Brilhos Anatômicos Bicúspides */}
          <circle cx="28" cy="17" r="7" fill="url(#cuspShine)" pointerEvents="none" />
          <circle cx="28" cy="39" r="7" fill="url(#cuspShine)" pointerEvents="none" />

          {/* Cúspide Vestibular (Top) */}
          <path
            d="M 12,8 C 22,5 34,5 44,8 C 38,18 18,18 12,8 Z"
            fill={colorTop || 'transparent'}
            className="face-hover"
            onClick={(e) => {
              e.stopPropagation();
              onFaceClick(num, faceTop);
            }}
          />

          {/* Cúspide Lingual / Palatina (Bottom) */}
          <path
            d="M 12,48 C 18,38 38,38 44,48 C 34,51 22,51 12,48 Z"
            fill={colorBottom || 'transparent'}
            className="face-hover"
            onClick={(e) => {
              e.stopPropagation();
              onFaceClick(num, faceBottom);
            }}
          />

          {/* Face Mesial */}
          <path
            d="M 12,8 C 18,18 18,38 12,48 C 5,40 5,16 12,8 Z"
            fill={colorLeft || 'transparent'}
            className="face-hover"
            onClick={(e) => {
              e.stopPropagation();
              onFaceClick(num, faceLeft);
            }}
          />

          {/* Face Distal */}
          <path
            d="M 44,8 C 51,16 51,40 44,48 C 38,38 38,18 44,8 Z"
            fill={colorRight || 'transparent'}
            className="face-hover"
            onClick={(e) => {
              e.stopPropagation();
              onFaceClick(num, faceRight);
            }}
          />

          {/* Face Oclusal Central (Sulco mésio-distal) */}
          {colorO ? (
            <path
              d="M 18,28 C 18,23 38,23 38,28 C 38,33 18,33 18,28 Z"
              fill={colorO}
              filter="drop-shadow(0 1px 2px rgba(0,0,0,0.18))"
              className="face-hover"
              onClick={(e) => {
                e.stopPropagation();
                onFaceClick(num, 'O');
              }}
            />
          ) : (
            <g
              className="face-hover"
              onClick={(e) => {
                e.stopPropagation();
                onFaceClick(num, 'O');
              }}
            >
              <rect x="16" y="22" width="24" height="12" rx="6" fill={viewMode === 'superficies' ? 'rgba(13,148,136,0.12)' : 'transparent'} />
              <line x1="18" y1="28" x2="38" y2="28" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" pointerEvents="none" />
              <circle cx="28" cy="18" r="1.5" fill="#e2e8f0" pointerEvents="none" />
              <circle cx="28" cy="38" r="1.5" fill="#e2e8f0" pointerEvents="none" />
            </g>
          )}
        </g>
      );
    } else if (type === 'canine') {
      return (
        <g>
          {/* Canino: silhueta amendoada/diamante com cúspide pontiaguda */}
          <path
            d="M 28,6 C 36,12 44,22 40,38 C 36,48 20,48 16,38 C 12,22 20,12 28,6 Z"
            fill="url(#enamelGrad)"
            stroke={hasCrown ? '#d97706' : strokeColor}
            strokeWidth={hasCrown ? 3 : strokeWidth}
            filter="url(#subtleShadow)"
          />

          {/* Vertentes e Face Vestibular */}
          <path
            d="M 28,6 C 34,12 38,20 28,24 C 20,20 22,12 28,6 Z"
            fill={colorTop || 'transparent'}
            className="face-hover"
            onClick={(e) => {
              e.stopPropagation();
              onFaceClick(num, faceTop);
            }}
          />

          {/* Palatina / Cíngulo */}
          <path
            d="M 28,24 C 36,28 38,38 28,46 C 18,38 20,28 28,24 Z"
            fill={colorBottom || 'transparent'}
            className="face-hover"
            onClick={(e) => {
              e.stopPropagation();
              onFaceClick(num, faceBottom);
            }}
          />

          {/* Cúspide Incisal Central */}
          <circle
            cx="28"
            cy="26"
            r="7"
            fill={colorO || (viewMode === 'superficies' ? 'rgba(13,148,136,0.12)' : 'transparent')}
            stroke={colorO ? colorO : '#94a3b8'}
            strokeWidth={colorO ? 0 : 0.8}
            className="face-hover"
            onClick={(e) => {
              e.stopPropagation();
              onFaceClick(num, 'O');
            }}
          />

          {/* Aresta longitudinal de cúspide */}
          <line x1="28" y1="10" x2="28" y2="42" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" pointerEvents="none" />
        </g>
      );
    } else {
      // Incisivo: Lâmina incisal transversal e cíngulo anatômico
      return (
        <g>
          <path
            d="M 10,12 C 22,9 34,9 46,12 C 49,24 47,38 42,44 C 32,48 24,48 14,44 C 9,38 7,24 10,12 Z"
            fill="url(#enamelGrad)"
            stroke={hasCrown ? '#d97706' : strokeColor}
            strokeWidth={hasCrown ? 3 : strokeWidth}
            filter="url(#subtleShadow)"
          />

          {/* Borda Incisal */}
          <path
            d="M 12,12 C 24,10 32,10 44,12 C 42,18 14,18 12,12 Z"
            fill={colorO || 'transparent'}
            className="face-hover"
            onClick={(e) => {
              e.stopPropagation();
              onFaceClick(num, 'O');
            }}
          />

          {/* Face Vestibular */}
          <path
            d="M 14,18 C 24,16 32,16 42,18 C 38,30 18,30 14,18 Z"
            fill={colorTop || 'transparent'}
            className="face-hover"
            onClick={(e) => {
              e.stopPropagation();
              onFaceClick(num, faceTop);
            }}
          />

          {/* Face Palatina / Cíngulo */}
          <path
            d="M 16,30 C 24,28 32,28 38,30 C 36,42 20,42 16,30 Z"
            fill={colorBottom || 'transparent'}
            className="face-hover"
            onClick={(e) => {
              e.stopPropagation();
              onFaceClick(num, faceBottom);
            }}
          />

          {/* Linha Incisal Anatômica */}
          <line x1="14" y1="14" x2="42" y2="14" stroke={colorO ? '#ffffff' : '#cbd5e1'} strokeWidth="1.2" pointerEvents="none" />
        </g>
      );
    }
  };

  return (
    <div
      className={`tooth-cell-pro ${isSelected ? 'selected' : ''}`}
      style={{ transform: `translateY(${archOffset}px)` }}
      onClick={() => onSelectTooth(num)}
      title={`${num} • ${toothName(num)}`}
      id={`tooth-${num}`}
    >
      {/* Numeração FDI no topo (para maxila) */}
      {upper && <span className="tooth-fdi-number">{num}</span>}

      <div style={{ position: 'relative', width, height }}>
        <svg viewBox="0 0 56 56" width={width} height={height} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="enamelGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#fbfcfd" />
              <stop offset="100%" stopColor="#f1f5f9" />
            </linearGradient>
            <radialGradient id="cuspShine" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            <filter id="subtleShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" floodColor="#0f172a" floodOpacity="0.08" />
            </filter>
          </defs>

          {/* Anatomia renderizada */}
          {renderToothAnatomy()}

          {/* Dente Ausente / Extraído (X estilizado tracejado idêntico ao dente 35 da Imagem 2) */}
          {(isMissing || isExtracted) && (
            <g pointerEvents="none">
              <rect
                x="6"
                y="6"
                width="44"
                height="44"
                rx="12"
                fill="rgba(147, 51, 234, 0.08)"
                stroke="#9333ea"
                strokeWidth="1.5"
                strokeDasharray="3 2"
              />
              <line x1="14" y1="14" x2="42" y2="42" stroke="#9333ea" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="42" y1="14" x2="14" y2="42" stroke="#9333ea" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          )}

          {/* Implante de Titânio */}
          {hasImplant && (
            <g pointerEvents="none" stroke="#64748b" strokeWidth="2" fill="none">
              <circle cx="28" cy="28" r="12" stroke="#475569" strokeWidth="2" fill="#f8fafc" />
              <circle cx="28" cy="28" r="5" fill="#475569" />
              <line x1="28" y1="16" x2="28" y2="40" stroke="#475569" strokeWidth="1.5" />
            </g>
          )}

          {/* Tratamento de Canal Endodôntico */}
          {hasCanal && (
            <g pointerEvents="none">
              <circle cx="28" cy="28" r="4.5" fill="#ea580c" />
              <circle cx="28" cy="28" r="8" stroke="#ea580c" strokeWidth="1.5" fill="none" strokeDasharray="2 2" />
            </g>
          )}

          {/* Indicador de Projeção de Raízes no modo Raízes */}
          {viewMode === 'raizes' && (
            <g pointerEvents="none" opacity="0.6">
              <ellipse cx="28" cy="28" rx="20" ry="24" stroke="#0d9488" strokeWidth="1" strokeDasharray="2 2" fill="none" />
            </g>
          )}
        </svg>

        {/* Halo de Seleção suave */}
        {isSelected && (
          <div
            style={{
              position: 'absolute',
              inset: -3,
              borderRadius: 14,
              border: '2px solid #0d9488',
              boxShadow: '0 0 0 3px rgba(13, 148, 136, 0.18)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Numeração FDI na base (para mandíbula) */}
      {!upper && <span className="tooth-fdi-number">{num}</span>}
    </div>
  );
}

// ============================================================================
// COMPONENTE DE ILUSTRAÇÃO DETALHADA DO DENTE (PAINEL LATERAL DIREITO)
// ============================================================================
function AnatomicalToothProfileView({ toothNum, condition, selectedFaces = [] }) {
  const isUp = isUpper(toothNum);
  const type = toothType(toothNum);
  const condColor = CONDITIONS[condition]?.color || '#e11d48';

  return (
    <div
      style={{
        width: 140,
        height: 140,
        margin: '0 auto',
        display: 'grid',
        placeItems: 'center',
        background: '#ffffff',
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        position: 'relative',
        boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.02)',
      }}
    >
      <svg viewBox="0 0 120 125" width="120" height="125">
        <defs>
          {/* Gradiente de Esmalte Clínico Suave */}
          <linearGradient id="profileEnamel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#f8fafc" />
            <stop offset="85%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          {/* Gradiente de Raiz Dentária */}
          <linearGradient id="profileRoot" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fdfbf7" />
            <stop offset="50%" stopColor="#f1ede2" />
            <stop offset="100%" stopColor="#ded7c5" />
          </linearGradient>

          <filter id="toothGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#0f172a" floodOpacity="0.06" />
          </filter>
        </defs>

        {/* 1. Raízes Dentárias Anatômicas (Mesial e Distal com bifurcação realista) */}
        <g filter="url(#toothGlow)">
          {/* Raiz Mesial (Esquerda) */}
          <path
            d="M 32,54 C 28,68 24,84 28,104 C 32,106 38,98 42,74 C 44,66 48,58 54,54 Z"
            fill="url(#profileRoot)"
            stroke="#cbd5e1"
            strokeWidth="1.2"
          />

          {/* Raiz Distal (Direita) */}
          <path
            d="M 66,54 C 72,58 76,66 78,74 C 82,98 88,106 92,104 C 96,84 92,68 88,54 Z"
            fill="url(#profileRoot)"
            stroke="#cbd5e1"
            strokeWidth="1.2"
          />

          {/* Forame Apical e Sulco de Radicular */}
          <path d="M 33,62 C 30,76 30,90 32,98" stroke="#cbd5e1" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M 87,62 C 90,76 90,90 88,98" stroke="#cbd5e1" strokeWidth="1" fill="none" strokeLinecap="round" />
        </g>

        {/* 2. Coroa Dentária com Cúspides Anatômicas e Colo Cervical */}
        <g filter="url(#toothGlow)">
          {/* Contorno Anatômico da Coroa (Molar Clássico) */}
          <path
            d="M 26,52 
               C 22,42 22,26 32,18 
               C 38,13 46,15 52,18 
               C 56,20 64,20 68,18 
               C 74,15 82,13 88,18 
               C 98,26 98,42 94,52 
               C 86,56 74,56 60,55 
               C 46,56 34,56 26,52 Z"
            fill="url(#profileEnamel)"
            stroke="#94a3b8"
            strokeWidth="1.4"
          />

          {/* Linha Amelo-Cementária (Colo Anatômico) */}
          <path
            d="M 26,52 C 40,56 60,55 74,56 C 84,56 94,52 94,52"
            stroke="#94a3b8"
            strokeWidth="1.2"
            fill="none"
          />

          {/* Sulco de Desenvolvimento da Face Vestibular */}
          <path
            d="M 60,19 C 60,26 60,36 60,46"
            stroke="#cbd5e1"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Brilho Esmalte Cúspide Vestíbulo-Mesial */}
          <ellipse cx="40" cy="24" rx="6" ry="3" fill="#ffffff" opacity="0.75" />
          {/* Brilho Esmalte Cúspide Vestíbulo-Distal */}
          <ellipse cx="80" cy="24" rx="6" ry="3" fill="#ffffff" opacity="0.75" />
        </g>

        {/* 3. Destaque Visual das Faces Afetadas / Selecionadas */}
        {/* Face Oclusal (Lesão ou Restauração Idêntica à Referência) */}
        {selectedFaces.includes('O') && (
          <g>
            <path
              d="M 44,17 C 48,14 72,14 76,17 C 78,21 72,25 60,24 C 48,25 42,21 44,17 Z"
              fill={condColor}
              stroke="#ffffff"
              strokeWidth="1.2"
              filter="drop-shadow(0 1px 2px rgba(0,0,0,0.15))"
            />
            {/* Brilho no ponto de resina/cárie */}
            <circle cx="56" cy="18" r="1.5" fill="#ffffff" opacity="0.8" />
          </g>
        )}

        {/* Face Vestibular */}
        {selectedFaces.includes('V') && (
          <path
            d="M 42,32 Q 60,38 78,32"
            stroke={condColor}
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Face Mesial */}
        {selectedFaces.includes('M') && (
          <path
            d="M 28,26 Q 26,38 30,48"
            stroke={condColor}
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Face Distal */}
        {selectedFaces.includes('D') && (
          <path
            d="M 92,26 Q 94,38 90,48"
            stroke={condColor}
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Face Palatina / Lingual */}
        {selectedFaces.includes('L') && (
          <path
            d="M 46,46 Q 60,50 74,46"
            stroke={condColor}
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        )}
      </svg>
    </div>
  );
}

// ============================================================================
// ODONTOGRAMA COMPLETO PROFISSIONAL COM ARCADAS FDI E PAINEL CLÍNICO
// ============================================================================
export default function Odontogram({ patientId, onOpen3D }) {
  const { state, dispatch, toast } = useApp();

  const [dentition, setDentition] = useState('permanent'); // 'permanent' | 'deciduous'
  const [activeCondition, setActiveCondition] = useState('carie'); // 'higido' | 'carie' | 'restauracao' | 'tratamento' | 'ausente' | 'extracao' | 'outros'
  const [selectedTooth, setSelectedTooth] = useState(16);
  const [selectedFaces, setSelectedFaces] = useState(['O']);
  const [viewMode, setViewMode] = useState('padrao'); // 'padrao' | 'superficies' | 'raizes'
  const [selectedProcedure, setSelectedProcedure] = useState('p_res1');

  const patient = state.patients.find((p) => p.id === patientId) || state.patients[0];
  const patientOdonto = state.odontogram[patient?.id] || {};
  const toothEntries = patientOdonto[selectedTooth] || [];

  // Seleção de Dente
  const handleSelectTooth = (num) => {
    setSelectedTooth(num);
    const entries = patientOdonto[num] || [];
    if (entries.length > 0) {
      const lastEntry = entries[entries.length - 1];
      setActiveCondition(lastEntry.condition);
      setSelectedFaces(lastEntry.faces && lastEntry.faces.length ? lastEntry.faces : ['O']);
    } else {
      setSelectedFaces(['O']);
    }
  };

  // Toggle de Face
  const handleFaceToggle = (face) => {
    setSelectedFaces((prev) =>
      prev.includes(face) ? prev.filter((f) => f !== face) : [...prev, face]
    );
  };

  // Clique em face dentária (interação imediata)
  const handleFaceClick = (num, face) => {
    setSelectedTooth(num);
    let nextFaces = selectedFaces.includes(face)
      ? selectedFaces.filter((f) => f !== face)
      : [...selectedFaces, face];
    setSelectedFaces(nextFaces);

    if (activeCondition && activeCondition !== 'higido') {
      handleApplyCondition(activeCondition, num, nextFaces);
    }
  };

  // Aplica condição selecionada
  const handleApplyCondition = (condKey, toothToUse = selectedTooth, facesToUse = selectedFaces) => {
    const condToUse = condKey || activeCondition;
    if (condToUse === 'higido') {
      const entries = patientOdonto[toothToUse] || [];
      entries.forEach((e) => {
        dispatch({
          type: 'ODONTO_REMOVE',
          patientId: patient.id,
          tooth: toothToUse,
          entryId: e.id,
        });
      });
      setSelectedFaces([]);
      toast(`Dente ${toothToUse} marcado como Hígido.`);
      return;
    }

    const condMeta = CONDITIONS[condToUse] || { label: condToUse, level: 'face' };
    const targetFaces = condMeta.level === 'face' ? (facesToUse.length ? facesToUse : ['O']) : [];

    const newEntry = {
      id: uid('od'),
      condition: condToUse,
      faces: targetFaces,
      status: condToUse === 'carie' ? 'existente' : 'realizado',
      date: todayISO(),
      notes: `Registrado no dente ${toothToUse}`,
    };

    dispatch({
      type: 'ODONTO_ADD',
      patientId: patient.id,
      tooth: toothToUse,
      entry: newEntry,
    });

    toast(`Condição ${condMeta.label} registrada no dente ${toothToUse}!`);
  };

  // Limpar todas as seleções ativas
  const handleClearSelections = () => {
    setSelectedFaces([]);
    toast('Seleções de faces limpas.');
  };

  // Adicionar ao plano de tratamento
  const handleAddToPlan = () => {
    if (!selectedTooth || !selectedProcedure) return;
    const proc = PROCEDURES.find((p) => p.id === selectedProcedure);
    dispatch({
      type: 'ADD_TO_PLAN',
      patientId: patient.id,
      procedureId: selectedProcedure,
      tooth: selectedTooth,
      faces: selectedFaces,
      professionalId: 'pr1',
    });
    toast(`Procedimento "${proc.name}" vinculado ao Plano de Tratamento!`);
  };

  const archSet = dentition === 'permanent' ? PERMANENT : DECIDUOUS;
  const toothInfo = toothSimpleName(selectedTooth);

  return (
    <div className="odontogram-container">
      {/* 1. BARRA DE FERRAMENTAS SUPERIOR (TOOLBAR - 2 TIERS FIEL À IMAGEM 2) */}
      <div className="odonto-toolbar-card">
        {/* Linha 1: Título e Ações */}
        <div className="odonto-toolbar-top-row">
          <span className="odonto-title">Odontograma</span>

          <div className="odonto-toolbar-actions">
            <button className="btn-toolbar-subtle" onClick={handleClearSelections} title="Limpar seleções ativas">
              <RotateCcw size={14} /> Limpar seleções
            </button>

            <button className="btn-toolbar-subtle" onClick={() => toast('Exibindo histórico de apontamentos clínicos.')}>
              <History size={14} /> Histórico
            </button>

            {onOpen3D && (
              <button
                type="button"
                className="btn-toolbar-subtle"
                onClick={onOpen3D}
                id="btn-open-3d-itero"
                title="Abrir escaneamento 3D estilo iTero"
                style={{ color: '#0d9488', fontWeight: 700 }}
              >
                <Box size={14} /> Modelo 3D (iTero)
              </button>
            )}

            {/* Alternância Permanente / Decídua */}
            <div className="seg-dentition">
              <button
                className={dentition === 'permanent' ? 'active' : ''}
                onClick={() => setDentition('permanent')}
                id="btn-dentition-permanent"
              >
                Permanente
              </button>
              <button
                className={dentition === 'deciduous' ? 'active' : ''}
                onClick={() => setDentition('deciduous')}
                id="btn-dentition-deciduous"
              >
                Decídua
              </button>
            </div>
          </div>
        </div>

        {/* Linha 2: "Selecionar condição:" + Pills */}
        <div className="odonto-toolbar-conditions-row">
          <span className="odonto-conditions-label">Selecionar condição:</span>

          <div className="odonto-conditions-pills">
            <button
              type="button"
              className={`pill-condition ${activeCondition === 'higido' ? 'active higido' : ''}`}
              onClick={() => {
                setActiveCondition('higido');
                handleApplyCondition('higido');
              }}
            >
              <Check size={14} /> Hígido
            </button>

            <button
              type="button"
              className={`pill-condition ${activeCondition === 'carie' ? 'active carie' : ''}`}
              onClick={() => {
                setActiveCondition('carie');
                if (selectedTooth && selectedFaces.length) handleApplyCondition('carie');
              }}
            >
              <span className="pill-dot" style={{ background: '#e11d48' }} /> Cárie
            </button>

            <button
              type="button"
              className={`pill-condition ${activeCondition === 'restauracao' ? 'active restauracao' : ''}`}
              onClick={() => {
                setActiveCondition('restauracao');
                if (selectedTooth && selectedFaces.length) handleApplyCondition('restauracao');
              }}
            >
              <span className="pill-dot" style={{ background: '#0284c7' }} /> Restauração
            </button>

            <button
              type="button"
              className={`pill-condition ${activeCondition === 'tratamento' ? 'active tratamento' : ''}`}
              onClick={() => {
                setActiveCondition('tratamento');
                if (selectedTooth && selectedFaces.length) handleApplyCondition('tratamento');
              }}
            >
              <span className="pill-dot" style={{ background: '#ea580c' }} /> Tratamento
            </button>

            <button
              type="button"
              className={`pill-condition ${activeCondition === 'ausente' ? 'active ausente' : ''}`}
              onClick={() => {
                setActiveCondition('ausente');
                handleApplyCondition('ausente');
              }}
            >
              <span className="pill-circle-empty" /> Ausente
            </button>

            <button
              type="button"
              className={`pill-condition ${activeCondition === 'extracao' ? 'active extracao' : ''}`}
              onClick={() => {
                setActiveCondition('extracao');
                handleApplyCondition('extracao');
              }}
            >
              <span className="pill-x">✕</span> Extração
            </button>

            <button
              type="button"
              className={`pill-condition ${activeCondition === 'outros' ? 'active outros' : ''}`}
              onClick={() => {
                setActiveCondition('outros');
                if (selectedTooth) handleApplyCondition('outros');
              }}
            >
              <span className="pill-dot" style={{ background: '#059669' }} /> Outros
            </button>
          </div>
        </div>
      </div>

      {/* 2. ÁREA PRINCIPAL: ARCADAS ANATÔMICAS + PAINEL DE DETALHES */}
      <div className="odonto-workspace">
        {/* ÁREA CENTRAL DAS ARCADAS */}
        <div className="odonto-canvas-card">
          {/* Header Arcada Superior */}
          <div className="arch-header-banner">
            <div className="arch-header-line" />
            <span className="arch-header-title">ARCADA SUPERIOR</span>
            <div className="arch-header-line" />
          </div>

          {/* Grid com Rótulos de Lado e Quadrantes */}
          <div className="arch-canvas-relative">
            {/* Rótulos Laterais Superiores */}
            <div className="side-label side-top-left">
              <span>DIREITO</span>
              <b>SUPERIOR</b>
            </div>
            <div className="side-label side-top-right">
              <span>ESQUERDO</span>
              <b>SUPERIOR</b>
            </div>

            {/* Arcada Superior (Maxila) */}
            <div className="arch-row">
              {/* Quadrante 1 (18 até 11) */}
              <div className="arch-quadrant">
                {archSet.upper[0].map((num) => (
                  <AnatomicalToothSVG
                    key={num}
                    num={num}
                    entries={patientOdonto[num] || []}
                    isSelected={selectedTooth === num}
                    activeCondition={activeCondition}
                    selectedFaces={selectedFaces}
                    onSelectTooth={handleSelectTooth}
                    onFaceClick={handleFaceClick}
                    viewMode={viewMode}
                  />
                ))}
              </div>

              {/* Linha Média Vertical Separadora */}
              <div className="arch-midline-vertical" />

              {/* Quadrante 2 (21 até 28) */}
              <div className="arch-quadrant">
                {archSet.upper[1].map((num) => (
                  <AnatomicalToothSVG
                    key={num}
                    num={num}
                    entries={patientOdonto[num] || []}
                    isSelected={selectedTooth === num}
                    activeCondition={activeCondition}
                    selectedFaces={selectedFaces}
                    onSelectTooth={handleSelectTooth}
                    onFaceClick={handleFaceClick}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            </div>

            {/* Divisor Central de Quadrantes (Cruz Anatômica) */}
            <div className="arch-center-cross">
              <span className="qd-tag qd-1">1º QD</span>
              <span className="qd-tag qd-2">2º QD</span>
              <div className="arch-horizontal-divider" />
              <span className="qd-tag qd-4">4º QD</span>
              <span className="qd-tag qd-3">3º QD</span>
            </div>

            {/* Rótulos Laterais Inferiores */}
            <div className="side-label side-bottom-left">
              <span>DIREITO</span>
              <b>INFERIOR</b>
            </div>
            <div className="side-label side-bottom-right">
              <span>ESQUERDO</span>
              <b>INFERIOR</b>
            </div>

            {/* Arcada Inferior (Mandíbula) */}
            <div className="arch-row">
              {/* Quadrante 4 (48 até 41) */}
              <div className="arch-quadrant">
                {archSet.lower[0].map((num) => (
                  <AnatomicalToothSVG
                    key={num}
                    num={num}
                    entries={patientOdonto[num] || []}
                    isSelected={selectedTooth === num}
                    activeCondition={activeCondition}
                    selectedFaces={selectedFaces}
                    onSelectTooth={handleSelectTooth}
                    onFaceClick={handleFaceClick}
                    viewMode={viewMode}
                  />
                ))}
              </div>

              {/* Linha Média Vertical */}
              <div className="arch-midline-vertical" />

              {/* Quadrante 3 (31 até 38) */}
              <div className="arch-quadrant">
                {archSet.lower[1].map((num) => (
                  <AnatomicalToothSVG
                    key={num}
                    num={num}
                    entries={patientOdonto[num] || []}
                    isSelected={selectedTooth === num}
                    activeCondition={activeCondition}
                    selectedFaces={selectedFaces}
                    onSelectTooth={handleSelectTooth}
                    onFaceClick={handleFaceClick}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Header Arcada Inferior */}
          <div className="arch-header-banner" style={{ marginTop: 8 }}>
            <div className="arch-header-line" />
            <span className="arch-header-title">ARCADA INFERIOR</span>
            <div className="arch-header-line" />
          </div>

          {/* Rodapé da Área de Arcada: Legenda Compacta + Modos de Visualização */}
          <div className="odonto-canvas-footer">
            <div className="odonto-legend-compact">
              <span className="legend-label">Legenda:</span>
              <span className="leg-item"><i className="leg-dot-empty" /> Hígido</span>
              <span className="leg-item"><i className="leg-dot" style={{ background: '#e11d48' }} /> Cárie</span>
              <span className="leg-item"><i className="leg-dot" style={{ background: '#0284c7' }} /> Restauração</span>
              <span className="leg-item"><i className="leg-dot" style={{ background: '#ea580c' }} /> Tratamento</span>
              <span className="leg-item"><i className="leg-dot" style={{ background: '#64748b' }} /> Ausente</span>
              <span className="leg-item"><i className="leg-dot" style={{ background: '#9333ea' }} /> Extração</span>
              <span className="leg-item"><i className="leg-dot" style={{ background: '#059669' }} /> Outros</span>
            </div>

            <div className="view-mode-selector">
              <span className="legend-label">Visualização:</span>
              <div className="seg-viewmode">
                <button
                  className={viewMode === 'padrao' ? 'active' : ''}
                  onClick={() => setViewMode('padrao')}
                >
                  Padrão
                </button>
                <button
                  className={viewMode === 'superficies' ? 'active' : ''}
                  onClick={() => setViewMode('superficies')}
                >
                  Superfícies
                </button>
                <button
                  className={viewMode === 'raizes' ? 'active' : ''}
                  onClick={() => setViewMode('raizes')}
                >
                  Raízes
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. PAINEL LATERAL DIREITO ("DENTE SELECIONADO") */}
        <aside className="odonto-details-sidebar">
          <div className="sidebar-section-header">
            <span className="sidebar-section-title">Dente selecionado</span>
          </div>

          {/* Identificação do Dente (Número FDI Grande + Nome Anatômico) */}
          <div className="selected-tooth-hero-card">
            <div className="selected-tooth-fdi-badge">{selectedTooth}</div>
            <div>
              <div className="selected-tooth-arch-side">
                {toothInfo.arch} {toothInfo.side}
              </div>
              <div className="selected-tooth-name">{toothInfo.base}</div>
            </div>
          </div>

          {/* Card Condição Atual */}
          <div className="detail-card-item">
            <span className="detail-card-label">Condição atual</span>
            <div className="condition-current-pill">
              <span
                className="condition-pill-dot"
                style={{ background: CONDITIONS[activeCondition]?.color || '#e11d48' }}
              />
              <b>{CONDITIONS[activeCondition]?.label || 'Cárie'}</b>
            </div>
          </div>

          {/* Card Faces Afetadas (Ilustração do Dente + Botoes Interativos) */}
          <div className="detail-card-item">
            <span className="detail-card-label">Faces afetadas</span>

            <div className="faces-interaction-layout">
              {/* Ilustração Anatômica de Perfil do Dente com Raízes e Ponto Clínico */}
              <AnatomicalToothProfileView
                toothNum={selectedTooth}
                condition={activeCondition}
                selectedFaces={selectedFaces}
              />

              {/* Botões Seletores das 5 Faces */}
              <div className="faces-buttons-stack">
                <button
                  type="button"
                  className={`btn-face-toggle ${selectedFaces.includes('O') ? 'active' : ''}`}
                  onClick={() => handleFaceToggle('O')}
                >
                  <span className="tooth-tiny-icon">🦷</span> Oclusal
                </button>

                <button
                  type="button"
                  className={`btn-face-toggle ${selectedFaces.includes('M') ? 'active' : ''}`}
                  onClick={() => handleFaceToggle('M')}
                >
                  Mesial
                </button>

                <button
                  type="button"
                  className={`btn-face-toggle ${selectedFaces.includes('D') ? 'active' : ''}`}
                  onClick={() => handleFaceToggle('D')}
                >
                  Distal
                </button>

                <button
                  type="button"
                  className={`btn-face-toggle ${selectedFaces.includes('V') ? 'active' : ''}`}
                  onClick={() => handleFaceToggle('V')}
                >
                  Vestibular
                </button>

                <button
                  type="button"
                  className={`btn-face-toggle ${selectedFaces.includes('L') ? 'active' : ''}`}
                  onClick={() => handleFaceToggle('L')}
                >
                  Palatina
                </button>
              </div>
            </div>
          </div>

          {/* Histórico Específico Deste Dente */}
          <div className="detail-card-item">
            <span className="detail-card-label">Histórico deste dente</span>

            <div className="tooth-history-list">
              {toothEntries.length === 0 ? (
                <div className="empty-history-note">
                  <span>● Elemento dental hígido sem intervenções anteriores.</span>
                </div>
              ) : (
                toothEntries.map((entry) => {
                  const cond = CONDITIONS[entry.condition] || { label: entry.condition, color: '#0284c7' };
                  return (
                    <div key={entry.id} className="tooth-history-entry">
                      <div className="row between" style={{ marginBottom: 2 }}>
                        <div className="row" style={{ gap: 6 }}>
                          <span className="history-dot" style={{ background: cond.color }} />
                          <b className="history-proc-name">
                            {cond.label} {entry.faces?.length ? `(${entry.faces.join(', ')})` : ''}
                          </b>
                        </div>
                        <span className="history-date">{fmtDate(entry.date)}</span>
                      </div>
                      <div className="history-author">Dra. Eva Martins</div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              className="btn-history-expand"
              onClick={() => toast(`Visualizando histórico completo do dente ${selectedTooth}.`)}
            >
              Ver histórico completo
            </button>
          </div>

          {/* Ação de Vinculação Rápida ao Plano de Tratamento */}
          <div className="detail-card-item" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <span className="detail-card-label">Vincular a Plano / Orçamento</span>
            <select
              className="select-procedure-odonto"
              value={selectedProcedure}
              onChange={(e) => setSelectedProcedure(e.target.value)}
            >
              {PROCEDURES.slice(0, 8).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — R$ {p.price.toFixed(2)}
                </option>
              ))}
            </select>

            <button
              className="btn-add-treatment-plan"
              onClick={handleAddToPlan}
              id="btn-add-treatment-from-odonto"
            >
              <Plus size={14} /> Adicionar ao Plano de Tratamento
            </button>
          </div>
        </aside>
      </div>

      {/* 4. LINHA DO TEMPO CRONOLÓGICA DO ODONTOGRAMA (BOTTOM CARD) */}
      <div className="odonto-timeline-card">
        <div className="odonto-timeline-header">
          <span className="timeline-title">Linha do tempo do odontograma</span>
          <button
            className="btn-timeline-all"
            onClick={() => toast('Exibindo histórico de todos os atendimentos e diagnósticos.')}
          >
            Ver todas as alterações
          </button>
        </div>

        <div className="odonto-timeline-track">
          <div className="timeline-node">
            <span className="node-dot" style={{ background: '#0284c7' }} />
            <div className="node-date">15/03/2023</div>
            <div className="node-title">Restauração</div>
            <div className="node-sub">Dente 16</div>
          </div>

          <div className="timeline-connector" />

          <div className="timeline-node">
            <span className="node-dot" style={{ background: '#e11d48' }} />
            <div className="node-date">10/03/2023</div>
            <div className="node-title">Cárie</div>
            <div className="node-sub">Dente 16</div>
          </div>

          <div className="timeline-connector" />

          <div className="timeline-node">
            <span className="node-dot" style={{ background: '#0d9488' }} />
            <div className="node-date">22/02/2023</div>
            <div className="node-title">Profilaxia</div>
            <div className="node-sub">Todos os dentes</div>
          </div>

          <div className="timeline-connector" />

          <div className="timeline-node">
            <span className="node-dot" style={{ background: '#64748b' }} />
            <div className="node-date">05/01/2023</div>
            <div className="node-title">Avaliação Inicial</div>
            <div className="node-sub">Todos os dentes</div>
          </div>
        </div>
      </div>
    </div>
  );
}
