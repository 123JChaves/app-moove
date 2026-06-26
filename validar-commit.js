const fs = require('fs');

// Pega o caminho do arquivo temporário do commit enviado pelo Git
const commitMsgFile = process.argv[2];
if (!commitMsgFile) process.exit(0);

const commitMsg = fs.readFileSync(commitMsgFile, 'utf8').trim();
const regex = /^(feat|fix|docs|style|refactor|test|chore|perf|ci)(\(.+\))?: .+/;

if (!regex.test(commitMsg)) {
    console.error("❌ Erro: Mensagem de commit inválida!");
    console.error("Padrão exigido: <tipo>: <mensagem> (Ex: 'feat: corrige conexao')");
    process.exit(1); // Barra o commit
}