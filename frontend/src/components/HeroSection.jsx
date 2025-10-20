import { Target, Calendar, Wallet, TrendingUp, List, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { formatCurrency } from "../utils/formatters";

/**
 * HeroSection Component
 *
 * Displays the hero row containing the Monthly Budget card and three KPI cards.
 * The budget feature uses static mock data except for the Total Spent value,
 * which comes from the API. This serves as a UI placeholder until backend support is added.
 *
 * @param {Object} props - Component properties
 * @param {Object} props.summary - Summary data from API containing totalSpent, transactionCount, etc.
 * @returns {JSX.Element} Rendered hero section
 */
export function HeroSection({ summary }) {
  const budget = 4000;
  const spent = summary?.current?.totalSpent || 0;
  const daysInMonth = 31;
  const today = new Date().getDate();
  const expectedByToday = (budget / daysInMonth) * today;
  const remaining = Math.max(budget - spent, 0);
  const projected = today > 0 ? (spent / today) * daysInMonth : 0;

  const pctSpent = Math.min((spent / budget) * 100, 100);
  const pctExpected = Math.min((expectedByToday / budget) * 100, 100);
  const overPace = spent > expectedByToday;

  const totalTx = summary?.current?.transactionCount || 0;

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
              <span className="font-medium">
                {formatCurrency(spent)}
              </span>{" "}
              de {formatCurrency(budget)} • faltam{" "}
              <span className="font-medium">
                {formatCurrency(remaining)}
              </span>
            </p>
          </div>
          <div className="text-right text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center justify-end gap-1">
              <Calendar className="h-4 w-4" />
              Dia {today} de {daysInMonth}
            </div>
            <div className="mt-1">
              Projeção mês:{" "}
              <span className="font-medium">
                {formatCurrency(projected)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="relative h-6 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
            <div className="absolute inset-y-0 left-0 w-1/2 bg-slate-100 dark:bg-slate-700" />
            <div className="absolute inset-y-0 left-1/2 right-1/4 bg-slate-200 dark:bg-slate-600" />
            <div className="absolute inset-y-0 right-0 w-1/4 bg-slate-300 dark:bg-slate-500" />
            <div
              className="absolute inset-y-0 w-0.5 bg-slate-600 dark:bg-slate-400/70 z-10"
              style={{ left: `${pctExpected}%` }}
              title="Esperado até hoje"
            />
            <div
              className={`absolute inset-y-0 left-0 z-20 ${overPace ? 'bg-red-600 dark:bg-red-500' : 'bg-green-600 dark:bg-green-500'}`}
              style={{ width: `${pctSpent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>
              Ritmo:{" "}
              {overPace ? (
                <span className="inline-flex items-center gap-1 font-medium text-red-700 dark:text-red-400">
                  <ArrowUpRight className="h-3 w-3" /> acima do esperado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-medium text-green-700 dark:text-green-400">
                  <ArrowDownRight className="h-3 w-3" /> abaixo do esperado
                </span>
              )}
            </span>
            <span>
              Esperado até hoje:{" "}
              {formatCurrency(expectedByToday)}
            </span>
          </div>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-4">
        <KpiCard
          icon={Wallet}
          label="Total gasto"
          value={formatCurrency(spent)}
        />
        <KpiCard
          icon={TrendingUp}
          label="Projeção fim do mês"
          value={formatCurrency(projected)}
          subtle
        />
        <KpiCard icon={List} label="Lançamentos" value={`${totalTx}`} />
      </div>
    </div>
  );
}
