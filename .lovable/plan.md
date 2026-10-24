# Revisão do Guia Cirúrgico — o que falta e o que corrigir

Revisei a tela do Guia Cirúrgico e as peças dela (leitura da tomografia, 4 quadrantes, osso 3D, alinhamento, seleção de dente). A base existe, mas vários pontos ainda não funcionam como no exocad/exoplan.

## Problemas confirmados (por prioridade)

### 1. Tela trava ao abrir a tomografia
- O ZIP inteiro (197 MB) e as 448 fatias são lidos na tela principal, sem trabalho em segundo plano. O navegador congela por vários segundos e pode fechar a aba.
- O osso 3D também é calculado na tela principal, e de novo a cada movimento do controle de densidade (sem espera), travando a cada ajuste.
- Correção: leitura e cálculo do osso em segundo plano, com barra de progresso real, e o osso só recalcula quando você solta o controle.

### 2. Tomografias de outros aparelhos podem abrir em branco ou erradas
- Tomografias compactadas internamente (comuns em alguns tomógrafos) não são lidas: aparece imagem "chuviscada".
- A ordem das fatias usa só a altura, sem considerar a inclinação do exame; o espaçamento é a média, não o real.
- Correção: avisar com mensagem clara quando o formato não é suportado, e usar a orientação real do exame.

### 3. Alinhamento STL x tomografia está incompleto
- Só existe o cálculo pelos pontos marcados. O refinamento automático (encaixe fino da malha sobre o osso) prometido não foi feito.
- Os pontos podem ficar com quantidades diferentes no STL e na tomografia sem aviso claro de qual par está faltando.
- Correção: adicionar o refinamento automático depois dos pontos, mostrar o erro em mm antes/depois e numerar os pares na tela.

### 4. Implante só aparece no corte axial
- Nos cortes coronal e sagital o implante não é desenhado.
- No axial ele é desenhado sempre reto, mesmo se você inclinar o implante.
- Ao ser colocado, o implante segue a inclinação da superfície clicada (a ponta do dente), e não o eixo do osso, então nasce torto.
- Correção: desenhar o implante inclinado corretamente nos 3 cortes, nascer apontando para o osso, e permitir ajustar inclinação também pelos cortes.

### 5. Clique no dente sugere o número errado
- A sugestão do dente parte do princípio de que o centro do arco está no meio da cena. Arquivos CEREC chegam em outra posição, então a sugestão fica errada até o alinhamento ser feito.
- Correção: calcular o centro e a frente do arco a partir do próprio arquivo STL; manter sempre a confirmação no mini-odontograma.

### 6. Marcação no prontuário
- A evolução é gravada sempre no nome de um profissional fixo, não de quem está usando.
- O procedimento é sempre registrado como "implante" no odontograma, mesmo se você escolher outro.
- Correção: usar o profissional logado e o procedimento escolhido; impedir marcar duas vezes o mesmo dente sem aviso.

### 7. Planejamento não é salvo
- Ao sair da tela, modelos, alinhamento e implantes são perdidos.
- Correção: salvar o planejamento por paciente (posição dos implantes e alinhamento), sem reenviar os arquivos pesados.

### 8. Exportar o guia
- A tela tenta falar com um servidor externo para gerar o guia; ele não existe aqui, então o botão não faz nada útil.
- Correção: gerar no próprio navegador um STL com o modelo + anilhas posicionadas (o desenho completo da placa do guia fica para uma próxima etapa).

## Ordem de execução
1. Itens 1 e 2 (abrir a tomografia sem travar)
2. Item 4 (implante nos 3 cortes)
3. Item 3 (alinhamento com refinamento)
4. Itens 5 e 6 (dente e prontuário)
5. Itens 7 e 8 (salvar e exportar)

Cada etapa é testada com o seu `dicon_EVA.zip` e os dois STL.

## Detalhes técnicos
- `dicomVolumeLoader.js` e `marchingCubes.js` passam a rodar em Web Workers; ZIP lido com `JSZip` em streaming; marching cubes com buffers tipados em vez de `push`; slider com debounce/onPointerUp.
- Transfer Syntax (0002,0010): detectar JPEG/JPEG2000/RLE e mostrar erro; ordenar por projeção de ImagePositionPatient na normal de ImageOrientationPatient (0020,0037).
- `registration.js`: adicionar ICP ponto-a-ponto com amostragem (~5k pontos) e grade espacial/k-d tree contra a malha do osso.
- `MprViewport.jsx`: projetar o segmento do implante (pos + axis * length) e intersectar com cada plano; nascer com eixo oposto à normal oclusal do arco.
- `ToothPicker.jsx`: centro/orientação do arco via PCA dos vértices do modelo (no frame local do modelo).
- `ScanPlanner.jsx`: `professionalId` do usuário logado, condição do odontograma derivada do procedimento; remover checagem do CAD Server; persistir plano via ação no AppContext.
