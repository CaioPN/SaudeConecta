// Um domínio, um ícone — em todo o app.
//
// Antes cada tela escolhia o seu: exames apareciam com "Activity" no perfil e
// com "Users" (o ícone de duas pessoas!) na barra inferior, e "Users" também
// era o de dependentes. Com o mapa aqui, mudar o ícone de um assunto é mexer
// em uma linha, e dois assuntos não podem acabar com o mesmo desenho sem que
// isso fique visível neste arquivo.
//
// Só a escolha do ícone mora aqui; o tamanho e a cor ficam com quem usa.
import {
  Home, HeartPulse, MapPin, Menu,
  FileText, Activity, Syringe, Users, Calendar,
  KeyRound, History, ShieldCheck,
  User, HelpCircle, ScrollText, Lock, LogOut,
} from 'lucide-react';

export const ICONES = {
  // Navegação principal
  inicio: Home,
  saude: HeartPulse,
  rede: MapPin,
  mais: Menu,

  // Registros de saúde
  prontuario: FileText,
  exames: Activity,
  consultas: Calendar,
  vacinas: Syringe,
  dependentes: Users,

  // Privacidade
  acessoMedico: KeyRound,
  historicoAcessos: History,
  privacidade: Lock,
  seguranca: ShieldCheck,

  // Conta e apoio
  perfil: User,
  duvidas: HelpCircle,
  termos: ScrollText,
  sair: LogOut,
};

export default ICONES;
