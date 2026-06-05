import { CouponModel } from '../models/CouponModel.js';
import { BadRequest } from '../errors.js';

export const couponController = {
  // Preview a coupon's discount against an amount, for the logged-in user.
  async validate(req, res) {
    const { code, amount } = req.body;
    if (!code || amount == null) throw BadRequest('MISSING_FIELDS', 'code and amount are required.');
    const result = await CouponModel.evaluate(code, Number(amount), req.user.id);
    if (!result.ok) throw BadRequest('INVALID_COUPON', result.reason);
    res.json({
      code: result.coupon.code,
      type: result.coupon.type,
      value: Number(result.coupon.value),
      discount: result.discount,
      total: Math.max(0, Number(amount) - result.discount),
    });
  },
};
