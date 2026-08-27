import os
import re

files = [
  'src/components/AccountList.tsx',
  'src/components/AgendaView.tsx',
  'src/components/NotificationCenter.tsx',
  'src/components/MonthlyPlanView.tsx',
  'src/services/FinancialEngine.ts',
  'src/components/InvestmentsView.tsx',
  'src/components/Dashboard.tsx'
]

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
        
    def repl_string_interp(m):
        return f"{{formatBRLFromCents({m.group(1).strip()})}}"
        
    def repl_generic(m):
        return f"formatBRLFromCents({m.group(1).strip()}).replace('R$ ', '')"
        
    # 1. R$ {(cents / 100).toFixed(2).replace('.', ',')} -> {formatBRLFromCents(cents)}
    content = re.sub(r'R\$\s*\{\(([^)\n]+?)\s*/\s*100\)\.toFixed\(2\)\.replace\(\'\.\',\s*\',\',\?\)\}', repl_string_interp, content)
    content = re.sub(r'R\$\s*\{\(([^)\n]+?)\s*/\s*100\)\.toFixed\(2\)\.replace\(\'\.\',\s*\',\'\)\}', repl_string_interp, content)
    
    # 2. `R$ ${(cents / 100).toFixed(2).replace('.', ',')}` -> `${formatBRLFromCents(cents)}`
    content = re.sub(r'`R\$\s*\$\{\(([^)\n]+?)\s*/\s*100\)\.toFixed\(2\)\.replace\(\'\.\',\s*\',\'\)\}`', lambda m: f"`${{formatBRLFromCents({m.group(1).strip()})}}`", content)
    
    # 3. {(cents / 100).toFixed(2).replace('.', ',')} -> {formatBRLFromCents(cents).replace('R$ ', '')}
    content = re.sub(r'\{\(([^)\n]+?)\s*/\s*100\)\.toFixed\(2\)\.replace\(\'\.\',\s*\',\'\)\}', lambda m: f"{{formatBRLFromCents({m.group(1).strip()}).replace('R$ ', '')}}", content)
    
    # 4. generic (cents / 100).toFixed(2).replace('.', ',') -> formatBRLFromCents(cents).replace('R$ ', '')
    content = re.sub(r'\(([^)\n]+?)\s*/\s*100\)\.toFixed\(2\)\.replace\(\'\.\',\s*\',\'\)', repl_generic, content)

    # Add import if missing
    if 'formatBRLFromCents' in content and 'import { formatBRLFromCents' not in content:
        lines = content.splitlines()
        for i, line in enumerate(lines):
            if line.startswith('import '):
                lines.insert(i, "import { formatBRLFromCents } from '../utils/currency';")
                break
        content = '\n'.join(lines) + '\n'

    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
