package br.com.hackgov.db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

/**
 * Responsável por abrir a conexão com o banco MySQL "saudeconecta".
 *
 * É o MESMO banco usado pelo backend Node/React (ver database/schema.sql),
 * o que permite inserir/consultar pacientes pelo Java e vê-los no app.
 * Ajuste USUARIO/SENHA conforme a sua instalação do MySQL.
 */
public class Conexao {

    private static final String HOST  = "localhost";
    private static final int    PORTA = 3306;
    private static final String BANCO = "saudeconecta";
    private static final String USUARIO = "root";
    private static final String SENHA   = "@Luke1greivous4"; // mesma senha do backend/.env

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
        return DriverManager.getConnection(URL, USUARIO, SENHA);
    }

    private Conexao() {
        // classe utilitária: não deve ser instanciada
    }
}
