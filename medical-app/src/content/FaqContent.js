// Perguntas e respostas exibidas na tela de Dúvidas Frequentes (/faq).
//
// É só texto: a tela (screens/Faq.jsx) cuida de exibir e de abrir/fechar cada
// resposta. Cada categoria tem um `id` que a tela usa para escolher o ícone.
//
// As respostas descrevem o que o app REALMENTE faz hoje — ao mudar um fluxo,
// revise o texto correspondente aqui.

export const FAQ = [
  {
    id: 'geral',
    titulo: 'Sobre o Saúde Conecta',
    perguntas: [
      {
        p: 'O que é o Saúde Conecta?',
        r: 'É um aplicativo que reúne em um só lugar as suas informações de saúde: tipo sanguíneo, carteira de vacinação, consultas, exames e prontuário. A ideia é funcionar como uma extensão do SUS, para você ter os seus dados à mão em qualquer atendimento.',
      },
      {
        p: 'O app substitui a consulta médica?',
        r: 'Não. Ele organiza e guarda as suas informações, mas quem avalia, diagnostica e prescreve é o profissional de saúde. Em caso de emergência, ligue para o SAMU (192) ou procure o pronto-socorro mais próximo.',
      },
      {
        p: 'Preciso pagar alguma coisa?',
        r: 'Não. O uso do aplicativo é gratuito.',
      },
      {
        p: 'Como falo com o suporte?',
        r: 'Pelo e-mail suporte@saudeconecta.com.br. Para assuntos de privacidade e proteção de dados, escreva para privacidade@saudeconecta.com.br.',
      },
    ],
  },
  {
    id: 'conta',
    titulo: 'Conta e acesso',
    perguntas: [
      {
        p: 'Como crio a minha conta?',
        r: 'Na tela de login, toque em "Cadastre-se" e preencha os seus dados. É preciso aceitar os Termos de Uso e a política de tratamento de dados para concluir o cadastro.',
      },
      {
        p: 'Quais são as regras da senha?',
        r: 'A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial.',
      },
      {
        p: 'Esqueci a minha senha. E agora?',
        r: 'A redefinição automática pelo aplicativo ainda está em desenvolvimento. Por enquanto, peça a troca de senha pelo e-mail suporte@saudeconecta.com.br.',
      },
      {
        p: 'Como saio da minha conta?',
        r: 'Toque em "Mais" na barra inferior e escolha "Sair". Isso apaga a sessão guardada no aparelho.',
      },
    ],
  },
  {
    id: 'dependentes',
    titulo: 'Dependentes',
    perguntas: [
      {
        p: 'Quem posso cadastrar como dependente?',
        r: 'Pessoas cujos dados de saúde você acompanha — filhos, idosos sob seus cuidados. Ao cadastrar, você declara ter autorização legal para gerenciar as informações dessa pessoa.',
      },
      {
        p: 'Como adiciono um dependente?',
        r: 'Vá em "Exames/Registros" → "Dependentes" e toque no botão de adicionar. Você informa nome, CPF, data de nascimento, gênero e tipo sanguíneo.',
      },
      {
        p: 'O dependente tem login próprio?',
        r: 'Não. Ele não acessa o aplicativo: os dados dele aparecem dentro da sua conta, e só você os vê.',
      },
    ],
  },
  {
    id: 'consultas',
    titulo: 'Consultas e exames',
    perguntas: [
      {
        p: 'Onde vejo as minhas consultas?',
        r: 'Na tela inicial, toque em "Agendamentos". As consultas ficam separadas entre as próximas (ainda por acontecer) e as anteriores. Tocando em uma delas você vê o local, o profissional, o resumo e a conduta.',
      },
      {
        p: 'Onde ficam os meus exames?',
        r: 'Em "Exames/Registros" → "Exames". Os exames de sangue aparecem agrupados por coleta e os de imagem trazem o laudo.',
      },
      {
        p: 'Como leio o resultado de um exame de sangue?',
        r: 'Cada item mostra o seu valor, a faixa de referência do laboratório e uma barra indicando onde o resultado caiu. O selo ao lado resume a situação: Normal, Limite (perto da borda da faixa) ou Alterado.',
      },
      {
        p: 'O que significa um resultado "Alterado"?',
        r: 'Que o valor ficou fora da faixa de referência. Isso não é um diagnóstico: muitos fatores mudam um exame, e só o médico consegue interpretar o resultado junto com o seu histórico. Leve o resultado à próxima consulta.',
      },
      {
        p: 'Quem coloca os meus exames e consultas no app?',
        r: 'O profissional de saúde que atende você, usando o código de acesso temporário que você gera no aplicativo.',
      },
    ],
  },
  {
    id: 'vacinas',
    titulo: 'Carteira de vacinação',
    perguntas: [
      {
        p: 'Como a minha carteira é montada?',
        r: 'A partir da sua data de nascimento, seguindo o calendário oficial do Programa Nacional de Imunizações (PNI). O app mostra as doses previstas para a sua idade e as que ainda vão chegar.',
      },
      {
        p: 'Posso ver a carteira de um dependente?',
        r: 'Sim. Em "Exames/Registros" → "Carteira de Vacinação", use o seletor no topo da tela para alternar entre você e cada dependente.',
      },
      {
        p: 'Onde vejo as campanhas de vacinação abertas?',
        r: 'No card "Avisos" da tela inicial. Ele mostra as campanhas nacionais em cartaz na data de hoje, com o público-alvo e o prazo final.',
      },
    ],
  },
  {
    id: 'medico',
    titulo: 'Acesso do médico',
    perguntas: [
      {
        p: 'Como mostro os meus dados a um médico?',
        r: 'Na tela inicial, toque em "Acesso do médico" e gere um código. O profissional digita esse código no portal do médico e passa a ver o seu resumo clínico.',
      },
      {
        p: 'Por quanto tempo o código vale?',
        r: 'O código expira em 30 minutos e serve para um único profissional. Depois de usado, a sessão do médico também dura 30 minutos.',
      },
      {
        p: 'O médico vê o meu CPF e o meu endereço?',
        r: 'Não. O resumo enviado ao profissional nunca inclui CPF, e-mail, telefone ou endereço — só o que interessa ao atendimento.',
      },
      {
        p: 'Posso escolher o que o médico faz com os meus dados?',
        r: 'Sim. Ao gerar o código você escolhe entre "Somente leitura", em que o médico apenas consulta, e "Leitura e registro", em que ele também pode lançar a consulta e os exames do dia.',
      },
      {
        p: 'Consigo cancelar um acesso já concedido?',
        r: 'Sim. Na mesma tela, a lista "Acessos concedidos" tem o botão de revogar. O corte vale na hora, mesmo que o médico esteja com a tela aberta.',
      },
    ],
  },
  {
    id: 'privacidade',
    titulo: 'Privacidade e segurança',
    perguntas: [
      {
        p: 'Os meus dados são vendidos ou compartilhados?',
        r: 'Não. Os seus dados só são compartilhados com os profissionais que você mesmo autoriza pelo código de acesso, ou quando a lei exigir.',
      },
      {
        p: 'A minha senha fica guardada em texto no sistema?',
        r: 'Não. O sistema guarda apenas uma versão criptografada (hash) da senha — nem a equipe do aplicativo consegue lê-la.',
      },
      {
        p: 'O assistente virtual tem acesso ao meu prontuário?',
        r: 'Não. Ele responde dúvidas sobre o aplicativo e recebe apenas a pergunta que você digita. Nenhum exame, consulta ou dado pessoal seu é enviado para fora.',
      },
      {
        p: 'Como peço a correção ou a exclusão dos meus dados?',
        r: 'A LGPD garante esse direito. Escreva para privacidade@saudeconecta.com.br pedindo o acesso, a correção ou a exclusão. O "Portal de Privacidade", no menu "Mais", detalha todos os seus direitos.',
      },
    ],
  },
];
