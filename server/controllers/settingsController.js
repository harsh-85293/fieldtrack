import AppSetting from '../models/AppSetting.js';
import { AppError } from '../utils/helpers.js';
import logAudit from '../middleware/auditMiddleware.js';

/**
 * GET /api/v1/settings
 * Admin: list all settings.
 */
export async function listSettings(req, res, next) {
  try {
    const settings = await AppSetting.find().sort('category key');
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/settings/public
 * Public: list only public settings.
 */
export async function getPublicSettings(req, res, next) {
  try {
    const settings = await AppSetting.find({ isPublic: true }).select('key value category label');
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/settings/:key
 * Admin: update a setting by key.
 */
export async function updateSetting(req, res, next) {
  try {
    const { value, label, category, isPublic } = req.body;
    const setting = await AppSetting.findOne({ key: req.params.key });
    if (!setting) throw new AppError('Setting not found', 404);

    const before = setting.toObject();
    if (value !== undefined) setting.value = value;
    if (label !== undefined) setting.label = label;
    if (category !== undefined) setting.category = category;
    if (isPublic !== undefined) setting.isPublic = isPublic;
    setting.updatedBy = req.user._id;
    await setting.save();

    await logAudit({
      req,
      action: 'setting.update',
      entity: 'AppSetting',
      entityId: setting._id,
      description: `Updated setting ${setting.key}`,
      before,
      after: setting.toObject(),
    });

    res.json({ success: true, message: 'Setting updated', data: setting });
  } catch (err) {
    next(err);
  }
}
