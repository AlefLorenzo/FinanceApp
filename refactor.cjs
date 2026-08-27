const fs = require('fs');
const files = [
  'src/components/AccountList.tsx',
  'src/components/AgendaView.tsx',
  'src/components/NotificationCenter.tsx',
  'src/components/MonthlyPlanView.tsx',
  'src/services/FinancialEngine.ts',
  'src/components/InvestmentsView.tsx',
  'src/components/Dashboard.tsx',
  'src/components/TopHeader.tsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');

  // Replace `R$ ${(X / 100).toFixed(2).replace('.', ',')}`
  content = content.replace(/`R\$\s*\$\{\(([^)\n]+)\s*\/\s*100\)\.toFixed\(2\)\.replace\('\.',\s*','\)\}`/g, '`${formatBRLFromCents($1)}`');
  
  // Replace R$ {(X / 100).toFixed(2).replace('.', ',')} 
  content = content.replace(/R\$\s*\{\(([^)\n]+)\s*\/\s*100\)\.toFixed\(2\)\.replace\('\.',\s*','\)\}/g, '{formatBRLFromCents($1)}');

  // Replace just {(X / 100).toFixed(2).replace('.', ',')}
  content = content.replace(/\{\(([^)\n]+)\s*\/\s*100\)\.toFixed\(2\)\.replace\('\.',\s*','\)\}/g, '{formatBRLFromCents($1).replace(\'R$ \', \'\')}');

  // Any remaining generic (X / 100).toFixed(2).replace('.', ',')
  content = content.replace(/\(([^)\n]+)\s*\/\s*100\)\.toFixed\(2\)\.replace\('\.',\s*','\)/g, 'formatBRLFromCents($1).replace(\'R$ \', \'\')');

  // Ensure import
  if (content.includes('formatBRLFromCents') && !content.includes('import { formatBRLFromCents')) {
     content = content.replace(/(import [^\n]+;\n)/, '$1import { formatBRLFromCents } from \'../utils/currency\';\n');
  }

  fs.writeFileSync(f, content);
});
