import React, { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  PERMANENT,
  DECIDUOUS,
  CONDITIONS,
  SPECIALTIES,
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
  Target,
  FilePlus,
  Search,
} from 'lucide-react';

// ============================================================================
// COMPONENTE ANATÔMICO REALISTA DO DENTE (VISTA VESTIBULAR COM RAÍZES E COROA)
// Inspirado nas referências clínicas (DNA USP / Odonto e Exocad)
// ============================================================================
function AnatomicalToothVestibular({ num, entries = [], upper, hasImplant, isMissing, isExtracted, hasCanal, hasCrown }) {
  const type = toothType(num);
  const q = Math.floor(num / 10);
  const isRightSide = [1, 4, 5, 8].includes(q);

  // Cores de dente clínico natural (esmalte marfim perolado e dentina radicular)
  const rootColor = '#f5eedb';
  const rootStroke = '#d8cbaf';
  const crownColor = '#fffdfa';
  const crownStroke = '#cbd5e1';

  // Se o dente tiver implante cirúrgico (substitui a raiz biológica por parafuso de titânio)
  if (hasImplant) {
    return (
      <svg viewBox="0 0 46 80" width="38" height="66" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="implantGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="abutmentGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>

        {upper ? (
          /* Implante Superior (Corpo do implante apontando para cima na maxila) */
          <g>
            {/* Parafuso do Implante (Rosca Cirúrgica de Titânio) */}
            <path
              d="M 17,34 L 17,12 C 17,8 29,8 29,12 L 29,34 Z"
              fill="url(#implantGrad)"
              stroke="#1e3a8a"
              strokeWidth="1"
            />
            {/* Espiras do Parafuso de Titânio */}
            <line x1="16" y1="14" x2="30" y2="14" stroke="#60a5fa" strokeWidth="1.5" />
            <line x1="16" y1="18" x2="30" y2="18" stroke="#1d4ed8" strokeWidth="1.5" />
            <line x1="17" y1="22" x2="29" y2="22" stroke="#60a5fa" strokeWidth="1.5" />
            <line x1="17" y1="26" x2="29" y2="26" stroke="#1d4ed8" strokeWidth="1.5" />
            <line x1="18" y1="30" x2="28" y2="30" stroke="#60a5fa" strokeWidth="1.5" />
            {/* Ápice Cônico do Implante */}
            <polygon points="18,12 28,12 23,6" fill="#1e40af" stroke="#1e3a8a" strokeWidth="1" />

            {/* Cinta / Abutment Transmucoso */}
            <rect x="15" y="34" width="16" height="5" rx="1.5" fill="url(#abutmentGrad)" stroke="#475569" strokeWidth="0.8" />

            {/* Coroa Protética sobre Implante */}
            <path
              d="M 12,39 C 12,39 9,48 10,58 C 11,66 35,66 36,58 C 37,48 34,39 34,39 Z"
              fill="#2563eb"
              stroke="#1d4ed8"
              strokeWidth="1.5"
            />
            {/* Brilho na Coroa */}
            <ellipse cx="23" cy="52" rx="4" ry="7" fill="#60a5fa" opacity="0.6" />
          </g>
        ) : (
          /* Implante Inferior (Corpo do implante apontando para baixo na mandíbula) */
          <g>
            {/* Coroa Protética Inferior */}
            <path
              d="M 12,35 C 12,35 9,26 10,16 C 11,8 35,8 36,16 C 37,26 34,35 34,35 Z"
              fill="#2563eb"
              stroke="#1d4ed8"
              strokeWidth="1.5"
            />
            <ellipse cx="23" cy="22" rx="4" ry="7" fill="#60a5fa" opacity="0.6" />

            {/* Cinta / Abutment Transmucoso */}
            <rect x="15" y="35" width="16" height="5" rx="1.5" fill="url(#abutmentGrad)" stroke="#475569" strokeWidth="0.8" />

            {/* Parafuso do Implante (Rosca para baixo) */}
            <path
              d="M 17,40 L 17,62 C 17,66 29,66 29,62 L 29,40 Z"
              fill="url(#implantGrad)"
              stroke="#1e3a8a"
              strokeWidth="1"
            />
            {/* Espiras */}
            <line x1="16" y1="44" x2="30" y2="44" stroke="#60a5fa" strokeWidth="1.5" />
            <line x1="16" y1="48" x2="30" y2="48" stroke="#1d4ed8" strokeWidth="1.5" />
            <line x1="17" y1="52" x2="29" y2="52" stroke="#60a5fa" strokeWidth="1.5" />
            <line x1="17" y1="56" x2="29" y2="56" stroke="#1d4ed8" strokeWidth="1.5" />
            <line x1="18" y1="60" x2="28" y2="60" stroke="#60a5fa" strokeWidth="1.5" />
            {/* Ápice Cônico */}
            <polygon points="18,62 28,62 23,68" fill="#1e40af" stroke="#1e3a8a" strokeWidth="1" />
          </g>
        )}
      </svg>
    );
  }

  // Se o dente estiver ausente ou marcado para extração (com 'X' conforme Imagem 3)
  if (isMissing || isExtracted) {
    return (
      <svg viewBox="0 0 46 80" width="38" height="66" style={{ overflow: 'visible' }}>
        {/* Contorno sombreado tênue do dente ausente */}
        <g opacity="0.25">
          <rect x="10" y="14" width="26" height="50" rx="8" fill="#cbd5e1" stroke="#94a3b8" strokeDasharray="3 2" />
        </g>
        {/* Caixa Quadrada com 'X' estilizado médico (exatamente como dente 11 da Imagem 3) */}
        <rect x="11" y="28" width="24" height="24" rx="4" fill="#ffffff" stroke="#9333ea" strokeWidth="1.8" />
        <line x1="16" y1="33" x2="30" y2="47" stroke="#9333ea" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="30" y1="33" x2="16" y2="47" stroke="#9333ea" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  // --------------------------------------------------------------------------
  // DENTE ANATÔMICO NATURAL (MOLARES, PRÉ-MOLARES, CANINOS E INCISIVOS)
  // --------------------------------------------------------------------------
  if (upper) {
    // ARCADA SUPERIOR (Raízes para cima, Coroa para baixo)
    if (type === 'molar') {
      return (
        <svg viewBox="0 0 46 80" width="40" height="68" style={{ overflow: 'visible' }}>
          {/* Raízes Superiores Tri-radiculares (Mesial, Palatina e Distal) */}
          <g>
            {/* Raiz Palatina (central superior profunda) */}
            <path
              d="M 19,34 C 20,24 21,12 23,4 C 25,12 26,24 27,34 Z"
              fill={rootColor}
              stroke={rootStroke}
              strokeWidth="1"
            />
            {/* Raiz Mesio-Vestibular */}
            <path
              d="M 10,36 C 9,26 11,14 13,8 C 16,14 19,26 21,36 Z"
              fill={rootColor}
              stroke={rootStroke}
              strokeWidth="1.1"
            />
            {/* Raiz Disto-Vestibular */}
            <path
              d="M 25,36 C 27,26 30,14 33,8 C 35,14 37,26 36,36 Z"
              fill={rootColor}
              stroke={rootStroke}
              strokeWidth="1.1"
            />

            {/* Canal Endodôntico (quando tratado) */}
            {hasCanal && (
              <g stroke="#ea580c" strokeWidth="1.2" strokeLinecap="round">
                <line x1="13" y1="10" x2="16" y2="34" />
                <line x1="23" y1="6" x2="23" y2="34" />
                <line x1="33" y1="10" x2="30" y2="34" />
              </g>
            )}
          </g>

          {/* Colo Cervical Anatômico */}
          <path d="M 8,36 Q 23,38 38,36" stroke="#c4b5fd" strokeWidth="0.8" fill="none" opacity="0.5" />

          {/* Coroa Molar Superior com Cúspides Anatômicas */}
          <path
            d="M 8,36 C 6,42 6,56 8,64 C 12,69 16,68 20,65 C 23,67 27,67 30,65 C 34,68 38,69 40,64 C 42,56 42,42 38,36 Z"
            fill={hasCrown ? '#fef3c7' : crownColor}
            stroke={hasCrown ? '#d97706' : crownStroke}
            strokeWidth={hasCrown ? 2 : 1.3}
          />
          {/* Sulcos de Cúspides no Esmalte */}
          <path d="M 20,65 Q 23,55 23,45" stroke="#e2e8f0" strokeWidth="1" fill="none" />
          <path d="M 30,65 Q 26,55 23,45" stroke="#e2e8f0" strokeWidth="1" fill="none" />
          <ellipse cx="14" cy="50" rx="3" ry="6" fill="#ffffff" opacity="0.8" />
        </svg>
      );
    }

    if (type === 'premolar') {
      return (
        <svg viewBox="0 0 46 80" width="36" height="66" style={{ overflow: 'visible' }}>
          {/* Raízes Pré-Molar Superior (Birradicular / Sulcada) */}
          <path
            d="M 14,35 C 13,24 16,12 19,6 C 22,12 23,24 23,35 Z"
            fill={rootColor}
            stroke={rootStroke}
            strokeWidth="1.1"
          />
          <path
            d="M 23,35 C 23,24 25,12 27,6 C 30,12 33,24 32,35 Z"
            fill={rootColor}
            stroke={rootStroke}
            strokeWidth="1.1"
          />
          {hasCanal && <line x1="23" y1="8" x2="23" y2="34" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />}

          {/* Coroa Pré-Molar Superior Bicúspide */}
          <path
            d="M 11,35 C 9,42 9,56 12,64 C 17,68 23,67 24,64 C 27,67 31,68 35,64 C 37,56 37,42 35,35 Z"
            fill={hasCrown ? '#fef3c7' : crownColor}
            stroke={hasCrown ? '#d97706' : crownStroke}
            strokeWidth={hasCrown ? 2 : 1.3}
          />
          <ellipse cx="17" cy="50" rx="2.5" ry="6" fill="#ffffff" opacity="0.8" />
        </svg>
      );
    }

    if (type === 'canine') {
      return (
        <svg viewBox="0 0 46 80" width="34" height="68" style={{ overflow: 'visible' }}>
          {/* Raiz Longa e Cônica do Canino Superior */}
          <path
            d="M 14,34 C 15,22 19,10 23,2 C 27,10 31,22 32,34 Z"
            fill={rootColor}
            stroke={rootStroke}
            strokeWidth="1.2"
          />
          {hasCanal && <line x1="23" y1="4" x2="23" y2="34" stroke="#ea580c" strokeWidth="1.6" strokeLinecap="round" />}

          {/* Coroa Cúspide Pontiaguda Canino */}
          <path
            d="M 12,34 C 10,42 10,54 13,63 C 18,68 23,71 23,71 C 23,71 28,68 33,63 C 36,54 36,42 34,34 Z"
            fill={hasCrown ? '#fef3c7' : crownColor}
            stroke={hasCrown ? '#d97706' : crownStroke}
            strokeWidth={hasCrown ? 2 : 1.3}
          />
          <line x1="23" y1="40" x2="23" y2="66" stroke="#f1f5f9" strokeWidth="1" strokeLinecap="round" />
          <ellipse cx="18" cy="50" rx="2" ry="7" fill="#ffffff" opacity="0.8" />
        </svg>
      );
    }

    // Incisivos Superiores (11, 12, 21, 22)
    return (
      <svg viewBox="0 0 46 80" width={num % 10 === 1 ? '38' : '34'} height="66" style={{ overflow: 'visible' }}>
        {/* Raiz Conical Incisivo Superior */}
        <path
          d="M 15,34 C 16,22 19,12 23,4 C 27,12 30,22 31,34 Z"
          fill={rootColor}
          stroke={rootStroke}
          strokeWidth="1.1"
        />
        {hasCanal && <line x1="23" y1="6" x2="23" y2="34" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />}

        {/* Coroa Incisivo Superior com Borda Incisal Larga e Reta */}
        <path
          d="M 11,34 C 9,42 8,56 10,65 C 13,67 33,67 36,65 C 38,56 37,42 35,34 Z"
          fill={hasCrown ? '#fef3c7' : crownColor}
          stroke={hasCrown ? '#d97706' : crownStroke}
          strokeWidth={hasCrown ? 2 : 1.3}
        />
        <ellipse cx="18" cy="50" rx="3" ry="7" fill="#ffffff" opacity="0.8" />
      </svg>
    );
  } else {
    // ------------------------------------------------------------------------
    // ARCADA INFERIOR (Coroa para cima, Raízes para baixo)
    // ------------------------------------------------------------------------
    if (type === 'molar') {
      return (
        <svg viewBox="0 0 46 80" width="40" height="68" style={{ overflow: 'visible' }}>
          {/* Coroa Molar Inferior com Cúspides */}
          <path
            d="M 8,44 C 6,38 6,24 8,16 C 12,11 16,12 20,15 C 23,13 27,13 30,15 C 34,12 38,11 40,16 C 42,24 42,38 38,44 Z"
            fill={hasCrown ? '#fef3c7' : crownColor}
            stroke={hasCrown ? '#d97706' : crownStroke}
            strokeWidth={hasCrown ? 2 : 1.3}
          />
          <path d="M 20,15 Q 23,25 23,35" stroke="#e2e8f0" strokeWidth="1" fill="none" />
          <path d="M 30,15 Q 26,25 23,35" stroke="#e2e8f0" strokeWidth="1" fill="none" />
          <ellipse cx="14" cy="28" rx="3" ry="6" fill="#ffffff" opacity="0.8" />

          {/* Raízes Inferiores Bi-radiculares com Curvatura Realista */}
          <g>
            {/* Raiz Mesial */}
            <path
              d="M 10,44 C 9,54 11,66 14,74 C 18,66 21,54 21,44 Z"
              fill={rootColor}
              stroke={rootStroke}
              strokeWidth="1.1"
            />
            {/* Raiz Distal */}
            <path
              d="M 25,44 C 25,54 28,66 32,74 C 35,66 37,54 36,44 Z"
              fill={rootColor}
              stroke={rootStroke}
              strokeWidth="1.1"
            />
            {hasCanal && (
              <g stroke="#ea580c" strokeWidth="1.3" strokeLinecap="round">
                <line x1="14" y1="72" x2="16" y2="44" />
                <line x1="32" y1="72" x2="30" y2="44" />
              </g>
            )}
          </g>
        </svg>
      );
    }

    if (type === 'premolar') {
      return (
        <svg viewBox="0 0 46 80" width="36" height="66" style={{ overflow: 'visible' }}>
          {/* Coroa Pré-Molar Inferior */}
          <path
            d="M 11,45 C 9,38 9,24 12,16 C 17,12 23,13 24,16 C 27,13 31,12 35,16 C 37,24 37,38 35,45 Z"
            fill={hasCrown ? '#fef3c7' : crownColor}
            stroke={hasCrown ? '#d97706' : crownStroke}
            strokeWidth={hasCrown ? 2 : 1.3}
          />
          <ellipse cx="17" cy="28" rx="2.5" ry="6" fill="#ffffff" opacity="0.8" />

          {/* Raiz Única Cônica Inferior */}
          <path
            d="M 15,45 C 16,56 19,68 23,74 C 27,68 30,56 31,45 Z"
            fill={rootColor}
            stroke={rootStroke}
            strokeWidth="1.1"
          />
          {hasCanal && <line x1="23" y1="72" x2="23" y2="45" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />}
        </svg>
      );
    }

    if (type === 'canine') {
      return (
        <svg viewBox="0 0 46 80" width="34" height="68" style={{ overflow: 'visible' }}>
          {/* Coroa Canino Inferior */}
          <path
            d="M 12,46 C 10,38 10,26 13,17 C 18,12 23,9 23,9 C 23,9 28,12 33,17 C 36,26 36,38 34,46 Z"
            fill={hasCrown ? '#fef3c7' : crownColor}
            stroke={hasCrown ? '#d97706' : crownStroke}
            strokeWidth={hasCrown ? 2 : 1.3}
          />
          <ellipse cx="18" cy="28" rx="2" ry="7" fill="#ffffff" opacity="0.8" />

          {/* Raiz Longa do Canino Inferior */}
          <path
            d="M 14,46 C 15,58 19,70 23,78 C 27,70 31,58 32,46 Z"
            fill={rootColor}
            stroke={rootStroke}
            strokeWidth="1.2"
          />
          {hasCanal && <line x1="23" y1="76" x2="23" y2="46" stroke="#ea580c" strokeWidth="1.6" strokeLinecap="round" />}
        </svg>
      );
    }

    // Incisivos Inferiores (41, 42, 31, 32)
    return (
      <svg viewBox="0 0 46 80" width="30" height="66" style={{ overflow: 'visible' }}>
        {/* Coroa Delicada Incisivo Inferior */}
        <path
          d="M 12,46 C 10,38 10,24 11,15 C 14,13 32,13 35,15 C 36,24 36,38 34,46 Z"
          fill={hasCrown ? '#fef3c7' : crownColor}
          stroke={hasCrown ? '#d97706' : crownStroke}
          strokeWidth={hasCrown ? 2 : 1.3}
        />
        <ellipse cx="18" cy="28" rx="2" ry="6" fill="#ffffff" opacity="0.8" />

        {/* Raiz Estreita Incisivo Inferior */}
        <path
          d="M 16,46 C 17,58 19,68 23,74 C 27,68 29,58 30,46 Z"
          fill={rootColor}
          stroke={rootStroke}
          strokeWidth="1.1"
        />
        {hasCanal && <line x1="23" y1="72" x2="23" y2="46" stroke="#ea580c" strokeWidth="1.4" strokeLinecap="round" />}
      </svg>
    );
  }
}

// ============================================================================
// DIAGRAMA CIRCULAR DE 5 FACES (VESTIBULAR, PALATINA/LINGUAL, MESIAL, DISTAL, OCLUSAL)
// Fiel aos círculos de seleção das referências médicas (Imagem 1 e Imagem 3)
// ============================================================================
function FiveFacesTargetCircle({ num, upper, entries = [], selectedFaces = [], isSelected, activeCondition, onFaceClick }) {
  const q = Math.floor(num / 10);
  const isRightSide = [1, 4, 5, 8].includes(q);

  const faceTop = upper ? 'V' : 'L';
  const faceBottom = upper ? 'L' : 'V';
  const faceLeft = isRightSide ? 'D' : 'M';
  const faceRight = isRightSide ? 'M' : 'D';

  const getFaceColor = (faceId) => {
    if (isSelected && selectedFaces.includes(faceId)) {
      return CONDITIONS[activeCondition]?.color || '#0d9488';
    }
    const match = entries.slice().reverse().find((e) => e.faces && e.faces.includes(faceId));
    if (match) {
      return CONDITIONS[match.condition]?.color || '#0284c7';
    }
    return '#ffffff';
  };

  const cO = getFaceColor('O');
  const cTop = getFaceColor(faceTop);
  const cBottom = getFaceColor(faceBottom);
  const cLeft = getFaceColor(faceLeft);
  const cRight = getFaceColor(faceRight);

  return (
    <div
      style={{
        width: 32,
        height: 32,
        display: 'grid',
        placeItems: 'center',
        margin: '2px auto',
        userSelect: 'none',
      }}
    >
      <svg viewBox="0 0 40 40" width="30" height="30" style={{ cursor: 'pointer' }}>
        {/* Face Superior */}
        <path
          d="M 6,6 L 34,6 L 27,13 L 13,13 Z"
          fill={cTop}
          stroke="#94a3b8"
          strokeWidth="1"
          onClick={(e) => {
            e.stopPropagation();
            onFaceClick(num, faceTop);
          }}
        />

        {/* Face Inferior */}
        <path
          d="M 6,34 L 34,34 L 27,27 L 13,27 Z"
          fill={cBottom}
          stroke="#94a3b8"
          strokeWidth="1"
          onClick={(e) => {
            e.stopPropagation();
            onFaceClick(num, faceBottom);
          }}
        />

        {/* Face Esquerda */}
        <path
          d="M 6,6 L 13,13 L 13,27 L 6,34 Z"
          fill={cLeft}
          stroke="#94a3b8"
          strokeWidth="1"
          onClick={(e) => {
            e.stopPropagation();
            onFaceClick(num, faceLeft);
          }}
        />

        {/* Face Direita */}
        <path
          d="M 34,6 L 27,13 L 27,27 L 34,34 Z"
          fill={cRight}
          stroke="#94a3b8"
          strokeWidth="1"
          onClick={(e) => {
            e.stopPropagation();
            onFaceClick(num, faceRight);
          }}
        />

        {/* Centro (Oclusal / Incisal) */}
        <rect
          x="13"
          y="13"
          width="14"
          height="14"
          fill={cO}
          stroke="#94a3b8"
          strokeWidth="1"
          onClick={(e) => {
            e.stopPropagation();
            onFaceClick(num, 'O');
          }}
        />
      </svg>
    </div>
  );
}

// ============================================================================
// CÉLULA COMPLETA DO ELEMENTO DENTÁRIO (ANATOMIA + DIAGRAMA DE FACES + NÚMERO FDI)
// ============================================================================
function OdontoToothColumn({
  num,
  entries = [],
  isSelected,
  activeCondition,
  selectedFaces = [],
  onSelectTooth,
  onFaceClick,
}) {
  const upper = isUpper(num);
  const isMissing = entries.some((e) => e.condition === 'ausente');
  const isExtracted = entries.some((e) => e.condition === 'extracao');
  const hasCanal = entries.some((e) => e.condition === 'canal' || e.condition === 'tratamento');
  const hasCrown = entries.some((e) => e.condition === 'coroa');
  const hasImplant = entries.some((e) => e.condition === 'implante');

  return (
    <div
      className={`odonto-tooth-column ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelectTooth(num)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '4px 2px',
        borderRadius: 10,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        background: isSelected ? 'rgba(13, 148, 136, 0.08)' : 'transparent',
        border: isSelected ? '1px solid #0d9488' : '1px solid transparent',
      }}
    >
      {upper ? (
        /* DISPOSIÇÃO SUPERIOR: Dente Anatômico no topo -> Diagrama 5 Faces -> Número FDI */
        <>
          <AnatomicalToothVestibular
            num={num}
            entries={entries}
            upper={true}
            hasImplant={hasImplant}
            isMissing={isMissing}
            isExtracted={isExtracted}
            hasCanal={hasCanal}
            hasCrown={hasCrown}
          />
          <FiveFacesTargetCircle
            num={num}
            upper={true}
            entries={entries}
            selectedFaces={selectedFaces}
            isSelected={isSelected}
            activeCondition={activeCondition}
            onFaceClick={onFaceClick}
          />
          <span className="tooth-fdi-number" style={{ fontSize: 11, fontWeight: isSelected ? 800 : 700, color: isSelected ? '#0d9488' : 'var(--text-2)' }}>
            {num}
          </span>
        </>
      ) : (
        /* DISPOSIÇÃO INFERIOR: Número FDI no topo -> Diagrama 5 Faces -> Dente Anatômico */
        <>
          <span className="tooth-fdi-number" style={{ fontSize: 11, fontWeight: isSelected ? 800 : 700, color: isSelected ? '#0d9488' : 'var(--text-2)' }}>
            {num}
          </span>
          <FiveFacesTargetCircle
            num={num}
            upper={false}
            entries={entries}
            selectedFaces={selectedFaces}
            isSelected={isSelected}
            activeCondition={activeCondition}
            onFaceClick={onFaceClick}
          />
          <AnatomicalToothVestibular
            num={num}
            entries={entries}
            upper={false}
            hasImplant={hasImplant}
            isMissing={isMissing}
            isExtracted={isExtracted}
            hasCanal={hasCanal}
            hasCrown={hasCrown}
          />
        </>
      )}
    </div>
  );
}

// ============================================================================
// ODONTOGRAMA PRINCIPAL PROFISSIONAL
// ============================================================================
export default function Odontogram({ patientId, onOpen3D }) {
  const { state, dispatch, toast } = useApp();
  const navigate = useNavigate();

  const [dentition, setDentition] = useState('permanent'); // 'permanent' | 'deciduous'
  const [activeCondition, setActiveCondition] = useState('carie');
  const [selectedTooth, setSelectedTooth] = useState(16);
  const [selectedFaces, setSelectedFaces] = useState(['O']);
  const [selectedSpecialty, setSelectedSpecialty] = useState('Todas');
  const [procedureSearch, setProcedureSearch] = useState('');
  const [customModalOpen, setCustomModalOpen] = useState(false);

  // Form de novo procedimento personalizado
  const [newProcName, setNewProcName] = useState('');
  const [newProcSpecialty, setNewProcSpecialty] = useState('Dentística');
  const [newProcPrice, setNewProcPrice] = useState(250);
  const [newProcDuration, setNewProcDuration] = useState(45);
  const [customProcedures, setCustomProcedures] = useState(() => {
    try {
      const stored = localStorage.getItem('eva_custom_procedures');
      if (stored) return JSON.parse(stored);
    } catch { }
    return [];
  });

  const patient = state.patients.find((p) => p.id === patientId) || state.patients[0];
  const patientOdonto = (state.odontogram && state.odontogram[patient?.id]) || {};
  const toothEntries = patientOdonto[selectedTooth] || [];
  const toothInfo = toothSimpleName(selectedTooth);

  const archSet = dentition === 'permanent' ? PERMANENT : DECIDUOUS;

  // Catálogo unificado de procedimentos (padrão + personalizados criados pela clínica)
  const allProcedures = useMemo(() => {
    return [...PROCEDURES, ...customProcedures];
  }, [customProcedures]);

  // Procedimentos filtrados pela especialidade ativa e busca
  const filteredProcedures = useMemo(() => {
    return allProcedures.filter((p) => {
      const matchSpecialty = selectedSpecialty === 'Todas' || p.category === selectedSpecialty;
      const matchQuery =
        !procedureSearch.trim() ||
        p.name.toLowerCase().includes(procedureSearch.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(procedureSearch.toLowerCase()));
      return matchSpecialty && matchQuery;
    });
  }, [allProcedures, selectedSpecialty, procedureSearch]);

  const [selectedProcedureId, setSelectedProcedureId] = useState(filteredProcedures[0]?.id || 'p_res1');

  // Seleção de dente
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
      toast(`Dente ${toothToUse} marcado como hígido.`);
      return;
    }

    const newEntry = {
      id: uid('od'),
      condition: condToUse,
      faces: ['carie', 'restauracao', 'selante', 'fratura'].includes(condToUse) ? facesToUse : [],
      status: 'planejado',
      date: todayISO(),
      notes: '',
    };

    dispatch({
      type: 'ODONTO_ADD',
      patientId: patient.id,
      tooth: toothToUse,
      entry: newEntry,
    });

    toast(
      `Apontamento de ${CONDITIONS[condToUse]?.label || condToUse} registrado no dente ${toothToUse}!`
    );
  };

  // Vincular procedimento ao plano de tratamento
  const handleAddToPlan = (procIdToUse) => {
    const procId = procIdToUse || selectedProcedureId;
    if (!procId) return;

    dispatch({
      type: 'ADD_TO_PLAN',
      patientId: patient.id,
      procedureId: procId,
      tooth: selectedTooth,
      faces: selectedFaces,
    });

    const proc = allProcedures.find((p) => p.id === procId);
    toast(`Procedimento "${proc?.name}" adicionado ao plano de tratamento do paciente!`);
  };

  // Criar novo procedimento customizado (não pré-setado)
  const handleCreateCustomProcedure = (e) => {
    e.preventDefault();
    if (!newProcName.trim()) {
      toast('Informe o nome do procedimento.');
      return;
    }

    const newProc = {
      id: uid('custom_proc'),
      name: newProcName.trim(),
      category: newProcSpecialty,
      price: Number(newProcPrice) || 0,
      duration: Number(newProcDuration) || 30,
      tooth: true,
      condition: 'tratamento',
      isCustom: true,
    };

    const updated = [newProc, ...customProcedures];
    setCustomProcedures(updated);
    try {
      localStorage.setItem('eva_custom_procedures', JSON.stringify(updated));
    } catch { }

    setSelectedProcedureId(newProc.id);
    setSelectedSpecialty(newProcSpecialty);
    setCustomModalOpen(false);
    setNewProcName('');
    toast(`Novo tratamento "${newProc.name}" cadastrado na especialidade ${newProc.category}!`);
  };

  const handleClearSelections = () => {
    setSelectedFaces(['O']);
    setActiveCondition('carie');
    toast('Seleções limpas.');
  };

  return (
    <div className="odontogram-container">
      {/* 1. BARRA DE FERRAMENTAS SUPERIOR (TOOLBAR COM CONDIÇÕES MÉDICAS) */}
      <div className="odonto-toolbar-card">
        <div className="odonto-toolbar-top-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="odonto-title">Odontograma Anatômico & Clínico</span>
            <span style={{ fontSize: 11, background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
              FDI / OMS 2D + 3D
            </span>
          </div>

          <div className="odonto-toolbar-actions">
            <button className="btn-toolbar-subtle" onClick={handleClearSelections} title="Limpar seleções ativas">
              <RotateCcw size={14} /> Limpar seleções
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
                <Box size={14} /> Visualizador 3D (iTero)
              </button>
            )}

            {/* Alternância Permanente / Decídua */}
            <div className="seg-dentition">
              <button
                className={dentition === 'permanent' ? 'active' : ''}
                onClick={() => setDentition('permanent')}
              >
                Permanente
              </button>
              <button
                className={dentition === 'deciduous' ? 'active' : ''}
                onClick={() => setDentition('deciduous')}
              >
                Decídua
              </button>
            </div>
          </div>
        </div>

        {/* Linha 2: "Selecionar condição:" + Pills de cores clínicas */}
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
              className={`pill-condition ${activeCondition === 'implante' ? 'active' : ''}`}
              style={activeCondition === 'implante' ? { background: '#2563eb', color: '#fff', borderColor: '#1d4ed8' } : {}}
              onClick={() => {
                setActiveCondition('implante');
                if (selectedTooth) handleApplyCondition('implante');
              }}
            >
              <span className="pill-dot" style={{ background: '#2563eb' }} /> Implante
            </button>

            <button
              type="button"
              className={`pill-condition ${activeCondition === 'canal' ? 'active' : ''}`}
              style={activeCondition === 'canal' ? { background: '#ea580c', color: '#fff', borderColor: '#c2410c' } : {}}
              onClick={() => {
                setActiveCondition('canal');
                if (selectedTooth) handleApplyCondition('canal');
              }}
            >
              <span className="pill-dot" style={{ background: '#ea580c' }} /> Canal
            </button>

            <button
              type="button"
              className={`pill-condition ${activeCondition === 'coroa' ? 'active' : ''}`}
              style={activeCondition === 'coroa' ? { background: '#d97706', color: '#fff', borderColor: '#b45309' } : {}}
              onClick={() => {
                setActiveCondition('coroa');
                if (selectedTooth) handleApplyCondition('coroa');
              }}
            >
              <span className="pill-dot" style={{ background: '#d97706' }} /> Coroa
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
          </div>
        </div>
      </div>

      {/* 2. ÁREA PRINCIPAL: ARCADAS ANATÔMICAS + CATÁLOGO POR ESPECIALIDADE */}
      <div className="odonto-workspace" style={{ gridTemplateColumns: '1fr 380px' }}>
        {/* ÁREA CENTRAL DAS ARCADAS ANATÔMICAS */}
        <div className="odonto-canvas-card" style={{ padding: '16px 20px', minHeight: 520 }}>
          {/* Header Arcada Superior */}
          <div className="arch-header-banner" style={{ margin: '4px 0 8px' }}>
            <div className="arch-header-line" />
            <span className="arch-header-title">ARCADA SUPERIOR (MAXILA)</span>
            <div className="arch-header-line" />
          </div>

          {/* Arcada Superior e Inferior com Raízes e Coroas Clínicas */}
          <div className="arch-canvas-relative" style={{ padding: '6px 10px', gap: 12 }}>
            {/* Rótulos Laterais Superiores */}
            <div className="side-label side-top-left" style={{ top: 0 }}>
              <span>DIREITO</span>
              <b>SUPERIOR</b>
            </div>
            <div className="side-label side-top-right" style={{ top: 0 }}>
              <span>ESQUERDO</span>
              <b>SUPERIOR</b>
            </div>

            {/* Arcada Superior (18..11 e 21..28) */}
            <div className="arch-row" style={{ gap: 8 }}>
              {/* Quadrante 1 (18 até 11) */}
              <div className="arch-quadrant" style={{ gap: 2 }}>
                {archSet.upper[0].map((num) => (
                  <OdontoToothColumn
                    key={num}
                    num={num}
                    entries={patientOdonto[num] || []}
                    isSelected={selectedTooth === num}
                    activeCondition={activeCondition}
                    selectedFaces={selectedFaces}
                    onSelectTooth={handleSelectTooth}
                    onFaceClick={handleFaceClick}
                  />
                ))}
              </div>

              {/* Linha Média Vertical Separadora */}
              <div className="arch-midline-vertical" style={{ height: 110 }} />

              {/* Quadrante 2 (21 até 28) */}
              <div className="arch-quadrant" style={{ gap: 2 }}>
                {archSet.upper[1].map((num) => (
                  <OdontoToothColumn
                    key={num}
                    num={num}
                    entries={patientOdonto[num] || []}
                    isSelected={selectedTooth === num}
                    activeCondition={activeCondition}
                    selectedFaces={selectedFaces}
                    onSelectTooth={handleSelectTooth}
                    onFaceClick={handleFaceClick}
                  />
                ))}
              </div>
            </div>

            {/* Divisor Central de Quadrantes */}
            <div className="arch-center-cross" style={{ height: 26, margin: '2px 0' }}>
              <span className="qd-tag qd-1" style={{ top: -11 }}>1º QD</span>
              <span className="qd-tag qd-2" style={{ top: -11 }}>2º QD</span>
              <div className="arch-horizontal-divider" />
              <span className="qd-tag qd-4" style={{ bottom: -11 }}>4º QD</span>
              <span className="qd-tag qd-3" style={{ bottom: -11 }}>3º QD</span>
            </div>

            {/* Rótulos Laterais Inferiores */}
            <div className="side-label side-bottom-left" style={{ bottom: 0 }}>
              <span>DIREITO</span>
              <b>INFERIOR</b>
            </div>
            <div className="side-label side-bottom-right" style={{ bottom: 0 }}>
              <span>ESQUERDO</span>
              <b>INFERIOR</b>
            </div>

            {/* Arcada Inferior (48..41 e 31..38) */}
            <div className="arch-row" style={{ gap: 8 }}>
              {/* Quadrante 4 (48 até 41) */}
              <div className="arch-quadrant" style={{ gap: 2 }}>
                {archSet.lower[0].map((num) => (
                  <OdontoToothColumn
                    key={num}
                    num={num}
                    entries={patientOdonto[num] || []}
                    isSelected={selectedTooth === num}
                    activeCondition={activeCondition}
                    selectedFaces={selectedFaces}
                    onSelectTooth={handleSelectTooth}
                    onFaceClick={handleFaceClick}
                  />
                ))}
              </div>

              {/* Linha Média Vertical */}
              <div className="arch-midline-vertical" style={{ height: 110 }} />

              {/* Quadrante 3 (31 até 38) */}
              <div className="arch-quadrant" style={{ gap: 2 }}>
                {archSet.lower[1].map((num) => (
                  <OdontoToothColumn
                    key={num}
                    num={num}
                    entries={patientOdonto[num] || []}
                    isSelected={selectedTooth === num}
                    activeCondition={activeCondition}
                    selectedFaces={selectedFaces}
                    onSelectTooth={handleSelectTooth}
                    onFaceClick={handleFaceClick}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Header Arcada Inferior */}
          <div className="arch-header-banner" style={{ margin: '8px 0 4px' }}>
            <div className="arch-header-line" />
            <span className="arch-header-title">ARCADA INFERIOR (MANDÍBULA)</span>
            <div className="arch-header-line" />
          </div>

          {/* Legenda Médica Alinhada às Referências */}
          <div className="odonto-canvas-footer" style={{ padding: '8px 0 0', marginTop: 6 }}>
            <div className="odonto-legend-compact" style={{ gap: 14 }}>
              <span className="legend-label">Legenda:</span>
              <span className="leg-item"><i className="leg-dot-empty" /> Hígido</span>
              <span className="leg-item"><i className="leg-dot" style={{ background: '#e11d48' }} /> Cárie</span>
              <span className="leg-item"><i className="leg-dot" style={{ background: '#0284c7' }} /> Restauração</span>
              <span className="leg-item"><i className="leg-dot" style={{ background: '#2563eb' }} /> Implante (Parafuso)</span>
              <span className="leg-item"><i className="leg-dot" style={{ background: '#ea580c' }} /> Canal (Endodontia)</span>
              <span className="leg-item"><i className="leg-dot" style={{ background: '#d97706' }} /> Coroa</span>
              <span className="leg-item"><i className="leg-dot" style={{ background: '#9333ea' }} /> Extração ('X')</span>
            </div>
          </div>
        </div>

        {/* 3. PAINEL LATERAL DIREITO: DENTE SELECIONADO & ESPECIALIDADES CLÍNICAS */}
        <aside className="odonto-details-sidebar" style={{ width: '100%' }}>
          {/* Hero do Dente Ativo */}
          <div className="selected-tooth-hero-card" style={{ padding: '10px 14px' }}>
            <div className="selected-tooth-fdi-badge" style={{ fontSize: 20, width: 40, height: 40 }}>
              {selectedTooth}
            </div>
            <div style={{ flex: 1 }}>
              <div className="selected-tooth-arch-side">
                {toothInfo.arch} • {toothInfo.side}
              </div>
              <div className="selected-tooth-name" style={{ fontSize: 13, fontWeight: 700 }}>
                {toothInfo.base}
              </div>
            </div>
            <button
              onClick={() => handleApplyCondition('higido')}
              className="btn-toolbar-subtle"
              style={{ fontSize: 11, padding: '4px 8px' }}
              title="Marcar dente como hígido"
            >
              Hígido
            </button>
          </div>

          {/* Seletor de Especialidades Clínicas */}
          <div className="detail-card-item" style={{ padding: '10px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="detail-card-label" style={{ margin: 0, fontWeight: 700 }}>Especialidades</span>
              <button
                type="button"
                onClick={() => setCustomModalOpen(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, color: '#0d9488', background: 'rgba(13, 148, 136, 0.08)',
                  border: '1px solid #99f6e4', borderRadius: 6, padding: '3px 8px',
                  fontWeight: 700, cursor: 'pointer',
                }}
              >
                <Plus size={12} /> Novo Procedimento
              </button>
            </div>

            {/* Carrossel de Especialidades */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
              {SPECIALTIES.map((spec) => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => setSelectedSpecialty(spec)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 14,
                    fontSize: 11.5,
                    fontWeight: selectedSpecialty === spec ? 700 : 500,
                    border: selectedSpecialty === spec ? '1px solid #0d9488' : '1px solid var(--border)',
                    background: selectedSpecialty === spec ? '#0d9488' : 'var(--surface)',
                    color: selectedSpecialty === spec ? '#ffffff' : 'var(--text-2)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {spec}
                </button>
              ))}
            </div>

            {/* Campo de Busca Rápida de Procedimentos */}
            <div style={{ position: 'relative', marginTop: 10 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text-3)' }} />
              <input
                type="text"
                placeholder="Buscar procedimento..."
                value={procedureSearch}
                onChange={(e) => setProcedureSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 30px',
                  borderRadius: 8,
                  fontSize: 12,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Lista Rolável de Procedimentos da Especialidade */}
            <div style={{ maxHeight: 180, overflowY: 'auto', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {filteredProcedures.length === 0 ? (
                <div style={{ padding: '12px 8px', textAlign: 'center', fontSize: 11, color: 'var(--text-3)' }}>
                  Nenhum procedimento encontrado nesta especialidade.
                </div>
              ) : (
                filteredProcedures.map((proc) => {
                  const isSelectedProc = selectedProcedureId === proc.id;
                  return (
                    <div
                      key={proc.id}
                      onClick={() => setSelectedProcedureId(proc.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: 8,
                        background: isSelectedProc ? 'rgba(13, 148, 136, 0.08)' : 'var(--surface)',
                        border: isSelectedProc ? '1px solid #0d9488' : '1px solid var(--border)',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: 12, fontWeight: isSelectedProc ? 700 : 600, color: 'var(--text)', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {proc.name}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
                          {proc.category} • {proc.duration || 30} min
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <b style={{ fontSize: 12, color: '#0d9488' }}>
                          R$ {proc.price.toFixed(2)}
                        </b>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToPlan(proc.id);
                          }}
                          style={{
                            border: 'none',
                            background: '#0d9488',
                            color: '#fff',
                            borderRadius: 6,
                            padding: '4px 6px',
                            cursor: 'pointer',
                            display: 'grid',
                            placeItems: 'center',
                          }}
                          title="Adicionar ao plano de tratamento"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Histórico do Dente Selecionado */}
          <div className="detail-card-item" style={{ padding: '8px 0' }}>
            <span className="detail-card-label" style={{ fontWeight: 700 }}>Histórico do dente #{selectedTooth}</span>

            <div className="tooth-history-list" style={{ maxHeight: 90, overflowY: 'auto' }}>
              {toothEntries.length === 0 ? (
                <div className="empty-history-note" style={{ fontSize: 11 }}>
                  <span>● Elemento dental hígido sem intervenções registradas.</span>
                </div>
              ) : (
                toothEntries.map((entry) => {
                  const cond = CONDITIONS[entry.condition] || { label: entry.condition, color: '#0284c7' };
                  return (
                    <div key={entry.id} className="tooth-history-entry" style={{ padding: '4px 0' }}>
                      <div className="row between" style={{ marginBottom: 2 }}>
                        <div className="row" style={{ gap: 6 }}>
                          <span className="history-dot" style={{ background: cond.color }} />
                          <b className="history-proc-name" style={{ fontSize: 11.5 }}>
                            {cond.label} {entry.faces?.length ? `(${entry.faces.join(', ')})` : ''}
                          </b>
                        </div>
                        <span className="history-date" style={{ fontSize: 10.5 }}>{fmtDate(entry.date)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Ação de Adicionar Seleção Atual ao Plano */}
          <div style={{ marginTop: 'auto', paddingTop: 6 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleAddToPlan()}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 14px',
                fontSize: 12.5,
                fontWeight: 700,
                borderRadius: 10,
              }}
            >
              <Plus size={15} /> Adicionar Procedimento Selecionado ao Orçamento
            </button>
          </div>

          {/* Planejamento de Guia Cirúrgico quando dente tem implante ou extração */}
          {(toothEntries.some((e) => e.condition === 'implante' || e.condition === 'ausente') || activeCondition === 'implante') && (
            <button
              type="button"
              onClick={() => navigate(`/guia-cirurgico?patient=${patient?.id || ''}&tooth=${selectedTooth}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '9px 12px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #0d9488, #2563eb)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 12,
                marginTop: 6,
              }}
            >
              <Target size={14} /> Planejar Guia Cirúrgico 3D no Dente #{selectedTooth}
            </button>
          )}
        </aside>
      </div>

      {/* MODAL: NOVO TRATAMENTO PERSONALIZADO (NÃO PRÉ-SETADO) */}
      {customModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: 'var(--surface-solid, #1e293b)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              width: '100%',
              maxWidth: 440,
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              color: 'var(--text)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} color="#0d9488" />
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Adicionar Tratamento Personalizado</h3>
              </div>
              <button
                type="button"
                onClick={() => setCustomModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomProcedure} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                  Nome do Procedimento / Tratamento:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Apicectomia com enxerto, Clareamento interno..."
                  value={newProcName}
                  onChange={(e) => setNewProcName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                    Especialidade:
                  </label>
                  <select
                    value={newProcSpecialty}
                    onChange={(e) => setNewProcSpecialty(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      fontSize: 13,
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                    }}
                  >
                    {SPECIALTIES.filter((s) => s !== 'Todas').map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                    Preço Padrão (R$):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={newProcPrice}
                    onChange={(e) => setNewProcPrice(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: 13,
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                  Duração Estimada (minutos):
                </label>
                <input
                  type="number"
                  min="10"
                  step="5"
                  value={newProcDuration}
                  onChange={(e) => setNewProcDuration(parseInt(e.target.value, 10) || 30)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setCustomModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar no Catálogo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
