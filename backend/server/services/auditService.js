import { AuditModel } from '../models/AuditModel.js';

// Fire-and-forget audit writer. `req.user` is the actor (set by authMiddleware).
// Never blocks or throws into the request flow.
export function audit(req, action, { entityType, entityId, detail } = {}) {
  const actor = req?.user ?? {};
  AuditModel.create({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action,
    entityType,
    entityId,
    detail,
  }).catch(() => {});
}
