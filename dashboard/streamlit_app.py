import os
from datetime import date
import pandas as pd
import psycopg
import streamlit as st

DB = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "dbname": os.getenv("DB_NAME", "finance"),
    "user": os.getenv("DB_USER", "finance"),
    "password": os.getenv("DB_PASSWORD", "changeme"),
}


@st.cache_data(ttl=30)
def fetch_df(sql, params=None):
    with psycopg.connect(
        host=DB["host"],
        port=DB["port"],
        dbname=DB["dbname"],
        user=DB["user"],
        password=DB["password"],
    ) as conn:
        return pd.read_sql_query(sql, conn, params=params)


st.set_page_config(page_title="Gastos (Telegram → Postgres)", layout="wide")
st.title("Dashboard de Gastos")

colA, colB, colC = st.columns([1, 1, 1])
with colA:
    start = st.date_input("Início", date.today().replace(day=1))
with colB:
    end = st.date_input("Fim", date.today())
with colC:
    tag_sel = st.selectbox(
        "Tag (opcional)",
        ["", "Gastos Pessoais", "Gastos do Casal", "Gastos de Casa"],
        index=0,
    )

if start > end:
    st.error("Datas inválidas")
    st.stop()

metodo = st.text_input("Filtrar por método (contém)", "")
busca = st.text_input("Buscar na descrição (contém)", "")

base_sql = """
SELECT
  id,
  expense_ts::date AS data,
  amount::numeric AS valor,
  description,
  method,
  tag,
  installments AS parcelas
FROM public.expenses
WHERE expense_ts BETWEEN %s AND %s
"""
conds = []
params = [start, end]

if metodo:
    conds.append("method ILIKE %s")
    params.append(f"%{metodo}%")
if busca:
    conds.append("description ILIKE %s")
    params.append(f"%{busca}%")
if tag_sel:
    conds.append("tag = %s")
    params.append(tag_sel)

if conds:
    base_sql += " AND " + " AND ".join(conds)
base_sql += " ORDER BY data, id"

df = fetch_df(base_sql, params)

col1, col2, col3 = st.columns(3)
with col1:
    st.metric(
        "Total no período",
        f"R$ {df['valor'].sum():,.2f}".replace(",", "X")
        .replace(".", ",")
        .replace("X", "."),
    )
with col2:
    st.metric("Qtde lançamentos", f"{len(df)}")
with col3:
    dias_unicos = df["data"].nunique() if not df.empty else 0
    media_dia = (df["valor"].sum() / dias_unicos) if dias_unicos else 0
    st.metric(
        "Média diária",
        f"R$ {media_dia:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
    )

st.divider()

st.subheader("Evolução diária")
if not df.empty:
    dias = df.groupby("data", as_index=False)["valor"].sum().sort_values("data")
    st.line_chart(dias.set_index("data"))
else:
    st.info("Sem dados para o intervalo.")

st.subheader("Gasto por método")
if not df.empty:
    met = (
        df.groupby("method", as_index=False)["valor"]
        .sum()
        .sort_values("valor", ascending=False)
    )
    st.bar_chart(met.set_index("method"))
else:
    st.info("Sem dados para o intervalo.")

st.subheader("Gasto por tag")
if not df.empty:
    tg = (
        df.groupby("tag", as_index=False)["valor"]
        .sum()
        .sort_values("valor", ascending=False)
    )
    st.bar_chart(tg.set_index("tag"))
else:
    st.info("Sem dados para o intervalo.")

st.subheader("Últimos lançamentos")
st.dataframe(
    df.sort_values(["data", "id"], ascending=[False, False]).head(50),
    use_container_width=True,
)

if not df.empty:
    csv = df.to_csv(index=False).encode("utf-8")
    st.download_button(
        "Baixar CSV filtrado", data=csv, file_name="gastos.csv", mime="text/csv"
    )
