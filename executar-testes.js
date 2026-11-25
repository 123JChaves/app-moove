const { execSync } = require('child_process');

console.log("🧪 Executando testes automatizados E2E locais antes do push...");

try {
    // Executa o primeiro script de teste
    console.log("\n▶️ Iniciando: Teste de Login...");
    execSync('npm run local:test:login', { stdio: 'inherit' });

    // Executa o segundo script de teste
    console.log("\n▶️ Iniciando: Teste de Cadastro...");
    execSync('npm run local:test:cadastro', { stdio: 'inherit' });

    console.log("\n✅ Todos os testes passaram localmente! Concluindo envio...");
    process.exit(0); // Libera o push
} catch (error) {
    console.error("\n❌ Erro: Um ou mais testes falharam. O envio foi cancelado.");
    process.exit(1); // Bloqueia o push
}