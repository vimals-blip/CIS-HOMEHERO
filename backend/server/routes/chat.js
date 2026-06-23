import express from 'express';
import prisma from '../prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { emitToUser } from '../realtime/io.js';

const router = express.Router();

router.use(authMiddleware);

// Get all conversations for the current user
router.get('/conversations', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const conversations = await prisma.conversations.findMany({
      where: {
        OR: [
          { user1_id: userId },
          { user2_id: userId }
        ]
      },
      orderBy: { updated_at: 'desc' }
    });

    // Manually fetch profiles for the "other" user in each conversation
    const otherUserIds = conversations.map(c => c.user1_id === userId ? c.user2_id : c.user1_id);
    const profiles = await prisma.profiles.findMany({
      where: { user_id: { in: otherUserIds } },
      select: { user_id: true, first_name: true, last_name: true, avatar_url: true }
    });

    const enrichedConversations = conversations.map(c => {
      const otherId = c.user1_id === userId ? c.user2_id : c.user1_id;
      const profile = profiles.find(p => p.user_id === otherId);
      return { ...c, other_user: profile || { user_id: otherId, first_name: 'Unknown', last_name: 'User' } };
    });

    res.json(enrichedConversations);
  } catch (err) {
    next(err);
  }
});

// Create or get an existing conversation
router.post('/conversations', async (req, res, next) => {
  try {
    const { user2_id, type, booking_id } = req.body;
    const user1_id = req.user.id;

    if (!user2_id) {
      return res.status(400).json({ error: "user2_id is required" });
    }

    // Try to find existing conversation
    let conversation = await prisma.conversations.findFirst({
      where: {
        OR: [
          { user1_id: user1_id, user2_id: user2_id, type: type || 'SUPPORT', booking_id: booking_id || null },
          { user1_id: user2_id, user2_id: user1_id, type: type || 'SUPPORT', booking_id: booking_id || null }
        ]
      }
    });

    if (!conversation) {
      conversation = await prisma.conversations.create({
        data: {
          user1_id,
          user2_id,
          type: type || 'SUPPORT',
          booking_id: booking_id || null
        }
      });
    }
    res.json(conversation);
  } catch (err) {
    next(err);
  }
});

// Get messages for a specific conversation
router.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params;
    const messages = await prisma.messages.findMany({
      where: { conversation_id: id },
      orderBy: { created_at: 'asc' }
    });
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

// Send a message
router.post('/conversations/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const sender_id = req.user.id;

    if (!content) {
      return res.status(400).json({ error: "content is required" });
    }

    const conversation = await prisma.conversations.findUnique({
      where: { id }
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const message = await prisma.messages.create({
      data: {
        conversation_id: id,
        sender_id,
        content
      }
    });

    await prisma.conversations.update({
      where: { id },
      data: { updated_at: new Date() }
    });

    // Broadcast the message via Socket.IO
    const recipient_id = conversation.user1_id === sender_id ? conversation.user2_id : conversation.user1_id;
    emitToUser(recipient_id, 'chat_message', message);
    emitToUser(sender_id, 'chat_message', message);

    res.json(message);
  } catch (err) {
    next(err);
  }
});

export default router;
