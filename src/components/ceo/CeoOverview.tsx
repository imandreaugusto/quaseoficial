import React, { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import {
  ArrowRight,
  Calendar,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Globe,
  Search,
  Ticket,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  Wallet
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PixPaymentRecord, TrialCoupon, UserProfile } from '../../types';
import { CeoWorldMap } from './CeoWorldMap';
import { isVerifiedCeoEmail } from '../../utils/security';
import {
  getEffectiveSubscriptionStatus,
  getSubscriptionDaysRemaining,
  isActiveSubscription
} from '../../lib/subscriptionStatus';

interface CeoOverviewProps {
  users: UserProfile[];
  pixPayments: PixPaymentRecord[];
  coupons: TrialCoupon[];
  onOpen: (tab: 'students' | 'pix_approvals' | 'promotions' | 'revenue' | 'location') => void;
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const GLASS = 'ceo-card rounded-2xl border border-white/25 bg-slate-950/30 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.25)]';
const COLORS = ['#38bdf8', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#fb7185'];

const reducedMotion = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const lastMonths = (count: number) =>
  Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    date.setMonth(date.getMonth() - (count - 1 - index));
    return date;
  });
const monthEnd = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime();
const sameMonth = (value: string | undefined, date: Date) => {
  if (!value) return false;
  const parsed = new Date(value);
  return parsed.getFullYear() === date.getFullYear() && parsed.getMonth() === date.getMonth();
};
const delta = (current: number, previous: number) => (previous > 0 ? Math.round(((current - previous) / previous) * 100) : null);

const CountUp: React.FC<{ value: number; format: (value: number) => string }> = ({ value, format }) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (reducedMotion()) {
      element.textContent = format(value);
      return;
    }
    const state = { current: 0 };
    const tween = gsap.to(state, { current: value, duration: 1.4, ease: 'power2.out', onUpdate: () => { element.textContent = format(state.current); } });
    return () => {
      tween.kill();
    };
  }, [value]);
  return <span ref={ref}>{format(0)}</span>;
};

const Donut: React.FC<{ segments: Array<{ label: string; value: number; color: string }>; center: string; sub: string }> = ({ segments, center, sub }) => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="relative mx-auto h-36 w-36 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="11" />
        {total > 0 && segments.map((segment) => {
          const length = (segment.value / total) * circumference;
          const circle = (
            <circle
              key={segment.label}
              className="donut-segment"
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth="11"
              strokeDasharray={`${Math.max(0, length - 1.5)} ${circumference}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            />
          );
          offset += length;
          return circle;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-black text-white">{center}</span>
        <span className="text-[10px] uppercase tracking-wider text-white/55">{sub}</span>
      </div>
    </div>
  );
};

const Legend: React.FC<{ items: Array<{ label: string; value: string; color: string }> }> = ({ items }) => (
  <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
    {items.map((item) => (
      <li key={item.label} className="flex items-center justify-between gap-2 text-white/80">
        <span className="flex min-w-0 items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} /><span className="truncate">{item.label}</span></span>
        <span className="font-semibold text-white">{item.value}</span>
      </li>
    ))}
  </ul>
);

export const CeoOverview: React.FC<CeoOverviewProps> = ({ users, pixPayments, coupons, onOpen }) => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const data = useMemo(() => {
    const students = users.filter((user) =>
      user.role === 'student' && !isVerifiedCeoEmail(user.email)
    );
    const now = new Date();
    const months = lastMonths(8);
    const approved = pixPayments.filter((payment) => payment.status === 'approved');
    const pending = pixPayments.filter((payment) => payment.status === 'pending');
    const thisMonth = months[months.length - 1];
    const prevMonth = months[months.length - 2];

    const revenueTotal = approved.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const revenueByMonth = months.map((month) => approved.filter((payment) => sameMonth(payment.paidAt, month)).reduce((sum, payment) => sum + (payment.amount || 0), 0));
    const growth = months.map((month) => students.filter((student) => new Date(student.created_at).getTime() < monthEnd(month)).length);
    const newThis = students.filter((student) => sameMonth(student.created_at, thisMonth)).length;
    const newPrev = students.filter((student) => sameMonth(student.created_at, prevMonth)).length;

    const active = students.filter((student) =>
      isActiveSubscription(student.status, student.data_expiracao, now.getTime())
    );
    const daysLeft = (student: UserProfile) =>
      getSubscriptionDaysRemaining(student.status, student.data_expiracao, now.getTime());
    const expiring = active.filter((student) => {
      const days = daysLeft(student);
      return days !== null && days >= 0 && days <= 7;
    });
    const buckets = [
      { label: 'Hoje', value: active.filter((student) => daysLeft(student) === 0).length },
      { label: 'Em 3 dias', value: active.filter((student) => { const d = daysLeft(student); return d !== null && d >= 1 && d <= 3; }).length },
      { label: 'Em 7 dias', value: active.filter((student) => { const d = daysLeft(student); return d !== null && d >= 4 && d <= 7; }).length },
      { label: 'Em 15 dias', value: active.filter((student) => { const d = daysLeft(student); return d !== null && d >= 8 && d <= 15; }).length }
    ];

    const countryMap = new Map<string, number>();
    students.forEach((student) => {
      const country = (student.ip_country || '').trim();
      if (country) countryMap.set(country, (countryMap.get(country) || 0) + 1);
    });
    const countries = [...countryMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    const withoutCountry = students.length - countries.reduce((sum, country) => sum + country.count, 0);

    const planMap = new Map<string, number>();
    approved.forEach((payment) => planMap.set(payment.planName || 'Mensal', (planMap.get(payment.planName || 'Mensal') || 0) + (payment.amount || 0)));
    const plans = [...planMap.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);

    return {
      students,
      total: students.length,
      active: active.length,
      expired: students.filter((student) =>
        getEffectiveSubscriptionStatus(student.status, student.data_expiracao, now.getTime()) === 'expired'
      ).length,
      couponsUsed: coupons.filter((coupon) => coupon.isUsed).length,
      revenueTotal,
      revenueMonth: revenueByMonth[revenueByMonth.length - 1],
      revenueDelta: delta(revenueByMonth[revenueByMonth.length - 1], revenueByMonth[revenueByMonth.length - 2]),
      newThis,
      newDelta: delta(newThis, newPrev),
      expiring: expiring.length,
      pendingCount: pending.length,
      pendingSum: pending.reduce((sum, payment) => sum + (payment.amount || 0), 0),
      months,
      revenueByMonth,
      growth,
      buckets,
      countries,
      withoutCountry,
      plans,
      recent: [...students].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6),
      daysLeft
    };
  }, [users, pixPayments, coupons]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion()) return;
    const context = gsap.context(() => {
      gsap.from('.ceo-card', { opacity: 0, y: 26, scale: 0.97, filter: 'blur(6px)', duration: 0.7, stagger: 0.06, ease: 'power3.out' });
      gsap.utils.toArray<SVGPathElement>('.line-draw').forEach((path) => {
        const length = path.getTotalLength();
        gsap.fromTo(path, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: 1.6, delay: 0.4, ease: 'power2.inOut' });
      });
      gsap.from('.area-fade', { opacity: 0, duration: 1.2, delay: 0.9 });
      gsap.from('.bar-grow', { scaleY: 0, transformBox: 'fill-box', transformOrigin: '50% 100%', duration: 0.9, delay: 0.5, stagger: 0.07, ease: 'back.out(1.4)' });
      gsap.utils.toArray<SVGCircleElement>('.donut-segment').forEach((circle, index) => {
        gsap.from(circle, { opacity: 0, duration: 0.8, delay: 0.5 + index * 0.1 });
      });
    }, root);
    return () => context.revert();
  }, [data.total, data.revenueTotal]);

  const kpis: Array<{ label: string; value: number; format: (value: number) => string; icon: LucideIcon; tint: string; trend?: number | null; hint: string }> = [
    { label: 'Total de assinantes', value: data.total, format: (v) => String(Math.round(v)), icon: Users, tint: 'from-sky-400/40 to-sky-500/10', hint: 'cadastrados' },
    { label: 'Assinaturas ativas', value: data.active, format: (v) => String(Math.round(v)), icon: UserCheck, tint: 'from-emerald-400/40 to-emerald-500/10', hint: 'com acesso liberado' },
    { label: 'Cancelados', value: data.expired, format: (v) => String(Math.round(v)), icon: UserX, tint: 'from-rose-400/40 to-rose-500/10', hint: 'acesso expirado' },
    { label: 'Receita total', value: data.revenueTotal, format: (v) => money(v), icon: CircleDollarSign, tint: 'from-blue-400/40 to-blue-500/10', hint: 'pagamentos aprovados' },
    { label: 'Receita do mês', value: data.revenueMonth, format: (v) => money(v), icon: Calendar, tint: 'from-indigo-400/40 to-indigo-500/10', trend: data.revenueDelta, hint: 'vs. mês anterior' },
    { label: 'Cupons resgatados', value: data.couponsUsed, format: (v) => String(Math.round(v)), icon: Ticket, tint: 'from-fuchsia-400/40 to-fuchsia-500/10', hint: 'códigos utilizados' },
    { label: 'Vencendo em breve', value: data.expiring, format: (v) => String(Math.round(v)), icon: Clock3, tint: 'from-amber-400/40 to-amber-500/10', hint: 'nos próximos 7 dias' },
    { label: 'Novos assinantes', value: data.newThis, format: (v) => String(Math.round(v)), icon: UserPlus, tint: 'from-cyan-400/40 to-cyan-500/10', trend: data.newDelta, hint: 'vs. mês anterior' }
  ];

  const chartW = 520;
  const chartH = 150;
  const growthMax = Math.max(1, ...data.growth);
  const linePoints = data.growth.map((value, index) => ({ x: 20 + (index / Math.max(1, data.growth.length - 1)) * (chartW - 40), y: chartH - 14 - (value / growthMax) * (chartH - 34) }));
  const linePath = linePoints.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${linePoints[linePoints.length - 1].x.toFixed(1)},${chartH - 14} L${linePoints[0].x.toFixed(1)},${chartH - 14} Z`;
  const revenueMax = Math.max(1, ...data.revenueByMonth);
  const mapCountries = data.countries.slice(0, 12);

  return (
    <div ref={rootRef} data-no-reveal className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className={`${GLASS} p-3.5`}>
              <div className="flex items-center gap-2">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${kpi.tint} text-white`}><Icon size={15} /></span>
                <span className="text-[10px] font-semibold leading-tight text-white/75">{kpi.label}</span>
              </div>
              <p className="mt-2.5 text-xl font-black tracking-tight text-white xl:text-lg 2xl:text-xl"><CountUp value={kpi.value} format={kpi.format} /></p>
              {kpi.trend !== undefined && kpi.trend !== null ? (
                <p className={`mt-1 inline-flex items-center gap-1 text-[10px] font-bold ${kpi.trend >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {kpi.trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{Math.abs(kpi.trend)}% <span className="font-normal text-white/45">{kpi.hint}</span>
                </p>
              ) : (
                <p className="mt-1 text-[10px] text-white/45">{kpi.hint}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className={`${GLASS} p-4 xl:col-span-5`}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-white"><Users size={14} className="text-sky-300" /> Crescimento de assinantes</h3>
          <svg viewBox={`0 0 ${chartW} ${chartH + 14}`} className="w-full">
            <defs>
              <linearGradient id="ceoGrowthFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" /><stop offset="100%" stopColor="#38bdf8" stopOpacity="0" /></linearGradient>
            </defs>
            {[0, 0.5, 1].map((fraction) => <line key={fraction} x1="20" x2={chartW - 20} y1={chartH - 14 - fraction * (chartH - 34)} y2={chartH - 14 - fraction * (chartH - 34)} stroke="rgba(255,255,255,0.1)" />)}
            <path className="area-fade" d={areaPath} fill="url(#ceoGrowthFill)" />
            <path className="line-draw" d={linePath} fill="none" stroke="#7dd3fc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {linePoints.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="3" fill="#e0f2fe" />)}
            {data.months.map((month, index) => <text key={index} x={linePoints[index].x} y={chartH + 8} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.55)">{MONTHS[month.getMonth()]}</text>)}
          </svg>
        </div>

        <div className={`${GLASS} p-4 xl:col-span-4`}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-white"><Wallet size={14} className="text-emerald-300" /> Faturamento mensal</h3>
          <svg viewBox={`0 0 ${chartW * 0.8} ${chartH + 14}`} className="w-full">
            <defs>
              <linearGradient id="ceoBarFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#38bdf8" /></linearGradient>
            </defs>
            {data.revenueByMonth.map((value, index) => {
              const barW = 26;
              const x = 16 + index * ((chartW * 0.8 - 32) / data.revenueByMonth.length) + 4;
              const h = Math.max(3, (value / revenueMax) * (chartH - 34));
              return (
                <g key={index}>
                  <rect className="bar-grow" x={x} y={chartH - 14 - h} width={barW} height={h} rx="5" fill="url(#ceoBarFill)" />
                  <text x={x + barW / 2} y={chartH + 8} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.55)">{MONTHS[data.months[index].getMonth()]}</text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className={`${GLASS} p-4 xl:col-span-3`}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-white"><Ticket size={14} className="text-fuchsia-300" /> Cupons resgatados</h3>
          <p className="text-3xl font-black text-white"><CountUp value={data.couponsUsed} format={(value) => String(Math.round(value))} /></p>
          <p className="mt-1 text-xs text-white/50">Conta somente quando um aluno resgata um código. Cupons apenas gerados não entram nessa métrica.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className={`${GLASS} p-4 xl:col-span-5`}>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white"><Globe size={14} className="text-sky-300" /> Países dos assinantes</h3>
            <button type="button" onClick={() => onOpen('location')} className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-white/55 hover:text-white">Ver detalhes</button>
          </div>
          <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_9rem]">
            <div className="aspect-[720/268] w-full"><Suspense fallback={null}><CeoWorldMap countries={mapCountries} /></Suspense></div>
            <ul className="space-y-1.5 text-xs">
              {data.countries.slice(0, 5).map((country, index) => (
                <li key={country.name} className="flex items-center justify-between gap-2 text-white/80">
                  <span className="flex min-w-0 items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLORS[index % COLORS.length] }} /><span className="truncate">{country.name}</span></span>
                  <span className="font-semibold text-white">{country.count} <span className="font-normal text-white/45">({Math.round((country.count / Math.max(1, data.total)) * 100)}%)</span></span>
                </li>
              ))}
              {data.withoutCountry > 0 && <li className="flex justify-between text-white/55"><span>Sem localização</span><span>{data.withoutCountry}</span></li>}
              {data.countries.length === 0 && <li className="text-white/50">Sem dados de localização ainda.</li>}
            </ul>
          </div>
        </div>

        <div className={`${GLASS} p-4 xl:col-span-3`}>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white"><CreditCard size={14} className="text-violet-300" /> Receita por plano</h3>
          <div className="flex items-center gap-3">
            <Donut center={money(data.revenueTotal)} sub="total" segments={data.plans.map((plan, index) => ({ ...plan, color: COLORS[index % COLORS.length] }))} />
            <Legend items={data.plans.length ? data.plans.map((plan, index) => ({ label: plan.label, value: money(plan.value), color: COLORS[index % COLORS.length] })) : [{ label: 'Sem pagamentos', value: '—', color: '#94a3b8' }]} />
          </div>
        </div>

        <div className={`${GLASS} p-4 xl:col-span-2`}>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white"><Calendar size={14} className="text-amber-300" /> Vencimentos</h3>
          <ul className="space-y-2 text-xs">
            {data.buckets.map((bucket, index) => (
              <li key={bucket.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-white/80">
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[index] }} />{bucket.label}</span>
                <span className="font-bold text-white">{bucket.value}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={`${GLASS} flex flex-col justify-between p-4 xl:col-span-2`}>
          <h3 className="flex items-center gap-2 text-sm font-bold text-white"><Wallet size={14} className="text-rose-300" /> Pagamentos pendentes</h3>
          <div>
            <p className="text-3xl font-black text-white"><CountUp value={data.pendingCount} format={(v) => String(Math.round(v))} /></p>
            <p className="text-sm text-white/65">{money(data.pendingSum)}</p>
          </div>
          <button type="button" onClick={() => onOpen('pix_approvals')} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20">Ver detalhes <ArrowRight size={13} /></button>
        </div>
      </div>

      <div className={`${GLASS} overflow-hidden p-4`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white"><Users size={14} className="text-sky-300" /> Assinantes recentes</h3>
          <button type="button" onClick={() => onOpen('students')} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/80 hover:bg-white/20"><Search size={12} /> Ver todos</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-white/45">
                {['Nome', 'Cidade', 'Estado', 'País', 'E-mail', 'Cadastro', 'Cupom', 'Dias restantes', 'Status'].map((heading) => <th key={heading} className="pb-2 pr-3 font-semibold">{heading}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.recent.map((student) => {
                const days = data.daysLeft(student);
                const statusStyle = student.status === 'active' ? 'border-emerald-300/40 bg-emerald-400/20 text-emerald-100' : student.status === 'expired' ? 'border-rose-300/40 bg-rose-400/20 text-rose-100' : 'border-amber-300/40 bg-amber-400/20 text-amber-100';
                const statusLabel = student.status === 'active' ? 'Ativo' : student.status === 'expired' ? 'Vencido' : student.status === 'trial' ? 'Teste' : 'Pendente';
                return (
                  <tr key={student.id} className="text-white/80">
                    <td className="py-2.5 pr-3 font-semibold text-white">{student.full_name || student.email.split('@')[0]}</td>
                    <td className="pr-3">{student.ip_city || '—'}</td>
                    <td className="pr-3">{student.ip_region || '—'}</td>
                    <td className="pr-3">{student.ip_country || '—'}</td>
                    <td className="max-w-[180px] truncate pr-3">{student.email}</td>
                    <td className="pr-3">{new Date(student.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="pr-3">{student.cupom_usado || '—'}</td>
                    <td className="pr-3">{days === null ? '—' : days > 0 ? `${days} dias` : days === 0 ? 'Hoje' : 'Vencido'}</td>
                    <td><span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusStyle}`}>{statusLabel}</span></td>
                  </tr>
                );
              })}
              {data.recent.length === 0 && <tr><td colSpan={9} className="py-6 text-center text-white/50">Nenhum assinante cadastrado ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
