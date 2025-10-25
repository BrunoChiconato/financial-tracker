import { body, param, query, validationResult } from 'express-validator';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => `${err.path}: ${err.msg}`);
    return res.status(400).json({
      error: 'Validation failed',
      details: errorMessages,
    });
  }
  next();
};

export const validateDateFilters = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date (YYYY-MM-DD)'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date (YYYY-MM-DD)'),
  query('invoiceYear')
    .optional()
    .isInt({ min: 2020, max: 2100 })
    .withMessage('invoiceYear must be a valid year between 2020 and 2100'),
  query('invoiceMonth')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('invoiceMonth must be between 1 and 12'),
  query('useInvoiceMonth').optional().isBoolean().withMessage('useInvoiceMonth must be a boolean'),
  validate,
];

export const validateArrayParams = [
  query('categories')
    .optional()
    .isString()
    .withMessage('categories must be a comma-separated string'),
  query('tags').optional().isString().withMessage('tags must be a comma-separated string'),
  query('methods').optional().isString().withMessage('methods must be a comma-separated string'),
  validate,
];

export const validateTextSearch = [
  query('search')
    .optional()
    .isString()
    .withMessage('search must be a string')
    .isLength({ max: 200 })
    .withMessage('search must be at most 200 characters'),
  validate,
];

export const validateCapParams = [
  param('year')
    .isInt({ min: 2020, max: 2100 })
    .withMessage('year must be a valid year between 2020 and 2100'),
  param('month').isInt({ min: 1, max: 12 }).withMessage('month must be between 1 and 12'),
  validate,
];

export const validateGroupBy = [
  query('groupBy')
    .optional()
    .isIn(['category', 'tag'])
    .withMessage('groupBy must be either "category" or "tag"'),
  validate,
];

export const validateExpensesFilters = [
  ...validateDateFilters,
  ...validateArrayParams,
  ...validateTextSearch,
];

export const validateSummaryFilters = [...validateDateFilters, ...validateArrayParams];

export const validateChartsFilters = [...validateDateFilters, ...validateArrayParams];

export const validateTrendsFilters = [
  ...validateDateFilters,
  ...validateArrayParams,
  ...validateGroupBy,
];
