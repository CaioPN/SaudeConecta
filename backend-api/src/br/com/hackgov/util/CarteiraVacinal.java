package br.com.hackgov.util;

import br.com.hackgov.modelos.DoseVacina;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;

/**
 * As regras puras da carteira de vacinação: dada a data de nascimento e o que
 * já foi aplicado, diz qual é a data prevista de cada dose e se ela está em
 * dia, atrasada ou ainda por vir.
 *
 * Só contas — nada de banco nem de HTTP. É o mesmo papel dos arquivos de
 * {@code utils/} no front: a regra fica separada de quem busca o dado e de
 * quem desenha a tela, e por isso dá para conferir no papel.
 *
 * <h3>O que mudou em relação à primeira versão</h3>
 * Antes a tela adivinhava: toda dose com data prevista no passado aparecia
 * como tomada. Isso é o oposto de um alerta útil — a criança que não foi ao
 * posto aparecia em dia. Agora "aplicada" é só o que alguém registrou; o que
 * venceu sem registro fica atrasado, e é isso que o Dashboard avisa.
 */
public class CarteiraVacinal {

    /** Até esta idade a pessoa usa o calendário da criança. */
    public static final int IDADE_LIMITE_CRIANCA = 13;

    public static final String PUBLICO_CRIANCA = "crianca";
    public static final String PUBLICO_ADULTO = "adulto";

    /**
     * Qual calendário se aplica a quem nasceu na data informada.
     *
     * O corte é a idade, não o fato de ser titular ou dependente: um
     * dependente de 40 anos (um pai idoso sob cuidado, por exemplo) segue o
     * calendário do adulto como qualquer outro.
     */
    public static String publicoPara(String dataNascimento) {
        Integer idade = idadeEmAnos(dataNascimento);
        return (idade != null && idade < IDADE_LIMITE_CRIANCA) ? PUBLICO_CRIANCA : PUBLICO_ADULTO;
    }

    /** Idade em anos completos, ou null quando a data não veio ou é inválida. */
    public static Integer idadeEmAnos(String dataNascimento) {
        LocalDate nascimento = data(dataNascimento);
        if (nascimento == null) return null;
        return java.time.Period.between(nascimento, LocalDate.now()).getYears();
    }

    /**
     * Preenche a data prevista e o status de cada dose da lista.
     *
     * A lista já vem com {@code aplicadaEm} preenchido pelo DAO nas doses que
     * a pessoa tomou. Doses do calendário adulto não têm idade recomendada, e
     * por isso nunca ficam "atrasadas": elas dependem de campanha e de
     * histórico que o app não tem, então só existem dois estados, aplicada ou
     * pendente.
     */
    public static void calcular(List<DoseVacina> doses, String dataNascimento) {
        LocalDate nascimento = data(dataNascimento);
        LocalDate hoje = LocalDate.now();

        for (DoseVacina d : doses) {
            if (d.getAplicadaEm() != null) {
                d.setStatus(DoseVacina.STATUS_APLICADA);
                continue;
            }

            if (d.getIdadeMeses() == null || nascimento == null) {
                d.setStatus(DoseVacina.STATUS_PREVISTA);
                continue;
            }

            LocalDate prevista = nascimento.plusMonths(d.getIdadeMeses());
            d.setPrevista(prevista.toString());
            d.setStatus(prevista.isAfter(hoje)
                    ? DoseVacina.STATUS_PREVISTA
                    : DoseVacina.STATUS_ATRASADA);
        }
    }

    /** Quantas doses da lista já venceram sem registro de aplicação. */
    public static int contarAtrasadas(List<DoseVacina> doses) {
        int total = 0;
        for (DoseVacina d : doses) {
            if (DoseVacina.STATUS_ATRASADA.equals(d.getStatus())) total++;
        }
        return total;
    }

    private static LocalDate data(String iso) {
        if (iso == null || iso.isEmpty()) return null;
        try {
            return LocalDate.parse(iso.length() > 10 ? iso.substring(0, 10) : iso);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private CarteiraVacinal() { }
}
