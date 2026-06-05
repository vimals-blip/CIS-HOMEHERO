import { SupportModel } from '../models/SupportModel.js';
import { BadRequest, Forbidden, NotFound } from '../errors.js';

const STAFF = ['ADMIN', 'SUPER_ADMIN'];

function canView(req, ticket) {
  return STAFF.includes(req.user.role) || ticket.user_id === req.user.id;
}

export const supportController = {
  async create(req, res) {
    const { subject, category, priority, booking_id } = req.body;
    if (!subject || String(subject).trim().length < 3) throw BadRequest('INVALID_SUBJECT', 'Subject is required.');
    const id = await SupportModel.createTicket({
      userId: req.user.id, subject: subject.trim(), category, priority, bookingId: booking_id,
    });
    // Seed the thread with the customer's opening message if provided.
    if (req.body.message) await SupportModel.addMessage(id, req.user.id, String(req.body.message), false);
    res.status(201).json({ id, status: 'OPEN' });
  },

  async list(req, res) {
    const tickets = STAFF.includes(req.user.role)
      ? await SupportModel.listAll(req.query.status)
      : await SupportModel.listForUser(req.user.id);
    res.json(tickets);
  },

  async getOne(req, res) {
    const ticket = await SupportModel.findById(req.params.id);
    if (!ticket) throw NotFound('Ticket not found.');
    if (!canView(req, ticket)) throw Forbidden();
    const messages = await SupportModel.messages(req.params.id);
    res.json({ ...ticket, messages });
  },

  async reply(req, res) {
    const ticket = await SupportModel.findById(req.params.id);
    if (!ticket) throw NotFound('Ticket not found.');
    if (!canView(req, ticket)) throw Forbidden();
    const { body } = req.body;
    if (!body || !String(body).trim()) throw BadRequest('EMPTY_MESSAGE', 'Message cannot be empty.');
    const isStaff = STAFF.includes(req.user.role);
    const id = await SupportModel.addMessage(req.params.id, req.user.id, String(body).trim(), isStaff);
    // A staff reply moves an open ticket into progress.
    if (isStaff && ticket.status === 'OPEN') await SupportModel.setStatus(req.params.id, 'IN_PROGRESS');
    res.status(201).json({ id });
  },

  // Staff updates ticket status.
  async setStatus(req, res) {
    if (!STAFF.includes(req.user.role)) throw Forbidden();
    const { status } = req.body;
    if (!['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) throw BadRequest('INVALID_STATUS', 'Invalid status.');
    const ticket = await SupportModel.findById(req.params.id);
    if (!ticket) throw NotFound('Ticket not found.');
    await SupportModel.setStatus(req.params.id, status);
    res.json({ status: 'updated', ticket_status: status });
  },
};
