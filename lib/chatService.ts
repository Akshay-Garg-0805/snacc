import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';

export interface ChatRoom {
  id: string;
  name?: string;
  type: 'direct' | 'group';
  participants: string[];
  createdBy: string;
  createdAt: number;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: number;
    type: 'text' | 'meme' | 'image';
  };
  lastActivity: number;
  isActive: boolean;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  type: 'text' | 'meme' | 'image';
  timestamp: number;
  memeData?: {
    memeId: string;
    title: string;
    imageUrl: string;
    authorName: string;
  };
  readBy: string[];
  edited?: boolean;
  editedAt?: number;
}

export class ChatService {
  private static readonly CHAT_ROOMS_COLLECTION = 'chatRooms';
  private static readonly CHAT_MESSAGES_COLLECTION = 'chatMessages';

  // Create a direct chat between two users
  static async createDirectChat(userId1: string, userId2: string): Promise<ChatRoom> {
    try {
      // Check if direct chat already exists
      const existingChat = await this.getDirectChat(userId1, userId2);
      if (existingChat) {
        return existingChat;
      }

      const chatId = `direct_${[userId1, userId2].sort().join('_')}`;
      const chatRoom: ChatRoom = {
        id: chatId,
        type: 'direct',
        participants: [userId1, userId2],
        createdBy: userId1,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        isActive: true
      };

      await setDoc(doc(db, this.CHAT_ROOMS_COLLECTION, chatId), chatRoom);
      return chatRoom;
    } catch (error) {
      console.error('Error creating direct chat:', error);
      throw error;
    }
  }

  // Create a group chat
  static async createGroupChat(
    creatorId: string, 
    participants: string[], 
    groupName: string
  ): Promise<ChatRoom> {
    try {
      const chatRef = doc(collection(db, this.CHAT_ROOMS_COLLECTION));
      const chatRoom: ChatRoom = {
        id: chatRef.id,
        name: groupName,
        type: 'group',
        participants: [creatorId, ...participants.filter(p => p !== creatorId)],
        createdBy: creatorId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        isActive: true
      };

      await setDoc(chatRef, chatRoom);
      return chatRoom;
    } catch (error) {
      console.error('Error creating group chat:', error);
      throw error;
    }
  }

  // Get direct chat between two users
  static async getDirectChat(userId1: string, userId2: string): Promise<ChatRoom | null> {
    try {
      const chatId = `direct_${[userId1, userId2].sort().join('_')}`;
      const chatRef = doc(db, this.CHAT_ROOMS_COLLECTION, chatId);
      const chatDoc = await getDoc(chatRef);

      if (chatDoc.exists()) {
        return chatDoc.data() as ChatRoom;
      }
      return null;
    } catch (error) {
      console.error('Error getting direct chat:', error);
      return null;
    }
  }

  // Get user's chat rooms
  static async getUserChats(userId: string): Promise<ChatRoom[]> {
    try {
      const q = query(
        collection(db, this.CHAT_ROOMS_COLLECTION),
        where('participants', 'array-contains', userId),
        where('isActive', '==', true),
        orderBy('lastActivity', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as ChatRoom);
    } catch (error) {
      console.error('Error getting user chats:', error);
      return [];
    }
  }

  // Send a text message
  static async sendMessage(
    chatId: string, 
    senderId: string, 
    senderName: string, 
    text: string
  ): Promise<ChatMessage> {
    try {
      const messageRef = doc(collection(db, this.CHAT_MESSAGES_COLLECTION));
      const message: ChatMessage = {
        id: messageRef.id,
        chatId,
        senderId,
        senderName,
        text,
        type: 'text',
        timestamp: Date.now(),
        readBy: [senderId]
      };

      const batch = writeBatch(db);
      
      // Add message
      batch.set(messageRef, message);
      
      // Update chat room last message and activity
      const chatRef = doc(db, this.CHAT_ROOMS_COLLECTION, chatId);
      batch.update(chatRef, {
        lastMessage: {
          text,
          senderId,
          timestamp: message.timestamp,
          type: 'text'
        },
        lastActivity: message.timestamp
      });

      await batch.commit();
      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Send a meme message
  static async sendMemeMessage(
    chatId: string, 
    senderId: string, 
    senderName: string, 
    memeData: {
      memeId: string;
      title: string;
      imageUrl: string;
      authorName: string;
    }
  ): Promise<ChatMessage> {
    try {
      const messageRef = doc(collection(db, this.CHAT_MESSAGES_COLLECTION));
      const message: ChatMessage = {
        id: messageRef.id,
        chatId,
        senderId,
        senderName,
        text: `Shared a meme: ${memeData.title}`,
        type: 'meme',
        timestamp: Date.now(),
        memeData,
        readBy: [senderId]
      };

      const batch = writeBatch(db);
      
      // Add message
      batch.set(messageRef, message);
      
      // Update chat room last message and activity
      const chatRef = doc(db, this.CHAT_ROOMS_COLLECTION, chatId);
      batch.update(chatRef, {
        lastMessage: {
          text: `Shared a meme: ${memeData.title}`,
          senderId,
          timestamp: message.timestamp,
          type: 'meme'
        },
        lastActivity: message.timestamp
      });

      await batch.commit();
      return message;
    } catch (error) {
      console.error('Error sending meme message:', error);
      throw error;
    }
  }

  // Get chat messages
  static async getChatMessages(chatId: string, limitCount: number = 50): Promise<ChatMessage[]> {
    try {
      const q = query(
        collection(db, this.CHAT_MESSAGES_COLLECTION),
        where('chatId', '==', chatId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs
        .map(doc => doc.data() as ChatMessage)
        .reverse(); // Reverse to show oldest first
    } catch (error) {
      console.error('Error getting chat messages:', error);
      return [];
    }
  }

  // Mark message as read
  static async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    try {
      const messageRef = doc(db, this.CHAT_MESSAGES_COLLECTION, messageId);
      await updateDoc(messageRef, {
        readBy: arrayUnion(userId)
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  // Mark all messages in chat as read
  static async markChatAsRead(chatId: string, userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.CHAT_MESSAGES_COLLECTION),
        where('chatId', '==', chatId),
        where('readBy', 'not-in', [[userId]])
      );

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);

      querySnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          readBy: arrayUnion(userId)
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  }

  // Get unread message count for user
  static async getUnreadMessageCount(userId: string): Promise<number> {
    try {
      // Get user's chats
      const userChats = await this.getUserChats(userId);
      let totalUnread = 0;

      for (const chat of userChats) {
        const q = query(
          collection(db, this.CHAT_MESSAGES_COLLECTION),
          where('chatId', '==', chat.id),
          where('senderId', '!=', userId),
          where('readBy', 'not-in', [[userId]])
        );

        const querySnapshot = await getDocs(q);
        totalUnread += querySnapshot.size;
      }

      return totalUnread;
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return 0;
    }
  }

  // Add participant to group chat
  static async addParticipant(chatId: string, userId: string): Promise<void> {
    try {
      const chatRef = doc(db, this.CHAT_ROOMS_COLLECTION, chatId);
      await updateDoc(chatRef, {
        participants: arrayUnion(userId)
      });
    } catch (error) {
      console.error('Error adding participant:', error);
      throw error;
    }
  }

  // Remove participant from group chat
  static async removeParticipant(chatId: string, userId: string): Promise<void> {
    try {
      const chatRef = doc(db, this.CHAT_ROOMS_COLLECTION, chatId);
      await updateDoc(chatRef, {
        participants: arrayRemove(userId)
      });
    } catch (error) {
      console.error('Error removing participant:', error);
      throw error;
    }
  }

  // Delete chat room
  static async deleteChatRoom(chatId: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Mark chat as inactive instead of deleting
      const chatRef = doc(db, this.CHAT_ROOMS_COLLECTION, chatId);
      batch.update(chatRef, { isActive: false });

      await batch.commit();
    } catch (error) {
      console.error('Error deleting chat room:', error);
      throw error;
    }
  }

  // Real-time listener for chat messages
  static subscribeToMessages(
    chatId: string, 
    callback: (messages: ChatMessage[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, this.CHAT_MESSAGES_COLLECTION),
      where('chatId', '==', chatId),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => doc.data() as ChatMessage);
      callback(messages);
    });
  }

  // Real-time listener for user's chats
  static subscribeToUserChats(
    userId: string, 
    callback: (chats: ChatRoom[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, this.CHAT_ROOMS_COLLECTION),
      where('participants', 'array-contains', userId),
      where('isActive', '==', true),
      orderBy('lastActivity', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(doc => doc.data() as ChatRoom);
      callback(chats);
    });
  }
}
