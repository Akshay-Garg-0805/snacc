"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatService, ChatRoom, ChatMessage } from "@/lib/chatService";
import { FollowService } from "@/lib/followService";
import { UserService } from "@/lib/userService";
import { UserProfile, getAvatarById } from "../../types/user";
import { useAuth } from "../context/AuthContext";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  memeData?: {
    id: string;
    title: string;
    imageUrl: string;
    authorName: string;
  };
}

export default function ChatModal({ isOpen, onClose, memeData }: ChatModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'select' | 'chat'>('select');
  const [followedUsers, setFollowedUsers] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [currentChat, setCurrentChat] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadFollowedUsers();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (currentChat) {
      loadMessages();
      const unsubscribe = ChatService.subscribeToMessages(currentChat.id, (newMessages) => {
        setMessages(newMessages);
        scrollToBottom();
      });
      return () => unsubscribe();
    }
  }, [currentChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadFollowedUsers = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const followedUserIds = await FollowService.getFollowing(user.uid);
      const userProfiles = await Promise.all(
        followedUserIds.map(userId => UserService.getUserProfile(userId))
      );
      setFollowedUsers(userProfiles.filter(profile => profile !== null) as UserProfile[]);
    } catch (error) {
      console.error('Error loading followed users:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!currentChat) return;
    
    try {
      const chatMessages = await ChatService.getChatMessages(currentChat.id);
      setMessages(chatMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleUserSelect = (userId: string) => {
    if (isGroup) {
      setSelectedUsers(prev => 
        prev.includes(userId) 
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
      );
    } else {
      setSelectedUsers([userId]);
    }
  };

  const handleStartChat = async () => {
    if (!user || selectedUsers.length === 0) return;

    try {
      setLoading(true);
      let chat: ChatRoom;

      if (isGroup && selectedUsers.length > 1) {
        if (!groupName.trim()) {
          toast.error('Please enter a group name');
          return;
        }
        chat = await ChatService.createGroupChat(user.uid, selectedUsers, groupName);
      } else {
        chat = await ChatService.createDirectChat(user.uid, selectedUsers[0]);
      }

      setCurrentChat(chat);
      setStep('chat');

      // Send meme if provided
      if (memeData) {
        await sendMeme();
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!user || !currentChat || !newMessage.trim()) return;

    try {
      setSendingMessage(true);
      const userProfile = await UserService.getUserProfile(user.uid);
      const userName = userProfile?.nickname || user.displayName || 'Anonymous';

      await ChatService.sendMessage(currentChat.id, user.uid, userName, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const sendMeme = async () => {
    if (!user || !currentChat || !memeData) return;

    try {
      const userProfile = await UserService.getUserProfile(user.uid);
      const userName = userProfile?.nickname || user.displayName || 'Anonymous';

      await ChatService.sendMemeMessage(currentChat.id, user.uid, userName, memeData);
      toast.success('Meme shared!');
    } catch (error) {
      console.error('Error sending meme:', error);
      toast.error('Failed to share meme');
    }
  };

  const handleClose = () => {
    setStep('select');
    setSelectedUsers([]);
    setGroupName('');
    setIsGroup(false);
    setCurrentChat(null);
    setMessages([]);
    setNewMessage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                {step === 'select' ? 'Share Meme' : currentChat?.name || 'Chat'}
              </h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
            {step === 'select' ? (
              <div className="space-y-4">
                {/* Meme Preview */}
                {memeData && (
                  <div className="bg-background border border-border rounded-lg p-3">
                    <p className="text-sm text-text-secondary mb-2">Sharing:</p>
                    <div className="flex items-center space-x-3">
                      <img
                        src={memeData.imageUrl}
                        alt={memeData.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div>
                        <h4 className="font-medium text-foreground">{memeData.title}</h4>
                        <p className="text-sm text-text-secondary">by {memeData.authorName}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chat Type Selection */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => setIsGroup(false)}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      !isGroup ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                    }`}
                  >
                    Direct Message
                  </button>
                  <button
                    onClick={() => setIsGroup(true)}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      isGroup ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                    }`}
                  >
                    Group Chat
                  </button>
                </div>

                {/* Group Name Input */}
                {isGroup && (
                  <input
                    type="text"
                    placeholder="Group name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full p-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                )}

                {/* User Selection */}
                <div>
                  <h3 className="font-medium text-foreground mb-3">
                    Select {isGroup ? 'users' : 'user'} to share with:
                  </h3>
                  
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : followedUsers.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {followedUsers.map((userProfile) => (
                        <div
                          key={userProfile.uid}
                          onClick={() => handleUserSelect(userProfile.uid)}
                          className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedUsers.includes(userProfile.uid)
                              ? 'bg-primary/20 border-primary'
                              : 'bg-background hover:bg-secondary border-border'
                          } border`}
                        >
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                            {userProfile.avatar.startsWith('http') ? (
                              <img
                                src={userProfile.avatar}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-lg">
                                {getAvatarById(userProfile.avatar)?.url || '🐱'}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground">{userProfile.nickname}</h4>
                          </div>
                          {selectedUsers.includes(userProfile.uid) && (
                            <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-text-secondary">No followed users found</p>
                      <p className="text-sm text-text-secondary mt-1">Follow some users to start chatting!</p>
                    </div>
                  )}
                </div>

                {/* Start Chat Button */}
                <button
                  onClick={handleStartChat}
                  disabled={selectedUsers.length === 0 || loading || (isGroup && !groupName.trim())}
                  className="w-full bg-primary hover:bg-primary-dark text-primary-foreground py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Starting Chat...' : `Start ${isGroup ? 'Group ' : ''}Chat`}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Messages */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.senderId === user?.uid
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-foreground'
                        }`}
                      >
                        {message.senderId !== user?.uid && (
                          <p className="text-xs opacity-70 mb-1">{message.senderName}</p>
                        )}
                        
                        {message.type === 'meme' && message.memeData ? (
                          <div className="space-y-2">
                            <img
                              src={message.memeData.imageUrl}
                              alt={message.memeData.title}
                              className="w-full rounded"
                            />
                            <p className="text-sm">{message.memeData.title}</p>
                          </div>
                        ) : (
                          <p>{message.text}</p>
                        )}
                        
                        <p className="text-xs opacity-70 mt-1">
                          {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    className="flex-1 p-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    className="bg-primary hover:bg-primary-dark text-primary-foreground px-4 py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {sendingMessage ? '...' : 'Send'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
