package br.com.hackgov.principal;

import br.com.hackgov.modelos.Consulta;
import br.com.hackgov.modelos.Medico;
import br.com.hackgov.modelos.Paciente;

public class Principal {

    public static void main(String[] args) {

        Paciente paciente = new Paciente();

        paciente.setIdPaciente(1);
        paciente.setNome("Gabriel");
        paciente.setDataNascimento("02/06/2007");
        paciente.setCpf("12345678900");
        paciente.setTelefone("11999999999");
        paciente.setEmail("gabriel@gmail.com");
        paciente.setTipoSanguineo("O+");
        paciente.setGenero("Masculino");

        Medico medico = new Medico();

        medico.setNome("Dr Marcus");
        medico.setEspecialidade("Cardiologia");

        Consulta consulta = new Consulta();

        consulta.setData("06/05/2026");
        consulta.setStatus("Confirmada");

        consulta.setPaciente(paciente);
        consulta.setMedico(medico);

        System.out.println("===== DADOS DA CONSULTA =====");
        System.out.println("Paciente: " + consulta.getPaciente().getNome());
        System.out.println("CPF: " + consulta.getPaciente().getCpf());
        System.out.println("Médico: " + consulta.getMedico().getNome());
        System.out.println("Especialidade: " + consulta.getMedico().getEspecialidade());
        System.out.println("Data da consulta: " + consulta.getData());
        System.out.println("Status: " + consulta.getStatus());
        System.out.println("=============================");

        System.out.println();

        paciente.exibirFichaPaciente();
    }

}