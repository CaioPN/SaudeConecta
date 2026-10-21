package br.com.hackgov.db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

import br.com.hackgov.util.Config;

/**
 * Responsável por abrir a conexão com o banco MySQL "saudeconecta".
 *
 * Usuário e senha vêm do config.properties (db.usuario / db.senha) ou das
 * variáveis DB_USUARIO / DB_SENHA — nunca do código. A senha esteve escrita
 * aqui, e o repositório é público: qualquer um a lia no GitHub.
 *
 * A conta usada é a saudeconecta_api, que só lê e grava linhas (sem CREATE,
 * ALTER ou DROP) e só entra pelo localhost. O schema.sql continua sendo
 * aplicado à mão com o root.
 */
public class Conexao {

    private static final String HOST  = "localhost";
    private static final int    PORTA = 3306;
    private static final String BANCO = "saudeconecta";

    private static final String URL =
        "jdbc:mysql://" + HOST + ":" + PORTA + "/" + BANCO
        + "?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&characterEncoding=UTF-8";

    // Garante que o driver do MySQL seja carregado (boa prática didática;
    // no connector 8.x o registro é automático, mas deixamos explícito).
    static {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            throw new RuntimeException(
                "Driver do MySQL não encontrado. Coloque o mysql-connector-j.jar em backend-api/lib/.", e);
        }
    }

    /** Abre e devolve uma nova conexão com o banco. */
    public static Connection abrir() throws SQLException {
        String usuario = Config.ler("db.usuario");
        String senha = Config.ler("db.senha");
        if (usuario == null || senha == null) {
            throw new SQLException(
                "Banco não configurado: preencha db.usuario e db.senha no config.properties.");
        }
        return DriverManager.getConnection(URL, usuario, senha);
    }

    private Conexao() {
        // classe utilitária: não deve ser instanciada
    }
}
