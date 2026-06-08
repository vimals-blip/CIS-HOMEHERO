import crypto from 'node:crypto';
import prisma from '../prisma.js';

export const AddressModel = {
  async listByCustomer(customerId) {
    return prisma.addresses.findMany({
      where: { customer_id: customerId },
      orderBy: [{ is_default: 'desc' }, { created_at: 'desc' }],
    });
  },

  async findById(id) {
    return prisma.addresses.findUnique({ where: { id } });
  },

  async create({ customerId, label, flat, addressLine, landmark, city, pincode, lat, lng, isDefault }) {
    const id = `addr-${crypto.randomUUID()}`;
    if (isDefault) {
      await prisma.addresses.updateMany({ where: { customer_id: customerId }, data: { is_default: false } });
    }
    await prisma.addresses.create({
      data: {
        id,
        customer_id: customerId,
        label: label ?? 'Home',
        flat: flat ?? null,
        address_line: addressLine,
        landmark: landmark ?? null,
        city,
        pincode,
        lat: lat ?? null,
        lng: lng ?? null,
        is_default: isDefault ? true : false,
      },
    });
    return id;
  },

  async setDefault(customerId, id) {
    await prisma.addresses.updateMany({ where: { customer_id: customerId }, data: { is_default: false } });
    await prisma.addresses.updateMany({ where: { id, customer_id: customerId }, data: { is_default: true } });
  },

  async remove(id) {
    await prisma.addresses.delete({ where: { id } });
  },
};
