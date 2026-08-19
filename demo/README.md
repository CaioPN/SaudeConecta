# Demonstração em HTML

`index.html` é o Saúde Conecta inteiro em **um arquivo só**: todas as telas do
app do paciente e o portal do médico, sem Node, sem Java e sem MySQL. Serve
para mostrar o projeto a quem não vai clonar o repositório — basta abrir o
arquivo no navegador ou publicá-lo em qualquer hospedagem de site estático.

**Não é o app.** Nada é gravado, nada sai da página e todos os dados exibidos
são fictícios (paciente, dependentes, consultas, exames e unidades de saúde).
O que existe só no app completo — baixar o PDF, abrir o mapa, ligar para a UBS,
falar com a IA do chatbot — avisa isso em vez de fingir que funcionou.

## Como gerar

```bash
node demo/gerar-icones.mjs   # só quando mudar a lista de ícones
node demo/gerar.mjs          # monta demo/index.html
```

O `gerar.mjs` monta o `index.html` a partir do `app.template.html` e **recorta
os originais do `medical-app`**, para a demonstração não virar uma cópia
paralela que envelhece sozinha:

| O que entra | De onde vem |
| --- | --- |
| Todo o CSS | `src/app.css` |
| Regras de exame (situação, régua, referência) | `src/utils/exames.js` |
| Máscaras do "olhinho" | `src/utils/privacidade.js` |
| Linha do tempo do prontuário | `src/utils/prontuario.js` |
| Calendário do PNI | `src/data/vacinas.js` |
| As 33 perguntas do FAQ | `src/content/FaqContent.js` |
| Termos de Uso e Portal de Privacidade | `src/content/LegalContent.jsx` |
| Base de regras do chatbot | `src/components/MedicalChatbot.jsx` |
| Logotipo (embutido em base64) | `src/assets/logo.png` |
| Ícones (SVG embutidos) | `lucide-react`, via `gerar-icones.mjs` |

Só as telas em si (`app.template.html`) são escritas à mão, em JavaScript puro:
elas repetem a marcação dos componentes React, mas sem React.

Depois de mexer em qualquer arquivo da tabela, rode o `gerar.mjs` de novo.

## Como publicar

O `index.html` não depende de mais nenhum arquivo — dá para arrastá-lo para o
Netlify Drop, para o GitHub Pages ou para qualquer servidor de arquivos. As
rotas usam `#` (`#/exams`, `#/vacinas`), então funciona até abrindo o arquivo
direto do disco, sem servidor.

## Diferenças propositais em relação ao app

- Qualquer e-mail e senha entram; o cadastro não valida nada além do formato.
- O frame tem altura fixa no computador e só o conteúdo rola, para a barra
  inferior ficar parada como ficaria no celular.
- O menu "Mais" ganhou um item **Portal do médico**, que no app real é uma URL
  à parte (`/medico`), fora do aplicativo do paciente.
- O assistente responde só pela base de regras local. No app, o que ela não
  conhece vai para o Gemini pelo backend.
- Um selo "Demonstração" fica fixo no canto do frame.
