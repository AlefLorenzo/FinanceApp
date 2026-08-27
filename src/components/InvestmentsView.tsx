import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { v4 as uuidv4 } from 'uuid';
import type { InvestmentProfile } from '../types';
import { useFinancialSummary } from '../hooks/useFinancialSummary';
import { ChevronRight, Info } from 'lucide-react';

const PROFILES: { id: InvestmentProfile; label: string; desc: string; color: string; emoji: string }[] = [
  { id: 'conservative', label: 'Conservador', desc: 'Menor risco, retorno mais previsível', color: 'bg-green-100 border-green-300 text-green-800', emoji: '🛡️' },
  { id: 'moderate', label: 'Moderado', desc: 'Equilíbrio entre segurança e crescimento', color: 'bg-yellow-100 border-yellow-300 text-yellow-800', emoji: '⚖️' },
  { id: 'aggressive', label: 'Arrojado', desc: 'Maior potencial de crescimento, mais oscilações', color: 'bg-red-100 border-red-300 text-red-800', emoji: '🚀' },
];

const ALLOCATIONS: Record<InvestmentProfile, { name: string; percent: number; color: string; desc: string }[]> = {
  conservative: [
    { name: 'Tesouro Direto / CDB', percent: 60, color: '#22c55e', desc: 'Renda fixa com menor risco' },
    { name: 'Fundos DI', percent: 25, color: '#3b82f6', desc: 'Liquidez diária, segurança' },
    { name: 'FIIs', percent: 15, color: '#f59e0b', desc: 'Fundos imobiliários, renda mensal' },
  ],
  moderate: [
    { name: 'Tesouro / Renda Fixa', percent: 40, color: '#22c55e', desc: 'Base sólida' },
    { name: 'FIIs', percent: 25, color: '#f59e0b', desc: 'Renda mensal + valorização' },
    { name: 'ETFs', percent: 25, color: '#3b82f6', desc: 'Diversificação ampla' },
    { name: 'Ações', percent: 10, color: '#ef4444', desc: 'Potencial de crescimento' },
  ],
  aggressive: [
    { name: 'Ações', percent: 40, color: '#ef4444', desc: 'Alta volatilidade, alto potencial' },
    { name: 'ETFs internacionais', percent: 30, color: '#8b5cf6', desc: 'Exposição global' },
    { name: 'FIIs', percent: 20, color: '#f59e0b', desc: 'Renda e crescimento' },
    { name: 'Renda Fixa', percent: 10, color: '#22c55e', desc: 'Reserva de segurança' },
  ],
};

const INVESTMENTS_EDU = [
  { name: 'Tesouro Direto', risk: 'Baixo', liquidity: 'D+1', return_: '~6-12% a.a.', desc: 'Títulos do governo federal, considerado um dos mais seguros do Brasil.', where: 'App do Tesouro Direto, corretoras' },
  { name: 'CDB', risk: 'Baixo', liquidity: 'Varia', return_: '~100-130% CDI', desc: 'Certificado de Depósito Bancário. Empresta dinheiro ao banco.', where: 'Bancos e corretoras (NuBank, Inter, XP)' },
  { name: 'Fundos Imobiliários (FIIs)', risk: 'Médio', liquidity: 'D+2', return_: '~0.7-1%/mês', desc: 'Investe em imóveis e distribui renda mensal.', where: 'B3 via corretoras' },
  { name: 'ETFs (BOVA11, IVVB11)', risk: 'Médio', liquidity: 'D+2', return_: 'Varia com mercado', desc: 'Fundos que replicam índices como Ibovespa ou S&P 500.', where: 'B3 via corretoras' },
  { name: 'Ações', risk: 'Alto', liquidity: 'D+3', return_: 'Altamente variável', desc: 'Participação em empresas. Maior risco, maior potencial.', where: 'B3 via corretoras' },
];

function SimulatorSection({ monthlyCents }: { monthlyCents: number }) {
  const rates = [0.06, 0.09, 0.12];
  const years = [1, 5, 10, 20];

  const compound = (monthly: number, annual: number, years: number) => {
    const monthly_rate = Math.pow(1 + annual, 1 / 12) - 1;
    const months = years * 12;
    return monthly * ((Math.pow(1 + monthly_rate, months) - 1) / monthly_rate);
  };

  const simple = (monthly: number, years: number) => monthly * years * 12;

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <h3 className="font-bold text-gray-800">📈 Simulador de Rentabilidade</h3>
        <p className="text-xs text-gray-400 mt-1">Comparativo com cenários ilustrativos. Rentabilidade passada não garante futura.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Período</th>
              <th className="text-right p-4 text-xs font-black text-gray-400 uppercase">Guardado</th>
              <th className="text-right p-4 text-xs font-black text-green-600 uppercase">Conserv. 6%</th>
              <th className="text-right p-4 text-xs font-black text-yellow-600 uppercase">Moder. 9%</th>
              <th className="text-right p-4 text-xs font-black text-red-600 uppercase">Arrojado 12%</th>
            </tr>
          </thead>
          <tbody>
            {years.map(y => (
              <tr key={y} className="border-b border-gray-50">
                <td className="p-4 font-bold text-gray-700">{y} {y === 1 ? 'ano' : 'anos'}</td>
                <td className="p-4 text-right text-gray-400">
                  R$ {(simple(monthlyCents / 100, y)).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </td>
                {rates.map((r, i) => (
                  <td key={i} className="p-4 text-right font-bold text-gray-700">
                    R$ {Math.round(compound(monthlyCents / 100, r, y)).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function InvestmentsView() {
  const plan = useLiveQuery(() => db.investment_plans.toArray(), []);
  const monthPlan = useFinancialSummary();

  const [selectedProfile, setSelectedProfile] = useState<InvestmentProfile>(
    plan?.[0]?.profile || 'moderate'
  );
  const [monthly, setMonthly] = useState(
    plan?.[0]?.monthly_amount_cents ? plan[0].monthly_amount_cents / 100 : Math.round(monthPlan.availableForInvestmentCents / 100 / 100) * 100
  );
  const [activeTab, setActiveTab] = useState<'plan' | 'learn'>('plan');
  const [expandedEdu, setExpandedEdu] = useState<string | null>(null);

  const allocs = ALLOCATIONS[selectedProfile];
  const monthlyCents = Math.round(monthly * 100);

  const savePlan = async () => {
    const existing = await db.investment_plans.toArray();
    const data = {
      profile: selectedProfile,
      monthly_amount_cents: monthlyCents,
      allocations: allocs.map(a => ({ name: a.name, percent: a.percent, color: a.color })),
      updated_at: new Date()
    };
    if (existing.length > 0) {
      await db.investment_plans.update(existing[0].id, data);
    } else {
      await db.investment_plans.add({ ...data, id: uuidv4(), created_at: new Date() });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl">
        <button onClick={() => setActiveTab('plan')} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${activeTab === 'plan' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
          Meu Plano
        </button>
        <button onClick={() => setActiveTab('learn')} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${activeTab === 'learn' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
          Aprender
        </button>
      </div>

      {activeTab === 'plan' && (
        <>
          {/* How Much Can I Invest */}
          <div className="bg-gray-900 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2">Quanto posso investir?</p>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between text-gray-300">
                  <span>Renda</span>
                  <span>R$ {(monthPlan.expectedIncomeCents / 100).toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Contas</span>
                  <span className="text-red-400">- R$ {(monthPlan.totalExpensesCents / 100).toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Reserva sugerida</span>
                  <span className="text-blue-400">- R$ {(monthPlan.suggestedReserveCents / 100).toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between font-black text-white border-t border-gray-700 pt-2">
                  <span>Disponível</span>
                  <span className="text-green-400">R$ {(monthPlan.freeMoneyCents / 100).toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              {monthPlan.isTight ? (
                <div className="bg-red-900/50 border border-red-700 rounded-2xl p-4">
                  <p className="text-red-200 text-sm font-medium">⚠️ Orçamento apertado este mês. Foque em organizar as contas antes de investir.</p>
                </div>
              ) : (
                <div className="bg-white/10 border border-white/20 rounded-2xl p-4">
                  <p className="text-green-300 text-sm font-medium">
                    💡 Sugestão: investir até <strong>R$ {Math.round(monthPlan.availableForInvestmentCents / 100).toLocaleString()}</strong> sem comprometer seu orçamento.
                  </p>
                </div>
              )}
            </div>
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
          </div>

          {/* Monthly Amount Slider */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4 gap-2">
              <h3 className="font-bold text-gray-800 truncate">Aporte Mensal</h3>
              <span className="text-xl sm:text-2xl font-black text-blue-600 shrink-0 amount-text">R$ {monthly.toLocaleString()}</span>
            </div>
            <input
              type="range" min="50" max={Math.max(500, Math.round(monthPlan.freeMoneyCents / 100))}
              step="50" value={monthly}
              onChange={e => setMonthly(Number(e.target.value))}
              className="w-full h-2 accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>R$ 50</span>
              <span>R$ {Math.max(500, Math.round(monthPlan.freeMoneyCents / 100)).toLocaleString()}</span>
            </div>
          </div>


          {/* Profile Selection */}
          <div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Perfil de Risco</h3>
            <div className="space-y-3">
              {PROFILES.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProfile(p.id)}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition ${selectedProfile === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{p.emoji}</span>
                    <div>
                      <div className="font-bold text-gray-900">{p.label}</div>
                      <div className="text-xs text-gray-400">{p.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Allocation */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-5">Alocação Sugerida</h3>
            <div className="space-y-4">
              {allocs.map(a => (
                <div key={a.name}>
                  <div className="flex justify-between text-sm mb-1 gap-2">
                    <span className="font-bold text-gray-700 truncate">{a.name}</span>
                    <span className="font-black text-gray-900 shrink-0">
                      {a.percent}% · R$ {Math.round(monthly * a.percent / 100).toLocaleString()}/mês
                    </span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${a.percent}%`, backgroundColor: a.color }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{a.desc}</p>
                </div>
              ))}
            </div>
            <button onClick={savePlan} className="w-full mt-6 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition">
              Salvar Meu Plano
            </button>
          </div>

          {/* Simulator */}
          <SimulatorSection monthlyCents={monthlyCents} />
        </>
      )}

      {activeTab === 'learn' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 px-1">Clique em um ativo para entender como funciona.</p>
          {INVESTMENTS_EDU.map(inv => (
            <div key={inv.name} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
              <button
                className="w-full p-5 flex items-center justify-between"
                onClick={() => setExpandedEdu(expandedEdu === inv.name ? null : inv.name)}
              >
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5 text-blue-500 shrink-0" />
                  <div className="text-left">
                    <div className="font-bold text-gray-900">{inv.name}</div>
                    <div className="flex gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inv.risk === 'Baixo' ? 'bg-green-100 text-green-700' : inv.risk === 'Médio' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        Risco {inv.risk}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {inv.return_}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-gray-300 transition-transform ${expandedEdu === inv.name ? 'rotate-90' : ''}`} />
              </button>
              {expandedEdu === inv.name && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-sm text-gray-600 leading-relaxed">{inv.desc}</p>
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 font-bold uppercase">Liquidez</span>
                      <span className="font-bold text-gray-700">{inv.liquidity}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 font-bold uppercase">Onde comprar</span>
                      <span className="font-bold text-gray-700 text-right max-w-[60%]">{inv.where}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
            <p className="text-xs text-yellow-700 font-medium leading-relaxed">
              ⚠️ <strong>Aviso importante:</strong> As informações acima são educacionais e não constituem recomendação de investimento. Consulte um profissional certificado antes de investir.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
