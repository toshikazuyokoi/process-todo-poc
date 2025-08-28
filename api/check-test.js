const ts = require('typescript');
const fs = require('fs');

const filePath = './src/domain/ai-agent/services/__tests__/information-validation.service.spec.ts';
const source = fs.readFileSync(filePath, 'utf8');

const result = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    experimentalDecorators: true,
    emitDecoratorMetadata: true
  }
});

if (result.diagnostics && result.diagnostics.length > 0) {
  result.diagnostics.forEach(diagnostic => {
    const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
    console.log(`Line ${line + 1}, Col ${character + 1}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`);
  });
} else {
  console.log('No TypeScript errors found');
}
