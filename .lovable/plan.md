# Guia Cirúrgico estilo exoplan — tomografia + STL no mesmo espaço

## Problemas atuais
- A tomografia só aparece como cortes 2D; o osso 3D depende de um servidor externo que não está ligado, então STL e tomografia nunca ficam juntos no 3D.
- Pastas com centenas de arquivos .dcm (ou ZIP) são lidas, mas a ordem/espaçamento pode ficar errada e travar em exames grandes.
- "Marcar no prontuário" abre um formulário onde você digita o dente manualmente — não usa o clique no modelo.

## O que vai mudar

### 1. Leitura da tomografia
- Aceitar: pasta inteira, vários .dcm, ou ZIP (inclusive ZIP com subpastas e arquivos sem extensão).
- Trocar o leitor caseiro pelas bibliotecas `jszip` e `dicom-parser` (mais confiáveis com tomógrafos diferentes).
- Ordenar fatias pela posição real do paciente; calcular o espaçamento entre elas.
- Exames grandes (mais de 300 fatias ou 512px) são reduzidos automaticamente para não travar; barra de progresso durante a leitura.

### 2. Tela em 4 quadrantes (padrão exoplan)
```text
+-------------+-------------+
|   Axial     |  Coronal    |
+-------------+-------------+
|  Sagital    |  3D         |
+-------------+-------------+
```
- Cada corte com slider e rolagem do mouse; linhas cruzadas sincronizadas (clicar num corte move os outros dois).
- Botão para maximizar qualquer quadrante.
- Presets de janela (osso, dente, tecido mole) já existentes.

### 3. Osso 3D da tomografia no próprio navegador
- Gerar a superfície do osso direto no navegador (sem servidor), com controle de densidade para esconder tecido mole.
- Os 3 planos de corte aparecem dentro do 3D junto do STL.
- Osso e STL compartilham as mesmas coordenadas em milímetros.

### 4. Alinhamento STL x Tomografia por pontos
- Botão "Alinhar STL à tomografia": marcar 3+ pontos no STL (cúspides) e os mesmos pontos no osso/cortes.
- Cálculo do alinhamento rígido a partir dos pares de pontos, seguido de refinamento automático (ICP) sobre a superfície.
- Mostrar o erro médio em mm; botões desfazer e "resetar para o eixo zero".

### 5. Implantes
- "Adicionar implante" cria implante + anilha metálica, com gizmo de mover/girar.
- Comprimento (8.5 / 10 / 11.5 / 13 mm) e diâmetro (3.5 / 4.3 / 5.0 mm) no painel lateral.
- O implante aparece desenhado nos três cortes 2D, acompanhando a posição.

### 6. Clicar no dente do arquivo para marcar no odontograma
- Ferramenta "Selecionar dente": clicar no dente do STL (ou do osso).
- O sistema sugere o número do dente (FDI) pela posição no arco, com um mini-odontograma para confirmar ou corrigir com um clique.
- Ao confirmar: o dente fica marcado no modelo e no odontograma do paciente, com o procedimento escolhido (ex.: implante), e o implante pode ser posicionado já naquele ponto.
- O botão "Marcar no prontuário" atual é substituído por esse fluxo.

## Detalhes técnicos
- Arquivos: `src/pages/ScanPlanner.jsx` (rota `/guia-cirurgico`), dividido em componentes novos: `MprViewport`, `Viewer3D`, `RegistrationPanel`, `ToothPicker`.
- Libs novas: `jszip`, `dicom-parser`. Leitura em Web Worker para não travar a tela.
- Superfície óssea: marching cubes em JS num worker, sobre volume reduzido (passo 2 se necessário), limite de triângulos.
- Alinhamento: Kabsch/SVD para os pares de pontos + ICP ponto-a-ponto com amostragem e k-d tree simples.
- FDI estimado: ângulo do clique em torno do centro do arco + lado (arcada sup./inf. definida pelo tipo do modelo), sempre com confirmação manual.
- Mantém o design atual (vidro/escuro-claro). Pastas `cad_engine` (Python) não rodam aqui; tudo passa a funcionar no navegador.
- Limitação: o encaixe automático do número do dente é uma sugestão; precisão final depende da confirmação do usuário. Preciso de uma tomografia real sua para testar.
