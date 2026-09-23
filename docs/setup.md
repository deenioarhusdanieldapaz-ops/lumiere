# Configuração do ambiente de desenvolvimento

## Ferramentas necessárias

- **Acode**: Editor de código para Android. Instale pela loja oficial.
- **Termux** (opcional, recomendado): Terminal para comandos Git, Node, npm.
- **Git**: Controle de versão.
- **Node.js e npm**: Para gerenciamento de pacotes e scripts.
- **Chrome/Firefox**: Navegadores para teste.

## Passos

1. Instale o Acode e conceda permissão de acesso à pasta do projeto.
2. No Acode, abra o terminal integrado ou use Termux.
3. Atualize pacotes no Termux (se usado): `pkg update && pkg upgrade`
4. Instale Git, Node.js (LTS) no Termux: `pkg install git nodejs-lts npm`
5. Verifique instalação: `git --version`, `node --version`, `npm --version`.
6. Crie o diretório do projeto e inicialize o Git.
7. Execute `npm init -y` para criar package.json.
8. Instale dependências de desenvolvimento conforme as fases (ex: Vitest, ESLint).
9. Para testar localmente, use um servidor como `npx serve` ou `npm run dev`.

## Dicas

- Mantenha o repositório sincronizado com GitHub para backup.
- Teste em Chrome e Firefox.
- Para PWA, o app deve ser servido por HTTPS ou localhost.
