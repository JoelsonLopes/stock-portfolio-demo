module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nova funcionalidade
        'fix',      // Correção de bug
        'docs',     // Mudanças na documentação
        'style',    // Formatação, ponto e vírgula, etc (não afeta código)
        'refactor', // Refatoração sem mudança de funcionalidade
        'test',     // Adição ou correção de testes
        'chore',    // Mudanças em build, ferramentas, etc
        'perf',     // Melhorias de performance
        'ci',       // Mudanças em CI/CD
        'build',    // Mudanças no sistema de build
        'revert'    // Reversão de commit
      ]
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100]
  }
};
