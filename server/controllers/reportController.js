import WorkSession from '../models/WorkSession.js';
import StoreVisit from '../models/StoreVisit.js';
import Store from '../models/Store.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { AppError } from '../utils/helpers.js';
import { getPagination, paginateResult, startOfDayUTC, endOfDayUTC, fromMinorUnits, formatMoney } from '../utils/geo.js';
import { ROLES } from '../config/constants.js';

/**
 * Fetch employee report data (aggregation pipeline with $lookup).
 */
export async function fetchEmployeeReport(filters = {}) {
  const { startDate, endDate, employeeId } = filters;
  const match = {};
  if (employeeId) match.employee = employeeId;
  if (startDate || endDate) {
    match.sessionDate = {};
    if (startDate) match.sessionDate.$gte = startOfDayUTC(startDate);
    if (endDate) match.sessionDate.$lte = endOfDayUTC(endDate);
  }

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'users',
        localField: 'employee',
        foreignField: '_id',
        as: 'employeeInfo',
      },
    },
    { $unwind: { path: '$employeeInfo', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'storevisits',
        localField: '_id',
        foreignField: 'session',
        as: 'visits',
      },
    },
    {
      $group: {
        _id: '$employee',
        employeeName: { $first: '$employeeInfo.fullName' },
        email: { $first: '$employeeInfo.email' },
        employeeId: { $first: '$employeeInfo.employeeId' },
        totalSessions: { $sum: 1 },
        totalDistanceKm: { $sum: '$totalDistanceKm' },
        totalDurationMs: { $sum: '$totalDurationMs' },
        totalVisits: { $sum: { $size: '$visits' } },
        totalVisitValue: {
          $sum: {
            $reduce: {
              input: '$visits',
              initialValue: 0,
              in: { $add: ['$value', { $ifNull: ['$this.totalValue', 0] }] },
            },
          },
        },
      },
    },
    { $sort: { totalSessions: -1 } },
  ];

  return WorkSession.aggregate(pipeline);
}

/**
 * GET /api/v1/reports/employee
 */
export async function employeeReport(req, res, next) {
  try {
    const { startDate, endDate, employeeId } = req.query;
    const data = await fetchEmployeeReport({ startDate, endDate, employeeId });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * Fetch store report data.
 */
export async function fetchStoreReport(filters = {}) {
  const { startDate, endDate, storeId } = filters;
  const match = {};
  if (storeId) match.store = storeId;
  if (startDate || endDate) {
    match.visitDate = {};
    if (startDate) match.visitDate.$gte = startOfDayUTC(startDate);
    if (endDate) match.visitDate.$lte = endOfDayUTC(endDate);
  }

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'stores',
        localField: 'store',
        foreignField: '_id',
        as: 'storeInfo',
      },
    },
    { $unwind: { path: '$storeInfo', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$store',
        storeName: { $first: '$storeInfo.name' },
        storeCode: { $first: '$storeInfo.code' },
        city: { $first: '$storeInfo.city' },
        totalVisits: { $sum: 1 },
        totalQuantity: { $sum: '$totalQuantity' },
        totalValue: { $sum: '$totalValue' },
        totalCollected: {
          $sum: {
            $reduce: {
              input: '$items',
              initialValue: 0,
              in: { $add: ['$value', { $ifNull: ['$this.collectedAmount', 0] }] },
            },
          },
        },
      },
    },
    { $sort: { totalVisits: -1 } },
  ];

  return StoreVisit.aggregate(pipeline);
}

/**
 * GET /api/v1/reports/store
 */
export async function storeReport(req, res, next) {
  try {
    const { startDate, endDate, storeId } = req.query;
    const data = await fetchStoreReport({ startDate, endDate, storeId });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * Fetch product report data.
 */
export async function fetchProductReport(filters = {}) {
  const { startDate, endDate, productId } = filters;
  const match = {};
  if (productId) match['items.product'] = productId;
  if (startDate || endDate) {
    match.visitDate = {};
    if (startDate) match.visitDate.$gte = startOfDayUTC(startDate);
    if (endDate) match.visitDate.$lte = endOfDayUTC(endDate);
  }

  const pipeline = [
    { $match: match },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productName',
        sku: { $first: '$items.sku' },
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.unitPrice', '$items.quantity'] } },
        totalCollected: { $sum: '$items.collectedAmount' },
        visitCount: { $sum: 1 },
      },
    },
    { $sort: { totalQuantity: -1 } },
  ];

  return StoreVisit.aggregate(pipeline);
}

/**
 * GET /api/v1/reports/product
 */
export async function productReport(req, res, next) {
  try {
    const { startDate, endDate, productId } = req.query;
    const data = await fetchProductReport({ startDate, endDate, productId });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * Fetch date report data (visits + sessions/distance).
 */
export async function fetchDateReport(filters = {}) {
  const { startDate, endDate } = filters;
  const visitMatch = {};
  const sessionMatch = {};
  if (startDate || endDate) {
    visitMatch.visitDate = {};
    sessionMatch.sessionDate = {};
    if (startDate) {
      visitMatch.visitDate.$gte = startOfDayUTC(startDate);
      sessionMatch.sessionDate.$gte = startOfDayUTC(startDate);
    }
    if (endDate) {
      visitMatch.visitDate.$lte = endOfDayUTC(endDate);
      sessionMatch.sessionDate.$lte = endOfDayUTC(endDate);
    }
  }

  const [visitRows, sessionRows] = await Promise.all([
    StoreVisit.aggregate([
      { $match: visitMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$visitDate' } },
          totalVisits: { $sum: 1 },
          totalQuantity: { $sum: '$totalQuantity' },
          totalValue: { $sum: '$totalValue' },
          totalCollected: {
            $sum: {
              $reduce: {
                input: '$items',
                initialValue: 0,
                in: { $add: ['$value', { $ifNull: ['$this.collectedAmount', 0] }] },
              },
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    WorkSession.aggregate([
      { $match: sessionMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$sessionDate' } },
          totalSessions: { $sum: 1 },
          totalDistanceKm: { $sum: '$totalDistanceKm' },
        },
      },
    ]),
  ]);

  const byDate = new Map();
  for (const row of visitRows) {
    byDate.set(row._id, {
      _id: row._id,
      date: row._id,
      totalVisits: row.totalVisits,
      totalQuantity: row.totalQuantity,
      totalValue: row.totalValue,
      totalCollected: row.totalCollected,
      totalSessions: 0,
      totalDistanceKm: 0,
    });
  }
  for (const row of sessionRows) {
    const existing = byDate.get(row._id) || {
      _id: row._id,
      date: row._id,
      totalVisits: 0,
      totalQuantity: 0,
      totalValue: 0,
      totalCollected: 0,
      totalSessions: 0,
      totalDistanceKm: 0,
    };
    existing.totalSessions = row.totalSessions;
    existing.totalDistanceKm = Number((row.totalDistanceKm || 0).toFixed(2));
    byDate.set(row._id, existing);
  }

  return Array.from(byDate.values()).sort((a, b) => String(a._id).localeCompare(String(b._id)));
}

/**
 * GET /api/v1/reports/date
 */
export async function dateReport(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const data = await fetchDateReport({ startDate, endDate });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/reports/export/:type/csv
 * Export report as CSV. type can be 'employee', 'store', 'product', or 'date'.
 */
export async function exportCsv(req, res, next) {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;
    const filters = { startDate, endDate };

    let data = [];
    let headers = [];
    let filename = '';

    switch (type) {
      case 'employee':
        data = await fetchEmployeeReport(filters);
        headers = ['Employee', 'Email', 'Employee ID', 'Sessions', 'Distance (km)', 'Duration (hrs)', 'Visits', 'Visit Value'];
        filename = 'employee-report.csv';
        break;
      case 'store':
        data = await fetchStoreReport(filters);
        headers = ['Store', 'Code', 'City', 'Visits', 'Quantity', 'Value', 'Collected'];
        filename = 'store-report.csv';
        break;
      case 'product':
        data = await fetchProductReport(filters);
        headers = ['Product', 'SKU', 'Quantity', 'Revenue', 'Collected', 'Visits'];
        filename = 'product-report.csv';
        break;
      case 'date':
        data = await fetchDateReport(filters);
        headers = ['Date', 'Visits', 'Quantity', 'Value', 'Collected'];
        filename = 'date-report.csv';
        break;
      default:
        throw new AppError('Invalid report type. Use employee, store, product, or date.', 400);
    }

    // Build CSV
    const csvLines = [headers.join(',')];
    for (const row of data) {
      let line;
      switch (type) {
        case 'employee':
          line = [
            `"${row.employeeName || ''}"`,
            `"${row.email || ''}"`,
            `"${row.employeeId || ''}"`,
            row.totalSessions,
            (row.totalDistanceKm || 0).toFixed(2),
            ((row.totalDurationMs || 0) / 3600000).toFixed(2),
            row.totalVisits,
            fromMinorUnits(row.totalVisitValue || 0).toFixed(2),
          ].join(',');
          break;
        case 'store':
          line = [
            `"${row.storeName || ''}"`,
            `"${row.storeCode || ''}"`,
            `"${row.city || ''}"`,
            row.totalVisits,
            row.totalQuantity,
            fromMinorUnits(row.totalValue || 0).toFixed(2),
            fromMinorUnits(row.totalCollected || 0).toFixed(2),
          ].join(',');
          break;
        case 'product':
          line = [
            `"${row._id || ''}"`,
            `"${row.sku || ''}"`,
            row.totalQuantity,
            fromMinorUnits(row.totalRevenue || 0).toFixed(2),
            fromMinorUnits(row.totalCollected || 0).toFixed(2),
            row.visitCount,
          ].join(',');
          break;
        case 'date':
          line = [
            row._id,
            row.totalVisits,
            row.totalQuantity,
            fromMinorUnits(row.totalValue || 0).toFixed(2),
            fromMinorUnits(row.totalCollected || 0).toFixed(2),
          ].join(',');
          break;
      }
      csvLines.push(line);
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvLines.join('\n'));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/reports/export/:type/excel
 * Export report as Excel using exceljs.
 */
export async function exportExcel(req, res, next) {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;
    const filters = { startDate, endDate };

    let data = [];
    let headers = [];
    let sheetName = '';
    let filename = '';

    switch (type) {
      case 'employee':
        data = await fetchEmployeeReport(filters);
        headers = ['Employee', 'Email', 'Employee ID', 'Sessions', 'Distance (km)', 'Duration (hrs)', 'Visits', 'Visit Value'];
        sheetName = 'Employee Report';
        filename = 'employee-report.xlsx';
        break;
      case 'store':
        data = await fetchStoreReport(filters);
        headers = ['Store', 'Code', 'City', 'Visits', 'Quantity', 'Value', 'Collected'];
        sheetName = 'Store Report';
        filename = 'store-report.xlsx';
        break;
      case 'product':
        data = await fetchProductReport(filters);
        headers = ['Product', 'SKU', 'Quantity', 'Revenue', 'Collected', 'Visits'];
        sheetName = 'Product Report';
        filename = 'product-report.xlsx';
        break;
      case 'date':
        data = await fetchDateReport(filters);
        headers = ['Date', 'Visits', 'Quantity', 'Value', 'Collected'];
        sheetName = 'Date Report';
        filename = 'date-report.xlsx';
        break;
      default:
        throw new AppError('Invalid report type. Use employee, store, product, or date.', 400);
    }

    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Add headers
    worksheet.addRow(headers);

    // Add data rows
    for (const row of data) {
      switch (type) {
        case 'employee':
          worksheet.addRow([
            row.employeeName || '',
            row.email || '',
            row.employeeId || '',
            row.totalSessions,
            (row.totalDistanceKm || 0).toFixed(2),
            ((row.totalDurationMs || 0) / 3600000).toFixed(2),
            row.totalVisits,
            fromMinorUnits(row.totalVisitValue || 0),
          ]);
          break;
        case 'store':
          worksheet.addRow([
            row.storeName || '',
            row.storeCode || '',
            row.city || '',
            row.totalVisits,
            row.totalQuantity,
            fromMinorUnits(row.totalValue || 0),
            fromMinorUnits(row.totalCollected || 0),
          ]);
          break;
        case 'product':
          worksheet.addRow([
            row._id || '',
            row.sku || '',
            row.totalQuantity,
            fromMinorUnits(row.totalRevenue || 0),
            fromMinorUnits(row.totalCollected || 0),
            row.visitCount,
          ]);
          break;
        case 'date':
          worksheet.addRow([
            row._id,
            row.totalVisits,
            row.totalQuantity,
            fromMinorUnits(row.totalValue || 0),
            fromMinorUnits(row.totalCollected || 0),
          ]);
          break;
      }
    }

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/reports/export/:type/pdf
 * Export report as PDF using pdfkit.
 */
export async function exportPdf(req, res, next) {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;
    const filters = { startDate, endDate };

    let data = [];
    let title = '';
    let headers = [];
    let filename = '';

    switch (type) {
      case 'employee':
        data = await fetchEmployeeReport(filters);
        title = 'Employee Report';
        headers = ['Employee', 'Email', 'Sessions', 'Visits', 'Value'];
        filename = 'employee-report.pdf';
        break;
      case 'store':
        data = await fetchStoreReport(filters);
        title = 'Store Report';
        headers = ['Store', 'Code', 'City', 'Visits', 'Value'];
        filename = 'store-report.pdf';
        break;
      case 'product':
        data = await fetchProductReport(filters);
        title = 'Product Report';
        headers = ['Product', 'SKU', 'Quantity', 'Revenue', 'Visits'];
        filename = 'product-report.pdf';
        break;
      case 'date':
        data = await fetchDateReport(filters);
        title = 'Date Report';
        headers = ['Date', 'Visits', 'Quantity', 'Value', 'Collected'];
        filename = 'date-report.pdf';
        break;
      default:
        throw new AppError('Invalid report type. Use employee, store, product, or date.', 400);
    }

    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // Title
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Table headers
    const colWidths = [];
    const pageWidth = doc.page.width - 100;
    const colCount = headers.length;
    const colWidth = Math.floor(pageWidth / colCount);
    for (let i = 0; i < colCount; i++) colWidths.push(colWidth);

    let x = 50;
    doc.font('Helvetica-Bold');
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], x, doc.y, { width: colWidths[i] });
      x += colWidths[i];
    }
    doc.moveDown();
    doc.font('Helvetica');

    // Data rows
    for (const row of data) {
      x = 50;
      const y = doc.y;
      let cells = [];

      switch (type) {
        case 'employee':
          cells = [row.employeeName || '', row.email || '', String(row.totalSessions), String(row.totalVisits), formatMoney(row.totalVisitValue || 0)];
          break;
        case 'store':
          cells = [row.storeName || '', row.storeCode || '', row.city || '', String(row.totalVisits), formatMoney(row.totalValue || 0)];
          break;
        case 'product':
          cells = [row._id || '', row.sku || '', String(row.totalQuantity), formatMoney(row.totalRevenue || 0), String(row.visitCount)];
          break;
        case 'date':
          cells = [row._id, String(row.totalVisits), String(row.totalQuantity), formatMoney(row.totalValue || 0), formatMoney(row.totalCollected || 0)];
          break;
      }

      for (let i = 0; i < cells.length; i++) {
        doc.text(cells[i], x, y, { width: colWidths[i] });
        x += colWidths[i];
      }
      doc.moveDown(0.5);
    }

    doc.end();
  } catch (err) {
    next(err);
  }
}
