import React, { useState } from 'react';
import { ClassItem, ExpenseItem } from '../types';
import { Plus, Trash2, Eye, EyeOff, FileText, Send, Share2, DollarSign, Calendar, Eye as ViewIcon, EyeOff as ViewIconOff, Youtube, ChevronDown, ChevronUp, Headphones } from 'lucide-react';
import { motion } from 'motion/react';
import { BrazilianLogo } from './BrazilianLogo';

interface DashboardProps {
  classes: ClassItem[];
  expenses: ExpenseItem[];
  onAddClass: () => void;
  onUpdateClass: (id: string, updated: Partial<ClassItem>) => void;
  onDeleteClass: (id: string) => void;
  onAddExpense: () => void;
  onUpdateExpense: (id: string, updated: Partial<ExpenseItem>) => void;
  onDeleteExpense: (id: string) => void;
  confirmDel: boolean;
  blurValues: boolean;
  accentColor: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  classes,
  expenses,
  onAddClass,
  onUpdateClass,
  onDeleteClass,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  confirmDel,
  blurValues,
  accentColor,
}) => {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceiptType, setSelectedReceiptType] = useState<'individual' | 'turma' | 'bia' | null>(null);
  const [isValuesBlurred, setIsValuesBlurred] = useState<boolean>(blurValues !== undefined ? blurValues : true);
  const [showExtraFinances, setShowExtraFinances] = useState(false);

  const diasSemanaNomes = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO'];
  const diasSemanaCurto = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

  const getDayIndex = (date: Date) => {
    const jsDay = date.getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  };

  const todayIdx = getDayIndex(new Date());

  // Helper to calculate the monthly earnings value for a class item
  const getClassValue = (c: ClassItem) => {
    if (typeof c.valor === 'number' && c.valor > 0) return c.valor;
    if (c.tipo === 'turma') return 300;
    if (c.tipo === 'bia') return 200;
    // individual: active days * R$18 per class * 4 weeks a month
    const activeDaysCount = c.d.length;
    return activeDaysCount * 18 * 4;
  };

  // Calculates financial forecast values for total & broken down by the 3 companies
  const calculateFinances = () => {
    let totalRevenue = 0;
    let revenueYoubecome = 0; // turma
    let countYoubecome = 0;
    let revenueSeidmann = 0; // individual
    let countSeidmann = 0;
    let revenueBia = 0; // bia
    let countBia = 0;

    classes.forEach((c) => {
      const val = getClassValue(c);
      totalRevenue += val;

      if (c.tipo === 'turma') {
        revenueYoubecome += val;
        countYoubecome++;
      } else if (c.tipo === 'bia') {
        revenueBia += val;
        countBia++;
      } else {
        revenueSeidmann += val;
        countSeidmann++;
      }
    });

    let totalExpenses = 0;
    expenses.forEach((e) => {
      totalExpenses += e.v || 0;
    });

    return {
      revenue: totalRevenue,
      revenueYoubecome,
      countYoubecome,
      revenueSeidmann,
      countSeidmann,
      revenueBia,
      countBia,
      expenses: totalExpenses,
      balance: totalRevenue - totalExpenses,
    };
  };

  const {
    revenue,
    revenueYoubecome,
    countYoubecome,
    revenueSeidmann,
    countSeidmann,
    revenueBia,
    countBia,
    expenses: totalExpensesVal,
    balance,
  } = calculateFinances();

  const handleDayClick = (classItem: ClassItem, dayIdx: number) => {
    if (isPreviewMode) return;
    let newD = [...classItem.d];
    let newF = [...classItem.f];

    if (classItem.d.includes(dayIdx)) {
      // Transition from active to holiday
      newD = newD.filter((d) => d !== dayIdx);
      newF.push(dayIdx);
    } else if (classItem.f.includes(dayIdx)) {
      // Transition from holiday to inactive
      newF = newF.filter((f) => f !== dayIdx);
    } else {
      // Transition from inactive to active
      newD.push(dayIdx);
    }

    onUpdateClass(classItem.id, { d: newD, f: newF });
  };

  const handleDeleteClassWithConfirm = (id: string) => {
    onDeleteClass(id);
  };

  const handleDeleteExpenseWithConfirm = (id: string) => {
    onDeleteExpense(id);
  };

  // Helper to convert number to Portuguese written words (por extenso)
  const valorPorExtenso = (valor: number): string => {
    if (valor === 0) return 'zero reais';

    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const dezAonove = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    const inteiros = Math.floor(valor);
    const centavos = Math.round((valor - inteiros) * 100);

    const converteGrupo = (n: number): string => {
      if (n === 0) return '';
      if (n === 100) return 'cem';
      let res = '';
      const c = Math.floor(n / 100);
      const d = Math.floor((n % 100) / 10);
      const u = n % 10;

      if (c > 0) res += centenas[c];
      if (d === 1) {
        if (res) res += ' e ';
        res += dezAonove[u];
      } else {
        if (d > 1) {
          if (res) res += ' e ';
          res += dezenas[d];
        }
        if (u > 0) {
          if (res) res += ' e ';
          res += unidades[u];
        }
      }
      return res;
    };

    let texto = '';
    const milhar = Math.floor(inteiros / 1000);
    const resto = inteiros % 1000;

    if (milhar > 0) {
      if (milhar === 1) {
        texto += 'mil';
      } else {
        texto += converteGrupo(milhar) + ' mil';
      }
      if (resto > 0) {
        if (resto < 100 || resto % 100 === 0) {
          texto += ' e ';
        } else {
          texto += ' ';
        }
      }
    }

    if (resto > 0 || milhar === 0) {
      texto += converteGrupo(resto);
    }

    texto += inteiros === 1 ? ' real' : ' reais';

    if (centavos > 0) {
      texto += ' e ' + converteGrupo(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
    }

    return texto;
  };

  // Triggers print of dynamic styled invoice
  const handleGenerateReceipt = () => {
    if (!selectedReceiptType) {
      alert('Por favor, selecione o tipo de recibo.');
      return;
    }

    const formatCurrency = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const date = new Date();
    const mesExtenso = date.toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
    const dia = String(date.getDate()).padStart(2, '0');
    const ano = date.getFullYear();
    const ultimoDia = new Date(ano, date.getMonth() + 1, 0).getDate();
    const periodoDataExtenso = `01 a ${ultimoDia} de ${mesExtenso.toLowerCase()} de ${ano}`;
    const emissaoData = `${dia} DE ${mesExtenso} DE ${ano}`;

    const receiptNum = `REC-${ano}-${selectedReceiptType.toUpperCase()}-${Math.floor(Math.random() * 8999 + 1000)}`;

    const companyConfigs = {
      turma: {
        companyName: 'YOUBECOME',
        cnpj: '25.464.755/0001-78',
        roleTitle: 'Professor de Inglês',
        badgeColor: '#2563eb',
        headerBg: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
        accentColor: '#3b82f6',
        modalidadeName: 'Turmas (Aulas Coletivas de Inglês)',
        contractorLabel: 'Empresa Contratante',
      },
      individual: {
        companyName: 'SEIDMANN',
        cnpj: '48.123.878/0001-40',
        roleTitle: 'Professor de Inglês',
        badgeColor: '#d97706',
        headerBg: 'linear-gradient(135deg, #18181b 0%, #451a03 100%)',
        accentColor: '#f59e0b',
        modalidadeName: 'Aulas Individuais de Inglês (VIP)',
        contractorLabel: 'Empresa Contratante',
      },
      bia: {
        companyName: 'BRAZILIAN IN ACTION',
        cnpj: '65.698.927/0001-92',
        roleTitle: 'Professor de Inglês',
        badgeColor: '#059669',
        headerBg: 'linear-gradient(135deg, #022c22 0%, #065f46 100%)',
        accentColor: '#10b981',
        modalidadeName: 'Ensino de Inglês - B.I.A.',
        contractorLabel: 'Instituição / Empresa',
      },
    };

    const config = companyConfigs[selectedReceiptType];
    let rowsHtml = '';
    let totalValue = 0;

    classes.forEach((c) => {
      if (c.tipo !== selectedReceiptType) return;
      const val = getClassValue(c);

      if (val > 0) {
        totalValue += val;
        const activeDays = c.d.length > 0 ? c.d.map((dIdx) => diasSemanaCurto[dIdx]).join(', ') : 'Flexível';
        rowsHtml += `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 14px 18px; color: #0f172a; font-weight: 600; font-size: 13px;">
              ${c.n || 'Estudante'}
              ${c.notas ? `<br><small style="color: #64748b; font-weight: 400; font-size: 11px;">Nota: ${c.notas}</small>` : ''}
            </td>
            <td style="padding: 14px 18px; color: #475569; text-align: center; font-size: 12px; font-weight: 500;">
              ${c.h || 'A combinar'}
            </td>
            <td style="padding: 14px 18px; color: #475569; text-align: center; font-size: 12px; font-weight: 500;">
              ${activeDays}
            </td>
            <td style="padding: 14px 18px; color: #0f172a; text-align: right; font-weight: 700; font-size: 14px; font-family: monospace;">
              ${formatCurrency(val)}
            </td>
          </tr>
        `;
      }
    });

    const valorExtensoTexto = valorPorExtenso(totalValue);
    const declarationText = `Eu, <strong>André Augusto Cardoso Junior</strong>, portador do CPF nº <strong>000.000.000-00</strong>, declaro que lecionei aulas de Inglês para a empresa <strong>${config.companyName}</strong> (CNPJ: ${config.cnpj}) no período de <strong>${periodoDataExtenso}</strong>, no valor total de <strong>${formatCurrency(totalValue)}</strong> (<em>${valorExtensoTexto}</em>), referente aos alunos listados abaixo.`;

    const win = window.open('', '_blank', 'height=850,width=950');
    if (!win) {
      alert('Por favor, autorize pop-ups para gerar recibos.');
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Declaração e Recibo - ${config.companyName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
            * { box-sizing: border-box; }
            body {
              font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
              background: #f1f5f9;
              padding: 40px 20px;
              margin: 0;
              color: #1e293b;
            }
            .invoice-card {
              background: #ffffff;
              max-width: 850px;
              margin: auto;
              border-radius: 20px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.08);
              overflow: hidden;
              border: 1px solid #e2e8f0;
            }
            .header-banner {
              background: ${config.headerBg};
              padding: 36px 40px;
              color: white;
              display: flex;
              justify-content: space-between;
              align-items: center;
              position: relative;
            }
            .header-left { display: flex; align-items: center; gap: 20px; }
            .logo-box {
              width: 56px;
              height: 56px;
              background: rgba(255, 255, 255, 0.1);
              border: 1.5px solid rgba(255, 255, 255, 0.25);
              border-radius: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              backdrop-filter: blur(8px);
            }
            .header-info h1 {
              margin: 0;
              font-size: 22px;
              font-weight: 800;
              letter-spacing: 1px;
            }
            .header-info p {
              margin: 4px 0 0;
              font-size: 11px;
              color: rgba(255, 255, 255, 0.75);
              text-transform: uppercase;
              letter-spacing: 1.5px;
            }
            .receipt-badge {
              background: rgba(255, 255, 255, 0.15);
              border: 1px solid rgba(255, 255, 255, 0.3);
              color: #ffffff;
              padding: 6px 16px;
              border-radius: 30px;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 1.5px;
              text-align: right;
            }
            .info-grid {
              padding: 28px 40px;
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 16px;
              background: #f8fafc;
              border-bottom: 1px solid #e2e8f0;
            }
            .info-item span {
              display: block;
              font-size: 10px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.8px;
              font-weight: 700;
              margin-bottom: 4px;
            }
            .info-item p {
              margin: 0;
              font-size: 13px;
              font-weight: 700;
              color: #0f172a;
            }
            .declaration-box {
              margin: 30px 40px 20px;
              padding: 22px 26px;
              background: #f8fafc;
              border-left: 4px solid ${config.accentColor};
              border-radius: 0 16px 16px 0;
              border-top: 1px solid #f1f5f9;
              border-right: 1px solid #f1f5f9;
              border-bottom: 1px solid #f1f5f9;
            }
            .declaration-title {
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              font-weight: 800;
              color: ${config.accentColor};
              margin-bottom: 8px;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .declaration-text {
              font-size: 14px;
              line-height: 1.6;
              color: #334155;
              margin: 0;
            }
            .table-container { padding: 10px 40px 20px; }
            table { width: 100%; border-collapse: collapse; }
            th {
              background: #f1f5f9;
              padding: 12px 18px;
              text-align: left;
              font-size: 12px;
              color: #475569;
              text-transform: uppercase;
              letter-spacing: 1px;
              font-weight: 700;
            }
            .total-banner {
              margin: 10px 40px 30px;
              padding: 20px 28px;
              background: #0f172a;
              color: white;
              border-radius: 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .total-left span { display: block; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
            .total-left p { margin: 2px 0 0; font-size: 13px; color: #cbd5e1; }
            .total-right { text-align: right; }
            .total-amount { font-size: 26px; font-weight: 800; font-family: monospace; color: ${config.accentColor}; }
            .signature-section {
              padding: 20px 40px 40px;
              display: flex;
              justify-content: space-between;
              gap: 40px;
            }
            .sig-block {
              flex: 1;
              text-align: center;
              padding-top: 15px;
              border-top: 1.5px solid #cbd5e1;
            }
            .sig-name { font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 4px; }
            .sig-role { font-size: 12px; color: #64748b; margin-top: 2px; }
            .document-footer {
              padding: 16px 40px;
              background: #f8fafc;
              border-top: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 12px;
              color: #94a3b8;
            }
            @media print {
              body { background: white; padding: 0; }
              .invoice-card { box-shadow: none; border: none; max-width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-card">
            <!-- HEADER WITH LOGO -->
            <div class="header-banner">
              <div class="header-left">
                <div class="logo-box">
                  <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="46" fill="#022c22" stroke="#10b981" stroke-width="3"/>
                    <polygon points="50,16 84,50 50,84 16,50" fill="#f59e0b"/>
                    <circle cx="50" cy="50" r="20" fill="#1e3a8a"/>
                    <path d="M 32 50 Q 50 42 68 50" stroke="#ffffff" stroke-width="3" fill="none"/>
                  </svg>
                </div>
                <div class="header-info">
                  <h1>${config.companyName}</h1>
                  <p>Brazilian in Action Academic Management System</p>
                </div>
              </div>
              <div class="receipt-badge">
                DECLARAÇÃO DE RECIBO<br>
                <small style="font-weight: 400; font-size: 9px; opacity: 0.85;">${receiptNum}</small>
              </div>
            </div>

            <!-- INFO GRID -->
            <div class="info-grid">
              <div class="info-item">
                <span>Emitente / Docente</span>
                <p>André Augusto Cardoso Jr.</p>
              </div>
              <div class="info-item">
                <span>${config.contractorLabel}</span>
                <p>${config.companyName}</p>
              </div>
              <div class="info-item">
                <span>CNPJ Registrado</span>
                <p>${config.cnpj}</p>
              </div>
              <div class="info-item" style="text-align: right;"><span>Data de Emissão</span><p>${emissaoData}</p></div>
            </div>

            <!-- DECLARAÇÃO ESCRITA -->
            <div class="declaration-box">
              <div class="declaration-title">
                 DECLARAÇÃO DE PRESTAÇÃO DE SERVIÇOS
              </div>
              <p class="declaration-text">
                ${declarationText}
              </p>
            </div>

            <!-- TABELA DE ALUNOS E VALORES -->
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Estudante / Turma</th>
                    <th style="text-align: center;">Horário</th>
                    <th style="text-align: center;">Dias</th>
                    <th style="text-align: right;">Honorários (BRL)</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    rowsHtml ||
                    '<tr><td colspan="4" style="text-align:center; padding: 25px; color: #94a3b8;">Nenhum registro ativo nesta modalidade.</td></tr>'
                  }
                </tbody>
              </table>
            </div>

            <!-- TOTAL BANNER -->
            <div class="total-banner">
              <div class="total-left">
                <span>VALOR TOTAL APURADO (${mesExtenso} / ${ano})</span>
                <p>Modalidade: ${config.modalidadeName}</p>
              </div>
              <div class="total-right">
                <div class="total-amount">${formatCurrency(totalValue)}</div>
              </div>
            </div>

            <!-- SIGNATURE SECTION -->
            <div class="signature-section">
              <div class="sig-block">
                <div class="sig-name">André Augusto Cardoso Junior</div>
                <div class="sig-role">Professor de Inglês</div>
              </div>
              <div class="sig-block">
                <div class="sig-name">${config.companyName}</div>
                <div class="sig-role">Empresa / Contratante</div>
              </div>
            </div>

            <!-- FOOTER -->
            <div class="document-footer">
              <span>Emitido via Brazilian in Action Elite Dashboard</span>
              <span>Autenticidade Garantida • ${receiptNum}</span>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            }
          </script>
        </body>
      </html>
    `);
    win.document.close();
    setReceiptModalOpen(false);
  };

  const filteredClasses = showTodayOnly
    ? classes.filter((c) => c.d.includes(todayIdx))
    : classes;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-32">
      {/* Top sticky/fixed style banner */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-neutral-950/80 backdrop-blur-md border border-white/15 p-5 rounded-2xl mb-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
          <BrazilianLogo size="lg" />
          <div className="h-8 w-[1px] bg-white/10 hidden md:block" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs tracking-widest text-amber-400 font-mono font-bold uppercase">Portal do Professor</span>
            <h2 className="text-xl font-light text-white/90">Painel Geral de Controle</h2>
          </div>
        </div>

        {/* Balance card */}
        <div className="flex gap-6 bg-neutral-950/90 border border-white/15 rounded-xl p-3 px-5 items-center justify-between group relative backdrop-blur-md shadow-lg">
          <div className="flex flex-col gap-1 text-xs text-white/50">
            <div>Receita Total: <span className={`font-mono font-bold text-emerald-400 ${isValuesBlurred ? 'blur-sm group-hover:blur-none transition-all duration-300' : ''}`}>R$ {revenue.toFixed(2)}</span></div>
            <div>Despesa Total: <span className={`font-mono font-bold text-red-400 ${isValuesBlurred ? 'blur-sm group-hover:blur-none transition-all duration-300' : ''}`}>R$ {totalExpensesVal.toFixed(2)}</span></div>
            <div className="border-t border-white/10 pt-1 mt-1 text-white font-bold">
              SALDO LÍQUIDO: <span className={`font-mono ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'} ${isValuesBlurred ? 'blur-sm group-hover:blur-none transition-all duration-300' : ''}`}>R$ {balance.toFixed(2)}</span>
            </div>
          </div>
          
          <button
            onClick={() => setIsValuesBlurred(!isValuesBlurred)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all text-xs font-mono border border-white/10 cursor-pointer"
            title="Clique para ocultar ou exibir valores financeiros"
          >
            {isValuesBlurred ? <EyeOff size={14} className="text-amber-400" /> : <Eye size={14} className="text-emerald-400" />}
            <span>{isValuesBlurred ? 'Oculto' : 'Visível'}</span>
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE 3 EMPRESAS FINANCIAL BREAKDOWN */}
      <div className="mb-6 rounded-2xl bg-neutral-950/60 border border-white/10 overflow-hidden backdrop-blur-md">
        <button
          onClick={() => setShowExtraFinances(!showExtraFinances)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.05] transition-all text-left text-xs font-mono text-white/80 hover:text-white cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400/80" />
            <span className="uppercase tracking-wider font-bold">Detalhamento Financeiro por Empresa</span>
          </div>
          <div className="flex items-center gap-1 text-xs font-sans text-white/60">
            <span>{showExtraFinances ? 'Ocultar' : 'Expandir'}</span>
            {showExtraFinances ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </button>

        {showExtraFinances && (
          <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-white/10">
            {/* YOUBECOME (Turmas) */}
            <div className="bg-neutral-950/85 border border-blue-500/30 rounded-2xl p-4 backdrop-blur-md shadow-lg flex items-center justify-between group">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                  <span className="text-xs font-mono font-bold tracking-widest text-blue-400 uppercase">
                    YOUBECOME
                  </span>
                </div>
                <span className="text-xs text-white/60 font-medium">
                  Turmas: {countYoubecome} {countYoubecome === 1 ? 'aula' : 'aulas'}
                </span>
              </div>
              <div className="text-right">
                <span className={`text-base sm:text-lg font-bold font-mono text-blue-300 block ${isValuesBlurred ? 'blur-sm group-hover:blur-none transition-all duration-300' : ''}`}>
                  R$ {revenueYoubecome.toFixed(2)}
                </span>
                <span className="text-xs text-white/50 uppercase font-mono tracking-wider">Receita Mensal</span>
              </div>
            </div>

            {/* SEIDMANN (Individuais) */}
            <div className="bg-neutral-950/85 border border-amber-500/30 rounded-2xl p-4 backdrop-blur-md shadow-lg flex items-center justify-between group">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
                  <span className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
                    SEIDMANN
                  </span>
                </div>
                <span className="text-xs text-white/60 font-medium">
                  Individuais: {countSeidmann} {countSeidmann === 1 ? 'aula' : 'aulas'}
                </span>
              </div>
              <div className="text-right">
                <span className={`text-base sm:text-lg font-bold font-mono text-amber-300 block ${isValuesBlurred ? 'blur-sm group-hover:blur-none transition-all duration-300' : ''}`}>
                  R$ {revenueSeidmann.toFixed(2)}
                </span>
                <span className="text-xs text-white/50 uppercase font-mono tracking-wider">Receita Mensal</span>
              </div>
            </div>

            {/* BRAZILIAN IN ACTION (B.I.A.) */}
            <div className="bg-neutral-950/85 border border-red-500/30 rounded-2xl p-4 backdrop-blur-md shadow-lg flex items-center justify-between group">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
                  <span className="text-xs font-mono font-bold tracking-widest text-red-400 uppercase">
                    BRAZILIAN IN ACTION
                  </span>
                </div>
                <span className="text-xs text-white/60 font-medium">
                  B.I.A.: {countBia} {countBia === 1 ? 'aula' : 'aulas'}
                </span>
              </div>
              <div className="text-right">
                <span className={`text-base sm:text-lg font-bold font-mono text-red-300 block ${isValuesBlurred ? 'blur-sm group-hover:blur-none transition-all duration-300' : ''}`}>
                  R$ {revenueBia.toFixed(2)}
                </span>
                <span className="text-xs text-white/50 uppercase font-mono tracking-wider">Receita Mensal</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Toolbar Panel */}
      <div className="flex flex-wrap items-center gap-3 mb-6 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowTodayOnly(!showTodayOnly)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
              showTodayOnly ? 'text-black border-amber-500' : 'text-white/70 hover:text-white bg-neutral-950/80 border-white/15 backdrop-blur-md shadow-md'
            }`}
            style={showTodayOnly ? { backgroundColor: accentColor } : undefined}
          >
            {showTodayOnly ? 'Mostrando Hoje' : 'Filtrar Hoje'}
          </button>

          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer bg-neutral-950/80 border border-white/15 backdrop-blur-md shadow-md text-white/80 hover:text-white flex items-center gap-2"
          >
            {isPreviewMode ? <ViewIconOff size={14} /> : <ViewIcon size={14} />}
            <span>{isPreviewMode ? 'Modo Edição' : 'Modo Leitura'}</span>
          </button>

          {/* Discreet Privacy Values Toggle Button */}
          <button
            onClick={() => setIsValuesBlurred(!isValuesBlurred)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer bg-neutral-950/80 border backdrop-blur-md shadow-md flex items-center gap-2 ${
              isValuesBlurred ? 'text-amber-400 border-amber-500/40 hover:bg-amber-500/10' : 'text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10'
            }`}
            title="Privacidade: Clique para ocultar ou revelar todos os valores financeiros"
          >
            {isValuesBlurred ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{isValuesBlurred ? 'Valores Ocultos' : 'Valores Visíveis'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://www.youtube.com/@brazilianinaction"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 flex items-center gap-2 backdrop-blur-md shadow-md"
            title="Abrir Canal no YouTube (@brazilianinaction)"
          >
            <Youtube size={14} className="text-red-500" />
            <span>YouTube</span>
          </a>

          <a
            href="https://meet.google.com/son-qbiu-obq"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 flex items-center gap-2 backdrop-blur-md shadow-md"
          >
            <Share2 size={13} />
            <span>Google Meet</span>
          </a>

          <button
            onClick={() => setReceiptModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 flex items-center gap-2 cursor-pointer backdrop-blur-md shadow-md"
          >
            <FileText size={13} />
            <span>Gerar Recibo</span>
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classes Table */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex justify-between items-center pb-2">
            <h3 className="text-xs font-bold font-mono tracking-[0.2em] text-white/90 uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>AULAS E TURMAS</span>
            </h3>
            <span className="text-xs text-white/50 font-mono font-semibold">{classes.length} cadastradas</span>
          </div>

          <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {filteredClasses.length === 0 ? (
              <div className="text-center py-12 text-white/40 italic text-sm bg-neutral-950/70 border border-dashed border-white/15 rounded-2xl backdrop-blur-md">
                Nenhuma aula cadastrada. Clique no botão abaixo para adicionar.
              </div>
            ) : (
              filteredClasses.map((item) => {
                const borderAccent =
                  item.tipo === 'bia'
                    ? 'border-l-[4px] border-l-red-500'
                    : item.tipo === 'turma'
                    ? 'border-l-[4px] border-l-blue-500'
                    : 'border-l-[4px] border-l-amber-500';

                const classVal = getClassValue(item);
                const companyInfo =
                  item.tipo === 'bia'
                    ? { name: 'B.I.A.', color: 'text-red-400 bg-red-500/10 border-red-500/20' }
                    : item.tipo === 'turma'
                    ? { name: 'YOUBECOME', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' }
                    : { name: 'SEIDMANN', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col p-4 rounded-2xl bg-neutral-950/80 border border-white/15 hover:border-white/30 backdrop-blur-md shadow-lg transition-all gap-3 ${borderAccent}`}
                  >
                    {/* Header line */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <span className={`text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${companyInfo.color}`}>
                          {companyInfo.name}
                        </span>
                        {isPreviewMode ? (
                          <span className="text-sm font-semibold text-white/90 px-1 py-1">
                            {item.n || 'Estudante Sem Nome'}
                          </span>
                        ) : (
                          <input
                            type="text"
                            value={item.n}
                            onChange={(e) => onUpdateClass(item.id, { n: e.target.value })}
                            placeholder="Nome do Estudante"
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-medium focus:outline-none focus:border-white/30 w-full"
                          />
                        )}
                      </div>

                      {/* Calculated Financial Value Pill for this class */}
                      <div className="flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-xl">
                        <DollarSign size={14} className="text-emerald-400" />
                        <span className={`text-sm font-mono font-bold text-emerald-300 ${isValuesBlurred ? 'blur-sm hover:blur-none transition-all' : ''}`}>
                          R$ {classVal.toFixed(2)}
                        </span>
                        <span className="text-xs text-emerald-400/70 font-mono">/mês</span>
                      </div>

                      {/* Day selection list */}
                      <div className="flex gap-1.5 select-none">
                        {diasSemanaCurto.map((dia, idx) => {
                          const isActive = item.d.includes(idx);
                          const isHoliday = item.f.includes(idx);

                          let dayClass = 'bg-white/5 text-white/40 hover:bg-white/10';
                          if (isHoliday) {
                            dayClass = 'bg-red-500 text-white font-bold shadow-md shadow-red-500/25';
                          } else if (isActive) {
                            dayClass = 'bg-white/20 text-white font-bold border border-white/25';
                          }

                          return (
                            <button
                              key={idx}
                              onClick={() => handleDayClick(item, idx)}
                              disabled={isPreviewMode}
                              className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${dayClass}`}
                              title={`${diasSemanaNomes[idx]} (Clique para alternar: Ativo -> Feriado -> Inativo)`}
                            >
                              {dia}
                            </button>
                          );
                        })}
                      </div>

                      {/* Drive Folder Shortcuts */}
                      <div className="flex items-center gap-1.5">
                        <a
                          href="https://drive.google.com/drive/folders/1UOND8-HDaBP3FbG1oaIGMgulBFaxgjnj"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full bg-purple-500/10 hover:bg-purple-500/25 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-300 transition-all"
                          title="Youbecome Drive Folder (Y)"
                        >
                          Y
                        </a>
                        <a
                          href="https://drive.google.com/drive/folders/13jIMCDYvXhbmqAbsa2Df7BtuOUs4j-3o"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full bg-blue-500/10 hover:bg-blue-500/25 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-300 transition-all"
                          title="B.I.A. Drive Folder (B)"
                        >
                          B
                        </a>
                        <a
                          href="https://seidmanninstitute.com/dashboard-professores"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-300 transition-all"
                          title="Seidmann Dashboard (S)"
                        >
                          S
                        </a>
                      </div>
                    </div>

                    {/* Options Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-black/10 p-2.5 rounded-xl">
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Type selection */}
                        {isPreviewMode ? (
                          <span className="text-xs uppercase font-mono px-2.5 py-1 rounded bg-white/5 text-white/60 tracking-wider">
                            {item.tipo}
                          </span>
                        ) : (
                          <select
                            value={item.tipo}
                            onChange={(e) => onUpdateClass(item.id, { tipo: e.target.value as any })}
                            className="bg-neutral-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                          >
                            <option value="individual">Individual (Seidmann)</option>
                            <option value="turma">Turma (Youbecome)</option>
                            <option value="bia">B.I.A. (Brazilian in Action)</option>
                          </select>
                        )}

                        {/* Custom Monthly Value override input (in edit mode) */}
                        {!isPreviewMode && (
                          <div className="flex items-center gap-1 bg-neutral-950 px-2.5 py-1 rounded-lg border border-white/10" title="Definir valor mensal customizado para esta aula/estudante">
                            <span className="text-xs text-emerald-400 font-mono font-bold">R$</span>
                            <input
                              type="number"
                              value={item.valor || ''}
                              onChange={(e) => {
                                const valStr = e.target.value;
                                const num = valStr === '' ? undefined : parseFloat(valStr);
                                onUpdateClass(item.id, { valor: num });
                              }}
                              placeholder="Valor Fixo"
                              className="bg-transparent border-none text-xs text-emerald-300 font-mono font-bold focus:outline-none w-20"
                            />
                          </div>
                        )}

                        {/* Hour selection */}
                        {isPreviewMode ? (
                          <span className="text-xs font-mono text-white/70">
                            {item.h}:00 {item.p}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded border border-white/5">
                            <select
                              value={item.h}
                              onChange={(e) => onUpdateClass(item.id, { h: e.target.value })}
                              className="bg-transparent border-none text-xs text-white focus:outline-none"
                            >
                              {Array.from({ length: 12 }, (_, i) => {
                                const hr = String(i + 1).padStart(2, '0');
                                return <option key={hr} value={hr}>{hr}</option>;
                              })}
                            </select>
                            <select
                              value={item.p}
                              onChange={(e) => onUpdateClass(item.id, { p: e.target.value as any })}
                              className="bg-transparent border-none text-xs text-white focus:outline-none"
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Notes Input */}
                      <div className="flex-1 max-w-sm">
                        {isPreviewMode ? (
                          item.notas && (
                            <span className="text-xs text-white/40 italic">
                              "{item.notas}"
                            </span>
                          )
                        ) : (
                          <input
                            type="text"
                            value={item.notas}
                            onChange={(e) => onUpdateClass(item.id, { notas: e.target.value })}
                            placeholder="Notas / Observações..."
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:border-white/30 w-full"
                          />
                        )}
                      </div>

                      {!isPreviewMode && (
                        <button
                          onClick={() => handleDeleteClassWithConfirm(item.id)}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer"
                          title="Deletar aula"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {!isPreviewMode && (
            <button
              onClick={onAddClass}
              className="mt-6 w-full py-3.5 border border-dashed rounded-xl flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase transition-all duration-200 cursor-pointer"
              style={{ borderColor: accentColor, color: accentColor }}
            >
              <Plus size={16} />
              <span>Adicionar Nova Aula</span>
            </button>
          )}
        </div>

        {/* Expenses and Budget Panel */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
              <h3 className="text-sm font-light tracking-[0.2em] text-white/80 uppercase">DESPESAS</h3>
              <span className="text-xs text-red-400 font-mono font-semibold">R$ {totalExpensesVal.toFixed(2)}</span>
            </div>

            <div className="flex flex-col gap-3 max-h-[35vh] overflow-y-auto pr-1">
              {expenses.length === 0 ? (
                <div className="text-center py-8 text-white/20 italic text-xs">
                  Nenhuma despesa cadastrada.
                </div>
              ) : (
                expenses.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10"
                  >
                    <div className="flex-1 pr-4">
                      {isPreviewMode ? (
                        <span className="text-xs text-white/80 font-medium">
                          {e.n || 'Despesa'}
                        </span>
                      ) : (
                        <input
                          type="text"
                          value={e.n}
                          onChange={(ev) => onUpdateExpense(e.id, { n: ev.target.value })}
                          placeholder="Conta / Despesa"
                          className="bg-transparent border-none text-xs text-white/80 focus:outline-none w-full"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-black/15 px-2 py-1 rounded">
                        <span className="text-xs text-white/40">R$</span>
                        {isPreviewMode ? (
                          <span className={`text-xs font-mono font-bold text-red-300 ${isValuesBlurred ? 'blur-sm' : ''}`}>
                            {e.v.toFixed(2)}
                          </span>
                        ) : (
                          <input
                            type="number"
                            value={e.v || ''}
                            onChange={(ev) => onUpdateExpense(e.id, { v: parseFloat(ev.target.value) || 0 })}
                            placeholder="0"
                            className="bg-transparent border-none text-xs text-red-300 font-mono font-bold focus:outline-none w-14"
                          />
                        )}
                      </div>

                      {!isPreviewMode && (
                        <button
                          onClick={() => handleDeleteExpenseWithConfirm(e.id)}
                          className="p-1 rounded text-white/30 hover:text-red-400 transition-all cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {!isPreviewMode && (
              <button
                onClick={onAddExpense}
                className="mt-4 w-full py-2.5 border border-dashed border-red-500/30 hover:border-red-500/50 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold tracking-wider uppercase text-red-400 hover:text-red-300 transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>Adicionar Conta</span>
              </button>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col gap-3">
            <a
              href="https://brazilianinaction.com/suporte"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase transition-all duration-200"
            >
              <Headphones size={15} />
              <span>Suporte & Atendimento B.I.A.</span>
            </a>
          </div>
        </div>
      </div>

      {/* Receipts Invoice Generation Modal */}
      {receiptModalOpen && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-sm font-semibold tracking-widest uppercase text-center mb-6" style={{ color: accentColor }}>
              Gerar Recibo Acadêmico
            </h3>

            <p className="text-xs text-white/50 text-center mb-6">
              Selecione o modelo organizacional para filtrar e calcular os honorários a serem impressos:
            </p>

            <div className="grid grid-cols-3 gap-3 mb-8">
              <button
                onClick={() => setSelectedReceiptType('turma')}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  selectedReceiptType === 'turma'
                    ? 'bg-blue-600/20 border-blue-500'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                }`}
              >
                <span className="text-xs font-bold tracking-wider text-white/60 uppercase">YOUBECOME</span>
                <span className="text-base font-bold text-blue-400 font-mono">Y</span>
              </button>

              <button
                onClick={() => setSelectedReceiptType('individual')}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  selectedReceiptType === 'individual'
                    ? 'bg-amber-600/20 border-amber-500'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                }`}
              >
                <span className="text-xs font-bold tracking-wider text-white/60 uppercase">SEIDMANN</span>
                <span className="text-base font-bold text-amber-400 font-mono">S</span>
              </button>

              <button
                onClick={() => setSelectedReceiptType('bia')}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  selectedReceiptType === 'bia'
                    ? 'bg-red-600/20 border-red-500'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                }`}
              >
                <span className="text-xs font-bold tracking-wider text-white/60 uppercase">B.I.A.</span>
                <span className="text-base font-bold text-red-400 font-mono">B</span>
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setReceiptModalOpen(false)}
                className="flex-1 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateReceipt}
                className="flex-1 py-3 rounded-lg text-black text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                style={{ backgroundColor: accentColor }}
              >
                Emitir PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
