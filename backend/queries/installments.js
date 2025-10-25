/**
 * Installment SQL Queries
 *
 * Contains the complex SQL queries with recursive CTEs (Common Table Expressions)
 * that handle installment distribution across billing cycles.
 *
 * The installment logic handles the transition from old billing cycle (4th-3rd)
 * to new cycle (17th-16th) starting Oct 4, 2025.
 */

/**
 * Base recursive CTE that generates virtual rows for each installment.
 *
 * This CTE distributes installments across months, handling the transition period
 * from Oct 4, 2025 to Nov 16, 2025 where the cycle changes.
 */
const INSTALLMENT_CTE = `
WITH RECURSIVE installment_cycles AS (
  SELECT
    id,
    expense_ts,
    amount / installments AS installment_amount,
    description,
    method,
    tag,
    category,
    installments,
    1 AS installment_number,
    expense_ts AS current_ts
  FROM public.expenses
  WHERE installments > 1

  UNION ALL

  SELECT
    ic.id,
    ic.expense_ts,
    ic.installment_amount,
    ic.description,
    ic.method,
    ic.tag,
    ic.category,
    ic.installments,
    ic.installment_number + 1,
    CASE
      WHEN ic.current_ts::date >= DATE '2025-10-04' AND ic.current_ts::date < DATE '2025-11-17'
      THEN DATE '2025-11-17' + (ic.current_ts::time)
      ELSE ic.current_ts + INTERVAL '1 month'
    END
  FROM installment_cycles ic
  WHERE ic.installment_number < ic.installments
),
monthly_expenses AS (
  SELECT
    id,
    current_ts AS expense_ts,
    installment_amount AS amount,
    description || ' (' || installment_number || '/' || installments || ')' AS description,
    method,
    tag,
    category,
    installment_number,
    installments
  FROM installment_cycles

  UNION ALL

  SELECT
    id,
    expense_ts,
    amount,
    description,
    method,
    tag,
    category,
    1 AS installment_number,
    COALESCE(installments, 1) AS installments
  FROM public.expenses
  WHERE installments IS NULL OR installments <= 1
)
`;

/**
 * Query to fetch all expenses with installment distribution.
 *
 * @param {Object} filters - Query filters
 * @param {Date} filters.startDate - Start date filter
 * @param {Date} filters.endDate - End date filter
 * @param {Array<string>} filters.categories - Category filters
 * @param {Array<string>} filters.tags - Tag filters
 * @param {Array<string>} filters.methods - Payment method filters
 * @param {string} filters.search - Description search term
 * @returns {string} SQL query
 */
export function getExpensesQuery(filters = {}) {
  let query = `${INSTALLMENT_CTE} SELECT * FROM monthly_expenses WHERE 1=1`;

  const conditions = [];
  const params = [];
  let paramCount = 1;

  if (filters.startDate && filters.endDate) {
    conditions.push(
      `(expense_ts AT TIME ZONE 'UTC')::date BETWEEN $${paramCount} AND $${paramCount + 1}`
    );
    params.push(filters.startDate, filters.endDate);
    paramCount += 2;
  }

  if (filters.categories && filters.categories.length > 0) {
    conditions.push(`category = ANY($${paramCount}::text[])`);
    params.push(filters.categories);
    paramCount++;
  }

  if (filters.tags && filters.tags.length > 0) {
    conditions.push(`tag = ANY($${paramCount}::text[])`);
    params.push(filters.tags);
    paramCount++;
  }

  if (filters.methods && filters.methods.length > 0) {
    conditions.push(`method = ANY($${paramCount}::text[])`);
    params.push(filters.methods);
    paramCount++;
  }

  if (filters.search) {
    conditions.push(`description ILIKE $${paramCount}`);
    params.push(`%${filters.search}%`);
    paramCount++;
  }

  if (conditions.length > 0) {
    query += ' AND ' + conditions.join(' AND ');
  }

  query += ' ORDER BY expense_ts DESC';

  return { text: query, values: params };
}

/**
 * Query to calculate summary statistics for a period.
 *
 * @param {Date} startDate - Period start date
 * @param {Date} endDate - Period end date
 * @param {Array<string>} categories - Category filters
 * @param {Array<string>} tags - Tag filters
 * @param {Array<string>} methods - Payment method filters
 * @returns {Object} Query object with text and values
 */
export function getSummaryQuery(startDate, endDate, categories = [], tags = [], methods = []) {
  let query = `
    ${INSTALLMENT_CTE}
    SELECT
      COALESCE(SUM(amount), 0) AS total_spent,
      COUNT(*) AS transaction_count
    FROM monthly_expenses
    WHERE (expense_ts AT TIME ZONE 'UTC')::date BETWEEN $1 AND $2
  `;

  const params = [startDate, endDate];
  let paramCount = 3;

  if (categories.length > 0) {
    query += ` AND category = ANY($${paramCount}::text[])`;
    params.push(categories);
    paramCount++;
  }

  if (tags.length > 0) {
    query += ` AND tag = ANY($${paramCount}::text[])`;
    params.push(tags);
    paramCount++;
  }

  if (methods.length > 0) {
    query += ` AND method = ANY($${paramCount}::text[])`;
    params.push(methods);
    paramCount++;
  }

  return { text: query, values: params };
}

/**
 * Query to get category spending breakdown.
 *
 * @param {Date} startDate - Period start date
 * @param {Date} endDate - Period end date
 * @param {Array<string>} categories - Category filters
 * @param {Array<string>} tags - Tag filters
 * @param {Array<string>} methods - Payment method filters
 * @returns {Object} Query object
 */
export function getCategoryBreakdownQuery(
  startDate,
  endDate,
  categories = [],
  tags = [],
  methods = []
) {
  let query = `
    ${INSTALLMENT_CTE}
    SELECT
      category,
      SUM(amount) AS total_amount
    FROM monthly_expenses
    WHERE (expense_ts AT TIME ZONE 'UTC')::date BETWEEN $1 AND $2
  `;

  const params = [startDate, endDate];
  let paramCount = 3;

  if (categories.length > 0) {
    query += ` AND category = ANY($${paramCount}::text[])`;
    params.push(categories);
    paramCount++;
  }

  if (tags.length > 0) {
    query += ` AND tag = ANY($${paramCount}::text[])`;
    params.push(tags);
    paramCount++;
  }

  if (methods.length > 0) {
    query += ` AND method = ANY($${paramCount}::text[])`;
    params.push(methods);
    paramCount++;
  }

  query += ' GROUP BY category ORDER BY total_amount DESC LIMIT 10';

  return { text: query, values: params };
}

/**
 * Query to get tag spending breakdown.
 *
 * @param {Date} startDate - Period start date
 * @param {Date} endDate - Period end date
 * @param {Array<string>} categories - Category filters
 * @param {Array<string>} tags - Tag filters
 * @param {Array<string>} methods - Payment method filters
 * @returns {Object} Query object
 */
export function getTagBreakdownQuery(startDate, endDate, categories = [], tags = [], methods = []) {
  let query = `
    ${INSTALLMENT_CTE}
    SELECT
      tag,
      SUM(amount) AS total_amount
    FROM monthly_expenses
    WHERE (expense_ts AT TIME ZONE 'UTC')::date BETWEEN $1 AND $2
  `;

  const params = [startDate, endDate];
  let paramCount = 3;

  if (categories.length > 0) {
    query += ` AND category = ANY($${paramCount}::text[])`;
    params.push(categories);
    paramCount++;
  }

  if (tags.length > 0) {
    query += ` AND tag = ANY($${paramCount}::text[])`;
    params.push(tags);
    paramCount++;
  }

  if (methods.length > 0) {
    query += ` AND method = ANY($${paramCount}::text[])`;
    params.push(methods);
    paramCount++;
  }

  query += ' GROUP BY tag ORDER BY total_amount DESC';

  return { text: query, values: params };
}

/**
 * Query to get MoM trend data grouped by category or tag.
 *
 * @param {string} groupBy - 'category' or 'tag'
 * @param {Date} currentStart - Current period start
 * @param {Date} currentEnd - Current period end
 * @param {Date} previousStart - Previous period start
 * @param {Date} previousEnd - Previous period end
 * @param {Array<string>} categories - Category filters
 * @param {Array<string>} tags - Tag filters
 * @param {Array<string>} methods - Payment method filters
 * @returns {Object} Query object
 */
export function getMoMTrendQuery(
  groupBy,
  currentStart,
  currentEnd,
  previousStart,
  previousEnd,
  categories = [],
  tags = [],
  methods = []
) {
  let query = `
    ${INSTALLMENT_CTE},
    current_period AS (
      SELECT
        ${groupBy},
        SUM(amount) AS current_total
      FROM monthly_expenses
      WHERE (expense_ts AT TIME ZONE 'UTC')::date BETWEEN $1 AND $2
  `;

  const params = [currentStart, currentEnd, previousStart, previousEnd];
  let paramCount = 5;

  const categoriesParamIndex = categories.length > 0 ? paramCount : null;
  if (categories.length > 0) {
    query += ` AND category = ANY($${paramCount}::text[])`;
    params.push(categories);
    paramCount++;
  }

  const tagsParamIndex = tags.length > 0 ? paramCount : null;
  if (tags.length > 0) {
    query += ` AND tag = ANY($${paramCount}::text[])`;
    params.push(tags);
    paramCount++;
  }

  const methodsParamIndex = methods.length > 0 ? paramCount : null;
  if (methods.length > 0) {
    query += ` AND method = ANY($${paramCount}::text[])`;
    params.push(methods);
    paramCount++;
  }

  query += ` GROUP BY ${groupBy}
    ),
    previous_period AS (
      SELECT
        ${groupBy},
        SUM(amount) AS previous_total
      FROM monthly_expenses
      WHERE (expense_ts AT TIME ZONE 'UTC')::date BETWEEN $3 AND $4
  `;

  if (categoriesParamIndex) {
    query += ` AND category = ANY($${categoriesParamIndex}::text[])`;
  }

  if (tagsParamIndex) {
    query += ` AND tag = ANY($${tagsParamIndex}::text[])`;
  }

  if (methodsParamIndex) {
    query += ` AND method = ANY($${methodsParamIndex}::text[])`;
  }

  query += ` GROUP BY ${groupBy}
    )
    SELECT
      COALESCE(c.${groupBy}, p.${groupBy}) AS ${groupBy},
      COALESCE(c.current_total, 0) AS current_total,
      COALESCE(p.previous_total, 0) AS previous_total,
      COALESCE(c.current_total, 0) - COALESCE(p.previous_total, 0) AS variation_amount,
      CASE
        WHEN COALESCE(p.previous_total, 0) = 0 THEN 0
        ELSE ((COALESCE(c.current_total, 0) - COALESCE(p.previous_total, 0)) / p.previous_total) * 100
      END AS variation_percentage
    FROM current_period c
    FULL OUTER JOIN previous_period p ON c.${groupBy} = p.${groupBy}
    ORDER BY current_total DESC NULLS LAST
  `;

  return { text: query, values: params };
}

/**
 * Query to get filter metadata (categories, tags, date range).
 * Uses the installment CTE to account for future installment payments.
 *
 * @returns {Object} Query object
 */
export function getFilterMetadataQuery() {
  return {
    text: `
      ${INSTALLMENT_CTE}
      SELECT
        ARRAY_AGG(DISTINCT category ORDER BY category) AS categories,
        ARRAY_AGG(DISTINCT tag ORDER BY tag) AS tags,
        MIN(expense_ts) AS min_date,
        MAX(expense_ts) AS max_date
      FROM monthly_expenses
    `,
    values: [],
  };
}
