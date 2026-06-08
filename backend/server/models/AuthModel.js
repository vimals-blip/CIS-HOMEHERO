import crypto from 'node:crypto';
import prisma from '../prisma.js';

export const AuthModel = {
  async findByEmail(email) {
    return prisma.users.findUnique({ where: { email } });
  },

  async emailExists(email) {
    const count = await prisma.users.count({ where: { email } });
    return count > 0;
  },

  async createUser({ email, passwordHash, name, city, phone, role }, tx = prisma) {
    const id = `user-${crypto.randomUUID()}`;
    await tx.users.create({
      data: { id, email, password_hash: passwordHash, is_verified: true },
    });
    await tx.profiles.upsert({
      where: { id },
      create: { id, name: name ?? null, phone: phone ?? null, city: city ?? null },
      update: { name: name ?? null, phone: phone ?? null, city: city ?? null },
    });
    if (phone) {
      await tx.profile_contacts.upsert({
        where: { user_id: id },
        create: { user_id: id, phone },
        update: { phone },
      });
    }
    await tx.user_roles.upsert({
      where: { id },
      create: { id, user_id: id, role },
      update: { role },
    });
    return id;
  },

  async createExpertProfile(userId, { gender, bio, experienceYears, servicePincodes }, tx = prisma) {
    await tx.experts.upsert({
      where: { id: userId },
      create: {
        id: userId,
        gender: gender ?? 'FEMALE',
        bio: bio ?? null,
        experience_years: experienceYears ?? 0,
        service_pincodes: servicePincodes ?? [],
        onboarding_status: 'SUBMITTED',
      },
      update: {
        gender: gender ?? 'FEMALE',
        bio: bio ?? null,
        experience_years: experienceYears ?? 0,
        service_pincodes: servicePincodes ?? [],
      },
    });
    await tx.expert_wallet.upsert({
      where: { expert_id: userId },
      create: { expert_id: userId },
      update: {},
    });
  },

  async addExpertServices(expertId, serviceIds, tx = prisma) {
    for (const serviceId of serviceIds) {
      await tx.expert_services.upsert({
        where: { expert_id_service_id: { expert_id: expertId, service_id: serviceId } },
        create: { expert_id: expertId, service_id: serviceId },
        update: {},
      });
    }
  },

  async getRoleByUserId(userId) {
    const row = await prisma.user_roles.findFirst({ where: { user_id: userId } });
    return row?.role ?? 'CUSTOMER';
  },

  async findUserByPhone(phone) {
    const rows = await prisma.$queryRaw`
      SELECT u.id, u.email, u.is_blocked, ur.role
      FROM profiles p
      JOIN users u ON u.id = p.id
      LEFT JOIN user_roles ur ON ur.user_id = p.id
      WHERE p.phone = ${phone}
      ORDER BY u.created_at ASC
      LIMIT 1
    `;
    return rows[0] ?? null;
  },

  async createPhoneUser(phone) {
    const id = `user-${crypto.randomUUID()}`;
    const email = `${phone}@phone.homehero`;
    const placeholderHash = crypto.randomBytes(24).toString('hex');
    await prisma.users.create({ data: { id, email, password_hash: placeholderHash, is_verified: true } });
    await prisma.profiles.create({ data: { id, name: null, phone } });
    await prisma.user_roles.create({ data: { id, user_id: id, role: 'CUSTOMER' } });
    return { id, email, role: 'CUSTOMER' };
  },

  async createOtp(phone, otpHash, expiresAt) {
    const id = `otp-${crypto.randomUUID()}`;
    await prisma.otp_verifications.create({ data: { id, phone, otp_hash: otpHash, expires_at: expiresAt } });
    return id;
  },

  async latestOtp(phone) {
    return prisma.otp_verifications.findFirst({
      where: { phone, consumed: false },
      orderBy: { created_at: 'desc' },
    });
  },

  async bumpOtpAttempts(id) {
    await prisma.otp_verifications.update({ where: { id }, data: { attempts: { increment: 1 } } });
  },

  async consumeOtp(id) {
    await prisma.otp_verifications.update({ where: { id }, data: { consumed: true } });
  },

  async saveRefreshToken(userId, tokenHash, expiresAt) {
    const id = `rt-${crypto.randomUUID()}`;
    await prisma.refresh_tokens.create({ data: { id, user_id: userId, token_hash: tokenHash, expires_at: expiresAt } });
  },

  async findRefreshToken(tokenHash) {
    const rows = await prisma.$queryRaw`
      SELECT rt.*, u.email, ur.role
      FROM refresh_tokens rt
      JOIN users u ON u.id = rt.user_id
      LEFT JOIN user_roles ur ON ur.user_id = rt.user_id
      WHERE rt.token_hash = ${tokenHash} AND rt.revoked = 0 AND rt.expires_at > NOW()
    `;
    return rows[0] ?? null;
  },

  async revokeRefreshToken(tokenHash) {
    await prisma.refresh_tokens.updateMany({ where: { token_hash: tokenHash }, data: { revoked: true } });
  },
};
