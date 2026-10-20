"""
Eva Clinic — Gerador de guia cirurgico dento-suportado a partir do SCAN REAL do paciente.

Entrada : STL da arcada (binario ou ASCII, qualquer escala em mm, malha aberta OK)
          + lista de implantes {pos:[x,y,z], axis:[x,y,z]}  (axis aponta para o lado OCLUSAL)
Saida   : STL estanque do guia (casca com folga + sleeves + furos de broca)

Metodo  : campo de altura ao longo da direcao de insercao (up = +1 ou -1 em Z) -> casca com offset,
          anel (sleeve) e furo ao longo do eixo de cada implante, volume voxel -> marching cubes.
Obs.    : o campo de altura ignora retencoes (undercuts) ao longo de Z. Para guia final de producao,
          o dentista deve conferir o assentamento e o tecnico validar antes de imprimir.
"""
import io
import numpy as np
import trimesh
from scipy import ndimage
from skimage import measure


def _heightfield(mesh, x0, y0, nx, ny, res, up):
    pts = np.vstack([mesh.vertices, mesh.triangles_center])
    ix = np.floor((pts[:, 0] - x0) / res).astype(int)
    iy = np.floor((pts[:, 1] - y0) / res).astype(int)
    ok = (ix >= 0) & (ix < nx) & (iy >= 0) & (iy < ny)
    ix, iy, z = ix[ok], iy[ok], pts[ok, 2] * up
    H = np.full((nx, ny), -np.inf)
    np.maximum.at(H, (ix, iy), z)
    have = np.isfinite(H)
    valid = ndimage.binary_closing(have, iterations=3)
    Hf = np.where(have, H, np.nan)
    idx = ndimage.distance_transform_edt(np.isnan(Hf), return_distances=False, return_indices=True)
    Hf = Hf[tuple(idx)]
    Hf = ndimage.maximum_filter(Hf, size=3)
    Hf = ndimage.gaussian_filter(Hf, 1.0)
    return Hf * up, valid


def build_guide_from_scan(stl_bytes, implants, file_type="stl", up=+1, radius=14.0, gap=0.10, thickness=2.5,
                          hole_d=5.0, sleeve_od=7.5, sleeve_h=5.0, res=0.2):
    mesh = trimesh.load(io.BytesIO(stl_bytes), file_type=file_type)
    if len(mesh.faces) == 0:
        raise ValueError("STL vazio ou invalido")
    if not implants:
        raise ValueError("Marque ao menos um implante no modelo")

    sites = np.array([i["pos"] for i in implants], float)
    axes = np.array([i["axis"] for i in implants], float)
    axes /= np.linalg.norm(axes, axis=1, keepdims=True)

    lo = sites[:, :2].min(0) - radius - 2
    hi = sites[:, :2].max(0) + radius + 2
    span = hi - lo
    if span.max() / res > 900:
        res = float(span.max() / 900)              # limita o tamanho da grade
    nx, ny = (np.ceil(span / res)).astype(int)
    H, valid = _heightfield(mesh, lo[0], lo[1], nx, ny, res, up)

    top_pad = thickness + sleeve_h + 6
    zmin = float(np.nanmin(H[valid])) - 2
    zmax = float(np.nanmax(H[valid])) + top_pad
    if up < 0:
        zmin, zmax = float(np.nanmin(H[valid])) - top_pad, float(np.nanmax(H[valid])) + 2
    nz = int(np.ceil((zmax - zmin) / res))

    gx = lo[0] + (np.arange(nx) + .5) * res
    gy = lo[1] + (np.arange(ny) + .5) * res
    gz = zmin + (np.arange(nz) + .5) * res
    X, Y = np.meshgrid(gx, gy, indexing="ij")

    roi = np.zeros((nx, ny), bool)
    for s in sites:
        roi |= ((X - s[0]) ** 2 + (Y - s[1]) ** 2 <= radius ** 2)
    roi &= valid

    Z = gz[None, None, :]
    Hs = H[:, :, None]
    shell = (Z >= Hs + gap) & (Z <= Hs + gap + thickness) if up > 0 else (Z <= Hs - gap) & (Z >= Hs - gap - thickness)
    vol = shell & roi[:, :, None]

    P3 = np.stack(np.broadcast_arrays(X[:, :, None], Y[:, :, None], Z), -1)
    drills = np.zeros_like(vol)
    for s, a in zip(sites, axes):
        # topo da casca sobre o sitio (para a altura do sleeve acompanhar a superficie)
        ci = int(np.clip((s[0] - lo[0]) / res, 0, nx - 1)); cj = int(np.clip((s[1] - lo[1]) / res, 0, ny - 1))
        base = np.array([s[0], s[1], H[ci, cj]])
        P = P3 - base
        t = P @ a
        perp = np.linalg.norm(P - t[..., None] * a, axis=-1)
        vol |= (perp <= sleeve_od / 2) & (t >= -(thickness + gap + 1.0)) & (t <= thickness + sleeve_h)
        drills |= (perp <= hole_d / 2) & (t >= -40) & (t <= thickness + sleeve_h + 8)
    vol &= ~drills

    vol = ndimage.binary_opening(vol, iterations=1)
    lab, n = ndimage.label(vol)
    if n == 0:
        raise ValueError("Nao foi possivel formar o guia: o implante esta fora da area escaneada")
    if n > 1:
        sizes = ndimage.sum(vol, lab, range(1, n + 1))
        keep = np.where(sizes >= 0.03 * sizes.max())[0] + 1      # mantem corpos relevantes (guia pode ter 2 pontes)
        vol = np.isin(lab, keep)

    field = ndimage.gaussian_filter(np.pad(vol, 2).astype(np.float32), 0.7)
    verts, faces, _, _ = measure.marching_cubes(field, 0.5, spacing=(res, res, res), allow_degenerate=False)
    verts += np.array([lo[0], lo[1], zmin]) - 2 * res
    g = trimesh.Trimesh(verts, faces[:, ::-1], process=True)
    trimesh.repair.fix_normals(g)
    trimesh.repair.fill_holes(g)
    info = {
        "faces": int(len(g.faces)),
        "watertight": bool(g.is_watertight),
        "volume_mm3": round(float(abs(g.volume)), 1),
        "extents_mm": [round(float(v), 1) for v in g.extents],
        "resolution_mm": round(float(res), 3),
    }
    return g, info
