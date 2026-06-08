import prisma from '../prisma.js';

export const ProfileModel = {
  async getMe(userId) {
    const rows = await prisma.$queryRaw`
      SELECT u.id, u.email, p.name, p.phone, p.city, p.avatar_url, ur.role
      FROM users u
      LEFT JOIN profiles p ON p.id = u.id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      WHERE u.id = ${userId}
    `;
    return rows[0] ?? null;
  },

  async updateProfile(userId, { name, phone, city, avatarUrl }) {
    const data = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (city !== undefined) data.city = city;
    if (avatarUrl !== undefined) data.avatar_url = avatarUrl;
    if (!Object.keys(data).length) return;
    await prisma.profiles.update({ where: { id: userId }, data });
    if (phone !== undefined) {
      await prisma.profile_contacts.upsert({
        where: { user_id: userId },
        create: { user_id: userId, phone },
        update: { phone },
      });
    }
  },

  async getPasswordHash(userId) {
    const row = await prisma.users.findUnique({ where: { id: userId }, select: { password_hash: true } });
    return row?.password_hash ?? null;
  },

  async updatePassword(userId, passwordHash) {
    await prisma.users.update({ where: { id: userId }, data: { password_hash: passwordHash } });
  },
};
