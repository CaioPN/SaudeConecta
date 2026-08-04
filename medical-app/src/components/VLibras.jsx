import { useEffect } from 'react';

/**
 * Integração com o VLibras (tradutor Português -> Libras do Governo Federal).
 *
 * O VLibras para web é um widget JavaScript oficial (não uma API REST):
 * carrega um avatar 3D flutuante que traduz o texto da página para Libras.
 * Gratuito e sem necessidade de chave/cadastro.
 *
 * Docs: https://www.gov.br/governodigital/pt-br/vlibras
 */
const PLUGIN_URL = 'https://vlibras.gov.br/app/vlibras-plugin.js';
const APP_URL = 'https://vlibras.gov.br/app';

export default function VLibras() {
  useEffect(() => {
    // Evita injetar o script mais de uma vez (StrictMode monta 2x em dev).
    if (document.getElementById('vlibras-plugin-script')) {
      return;
    }

    const script = document.createElement('script');
    script.id = 'vlibras-plugin-script';
    script.src = PLUGIN_URL;
    script.async = true;
    script.onload = () => {
      // O plugin expõe window.VLibras após carregar.
      if (window.VLibras) {
        new window.VLibras.Widget(APP_URL);
      }
    };
    document.body.appendChild(script);
  }, []);

  // Estrutura exigida pelo widget. Os atributos "vw" são lidos pelo plugin.
  return (
    <div vw="true" className="enabled">
      <div vw-access-button="true" className="active"></div>
      <div vw-plugin-wrapper="true">
        <div className="vw-plugin-top-wrapper"></div>
      </div>
    </div>
  );
}
