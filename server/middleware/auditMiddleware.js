import AuditLog from '../models/AuditLog.js';
import logger from '../utils/logger.js';

/**
 * Create an audit log entry.
 *
 * @param {object} params
 * @param {import('express').Request} [params.req] Express request (for actor IP / UA)
 * @param {string} params.action e.g. 'user.create'
 * @param {string} params.entity e.g. 'User'
 * @param {import('mongoose').Types.ObjectId|string} [params.entityId]
 * @param {string} [params.description]
 * @param {*} [params.before]
 * @param {*} [params.after]
 * @returns {Promise<void>}
 */
export async function logAudit({ req, action, entity, entityId, description, before, after }) {
  try {
    await AuditLog.create({
      actor: req?.user?._id || null,
      actorRole: req?.user?.role || null,
      action,
      entity,
      entityId: entityId || null,
      description: description || '',
      before: before || undefined,
      after: after || undefined,
      ipAddress: req?.ip || req?.connection?.remoteAddress || null,
      userAgent: req?.get('User-Agent') || null,
    });
  } catch (err) {
    logger.error(`Audit log error: ${err.message}`);
  }
}

export default logAudit;
