import React, { useRef, useState } from 'react';
import { Droplet, Image as ImageIcon, Plus, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';
import ICONES from '../utils/icones';
import { importarExame } from '../services/exames';
import { lerPdf, interpretarLaudo } from '../utils/leitorLaudo';
import { mensagemDaAcao } from '../utils/falhas';

// O paciente traz o PDF de um exame feito em outro hospital ou laboratório.
//
// O caminho é sempre: escolher o arquivo → o app lê o texto AQUI no aparelho
// (pdf.js) e pré-preenche → o paciente confere linha por linha → salvar. A
// leitura é um palpite (cada laboratório desenha o laudo de um jeito), então
// nada é gravado sem passar pela conferência, e o que for gravado aparece como
// "informado por você" — nunca como resultado registrado por um profissional.

/** O mesmo teto do backend (LIMITE_DOCUMENTO_BYTES no ApiServer). */
const LIMITE_MB = 5;

function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const ITEM_VAZIO = { nome: '', valor: '', unidade: '', refMin: '', refMax: '' };

/** Número do formulário ("12,5" ou "12.5") → 12.5; vazio → null. */
function numero(texto) {
  const t = String(texto ?? '').trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * 13.8 → "13,8": o campo mostra o número como está no laudo brasileiro, para
 * o paciente comparar com o papel sem traduzir ponto e vírgula de cabeça.
 */
function paraTexto(n) {
  return n === null || n === undefined ? '' : String(n).replace('.', ',');
}

/** O que falta numa linha, para a tela marcar antes de deixar salvar. */
function problemaDoItem(it) {
  if (!it.nome.trim()) return 'Falta o nome do exame.';
  if (numero(it.valor) === null) return 'Falta o resultado.';
  const min = numero(it.refMin);
  const max = numero(it.refMax);
  if (min === null || max === null) {
    return 'O laudo não trouxe a faixa de referência completa. Complete com o que está no documento ou remova a linha.';
  }
  if (min > max) return 'O mínimo da referência está maior que o máximo.';
  return null;
}

/** Bytes do arquivo → base64, em blocos (um btoa do arquivo inteiro estoura a pilha). */
function paraBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binario = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binario);
}

export default function ImportarExame({ dependenteId, nomePessoa, onSalvo, onCancelar }) {
  const entrada = useRef(null);
  const [etapa, setEtapa] = useState('escolher'); // escolher | lendo | conferir
  const [arquivo, setArquivo] = useState(null); // { nome, dados: ArrayBuffer }
  const [leitura, setLeitura] = useState(null); // { temTexto, achados }
  const [tipo, setTipo] = useState('sangue');
  const [data, setData] = useState('');
  const [local, setLocal] = useState('');
  const [nome, setNome] = useState('');
  const [laudo, setLaudo] = useState('');
  const [itens, setItens] = useState([]);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const escolher = async (e) => {
    const escolhido = e.target.files?.[0];
    e.target.value = ''; // permite escolher o mesmo arquivo de novo
    if (!escolhido) return;
    setErro('');
    if (escolhido.size > LIMITE_MB * 1024 * 1024) {
      setErro(`O arquivo tem mais de ${LIMITE_MB} MB. Peça ao laboratório uma versão menor ou envie só as páginas do resultado.`);
      return;
    }

    setEtapa('lendo');
    try {
      const dados = await escolhido.arrayBuffer();
      // Os primeiros bytes dizem se é PDF; o nome e o tipo do arquivo, não.
      const assinatura = String.fromCharCode(...new Uint8Array(dados.slice(0, 5)));
      if (assinatura !== '%PDF-') {
        setErro('Este arquivo não é um PDF.');
        setEtapa('escolher');
        return;
      }

      let rascunho = { tipo: 'sangue', data: '', local: '', itens: [], nome: '', laudo: '' };
      let temTexto = false;
      try {
        const lido = await lerPdf(dados);
        temTexto = lido.temTexto;
        if (temTexto) rascunho = interpretarLaudo(lido.linhas);
      } catch {
        // PDF protegido por senha ou corrompido: sem leitura, mas o
        // paciente ainda pode digitar os valores e anexar o arquivo.
        temTexto = false;
      }

      setArquivo({ nome: escolhido.name, dados });
      setTipo(rascunho.tipo);
      setData(rascunho.data);
      setLocal(rascunho.local);
      setNome(rascunho.nome);
      setLaudo(rascunho.laudo);
      setItens(rascunho.itens.length
        ? rascunho.itens.map((it) => ({
            nome: it.nome,
            valor: paraTexto(it.valor),
            unidade: it.unidade,
            refMin: paraTexto(it.refMin),
            refMax: paraTexto(it.refMax),
          }))
        : [{ ...ITEM_VAZIO }]);
      setLeitura({ temTexto, achados: rascunho.tipo === 'sangue' ? rascunho.itens.length : (rascunho.nome ? 1 : 0) });
      setEtapa('conferir');
    } catch {
      setErro('Não foi possível abrir este arquivo.');
      setEtapa('escolher');
    }
  };

  const alterarItem = (i, campo) => (e) => {
    const valor = e.target.value;
    setItens((atual) => atual.map((it, j) => (j === i ? { ...it, [campo]: valor } : it)));
  };
  const removerItem = (i) => setItens((atual) => atual.filter((_, j) => j !== i));
  const adicionarItem = () => setItens((atual) => [...atual, { ...ITEM_VAZIO }]);

  const problemas = tipo === 'sangue' ? itens.map(problemaDoItem) : [];
  const pendentes = problemas.filter(Boolean).length;

  const salvar = async (e) => {
    e.preventDefault();
    setErro('');
    if (tipo === 'sangue' && (itens.length === 0 || pendentes > 0)) {
      setErro(itens.length === 0
        ? 'Inclua ao menos um resultado.'
        : `${pendentes} ${pendentes === 1 ? 'linha precisa' : 'linhas precisam'} de ajuste antes de salvar.`);
      return;
    }

    setSalvando(true);
    try {
      const base = { tipo, data, local, dependenteId: dependenteId ?? undefined };
      await importarExame(
        tipo === 'imagem'
          ? { ...base, nome, laudo }
          : {
              ...base,
              itens: itens.map((it) => ({
                nome: it.nome.trim(),
                valor: numero(it.valor),
                unidade: it.unidade.trim(),
                refMin: numero(it.refMin),
                refMax: numero(it.refMax),
              })),
            },
        { nome: arquivo.nome, conteudo: paraBase64(arquivo.dados) },
      );
      onSalvo();
    } catch (falha) {
      setErro(mensagemDaAcao(falha, 'Não foi possível salvar o exame.'));
    } finally {
      setSalvando(false);
    }
  };

  if (etapa !== 'conferir') {
    return (
      <div className="importar-exame">
        <p className="text-sm">
          Escolha o PDF do resultado de um exame feito em outro hospital, laboratório ou clínica.
        </p>
        <p className="importar-nota">
          <ShieldCheck size={14} />
          O arquivo é lido aqui no seu aparelho. Nada é enviado antes de você conferir os valores e salvar.
        </p>
        <input
          ref={entrada}
          type="file"
          accept="application/pdf,.pdf"
          className="importar-entrada"
          onChange={escolher}
        />
        <button
          type="button"
          className="btn-primary"
          onClick={() => entrada.current?.click()}
          disabled={etapa === 'lendo'}
        >
          <ICONES.importarExame size={18} /> {etapa === 'lendo' ? 'Lendo o PDF…' : 'Escolher PDF'}
        </button>
        {erro && <p className="form-erro">{erro}</p>}
        <button type="button" className="btn-secondary" onClick={onCancelar}>Cancelar</button>
      </div>
    );
  }

  return (
    <form className="importar-exame" onSubmit={salvar}>
      <p className="text-xs text-muted">
        Arquivo: {arquivo.nome}{nomePessoa ? ` · exame de ${nomePessoa}` : ''}
      </p>

      {!leitura.temTexto ? (
        <p className="importar-aviso">
          <AlertTriangle size={14} />
          Este PDF não tem texto para ler (costuma ser papel escaneado ou foto). Preencha os
          resultados olhando o documento. O arquivo vai anexado mesmo assim.
        </p>
      ) : leitura.achados === 0 ? (
        <p className="importar-aviso">
          <AlertTriangle size={14} />
          Não reconhecemos os resultados neste laudo. Preencha olhando o documento.
        </p>
      ) : (
        <p className="importar-aviso">
          <AlertTriangle size={14} />
          {tipo === 'sangue'
            ? `Lemos ${leitura.achados} ${leitura.achados === 1 ? 'resultado' : 'resultados'}.`
            : 'Lemos o nome e a conclusão do exame.'}
          {' '}Confira cada valor com o documento: a leitura automática erra.
        </p>
      )}

      <div className="tabs-wrapper">
        <button type="button" className={`tab-btn ${tipo === 'sangue' ? 'active' : ''}`} onClick={() => setTipo('sangue')}>
          <Droplet size={18} /><span>Sangue e outros</span>
        </button>
        <button type="button" className={`tab-btn ${tipo === 'imagem' ? 'active' : ''}`} onClick={() => setTipo('imagem')}>
          <ImageIcon size={18} /><span>Imagem</span>
        </button>
      </div>

      <div className="form-linha-dupla">
        <div className="input-group">
          <label className="input-label">{tipo === 'imagem' ? 'Data do exame' : 'Data da coleta'}</label>
          <input className="input-field" type="date" value={data} max={hojeIso()}
            onChange={(e) => setData(e.target.value)} required />
        </div>
        <div className="input-group">
          <label className="input-label">Laboratório ou hospital</label>
          <input className="input-field" value={local} maxLength={160}
            onChange={(e) => setLocal(e.target.value)} required />
        </div>
      </div>

      {tipo === 'imagem' ? (
        <>
          <div className="input-group">
            <label className="input-label">Exame</label>
            <input className="input-field" placeholder="Ex.: Ultrassonografia de abdome" value={nome}
              maxLength={160} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div className="input-group">
            <label className="input-label">Conclusão do laudo (opcional)</label>
            <textarea className="input-field" rows={4} value={laudo} maxLength={5000}
              onChange={(e) => setLaudo(e.target.value)} />
          </div>
        </>
      ) : (
        <>
          {itens.map((item, i) => (
            <div key={i} className={`item-exame-form ${problemas[i] ? 'incompleto' : ''}`}>
              <div className="item-exame-linha">
                <input className="input-field" placeholder="Exame (ex.: Hemoglobina)" value={item.nome}
                  maxLength={120} onChange={alterarItem(i, 'nome')} aria-label="Nome do exame" />
                <button type="button" className="item-remover" onClick={() => removerItem(i)}
                  title="Remover esta linha" aria-label="Remover esta linha">
                  <Trash2 size={16} />
                </button>
              </div>
              {/* Rótulo visível, e não só placeholder: preenchido pela leitura,
                  o campo perdia o placeholder, e "12" e "16" lado a lado não
                  diziam qual era o mínimo. */}
              <div className="item-exame-linha">
                <label className="item-exame-campo">
                  <span>Resultado</span>
                  <input className="input-field" inputMode="decimal"
                    value={item.valor} onChange={alterarItem(i, 'valor')} />
                </label>
                <label className="item-exame-campo">
                  <span>Unidade</span>
                  <input className="input-field" value={item.unidade}
                    maxLength={20} onChange={alterarItem(i, 'unidade')} />
                </label>
              </div>
              <div className="item-exame-linha">
                <label className="item-exame-campo">
                  <span>Referência mínima</span>
                  <input className="input-field" inputMode="decimal"
                    value={item.refMin} onChange={alterarItem(i, 'refMin')} />
                </label>
                <label className="item-exame-campo">
                  <span>Referência máxima</span>
                  <input className="input-field" inputMode="decimal"
                    value={item.refMax} onChange={alterarItem(i, 'refMax')} />
                </label>
              </div>
              {problemas[i] && <p className="campo-erro">{problemas[i]}</p>}
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={adicionarItem}>
            <Plus size={16} /> Adicionar resultado
          </button>
        </>
      )}

      <p className="text-xs text-muted">
        O exame vai aparecer como “informado por você”, com o PDF guardado para quem quiser conferir.
      </p>

      {erro && <p className="form-erro">{erro}</p>}

      <div className="form-botoes">
        <button type="button" className="btn-secondary" onClick={() => setEtapa('escolher')} disabled={salvando}>
          Outro arquivo
        </button>
        <button type="submit" className="btn-primary" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar exame'}
        </button>
      </div>
    </form>
  );
}
