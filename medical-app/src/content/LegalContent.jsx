import React from 'react';

// Conteúdo textual dos Termos de Uso. Usado tanto na tela cheia (/terms)
// quanto na janelinha (modal) exibida no Cadastro.
export function TermsContent() {
  return (
    <>
      <h3 className="section-title">1. Aceitação dos Termos</h3>
      <p className="text-sm text-muted mb-6">
        Ao criar uma conta e utilizar o aplicativo Saúde Conecta, você declara ter lido,
        compreendido e concordado com estes Termos de Uso. Caso não concorde com qualquer
        condição aqui descrita, recomendamos que não utilize a plataforma.
      </p>

      <h3 className="section-title">2. Descrição do Serviço</h3>
      <p className="text-sm text-muted mb-6">
        O Saúde Conecta é uma plataforma digital que permite ao usuário organizar e
        acompanhar informações de saúde, como dados pessoais, dependentes, prontuário,
        exames e agendamentos. A plataforma tem caráter informativo e organizacional e
        não substitui, em nenhuma hipótese, o atendimento médico presencial ou a
        orientação de um profissional de saúde qualificado.
      </p>

      <h3 className="section-title">3. Cadastro e Conta do Usuário</h3>
      <p className="text-sm text-muted mb-6">
        O usuário é responsável por fornecer informações verdadeiras, completas e
        atualizadas no momento do cadastro, bem como por manter a confidencialidade de
        suas credenciais de acesso (e-mail e senha). Toda atividade realizada na conta é
        de responsabilidade do seu titular.
      </p>

      <h3 className="section-title">4. Dependentes</h3>
      <p className="text-sm text-muted mb-6">
        Ao cadastrar dependentes, o usuário declara possuir autorização legal para
        gerenciar os dados de saúde dessas pessoas, assumindo total responsabilidade
        pelas informações inseridas.
      </p>

      <h3 className="section-title">5. Uso Adequado</h3>
      <p className="text-sm text-muted mb-6">
        É vedado utilizar a plataforma para fins ilícitos, inserir dados de terceiros sem
        autorização, ou tentar comprometer a segurança e o funcionamento do sistema. O
        descumprimento poderá resultar na suspensão ou exclusão da conta.
      </p>

      <h3 className="section-title">6. Limitação de Responsabilidade</h3>
      <p className="text-sm text-muted mb-6">
        O Saúde Conecta não se responsabiliza por decisões médicas tomadas com base nas
        informações armazenadas na plataforma. Em situações de emergência, procure
        imediatamente atendimento médico ou ligue para o serviço de emergência (SAMU 192).
      </p>

      <h3 className="section-title">7. Alterações nos Termos</h3>
      <p className="text-sm text-muted mb-6">
        Estes Termos podem ser atualizados periodicamente. Alterações relevantes serão
        comunicadas dentro do aplicativo. O uso continuado após as mudanças representa a
        concordância com a versão vigente.
      </p>

      <h3 className="section-title">8. Contato</h3>
      <p className="text-sm text-muted">
        Em caso de dúvidas sobre estes Termos, entre em contato pelo e-mail
        <strong> suporte@saudeconecta.com.br</strong>.
      </p>
    </>
  );
}

// Conteúdo textual do Uso dos Dados / Privacidade (LGPD). Usado na tela cheia
// (/privacy) e na janelinha (modal) exibida no Cadastro.
export function PrivacyContent() {
  return (
    <>
      <h3 className="section-title">1. Dados que Coletamos</h3>
      <p className="text-sm text-muted mb-6">
        Coletamos os dados que você fornece ao se cadastrar e usar o app: dados de
        identificação (nome, CPF, e-mail, telefone, data de nascimento), dados de saúde
        (tipo sanguíneo, alergias, prontuário, exames) e dados de dependentes que você
        venha a cadastrar.
      </p>

      <h3 className="section-title">2. Como Utilizamos seus Dados</h3>
      <p className="text-sm text-muted mb-6">
        Seus dados são usados exclusivamente para fornecer e melhorar os serviços da
        plataforma: autenticar seu acesso, organizar seu histórico de saúde, gerenciar
        dependentes e gerar documentos como o relatório de exames em PDF. Não vendemos
        nem compartilhamos seus dados com terceiros para fins comerciais.
      </p>

      <h3 className="section-title">3. Armazenamento e Segurança</h3>
      <p className="text-sm text-muted mb-6">
        As senhas são armazenadas de forma criptografada (hash) e o acesso à sua conta é
        protegido por autenticação via token. Adotamos medidas técnicas e organizacionais
        para proteger seus dados contra acesso não autorizado, perda ou divulgação
        indevida.
      </p>

      <h3 className="section-title">4. Seus Direitos (LGPD)</h3>
      <p className="text-sm text-muted mb-6">
        Você tem direito de acessar, corrigir, atualizar e solicitar a exclusão dos seus
        dados pessoais, bem como revogar consentimentos a qualquer momento. Para exercer
        esses direitos, utilize as opções do app ou entre em contato com nosso
        Encarregado de Dados (DPO).
      </p>

      <h3 className="section-title">5. Compartilhamento</h3>
      <p className="text-sm text-muted mb-6">
        Seus dados poderão ser compartilhados apenas com profissionais e serviços de saúde
        autorizados por você, ou quando exigido por lei ou ordem judicial.
      </p>

      <h3 className="section-title">6. Cookies e Dados Locais</h3>
      <p className="text-sm text-muted mb-6">
        Utilizamos o armazenamento local do dispositivo apenas para manter sua sessão
        ativa (token de acesso) e melhorar a experiência de uso. Esses dados podem ser
        removidos ao sair da conta.
      </p>

      <h3 className="section-title">7. Contato do Encarregado (DPO)</h3>
      <p className="text-sm text-muted">
        Para tratar de assuntos relacionados à privacidade e proteção de dados, entre em
        contato pelo e-mail <strong>privacidade@saudeconecta.com.br</strong>.
      </p>
    </>
  );
}
