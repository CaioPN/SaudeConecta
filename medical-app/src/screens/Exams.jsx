import React, { useEffect, useMemo, useState } from 'react';
import useVoltar from '../hooks/useVoltar';
import { ChevronLeft, Image as ImageIcon, Droplet, Download, Calendar, Building2, Stethoscope, AlertTriangle, Lock } from 'lucide-react';
import { senhaDoPaciente, novoRelatorio, fecharRelatorio, nomeDeArquivo } from '../utils/pdf';
import { useAuth } from '../context/AuthContext';
import { usePessoas } from '../context/PessoasContext';
import { usePrivacidade } from '../context/PrivacidadeContext';
import BotaoPrivacidade from '../components/BotaoPrivacidade';
import SeletorPessoa from '../components/SeletorPessoa';
import { mascararTexto } from '../utils/privacidade';
import ResultRow from '../components/ResultRow';
import BotaoExplicacao from '../components/BotaoExplicacao';
import InfoField from '../components/InfoField';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import EstadoErro from '../components/EstadoErro';
import GraficoEvolucao from '../components/GraficoEvolucao';
import { buscarExames } from '../services/exames';
import { registrarExportacao } from '../services/auditoria';
import {
  situacaoItem, textoReferencia, formatarData, totalAlterados, seriesPorItem, chaveDoItem,
} from '../utils/exames';

export default function Exams() {
  const voltar = useVoltar('/patient');
  const { paciente } = useAuth();
  const { pessoa, dependenteId } = usePessoas();
  const { oculto } = usePrivacidade();
  const [tab, setTab] = useState('sangue');
  const [coletas, setColetas] = useState([]);
  const [imagem, setImagem] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  // Sobe a cada "Tentar de novo" para refazer a busca do efeito abaixo.
  const [tentativa, setTentativa] = useState(0);
  // Item cujo gráfico de evolução está aberto ({ nome, chave }), ou null.
  const [evolucao, setEvolucao] = useState(null);

  // As séries saem das coletas que a tela já tem: o gráfico não faz
  // requisição nenhuma, e por isso também não gera linha nova na auditoria.
  const series = useMemo(() => seriesPorItem(coletas), [coletas]);

  // Trocar de pessoa fecha o gráfico, que era de outra pessoa.
  useEffect(() => setEvolucao(null), [dependenteId]);

  // Refaz a busca ao trocar de pessoa no seletor. O estado volta ao início
  // junto, senão os exames de quem estava selecionado antes ficariam na tela
  // enquanto os novos não chegam.
  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);
    // Sem limpar, uma falha deixaria as coletas de quem estava selecionado
    // antes — e o "Baixar PDF" as exportaria com o nome da pessoa nova.
    setColetas([]);
    setImagem([]);
    buscarExames(dependenteId)
      .then(({ coletas: c, imagem: i }) => {
        if (!ativo) return;
        setColetas(c);
        setImagem(i);
      })
      .catch((falha) => {
        if (ativo) setErro(falha);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [dependenteId, tentativa]);

  // Gera e baixa um PDF com o histórico de exames do paciente.
  const baixarPDF = () => {
    const senha = senhaDoPaciente(paciente);
    const nome = pessoa.nome || paciente?.nome || 'Paciente';
    const { doc, pagina, espaco } = novoRelatorio({ senha, titulo: 'Histórico de Exames', nome });

    // Seção: Exames de Sangue — uma tabela por coleta.
    coletas.forEach((coleta) => {
      espaco(50);
      pagina.y += 10;
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      doc.text(`Coleta de ${formatarData(coleta.data)}`, 14, pagina.y);

      pagina.y += 5;
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);
      const origem = [coleta.local, coleta.solicitante && `Solicitado por ${coleta.solicitante}`]
        .filter(Boolean)
        .join(' · ');
      doc.text(origem, 14, pagina.y);

      // Cabeçalho da tabela
      pagina.y += 8;
      doc.text('Exame', 14, pagina.y);
      doc.text('Resultado', 80, pagina.y);
      doc.text('Referência', 120, pagina.y);
      doc.text('Situação', 170, pagina.y);

      doc.setFontSize(10);
      coleta.itens.forEach((item) => {
        espaco(10);
        pagina.y += 7;
        const situacao = situacaoItem(item);
        doc.setTextColor(30, 30, 30);
        doc.text(String(item.nome), 14, pagina.y);
        doc.text(`${item.valor} ${item.unidade}`, 80, pagina.y);
        doc.text(textoReferencia(item), 120, pagina.y);

        if (situacao === 'alterado') doc.setTextColor(220, 38, 38);
        else if (situacao === 'limite') doc.setTextColor(202, 138, 4);
        else doc.setTextColor(22, 163, 74);
        doc.text(situacao === 'normal' ? 'Normal' : situacao === 'limite' ? 'Limite' : 'Alterado', 170, pagina.y);
        doc.setTextColor(30, 30, 30);
      });
    });

    // Seção: Exames de Imagem
    espaco(30);
    pagina.y += 14;
    doc.setFontSize(12);
    doc.text('Exames de Imagem', 14, pagina.y);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    imagem.forEach((e) => {
      espaco(10);
      pagina.y += 7;
      doc.text(`• ${e.nome} — ${formatarData(e.data)} · ${e.local}`, 14, pagina.y);
    });

    fecharRelatorio(
      doc,
      'Documento gerado automaticamente pelo Saúde Conecta. Não substitui laudo médico oficial.',
      nomeDeArquivo('exames', nome),
    );

    // Exportar dado de saúde é operação auditável, e o arquivo nasce aqui no
    // navegador: sem este aviso a API não teria como saber que ele existiu.
    registrarExportacao({
      coletas: coletas.length,
      imagens: imagem.length,
      protegido: senha !== null,
      dependenteId,
    });
  };

  const temExames = coletas.length > 0 || imagem.length > 0;
  const protegido = senhaDoPaciente(paciente) !== null;

  return (
    <div className="screen-container tela-rolagem">
      {/* Cabeçalho, seletor de pessoa e abas ficam parados: as abas são o
          controle da lista e não podem sumir junto com ela. */}
      <div className="tela-topo">
      <button onClick={() => voltar()} className="back-btn">
        <ChevronLeft size={20} /> Voltar
      </button>

      <div className="section-header">
        <h2 className="header-title">Exames</h2>
        <div className="flex items-center gap-4">
          <BotaoPrivacidade rotulo="resultados" />
          {temExames && (
            <button onClick={baixarPDF} className="pdf-download-btn">
              <Download size={18} />
              <span>Baixar PDF</span>
            </button>
          )}
        </div>
      </div>

      <SeletorPessoa />

      {temExames && (
        <p className="pdf-nota">
          <Lock size={13} />
          {protegido
            ? 'O PDF baixado abre com senha: os 4 primeiros dígitos do seu CPF.'
            : 'Sem CPF no cadastro, o PDF é baixado sem senha de proteção.'}
        </p>
      )}

      <div className="tabs-wrapper">
        <button onClick={() => setTab('sangue')} className={`tab-btn ${tab === 'sangue' ? 'active' : ''}`}>
          <Droplet size={18} />
          <span>Exames de Sangue</span>
        </button>
        <button onClick={() => setTab('imagem')} className={`tab-btn ${tab === 'imagem' ? 'active' : ''}`}>
          <ImageIcon size={18} />
          <span>Exames de Imagem</span>
        </button>
      </div>
      </div>

      <div className="tela-lista">
      {carregando && <p className="empty-state">Carregando exames…</p>}
      {erro && !carregando && (
        <EstadoErro erro={erro} oQue="os exames" onTentarDeNovo={() => setTentativa((t) => t + 1)} />
      )}

      {!carregando && !erro && tab === 'sangue' && (
        coletas.length === 0 ? (
          <p className="empty-state">Nenhum exame de sangue registrado até o momento.</p>
        ) : (
          coletas.map((coleta) => {
            const alterados = totalAlterados(coleta);
            return (
              <div key={coleta.id} className="card exam-card">
                <div className="exam-card-header">
                  <div>
                    <h3 className="exam-card-title">
                      <Calendar size={16} /> {formatarData(coleta.data)}
                    </h3>
                    <p className="exam-card-meta">
                      <Building2 size={13} /> {coleta.local}
                    </p>
                    {coleta.solicitante && (
                      <p className="exam-card-meta">
                        <Stethoscope size={13} /> Solicitado por {coleta.solicitante}
                        {coleta.crm ? ` · ${coleta.crm}` : ''}
                      </p>
                    )}
                  </div>
                  {oculto ? (
                    <span className="status-badge oculto">•••</span>
                  ) : (
                    <StatusBadge
                      status={alterados > 0 ? 'alterado' : 'normal'}
                      texto={
                        alterados > 0
                          ? `${alterados} ${alterados === 1 ? 'alterado' : 'alterados'}`
                          : 'Tudo normal'
                      }
                    />
                  )}
                </div>

                {coleta.itens.map((item) => (
                  <ResultRow
                    key={item.id}
                    item={item}
                    medicoes={series[chaveDoItem(item)]?.length || 1}
                    onEvolucao={(it) => setEvolucao({ nome: it.nome, chave: chaveDoItem(it) })}
                  />
                ))}
              </div>
            );
          })
        )
      )}

      {!carregando && !erro && tab === 'imagem' && (
        imagem.length === 0 ? (
          <p className="empty-state">Nenhum exame de imagem registrado até o momento.</p>
        ) : (
          imagem.map((exame) => (
            <div key={exame.id} className="card exam-card">
              <div className="exam-card-header">
                <h3 className="exam-card-title">
                  <ImageIcon size={16} /> {exame.nome}
                  <BotaoExplicacao tipo="exame" termo={exame.nome} />
                </h3>
              </div>

              <InfoField icon={Calendar} label="Realizado em">
                {formatarData(exame.data)}
              </InfoField>
              <InfoField icon={Building2} label="Local">
                {exame.local}
              </InfoField>
              {exame.solicitante && (
                <InfoField icon={Stethoscope} label="Solicitado por">
                  {exame.solicitante}
                </InfoField>
              )}

              {exame.laudo && (
                <>
                  <p className="exam-laudo-label">Conclusão do laudo</p>
                  <p className={`record-card ${oculto ? 'valor-oculto' : ''}`}>
                    {oculto ? mascararTexto(exame.laudo) : exame.laudo}
                  </p>
                  <p className="exam-aviso">
                    <AlertTriangle size={13} /> Resumo informativo — não substitui o laudo oficial.
                  </p>
                </>
              )}
            </div>
          ))
        )
      )}
      </div>

      {/* Fechar o olhinho com o gráfico aberto também o esconde: ele é feito
          inteiro de valores. */}
      <Modal
        open={Boolean(evolucao) && !oculto && Boolean(series[evolucao?.chave])}
        title={evolucao ? `Evolução · ${evolucao.nome}` : ''}
        onClose={() => setEvolucao(null)}
      >
        {evolucao && series[evolucao.chave] && (
          <GraficoEvolucao nome={evolucao.nome} pontos={series[evolucao.chave]} />
        )}
      </Modal>
    </div>
  );
}
