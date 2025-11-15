import { Target, Calendar, Wallet, List } from 'lucide-react';
import { KpiCard } from './KpiCard';
import { formatCurrency } from '../utils/formatters';
import { getBillingCycleDays, getCurrentDayOfCycle } from '../utils/billingCycle';

/**
 * HeroSection Component
 *
 * Displays the hero row containing the Monthly Budget card and three KPI cards.
 * The budget cap is dynamically calculated by the backend based on business days,
 * hourly rates, and deductions configured in environment variables.
 *
 * Conditionally renders UI elements based on whether the selected month is:
 * - Past: Hides cap (if before start date), rhythm, expected, projection. Shows "Mês concluído!"
 * - Current: Shows all elements with live calculations
 * - Future: Hides rhythm, expected, projection. Shows "Mês ainda não iniciado!"
 *
 * @param {Object} props - Component properties
 * @param {Object} props.summary - Summary data from API containing totalSpent, transactionCount, etc.
 * @param {Object|null} props.capData - Cap calculation breakdown (null if not applicable)
 * @param {number} props.invoiceYear - Selected invoice year
 * @param {number} props.invoiceMonth - Selected invoice month (1-12)
 * @returns {JSX.Element} Rendered hero section
 */
export function HeroSection({ summary, capData, invoiceYear, invoiceMonth }) {
  const budget = capData ? parseFloat(capData.netCap) : 4000;
  const spent = summary?.current?.totalSpent || 0;

  const totalCycleDays = getBillingCycleDays(invoiceYear, invoiceMonth);
  const currentDayOfCycle = getCurrentDayOfCycle();

  const remaining = Math.max(budget - spent, 0);
  const pctSpent = Math.min((spent / budget) * 100, 100);

  const totalTx = summary?.current?.transactionCount || 0;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const CYCLE_CHANGE_DATE = new Date(2025, 9, 4);
  const TRANSITION_END_DATE = new Date(2025, 10, 16);
  const currentDate = new Date(currentYear, currentMonth - 1, now.getDate());

  let currentInvoiceYear = currentYear;
  let currentInvoiceMonth;

  if (currentDate < CYCLE_CHANGE_DATE) {
    const cycleDay = 4;
    if (now.getDate() >= cycleDay) {
      currentInvoiceMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      if (currentMonth === 12) currentInvoiceYear++;
    } else {
      currentInvoiceMonth = currentMonth;
    }
  } else if (currentDate <= TRANSITION_END_DATE) {
    currentInvoiceMonth = 11;
    currentInvoiceYear = 2025;
  } else {
    const cycleDay = 17;
    if (now.getDate() >= cycleDay) {
      currentInvoiceMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      if (currentMonth === 12) currentInvoiceYear++;
    } else {
      currentInvoiceMonth = currentMonth;
    }
  }

  const selectedYearMonth = invoiceYear * 100 + invoiceMonth;
  const currentYearMonth = currentInvoiceYear * 100 + currentInvoiceMonth;

  const isPastMonth = selectedYearMonth < currentYearMonth;
  const isCurrentMonth = selectedYearMonth === currentYearMonth;
  const isFutureMonth = selectedYearMonth > currentYearMonth;

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-slate-900 dark:text-slate-100" />
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Orçamento do mês</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              <span className="font-medium">{formatCurrency(spent)}</span>{' '}
              {capData && (
                <>
                  de {formatCurrency(budget)} • faltam{' '}
                  <span className="font-medium">{formatCurrency(remaining)}</span>
                </>
              )}
            </p>
            {capData && capData.holidays > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                Dias úteis trabalhados: {capData.businessDaysWorked} ({capData.totalBusinessDays}{' '}
                disponíveis - {capData.holidays} {capData.holidays === 1 ? 'feriado' : 'feriados'})
              </p>
            )}
          </div>
          <div className="text-right text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center justify-end gap-1">
              <Calendar className="h-4 w-4" />
              {isPastMonth && 'Mês concluído!'}
              {isCurrentMonth && `Dia ${currentDayOfCycle} de ${totalCycleDays}`}
              {isFutureMonth && 'Mês ainda não iniciado!'}
            </div>
          </div>
        </div>

        {capData && !isPastMonth && (
          <div className="mt-4">
            <div className="relative h-6 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
              <div className="absolute inset-y-0 left-0 w-1/2 bg-slate-100 dark:bg-slate-700" />
              <div className="absolute inset-y-0 left-1/2 right-1/4 bg-slate-200 dark:bg-slate-600" />
              <div className="absolute inset-y-0 right-0 w-1/4 bg-slate-300 dark:bg-slate-500" />
              <div
                className="absolute inset-y-0 left-0 z-20 bg-green-600 dark:bg-green-500"
                style={{ width: `${pctSpent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="col-span-12 lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-4">
        <KpiCard icon={Wallet} label="Total gasto" value={formatCurrency(spent)} />
        <KpiCard icon={List} label="Lançamentos" value={`${totalTx}`} />
      </div>
    </div>
  );
}
