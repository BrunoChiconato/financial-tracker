import streamlit as st
import plotly.express as px
import pandas as pd
from datetime import timedelta
from decimal import Decimal

from src.storage.repository import ExpenseRepository
from src.core import config

st.set_page_config(page_title="Dashboard de Gastos", layout="wide")
repo = ExpenseRepository()


@st.cache_data(ttl=120)
def load_data(start_date, end_date):
    """
    Loads expense data for a specific date range from the repository.

    This function is cached by Streamlit to avoid redundant database calls.

    Args:
        start_date (date): The start date of the period.
        end_date (date): The end date of the period.

    Returns:
        pd.DataFrame: A DataFrame containing expenses within the specified range.
    """
    return repo.get_expenses_in_range_as_dataframe(start_date, end_date)


def format_currency(value):
    """
    Formats a numeric value into a BRL currency string.

    Example: 1234.56 -> 'R$ 1.234,56'

    Args:
        value (float | int | Decimal): The numeric value to format.

    Returns:
        str: The formatted currency string.
    """
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def calculate_mom(current_value, previous_value):
    """
    Calculates the Month-over-Month (MoM) percentage change as a formatted string.

    Handles the case where the previous value is zero.

    Args:
        current_value (float): The value for the current period.
        previous_value (float): The value for the previous period.

    Returns:
        str: A formatted string like ' (+15.2%)', ' (-5.0%)', or ' (novo)'.
    """
    if previous_value == 0:
        return " (novo)" if current_value > 0 else ""
    percentage = ((current_value - previous_value) / previous_value) * 100
    return f" ({percentage:+.1f}%)"


def highlight_variation(val):
    """
    Returns a CSS style to color the font based on the value.

    Used for Pandas Styler to apply conditional formatting. Returns red for
    positive values (increased spending) and green for negative values
    (decreased spending), using colors visible in light and dark modes.

    Args:
        val (float): The numeric value from the DataFrame cell.

    Returns:
        str: A CSS string for the 'color' property.
    """
    if val < 0:
        return "color: #3D9970"
    elif val > 0:
        return "color: #FF4136"
    else:
        return ""


st.title("📊 Dashboard de Análise de Gastos")


@st.cache_data(ttl=120)
def get_initial_data():
    """
    Fetches the entire expense dataset, including generated installments.

    This is used once on startup to determine the overall date range and
    populate filter options. The result is cached.

    Returns:
        pd.DataFrame: A DataFrame containing all expenses.
    """
    return repo.get_all_expenses_as_dataframe()


df_full = get_initial_data()

if df_full.empty:
    st.warning("Nenhum dado encontrado no banco de dados para popular os filtros.")
    st.stop()

st.sidebar.header("Filtros")

min_date = df_full["expense_ts"].min().date()
max_date = df_full["expense_ts"].max().date()
start_date = st.sidebar.date_input(
    "Data de Início", min_date, min_value=min_date, max_value=max_date
)
end_date = st.sidebar.date_input(
    "Data de Fim", max_date, min_value=min_date, max_value=max_date
)

if start_date > end_date:
    st.sidebar.error("Data de início não pode ser maior que a data de fim.")
    st.stop()

unique_categories = sorted(df_full["category"].unique())
selected_categories = st.sidebar.multiselect(
    "Categorias", options=unique_categories, default=unique_categories
)

unique_tags = sorted(df_full["tag"].unique())
selected_tags = st.sidebar.multiselect("Tags", options=unique_tags, default=unique_tags)

search_description = st.sidebar.text_input("Buscar na Descrição (contém)")

df_current = df_full[
    (df_full["expense_ts"].dt.date >= start_date)
    & (df_full["expense_ts"].dt.date <= end_date)
    & (df_full["category"].isin(selected_categories))
    & (df_full["tag"].isin(selected_tags))
]
if search_description:
    df_current = df_current[
        df_current["description"].str.contains(search_description, case=False, na=False)
    ]

period_duration = end_date - start_date
previous_end_date = start_date - timedelta(days=1)
previous_start_date = previous_end_date - period_duration

df_previous = load_data(previous_start_date, previous_end_date)
if not df_previous.empty:
    df_previous = df_previous[
        (df_previous["category"].isin(selected_categories))
        & (df_previous["tag"].isin(selected_tags))
    ]

st.header(f"Análise do Período: {start_date:%d/%m/%Y} a {end_date:%d/%m/%Y}")

if df_current.empty:
    st.info("Nenhum lançamento encontrado para os filtros selecionados.")
    st.stop()

total_spent_current = Decimal(df_current["amount"].sum())
total_spent_previous = Decimal(df_previous["amount"].sum())
mom_total = calculate_mom(total_spent_current, total_spent_previous)

num_days_current = period_duration.days + 1
avg_daily_current = total_spent_current / num_days_current

num_days_previous = period_duration.days + 1
avg_daily_previous = total_spent_previous / num_days_previous
mom_avg_daily = calculate_mom(avg_daily_current, avg_daily_previous)

monthly_cap = config.MONTHLY_CAP
remaining_cap = monthly_cap - total_spent_current
spent_percentage = (
    min(float(total_spent_current / monthly_cap), 1.0) if monthly_cap > 0 else 0.0
)

col1, col2, col3, col4, col5 = st.columns(5)
col1.metric(
    "Total Gasto no Período",
    format_currency(total_spent_current),
    delta=mom_total,
    help=f"Comparado com {previous_start_date:%d/%m} a {previous_end_date:%d/%m}",
)
col2.metric(
    "Teto de Gastos",
    format_currency(monthly_cap),
    help="Seu limite de gastos definido na configuração.",
)
if remaining_cap >= 0:
    col3.metric(
        "Saldo Restante",
        format_currency(remaining_cap),
        help="Quanto ainda resta para atingir o teto.",
    )
else:
    col3.metric(
        "Teto Excedido em",
        format_currency(abs(remaining_cap)),
        delta_color="inverse",
        help="Valor gasto além do seu teto.",
    )
col4.metric("Média Diária", format_currency(avg_daily_current), delta=mom_avg_daily)
col5.metric("Nº de Lançamentos", str(len(df_current)))

if spent_percentage < 1 / 3:
    progress_bar_color = "green"
elif spent_percentage < 2 / 3:
    progress_bar_color = "orange"
else:
    progress_bar_color = "red"

st.progress(spent_percentage, text=f"{spent_percentage:.1%}")

st.markdown(
    f"""
    <style>
        .stProgress > div > div > div > div {{
            background-color: {progress_bar_color};
        }}
    </style>""",
    unsafe_allow_html=True,
)

st.divider()

col_charts1, col_charts2 = st.columns(2)
with col_charts1:
    st.subheader("Gastos por Categoria")
    category_summary = (
        df_current.groupby("category")["amount"]
        .sum()
        .sort_values(ascending=False)
        .reset_index()
    )
    category_summary["amount_text"] = category_summary["amount"].apply(format_currency)

    fig_cat = px.bar(
        category_summary.head(10),
        x="amount",
        y="category",
        orientation="h",
        text="amount_text",
        height=400,
    )

    fig_cat.update_layout(
        yaxis_title=None,
        xaxis_title=None,
        yaxis=dict(categoryorder="total ascending", tickfont=dict(size=18)),
        xaxis=dict(showticklabels=False),
    )
    fig_cat.update_traces(textfont_size=18)
    st.plotly_chart(fig_cat, use_container_width=True)

with col_charts2:
    st.subheader("Gastos por Tag")
    tag_summary = df_current.groupby("tag")["amount"].sum().reset_index()
    fig_tag = px.pie(
        tag_summary,
        values="amount",
        names="tag",
        hole=0.4,
        labels={"amount": "Total (R$)", "tag": "Tag"},
    )

    fig_tag.update_traces(textinfo="percent", textfont_size=18)
    fig_tag.update_layout(legend=dict(font=dict(size=18)))
    st.plotly_chart(fig_tag, use_container_width=True)

st.divider()

st.subheader("Resumo e Tendências (MoM)")

grouping_choice = st.radio(
    "Analisar Resumo MoM Por:",
    ["Categoria", "Tag"],
    horizontal=True,
    label_visibility="collapsed",
)
grouping_col = "category" if grouping_choice == "Categoria" else "tag"

summary_current = (
    df_current.groupby(grouping_col)["amount"].sum().rename("Total no Período")
)
summary_previous = (
    df_previous.groupby(grouping_col)["amount"].sum().rename("Período Anterior")
)
summary_df = pd.concat([summary_current, summary_previous], axis=1).fillna(0)
summary_df["Variação (R$)"] = (
    summary_df["Total no Período"] - summary_df["Período Anterior"]
)
summary_df["Variação (%)"] = (
    (summary_df["Variação (R$)"] / summary_df["Período Anterior"]).replace(
        [float("inf"), -float("inf")], 0
    )
    * 100
).fillna(0)
summary_df.rename_axis(grouping_choice, inplace=True)

st.dataframe(
    summary_df.sort_values(by="Total no Período", ascending=False)
    .style.format(
        {
            "Total no Período": "R$ {:,.2f}",
            "Período Anterior": "R$ {:,.2f}",
            "Variação (R$)": "R$ {:+,.2f}",
            "Variação (%)": "{:+.1f}%",
        }
    )
    .applymap(highlight_variation, subset=["Variação (R$)", "Variação (%)"])
)

st.divider()

st.subheader("Lançamentos Detalhados")
columns_to_display = {
    "expense_ts": "Data e Hora",
    "amount": "Valor (R$)",
    "description": "Descrição",
    "category": "Categoria",
    "method": "Método",
    "tag": "Tag",
    "installment_number": "Nº da Parcela",
    "installments": "Total de Parcelas",
}
df_display_cols = [
    col for col in columns_to_display.keys() if col in df_current.columns
]
df_display = df_current[df_display_cols].copy()

df_display.rename(columns=columns_to_display, inplace=True)
st.dataframe(
    df_display.sort_values(by="Data e Hora", ascending=False),
    use_container_width=True,
    hide_index=True,
)
