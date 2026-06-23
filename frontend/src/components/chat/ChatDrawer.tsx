import React, { useEffect, useState, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { useAuth } from '@/lib/auth-context';
import { getSocket } from '@/lib/socket';
import { apiFetch } from '@/lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Send, Loader2, User } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '../../lib/utils';

interface ChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId: string | null;
  recipientName?: string;
  type?: 'BOOKING' | 'SUPPORT';
  bookingId?: string | null;
}

export function ChatDrawer({ open, onOpenChange, recipientId, recipientName = "User", type = "SUPPORT", bookingId = null }: ChatDrawerProps) {
  const { user } = useAuth();
  const socket = getSocket();
  const [content, setContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // 1. Get or Create Conversation
  const { data: conversation, isLoading: starting } = useQuery({
    queryKey: ['chat', recipientId, bookingId],
    queryFn: async () => {
      if (!recipientId) return null;
      return await apiFetch('/chat/conversations', { 
        method: 'POST', 
        body: JSON.stringify({ user2_id: recipientId, type, booking_id: bookingId }) 
      });
    },
    enabled: open && !!recipientId,
  });

  // 2. Fetch Messages
  const conversationId = conversation?.id;
  const { data: messages = [], isLoading: loadingMsgs } = useQuery({
    queryKey: ['chat', conversationId, 'messages'],
    queryFn: async () => {
      if (!conversationId) return [];
      return await apiFetch(`/chat/conversations/${conversationId}/messages`);
    },
    enabled: !!conversationId && open,
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Listen to Socket.IO for new messages
  useEffect(() => {
    if (!socket || !open || !conversationId) return;

    const handleNewMessage = (msg: any) => {
      if (msg.conversation_id === conversationId) {
        queryClient.setQueryData(['chat', conversationId, 'messages'], (old: any) => [...(old || []), msg]);
      }
    };

    socket.on('chat_message', handleNewMessage);
    return () => {
      socket.off('chat_message', handleNewMessage);
    };
  }, [socket, open, conversationId, queryClient]);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (text: string) => {
      return await apiFetch(`/chat/conversations/${conversationId}/messages`, { 
        method: 'POST', 
        body: JSON.stringify({ content: text }) 
      });
    },
    onSuccess: (newMsg) => {
      setContent('');
      // It will also arrive via socket, but optimistic update is faster
      queryClient.setQueryData(['chat', conversationId, 'messages'], (old: any) => {
        // Prevent duplicate if socket beat the HTTP response
        if (old?.find((m: any) => m.id === newMsg.id)) return old;
        return [...(old || []), newMsg];
      });
    }
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !conversationId || sendMessage.isPending) return;
    sendMessage.mutate(content.trim());
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col p-0 border-l border-border bg-background shadow-xl">
        <SheetHeader className="p-4 border-b border-border/50 bg-muted/20 flex flex-row items-center gap-3 space-y-0">
          <Avatar className="h-10 w-10 border border-border/50">
            <AvatarFallback className="bg-primary/10 text-primary"><User className="h-5 w-5" /></AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-left">
            <SheetTitle className="text-base font-semibold">{recipientName}</SheetTitle>
            <span className="text-xs text-muted-foreground">{type === 'BOOKING' ? 'Booking Support' : 'Direct Message'}</span>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-muted/5" ref={scrollRef}>
          {starting || loadingMsgs ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading chat...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Send className="h-5 w-5 text-primary opacity-50 ml-1" />
              </div>
              <p>No messages yet.</p>
              <p className="text-xs mt-1">Send a message to start the conversation.</p>
            </div>
          ) : (
            messages.map((msg: any) => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={cn("flex flex-col max-w-[80%] animate-in fade-in slide-in-from-bottom-2", isMe ? "self-end items-end" : "self-start items-start")}>
                  <div className={cn("px-4 py-2 rounded-2xl text-sm", isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground border border-border/50 rounded-bl-sm")}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 mx-1 opacity-70">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-border/50 bg-background">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <Input 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-full px-4 border-border/60 focus-visible:ring-primary/20 bg-muted/20"
              disabled={starting || !conversationId}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="rounded-full h-10 w-10 shrink-0" 
              disabled={!content.trim() || starting || !conversationId || sendMessage.isPending}
            >
              {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
