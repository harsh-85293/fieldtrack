import AuditLog from '../models/AuditLog.js';
import { getPagination, paginateResult } from '../utils/geo.js';

/**
 * GET /api/v1/audit
 * Admin: list audit logs with search/filter/pagination.
 */
export async function listAuditLogs(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, entity, action, actor } = req.query;

    const filter = {};
    if (entity) filter.entity = entity;
    if (action) filter.action = { $regex: action, $options: 'i' };
    if (actor) filter.actor = actor;
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
        { entity: { $regex: search, $options: 'i' } },
      ];
    }

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter)
        .populate('actor', 'fullName email')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
    ]);

    res.json({ success: true, data: paginateResult(logs, total, page, limit) });
  } catch (err) {
    next(err);
  }
}
