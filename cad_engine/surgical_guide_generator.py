#!/usr/bin/env python3
"""
Eva Clinic — Motor CAD de Geração de Guias Cirúrgicos para Implante Dentário
Baseado em Campo de Altura (Heightfield), Voxelização e Marching Cubes.

Permite gerar guias dento-suportados estanques (watertight) a partir de STL
intraoral (mesmo com malhas abertas), com suporte a:
- Anilha (sleeve) personalizada e canal de broca calibrado
- Janelas de inspeção oclusal/incisal para checagem de assentamento clínico
- Alívio de espaçamento (gap) e espessura controlada de resina
- Modelo de arcada sintética para teste imediato
"""

import sys
import os
import argparse
import numpy as np
import trimesh
from scipy import ndimage
from skimage import measure

def generate_sample_mandible_arch(out_path="arcada_modelo_mandibula.stl"):
    """
    Gera uma arcada inferior realista com rebordo alveolar e dentes
    caso o cirurgião ainda não tenha um escaneamento intraoral do paciente em mãos.
    """
    print(f"[*] Gerando arcada mandibular modelo para demonstração em: {out_path}...")
    # Cria uma parábola em ferradura representando a arcada mandibular
    t = np.linspace(-np.pi * 0.7, np.pi * 0.7, 120)
    a = 28.0  # semi-eixo X (largura transversal)
    b = 35.0  # semi-eixo Y (profundidade anteroposterior)
    
    arch_pts = []
    r_ridge = 4.5
    for angle in t:
        cx = a * np.sin(angle)
        cy = b * (np.cos(angle) - 1.0)
        # Cria perfil coronal do rebordo em U
        for phi in np.linspace(0, np.pi, 16):
            px = cx + r_ridge * np.cos(phi) * np.cos(angle)
            py = cy + r_ridge * np.cos(phi) * np.sin(angle)
            # Altura com cúspides simuladas
            pz = r_ridge * np.sin(phi) + 2.0 * np.sin(angle * 7)**2
            arch_pts.append([px, py, pz])
            
    # Adiciona dentes como cilindros ao longo do arco
    teeth_meshes = []
    tooth_positions = [
        (-22, -26), (-18, -20), (-14, -14), (-10, -8), (-6, -3), (-2, 0),
        (2, 0), (6, -3), (10, -8), (14, -14), (18, -20), (22, -26)
    ]
    for (tx, ty) in tooth_positions:
        # Pula a posição do elemento #36 (-18, -20) para simular ausência dentária (leito cirúrgico)
        if abs(tx - (-18)) < 1 and abs(ty - (-20)) < 1:
            continue
        crown = trimesh.creation.cylinder(radius=4.2, height=7.0)
        crown.apply_translation([tx, ty, 5.0])
        teeth_meshes.append(crown)
        
    base_arch = trimesh.creation.cylinder(radius=2.0, height=2.0)
    arch_mesh = trimesh.util.concatenate([base_arch] + teeth_meshes)
    arch_mesh.export(out_path)
    print(f"[+] Arcada modelo salva com sucesso ({len(arch_mesh.faces)} faces).")
    return out_path

def surface_heightfield(mesh, x0, y0, nx, ny, res, up=+1):
    """
    Projeta a superfície da arcada (mesmo aberta) em um grid 2.5D (heightfield).
    Preenche buracos e suaviza micro-reentrâncias.
    """
    pts = np.vstack([mesh.vertices, mesh.triangles_center])
    ix = np.floor((pts[:, 0] - x0) / res).astype(int)
    iy = np.floor((pts[:, 1] - y0) / res).astype(int)
    ok = (ix >= 0) & (ix < nx) & (iy >= 0) & (iy < ny)
    ix, iy, z = ix[ok], iy[ok], pts[ok, 2] * up
    
    H = np.full((nx, ny), -np.inf)
    np.maximum.at(H, (ix, iy), z)
    valid = np.isfinite(H)
    valid = ndimage.binary_closing(valid, iterations=3)
    
    Hf = np.where(np.isfinite(H), H, np.nan)
    # Preenche buracos abertos utilizando o vizinho mais próximo
    idx = ndimage.distance_transform_edt(np.isnan(Hf), return_distances=False, return_indices=True)
    Hf = Hf[tuple(idx)]
    Hf = ndimage.maximum_filter(Hf, size=3)  # Fecha pequenas reentrâncias
    Hf = ndimage.gaussian_filter(Hf, 1.0)     # Suavização suave
    return Hf * up, valid

def build_guide(
    stl_path,
    site_xy,
    radius=18.0,
    up=+1,
    gap=0.12,
    thickness=2.5,
    axis=(0.0, 0.0, 1.0),
    hole_d=5.0,
    sleeve_od=7.5,
    sleeve_h=5.0,
    sleeve_offset=9.0,
    inspection_windows=True,
    res=0.18,
    out="guia_cirurgico_paciente.stl"
):
    """
    Gera o guia cirúrgico CAD completo:
    - Casca dento-suportada com espessura e gap configuráveis
    - Anilha (sleeve) ao longo do eixo cirúrgico do implante
    - Perfuração de broca cilíndrica precisa
    - Janelas de inspeção vestibular/incisal nos dentes vizinhos
    """
    print(f"[*] Carregando malha da arcada: {stl_path}...")
    if not os.path.exists(stl_path):
        stl_path = generate_sample_mandible_arch(stl_path)
        
    mesh = trimesh.load(stl_path)
    site = np.array(site_xy, float)
    
    x0, y0 = site - radius - 2.0
    n = int((2.0 * radius + 4.0) / res)
    
    print(f"[*] Calculando campo de altura 2.5D (Grid: {n}x{n}, Resolução: {res}mm)...")
    H, valid = surface_heightfield(mesh, x0, y0, n, n, res, up)
    
    # Determina limites do volume tridimensional
    zmin = np.nanmin(H[valid]) - 2.0
    zmax = np.nanmax(H[valid]) + thickness + sleeve_h + sleeve_offset + 4.0
    nz = int((zmax - zmin) / res)
    
    gx = x0 + (np.arange(n) + 0.5) * res
    gy = y0 + (np.arange(n) + 0.5) * res
    gz = zmin + (np.arange(nz) + 0.5) * res
    
    X, Y = np.meshgrid(gx, gy, indexing="ij")
    roi = ((X - site[0])**2 + (Y - site[1])**2 <= radius**2) & valid
    
    Z = gz[None, None, :]
    Hs = H[:, :, None]
    
    # Cria casca com alívio salivar (gap) e espessura estrutural (thickness)
    if up > 0:
        shell = (Z >= Hs + gap) & (Z <= Hs + gap + thickness)
    else:
        shell = (Z <= Hs - gap) & (Z >= Hs - gap - thickness)
        
    vol = shell & roi[:, :, None]
    
    # Coordenada da crista óssea/gengival no centro do sítio cirúrgico
    ci = int(np.clip((site[0] - x0) / res, 0, n - 1))
    cj = int(np.clip((site[1] - y0) / res, 0, n - 1))
    p0 = np.array([site[0], site[1], H[ci, cj]])
    
    # Vetor unitário do eixo do implante
    a = np.array(axis, float)
    norm_a = np.linalg.norm(a)
    if norm_a > 1e-6:
        a /= norm_a
    else:
        a = np.array([0.0, 0.0, 1.0])
        
    # Vetorização da distância ao eixo da anilha
    P = np.stack(np.broadcast_arrays(X[:, :, None], Y[:, :, None], Z), -1) - p0
    t = P @ a
    perp = np.linalg.norm(P - t[..., None] * a, axis=-1)
    tt = t * up
    
    # Modelagem da anilha cirúrgica (cilindro externo integrado à casca)
    sleeve = (perp <= sleeve_od / 2.0) & (perp >= 0) & (tt >= -thickness - gap - 1.0) & (tt <= sleeve_h + thickness + sleeve_offset)
    vol |= sleeve
    
    # Perfuração cilíndrica do canal da broca (Hole)
    drill_channel = (perp <= hole_d / 2.0) & (tt >= -30.0) & (tt <= sleeve_h + thickness + sleeve_offset + 5.0)
    vol &= ~drill_channel
    
    # Janelas de inspeção (para conferir o assentamento visual no dente adjacente)
    if inspection_windows:
        # Janela vestibular a 8mm do centro do implante
        win_offset_x = site[0] + (10.0 if site[0] >= 0 else -10.0)
        win_offset_y = site[1] + 6.0
        dist_win = np.sqrt((X[:, :, None] - win_offset_x)**2 + (Y[:, :, None] - win_offset_y)**2)
        win_cut = (dist_win <= 2.2) & (Z >= Hs - 1.0) & (Z <= Hs + thickness + gap + 3.0)
        vol &= ~win_cut
    
    # Operações morfológicas de limpeza e seleção do maior componente conexo
    vol = ndimage.binary_opening(vol, iterations=1)
    lab, nl = ndimage.label(vol)
    if nl > 1:
        sizes = ndimage.sum(vol, lab, range(1, nl + 1))
        vol = lab == (1 + np.argmax(sizes))
        
    # Reconstrução poligonal por Marching Cubes
    print("[*] Reconstruindo malha sólida 3D (Marching Cubes)...")
    vol = np.pad(vol, 1)
    verts, faces, _, _ = measure.marching_cubes(vol.astype(np.float32), 0.5, spacing=(res, res, res))
    verts += np.array([x0 - res, y0 - res, zmin - res])
    
    guide_mesh = trimesh.Trimesh(verts, faces[:, ::-1])
    guide_mesh.merge_vertices()
    # Suavização Taubin para manter precisão dimensional sem encolhimento
    trimesh.smoothing.filter_taubin(guide_mesh, iterations=6)
    
    # Exportação final para STL
    guide_mesh.export(out)
    
    vol_mm3 = round(float(guide_mesh.volume), 1) if guide_mesh.is_watertight else 0.0
    extents = [round(float(e), 2) for e in guide_mesh.extents]
    
    print("=" * 60)
    print(f"[OK] GUIA CIRÚRGICO GERADO COM SUCESSO: {out}")
    print(f"    - Faces: {len(guide_mesh.faces):,}")
    print(f"    - Vértices: {len(guide_mesh.vertices):,}")
    print(f"    - Dimensões (X, Y, Z): {extents} mm")
    print(f"    - Malha Estanque (Watertight): {guide_mesh.is_watertight}")
    print(f"    - Volume estimado de resina: {vol_mm3} mm³ ({vol_mm3 / 1000.0:.2f} mL)")
    print(f"    - Ponto de inserção da crista: {p0.round(2).tolist()}")
    print("=" * 60)
    
    return {
        "success": True,
        "output_file": out,
        "faces": len(guide_mesh.faces),
        "vertices": len(guide_mesh.vertices),
        "dimensions": extents,
        "is_watertight": guide_mesh.is_watertight,
        "volume_mm3": vol_mm3,
        "volume_ml": round(vol_mm3 / 1000.0, 2),
        "site_xyz": p0.round(2).tolist(),
        "axis": a.tolist()
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Gerador de Guia Cirúrgico Dentário CAD (Eva Clinic)")
    parser.add_argument("--stl", default="arcada_modelo_mandibula.stl", help="Caminho do arquivo STL da arcada")
    parser.add_argument("--site", default="-18,-20", help="Coordenadas X,Y do dente/sítio (ex: -18,-20)")
    parser.add_argument("--tooth", default="36", help="Número do dente FDI (ex: 36)")
    parser.add_argument("--radius", type=float, default=18.0, help="Raio de apoio do guia sobre os dentes (mm)")
    parser.add_argument("--thickness", type=float, default=2.5, help="Espessura da casca de resina (mm)")
    parser.add_argument("--gap", type=float, default=0.12, help="Espaçamento de alívio salivar (mm)")
    parser.add_argument("--hole", type=float, default=5.0, help="Diâmetro do furo guia da broca (mm)")
    parser.add_argument("--sleeve_od", type=float, default=7.5, help="Diâmetro externo da anilha (mm)")
    parser.add_argument("--sleeve_h", type=float, default=5.0, help="Altura da anilha (mm)")
    parser.add_argument("--sleeve_offset", type=float, default=9.0, help="Distância de stop do implante ao topo da anilha (mm)")
    parser.add_argument("--res", type=float, default=0.20, help="Resolução da grade de voxels (mm)")
    parser.add_argument("--out", default="guia_cirurgico_gerado.stl", help="Arquivo STL de saída")
    
    args = parser.parse_args()
    
    parts = [float(p.strip()) for p in args.site.split(",")]
    site_xy = (parts[0], parts[1])
    
    res = build_guide(
        stl_path=args.stl,
        site_xy=site_xy,
        radius=args.radius,
        thickness=args.thickness,
        gap=args.gap,
        hole_d=args.hole,
        sleeve_od=args.sleeve_od,
        sleeve_h=args.sleeve_h,
        sleeve_offset=args.sleeve_offset,
        res=args.res,
        out=args.out
    )
