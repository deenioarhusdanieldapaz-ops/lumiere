const fs = require('fs');
let css = fs.readFileSync('pages/settings/settings.css', 'utf8');

// Mudar de fixed para absolute para o fundo acompanhar o scroll
css = css.replace(/position: fixed;/g, 'position: absolute;');

// Garantir que o contentor permite o scroll
css = css.replace('.settings-page {', '.settings-page {\n  position: relative;\n  overflow-x: hidden;');
fs.writeFileSync('pages/settings/settings.css', css);
console.log('Fundo alterado para scroll absoluto!');
