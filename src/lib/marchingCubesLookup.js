// Tabelas de Lookup Paul Bourke para Marching Cubes (versão oficial distribuída com three.js)
import { edgeTable, triTable } from 'three/examples/jsm/objects/MarchingCubes.js';

export const EDGE_TABLE = edgeTable;
export const TRI_TABLE = Array.from({ length: 256 }, (_, i) => Array.from(triTable.subarray(i * 16, i * 16 + 16)));
