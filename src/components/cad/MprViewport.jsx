// ===========================================================================
// Eva Clinic — Visualizador Multiplanar MPR (Padrão Exoplan)
// 3 Cortes Ortogonais Sincronizados (Axial, Coronal, Sagital) com Crosshairs interativos,
// rolagem pelo mouse, ajuste dinâmico de janela HU e projeção de implantes em 2D.
// ===========================================================================
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, Sliders } from 'lucide-react';
import {
  extractAxialImageData,
  extractCoronalImageData,
  extractSagittalImageData,
} from '../../lib/dicomReader';

export default function MprViewport({
  volume,
  slices, // { axial, coronal, sagittal }
  onSliceChange,
  crosshair, // { x, y, z } in voxel coordinates [0..W-1, 0..H-1, 0..D-1]
  onCrosshairChange,
  ww,
  wl,
  onWwChange,
  onWlChange,
  implants = [],
  expandedQuadrant,
  onToggleMaximize,
}) {
  const axialCanvasRef = useRef(null);
  const coronalCanvasRef = useRef(null);
  const sagittalCanvasRef = useRef(null);

  const [isDraggingCrosshair, setIsDraggingCrosshair] = useState(false);
  const [activePlane, setActivePlane] = useState(null);

  if (!volume) return null;

  const [W, H, D] = volume.dims;
  const [dx, dy, dz] = volume.spacing;

  // Renderiza Corte Axial (Z)
  useEffect(() => {
    if (!axialCanvasRef.current || !volume) return;
    const canvas = axialCanvasRef.current;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(W, H);
    extractAxialImageData(volume, slices.axial, ww, wl, imgData);
    ctx.putImageData(imgData, 0, 0);

    // Crosshairs: Linha Sagital (X, verde) e Linha Coronal (Y, roxa)
    if (crosshair) {
      ctx.lineWidth = 1;
      // Linha vertical (Sagital X)
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)';
      ctx.beginPath();
      ctx.moveTo(crosshair.x + 0.5, 0);
      ctx.lineTo(crosshair.x + 0.5, H);
      ctx.stroke();

      // Linha horizontal (Coronal Y)
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.85)';
      ctx.beginPath();
      ctx.moveTo(0, crosshair.y + 0.5);
      ctx.lineTo(W, crosshair.y + 0.5);
      ctx.stroke();
    }

    drawImplantsOn(ctx, 'axial', slices.axial);
  }, [volume, slices.axial, crosshair, ww, wl, implants, W, H, D, dx, dy, dz]);

  // Renderiza Corte Coronal (Y)
  useEffect(() => {
    if (!coronalCanvasRef.current || !volume) return;
    const canvas = coronalCanvasRef.current;
    canvas.width = W;
    canvas.height = D;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(W, D);
    extractCoronalImageData(volume, slices.coronal, ww, wl, imgData);
    ctx.putImageData(imgData, 0, 0);

    // Crosshairs: Linha Sagital (X, verde) e Linha Axial (Z, azul)
    if (crosshair) {
      ctx.lineWidth = 1;
      // Linha vertical (Sagital X)
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)';
      ctx.beginPath();
      ctx.moveTo(crosshair.x + 0.5, 0);
      ctx.lineTo(crosshair.x + 0.5, D);
      ctx.stroke();

      // Linha horizontal (Axial Z)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.beginPath();
      ctx.moveTo(0, D - crosshair.z - 0.5);
      ctx.lineTo(W, D - crosshair.z - 0.5);
      ctx.stroke();
    }
    drawImplantsOn(ctx, 'coronal', slices.coronal);
  }, [volume, slices.coronal, crosshair, ww, wl, W, D, implants]);

  // Renderiza Corte Sagital (X)
  useEffect(() => {
    if (!sagittalCanvasRef.current || !volume) return;
    const canvas = sagittalCanvasRef.current;
    canvas.width = H;
    canvas.height = D;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(H, D);
    extractSagittalImageData(volume, slices.sagittal, ww, wl, imgData);
    ctx.putImageData(imgData, 0, 0);

    // Crosshairs: Linha Coronal (Y, roxa) e Linha Axial (Z, azul)
    if (crosshair) {
      ctx.lineWidth = 1;
      // Linha vertical (Coronal Y)
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.85)';
      ctx.beginPath();
      ctx.moveTo(crosshair.y + 0.5, 0);
      ctx.lineTo(crosshair.y + 0.5, D);
      ctx.stroke();

      // Linha horizontal (Axial Z)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.beginPath();
      ctx.moveTo(0, D - crosshair.z - 0.5);
      ctx.lineTo(H, D - crosshair.z - 0.5);
      ctx.stroke();
    }
    drawImplantsOn(ctx, 'sagittal', slices.sagittal);
  }, [volume, slices.sagittal, crosshair, ww, wl, H, D, implants]);

  // Tratamento de Rolagem (Mouse Wheel) para navegar fatias
  const handleWheel = (e, plane) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    if (plane === 'axial') {
      const next = Math.max(0, Math.min(D - 1, slices.axial + delta));
      onSliceChange({ ...slices, axial: next });
      onCrosshairChange({ ...crosshair, z: next });
    } else if (plane === 'coronal') {
      const next = Math.max(0, Math.min(H - 1, slices.coronal + delta));
      onSliceChange({ ...slices, coronal: next });
      onCrosshairChange({ ...crosshair, y: next });
    } else if (plane === 'sagittal') {
      const next = Math.max(0, Math.min(W - 1, slices.sagittal + delta));
      onSliceChange({ ...slices, sagittal: next });
      onCrosshairChange({ ...crosshair, x: next });
    }
  };

  // Clique e arrasto para reposicionar a mira cruzada (Crosshair)
  const handleMouseDown = (e, plane, canvasRef) => {
    setIsDraggingCrosshair(true);
    setActivePlane(plane);
    updateCrosshairFromEvent(e, plane, canvasRef);
  };

  const handleMouseMove = (e, plane, canvasRef) => {
    if (isDraggingCrosshair && activePlane === plane) {
      updateCrosshairFromEvent(e, plane, canvasRef);
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCrosshair(false);
    setActivePlane(null);
  };

  const updateCrosshairFromEvent = (e, plane, canvasRef) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    if (plane === 'axial') {
      const vx = Math.max(0, Math.min(W - 1, Math.floor(clickX * W)));
      const vy = Math.max(0, Math.min(H - 1, Math.floor(clickY * H)));
      onCrosshairChange({ x: vx, y: vy, z: slices.axial });
      onSliceChange({ ...slices, coronal: vy, sagittal: vx });
    } else if (plane === 'coronal') {
      const vx = Math.max(0, Math.min(W - 1, Math.floor(clickX * W)));
      const vz = Math.max(0, Math.min(D - 1, Math.floor((1 - clickY) * D)));
      onCrosshairChange({ x: vx, y: slices.coronal, z: vz });
      onSliceChange({ ...slices, sagittal: vx, axial: vz });
    } else if (plane === 'sagittal') {
      const vy = Math.max(0, Math.min(H - 1, Math.floor(clickX * H)));
      const vz = Math.max(0, Math.min(D - 1, Math.floor((1 - clickY) * D)));
      onCrosshairChange({ x: slices.sagittal, y: vy, z: vz });
      onSliceChange({ ...slices, coronal: vy, axial: vz });
    }
  };

  const renderViewportBox = (id, title, colorHex, canvasRef, sliceVal, sliceMax, onSliderChange) => {
    const isMax = expandedQuadrant === id;

    return (
      <div
        style={{
          background: '#040711',
          border: `1px solid ${isMax ? colorHex : 'var(--border)'}`,
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 180,
          flex: 1,
        }}
        onMouseUp={handleMouseUp}
      >
        {/* Header do Quadrante */}
        <div
          style={{
            padding: '6px 10px',
            background: 'rgba(0,0,0,0.4)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 2,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: colorHex }} />
            <strong style={{ fontSize: 11.5, color: '#e2e8f0', letterSpacing: 0.3 }}>
              {title} <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>({sliceVal + 1}/{sliceMax})</span>
            </strong>
          </div>

          <button
            onClick={() => onToggleMaximize(id)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-2)',
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
            }}
            title={isMax ? 'Restaurar visualização em 4 quadrantes' : 'Maximizar este corte'}
          >
            {isMax ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>

        {/* Canvas da Imagem DICOM com Crosshair */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            placeItems: 'center',
            background: '#000000',
            position: 'relative',
            cursor: 'crosshair',
            overflow: 'hidden',
          }}
          onWheel={(e) => handleWheel(e, id)}
          onMouseDown={(e) => handleMouseDown(e, id, canvasRef)}
          onMouseMove={(e) => handleMouseMove(e, id, canvasRef)}
        >
          <canvas
            ref={canvasRef}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              display: 'block',
              imageRendering: 'pixelated',
            }}
          />
        </div>

        {/* Slider Inferior de Fatias */}
        <div style={{ padding: '3px 8px', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center' }}>
          <input
            type="range"
            min={0}
            max={sliceMax - 1}
            value={sliceVal}
            onChange={(e) => onSliderChange(parseInt(e.target.value, 10))}
            style={{ width: '100%', margin: 0, height: 4, cursor: 'pointer' }}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: expandedQuadrant ? '1fr' : '1fr 1fr',
        gridTemplateRows: expandedQuadrant ? '1fr' : '1fr 1fr',
        gap: 8,
        height: '100%',
        width: '100%',
      }}
    >
      {(!expandedQuadrant || expandedQuadrant === 'axial') &&
        renderViewportBox('axial', 'Axial (Z)', '#38bdf8', axialCanvasRef, slices.axial, D, (val) => {
          onSliceChange({ ...slices, axial: val });
          onCrosshairChange({ ...crosshair, z: val });
        })}

      {(!expandedQuadrant || expandedQuadrant === 'coronal') &&
        renderViewportBox('coronal', 'Coronal (Y)', '#a78bfa', coronalCanvasRef, slices.coronal, H, (val) => {
          onSliceChange({ ...slices, coronal: val });
          onCrosshairChange({ ...crosshair, y: val });
        })}

      {(!expandedQuadrant || expandedQuadrant === 'sagittal') &&
        renderViewportBox('sagittal', 'Sagital (X)', '#34d399', sagittalCanvasRef, slices.sagittal, W, (val) => {
          onSliceChange({ ...slices, sagittal: val });
          onCrosshairChange({ ...crosshair, x: val });
        })}
    </div>
  );
}
