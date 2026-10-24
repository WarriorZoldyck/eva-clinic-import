// ===========================================================================
// Eva Clinic — Viewport 3D da Estação Cirúrgica (4º Quadrante do Layout Exoplan)
// Renderiza em tempo real: STL (CEREC), Osso 3D (Marching Cubes local), Implantes com Anilhas,
// e os 3 Planos Ortogonais de Corte MPR projetados no espaço físico milimétrico.
// ===========================================================================
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { Maximize2, Minimize2, RotateCcw, Move, RotateCw, Eye, EyeOff, Layers } from 'lucide-react';

export default function Viewer3D({
  models = [],
  implants = [],
  selectedImplantId,
  onSelectImplant,
  selectedModelId,
  onSelectModel,
  tool,
  gizmoMode,
  volume,
  slices,
  boneGeometry,
  boneOpacity = 0.85,
  showMprPlanes = true,
  isMaximized,
  onToggleMaximize,
  onSceneClick,
  onTransformChange,
  registrationPoints = { stl: [], tomografia: [] },
  isRegistering,
}) {
  const hostRef = useRef(null);
  const E = useRef({
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    tc: null,
    meshMap: new Map(),
    boneMesh: null,
    planesGroup: null,
    axialPlane: null,
    coronalPlane: null,
    sagittalPlane: null,
    regMarkersGroup: null,
    implMap: new Map(),
  }).current;
  const cbRef = useRef({});
  cbRef.current = { onTransformChange };
  const downRef = useRef(null);

  // Inicializa Cena Three.js
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070b16');

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 2500);
    camera.up.set(0, 0, 1);
    camera.position.set(0, -140, 100);
    scene.add(camera);

    scene.add(new THREE.HemisphereLight('#ffffff', '#334155', 0.8));
    const dirLight = new THREE.DirectionalLight('#ffffff', 1.0);
    dirLight.position.set(0.3, 0.5, 1);
    camera.add(dirLight);

    const grid = new THREE.GridHelper(200, 40, '#1f2a4a', '#141c36');
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -0.5;
    scene.add(grid);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.screenSpacePanning = true;

    const tc = new TransformControls(camera, renderer.domElement);
    tc.setSize(0.85);
    tc.addEventListener('dragging-changed', (e) => {
      controls.enabled = !e.value;
    });
    tc.addEventListener('mouseUp', () => {
      const obj = tc.object;
      if (!obj) return;
      const info = obj.userData.implantId
        ? { kind: 'implant', id: obj.userData.implantId }
        : { kind: 'model', id: obj.userData.modelId };
      cbRef.current.onTransformChange?.({
        ...info,
        position: obj.position.toArray(),
        quaternion: obj.quaternion.toArray(),
      });
    });
    scene.add(tc.getHelper());

    // Grupo de Planos Ortogonais de Corte MPR projetados no 3D
    const planesGroup = new THREE.Group();
    scene.add(planesGroup);

    // Grupo de Marcadores de Registro por Pontos
    const regMarkersGroup = new THREE.Group();
    scene.add(regMarkersGroup);

    Object.assign(E, {
      renderer, scene, camera, controls, tc, planesGroup, regMarkersGroup,
    });

    const resize = () => {
      if (!host) return;
      const w = host.clientWidth;
      const h = host.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let reqId;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(reqId);
      ro.disconnect();
      tc.dispose();
      controls.dispose();
      renderer.dispose();
      if (host.contains(renderer.domElement)) host.removeChild(renderer.domElement);
    };
  }, []);

  // Atualização dos Modelos STL na cena Three.js
  useEffect(() => {
    if (!E.scene) return;

    // Remove malhas antigas que não existem mais
    const currentIds = new Set(models.map((m) => m.id));
    E.meshMap.forEach((mesh, id) => {
      if (!currentIds.has(id)) {
        E.scene.remove(mesh);
        mesh.geometry?.dispose();
        mesh.material?.dispose();
        E.meshMap.delete(id);
      }
    });

    // Adiciona ou atualiza malhas
    models.forEach((m) => {
      let mesh = E.meshMap.get(m.id);
      if (!mesh && m.geometry) {
        const mat = new THREE.MeshStandardMaterial({
          color: m.color || '#e9dcc3',
          roughness: 0.5,
          metalness: 0.1,
          side: THREE.DoubleSide,
          transparent: (m.opacity || 1) < 1,
          opacity: m.opacity || 1,
        });
        mesh = new THREE.Mesh(m.geometry, mat);
        mesh.userData.modelId = m.id;
        E.scene.add(mesh);
        E.meshMap.set(m.id, mesh);
      }

      if (mesh) {
        mesh.visible = m.visible !== false;
        mesh.material.opacity = m.opacity || 1;
        mesh.material.transparent = (m.opacity || 1) < 1;
        if (m.position) mesh.position.fromArray(m.position);
        if (m.quaternion) mesh.quaternion.fromArray(m.quaternion);
        if (m.scale) mesh.scale.fromArray(m.scale);
        mesh.updateMatrixWorld(true);
      }
    });
  }, [models, E]);

  // Atualização da Geometria do Osso 3D (Marching Cubes local)
  useEffect(() => {
    if (!E.scene) return;

    if (boneGeometry) {
      if (!E.boneMesh) {
        const mat = new THREE.MeshStandardMaterial({
          color: '#fed7aa',
          roughness: 0.45,
          metalness: 0.1,
          side: THREE.DoubleSide,
          transparent: boneOpacity < 1,
          opacity: boneOpacity,
        });
        E.boneMesh = new THREE.Mesh(boneGeometry, mat);
        E.boneMesh.userData.isBone = true;
        E.scene.add(E.boneMesh);
      } else {
        E.boneMesh.geometry.dispose();
        E.boneMesh.geometry = boneGeometry;
        E.boneMesh.material.opacity = boneOpacity;
        E.boneMesh.material.transparent = boneOpacity < 1;
        E.boneMesh.visible = true;
      }
    } else if (E.boneMesh) {
      E.boneMesh.visible = false;
    }
  }, [boneGeometry, boneOpacity, E]);

  // Atualização dos 3 Planos MPR no 3D
  useEffect(() => {
    if (!E.planesGroup || !volume) return;

    E.planesGroup.visible = showMprPlanes;
    if (!showMprPlanes) return;

    const [W, H, D] = volume.dims;
    const [dx, dy, dz] = volume.spacing;

    const widthMm = W * dx;
    const heightMm = H * dy;
    const depthMm = D * dz;

    // 1. Plano Axial (Z)
    if (!E.axialPlane) {
      const geo = new THREE.PlaneGeometry(widthMm, heightMm);
      const mat = new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      E.axialPlane = new THREE.Mesh(geo, mat);
      E.planesGroup.add(E.axialPlane);
    }
    const zMm = (slices.axial - D / 2) * dz;
    E.axialPlane.position.set(0, 0, zMm);

    // 2. Plano Coronal (Y)
    if (!E.coronalPlane) {
      const geo = new THREE.PlaneGeometry(widthMm, depthMm);
      geo.rotateX(Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({
        color: '#a78bfa',
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      E.coronalPlane = new THREE.Mesh(geo, mat);
      E.planesGroup.add(E.coronalPlane);
    }
    const yMm = -(slices.coronal - H / 2) * dy;
    E.coronalPlane.position.set(0, yMm, 0);

    // 3. Plano Sagital (X)
    if (!E.sagittalPlane) {
      const geo = new THREE.PlaneGeometry(heightMm, depthMm);
      geo.rotateY(Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({
        color: '#34d399',
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      E.sagittalPlane = new THREE.Mesh(geo, mat);
      E.planesGroup.add(E.sagittalPlane);
    }
    const xMm = (slices.sagittal - W / 2) * dx;
    E.sagittalPlane.position.set(xMm, 0, 0);
  }, [volume, slices, showMprPlanes, E]);

  // Marcadores visuais dos pontos de alinhamento Kabsch
  useEffect(() => {
    if (!E.regMarkersGroup) return;

    while (E.regMarkersGroup.children.length) {
      const c = E.regMarkersGroup.children.pop();
      c.geometry?.dispose();
      c.material?.dispose();
    }

    // Pontos STL (azuis)
    (registrationPoints.stl || []).forEach((p, idx) => {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 16, 16),
        new THREE.MeshBasicMaterial({ color: '#38bdf8' })
      );
      sphere.position.fromArray(p.pos);
      E.regMarkersGroup.add(sphere);
    });

    // Pontos Tomografia (laranjas)
    (registrationPoints.tomografia || []).forEach((p, idx) => {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 16, 16),
        new THREE.MeshBasicMaterial({ color: '#fb923c' })
      );
      sphere.position.fromArray(p.pos);
      E.regMarkersGroup.add(sphere);
    });
  }, [registrationPoints, E]);

  // Implantes 3D (corpo + anilha), eixo local -Y = direção apical
  useEffect(() => {
    if (!E.scene) return;
    const ids = new Set(implants.map((i) => i.id));
    E.implMap.forEach((g, id) => {
      if (!ids.has(id)) {
        E.scene.remove(g);
        g.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
        E.implMap.delete(id);
      }
    });
    implants.forEach((imp) => {
      let g = E.implMap.get(imp.id);
      const sig = `${imp.diameter}|${imp.length}|${imp.id === selectedImplantId}`;
      if (g && g.userData.sig !== sig) {
        E.scene.remove(g);
        g.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
        g = null;
      }
      if (!g) {
        g = new THREE.Group();
        g.userData = { implantId: imp.id, sig };
        const sel = imp.id === selectedImplantId;
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(imp.diameter / 2, imp.diameter / 2 * 0.8, imp.length, 24),
          new THREE.MeshStandardMaterial({ color: sel ? '#fbbf24' : '#cbd5e1', metalness: 0.6, roughness: 0.3 })
        );
        body.position.y = -imp.length / 2;
        body.userData.implantId = imp.id;
        const sleeve = new THREE.Mesh(
          new THREE.CylinderGeometry(3.75, 3.75, 5, 24, 1, true),
          new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.8, roughness: 0.25, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
        );
        sleeve.position.y = 2.5 + 2;
        sleeve.userData.implantId = imp.id;
        g.add(body, sleeve);
        E.scene.add(g);
        E.implMap.set(imp.id, g);
      }
      g.position.fromArray(imp.pos);
      const axis = new THREE.Vector3(...(imp.axis || [0, 0, -1])).normalize();
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), axis);
      g.updateMatrixWorld(true);
    });
  }, [implants, selectedImplantId, E]);

  // Seleção e Gizmo do Three.js
  useEffect(() => {
    if (!E.tc) return;

    if (selectedImplantId && E.implMap.get(selectedImplantId) && tool !== 'alinhamento') {
      E.tc.attach(E.implMap.get(selectedImplantId));
      E.tc.setMode(gizmoMode || 'translate');
      E.tc.setSpace(gizmoMode === 'rotate' ? 'local' : 'world');
      return;
    }
    if (selectedModelId) {
      const mesh = E.meshMap.get(selectedModelId);
      if (mesh) {
        E.tc.attach(mesh);
        E.tc.setMode(gizmoMode || 'translate');
        E.tc.setSpace('world');
        return;
      }
    }
    E.tc.detach();
  }, [selectedModelId, selectedImplantId, implants, tool, gizmoMode, E]);

  // Clique na cena 3D (Raycasting para dente, implante ou ponto de alinhamento)
  const handleClick = (e) => {
    if (!E.camera || !E.scene || !hostRef.current) return;
    // Ignora o clique que encerra um arraste (girar câmera / mover gizmo)
    const d = downRef.current;
    if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) return;
    if (E.tc?.dragging) return;
    const rect = hostRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, E.camera);

    const implHits = raycaster.intersectObjects([...E.implMap.values()], true);
    if (implHits.length && tool !== 'alinhamento' && !isRegistering) {
      onSelectImplant?.(implHits[0].object.userData.implantId);
      return;
    }

    const targetMeshes = [...E.meshMap.values()];
    if (E.boneMesh && E.boneMesh.visible) targetMeshes.push(E.boneMesh);

    const intersects = raycaster.intersectObjects(targetMeshes, false);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const worldNormal = hit.face
        ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
        : new THREE.Vector3(0, 0, 1);
      if (worldNormal.dot(raycaster.ray.direction) > 0) worldNormal.negate();
      onSceneClick?.({
        hit: { ...hit, normal: worldNormal },
        screenPos: { x: e.clientX, y: e.clientY },
      });
    }
  };

  const setViewAngle = (view) => {
    if (!E.camera || !E.controls) return;
    const dist = 140;
    if (view === 'oclusal') E.camera.position.set(0, 0, dist);
    else if (view === 'frontal') E.camera.position.set(0, -dist, 0);
    else if (view === 'esquerda') E.camera.position.set(-dist, 0, 0);
    else if (view === 'direita') E.camera.position.set(dist, 0, 0);
    E.controls.target.set(0, 0, 0);
    E.controls.update();
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#040711',
        borderRadius: 8,
        border: `1px solid ${isMaximized ? 'var(--brand)' : 'var(--border)'}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header do Viewport 3D */}
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
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24' }} />
          <strong style={{ fontSize: 11.5, color: '#e2e8f0', letterSpacing: 0.3 }}>
            Cena 3D (STL + Osso + Implantes)
          </strong>
        </div>

        <button
          onClick={() => onToggleMaximize('3d')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-2)',
            cursor: 'pointer',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
          }}
          title={isMaximized ? 'Restaurar 4 quadrantes' : 'Maximizar 3D'}
        >
          {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>

      {/* Canvas Three.js */}
      <div
        ref={hostRef}
        style={{ flex: 1, position: 'relative', cursor: tool === 'navegar' ? 'default' : 'crosshair' }}
        onClick={handleClick}
        onPointerDown={(e) => { downRef.current = { x: e.clientX, y: e.clientY }; }}
      />

      {/* Barra Flutuante de Câmera */}
      <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', gap: 4, zIndex: 5 }}>
        {[['oclusal', 'Oclusal'], ['frontal', 'Frontal'], ['esquerda', 'Esq.'], ['direita', 'Dir.']].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setViewAngle(k)}
            style={{
              padding: '4px 8px',
              fontSize: 10.5,
              fontWeight: 600,
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4,
              color: 'var(--text-2)',
              cursor: 'pointer',
            }}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
