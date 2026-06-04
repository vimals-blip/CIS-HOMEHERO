import { DocumentModel } from '../models/DocumentModel.js';
import { storageProvider } from '../providers/storageProvider.js';
import { BadRequest, Forbidden, NotFound } from '../errors.js';

const VALID_TYPES = ['AADHAAR', 'PAN', 'SELFIE', 'OTHER'];

export const documentController = {
  // Returns where to upload a KYC file (S3 presign in production, mock otherwise).
  async uploadTarget(req, res) {
    if (req.user.id !== req.params.id && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') throw Forbidden();
    const target = await storageProvider.getUploadTarget({ folder: `kyc/${req.params.id}`, contentType: req.query.type || 'image/jpeg' });
    res.json(target);
  },

  async list(req, res) {
    if (req.user.id !== req.params.id && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') throw Forbidden();
    res.json(await DocumentModel.listForExpert(req.params.id));
  },

  // Expert submits a document reference (file already uploaded to storage).
  async submit(req, res) {
    if (req.user.id !== req.params.id) throw Forbidden('You can only submit your own documents.');
    const { type, file_url } = req.body;
    if (!type || !file_url) throw BadRequest('MISSING_FIELDS', 'type and file_url are required.');
    if (!VALID_TYPES.includes(type)) throw BadRequest('INVALID_TYPE', 'Invalid document type.');
    const id = await DocumentModel.upsert(req.params.id, type, file_url);
    res.status(201).json({ id, type, status: 'PENDING' });
  },

  // Admin reviews a document.
  async review(req, res) {
    const { status, note } = req.body;
    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) throw BadRequest('INVALID_STATUS', 'Invalid review status.');
    const doc = await DocumentModel.findById(req.params.docId);
    if (!doc) throw NotFound('Document not found.');
    await DocumentModel.setStatus(req.params.docId, status, note);
    res.json({ status: 'updated', document_status: status });
  },
};
