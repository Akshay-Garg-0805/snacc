"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";

interface ShareButtonProps {
  memeId: string;
  memeTitle: string;
  memeImageUrl: string;
  authorName: string;
  className?: string;
}

interface SharePlatform {
  name: string;
  icon: string;
  color: string;
  action: () => void;
}

export default function ShareButton({
  memeId,
  memeTitle,
  memeImageUrl,
  authorName,
  className = ""
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showInstagramOptions, setShowInstagramOptions] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Generate share URL and text
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/meme/${memeId}` : `/meme/${memeId}`;
  const shareText = `Check out this hilarious meme "${memeTitle}" by ${authorName} on Snacx! 😂`;
  const hashtags = "memes,funny,Snacx";

  // Copy to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast.success("Link copied to clipboard! 📋");
      setIsOpen(false);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  // Download meme
  const downloadMeme = async () => {
    try {
      setIsSharing(true);
      const response = await fetch(memeImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${memeTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_meme.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Meme downloaded! 📥");
      setIsOpen(false);
    } catch (error) {
      toast.error("Failed to download meme");
    } finally {
      setIsSharing(false);
    }
  };

  // Native share (mobile)
  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: memeTitle,
          text: shareText,
          url: shareUrl,
        });
        setIsOpen(false);
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          toast.error("Failed to share");
        }
      }
    } else {
      copyToClipboard();
    }
  };

  // Share platforms
  const platforms: SharePlatform[] = [
    {
      name: "Twitter",
      icon: "🐦",
      color: "bg-blue-500 hover:bg-blue-600",
      action: () => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&hashtags=${hashtags}`;
        window.open(url, '_blank', 'width=600,height=400');
        setIsOpen(false);
      }
    },
    {
      name: "Facebook",
      icon: "📘",
      color: "bg-blue-600 hover:bg-blue-700",
      action: () => {
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
        window.open(url, '_blank', 'width=600,height=400');
        setIsOpen(false);
      }
    },
    {
      name: "WhatsApp",
      icon: "💬",
      color: "bg-green-500 hover:bg-green-600",
      action: () => {
        const url = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
        window.open(url, '_blank');
        setIsOpen(false);
      }
    },
    {
      name: "Instagram",
      icon: "📸",
      color: "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600",
      action: () => {
        setShowInstagramOptions(true);
      }
    },
    {
      name: "Reddit",
      icon: "🤖",
      color: "bg-orange-500 hover:bg-orange-600",
      action: () => {
        const url = `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`;
        window.open(url, '_blank', 'width=600,height=400');
        setIsOpen(false);
      }
    },
    {
      name: "Telegram",
      icon: "✈️",
      color: "bg-blue-400 hover:bg-blue-500",
      action: () => {
        const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        window.open(url, '_blank');
        setIsOpen(false);
      }
    },
    {
      name: "LinkedIn",
      icon: "💼",
      color: "bg-blue-700 hover:bg-blue-800",
      action: () => {
        const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        window.open(url, '_blank', 'width=600,height=400');
        setIsOpen(false);
      }
    }
  ];

  return (
    <>
      {/* Share Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center space-x-1 sm:space-x-2 text-text-secondary hover:text-green-500 transition-colors"
        disabled={isSharing}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 sm:h-5 sm:w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
          />
        </svg>
      </motion.button>

      {/* Share Overlay - positioned absolutely over the meme card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center"
            onClick={() => setIsOpen(false)}
          >
            {/* Blurred Background */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-xl" />

            {/* Share Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="relative w-72 bg-card rounded-xl shadow-2xl border border-primary/20 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-primary/10">
                <h3 className="font-semibold text-foreground text-base">Share this meme</h3>
                <p className="text-sm text-text-secondary mt-1 truncate">{memeTitle}</p>
              </div>

              {/* Quick Actions */}
              <div className="p-4 border-b border-primary/10">
                <div className="grid grid-cols-2 gap-3">
                  {/* Native Share / Copy */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={nativeShare}
                    className="flex items-center space-x-2 p-3 bg-primary/10 hover:bg-primary/20 rounded-lg transition-all duration-200"
                  >
                    <span className="text-lg">📱</span>
                    <span className="text-sm font-medium text-foreground">
                      {navigator.share ? 'Share' : 'Copy Link'}
                    </span>
                  </motion.button>

                  {/* Download */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={downloadMeme}
                    disabled={isSharing}
                    className="flex items-center space-x-2 p-3 bg-secondary hover:bg-secondary/80 rounded-lg transition-all duration-200 disabled:opacity-50"
                  >
                    <span className="text-lg">📥</span>
                    <span className="text-sm font-medium text-foreground">
                      {isSharing ? 'Downloading...' : 'Download'}
                    </span>
                  </motion.button>
                </div>
              </div>

              {/* Social Platforms */}
              <div className="p-4">
                <div className="grid grid-cols-3 gap-3">
                  {platforms.map((platform, index) => (
                    <motion.button
                      key={platform.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={platform.action}
                      className={`flex flex-col items-center p-3 rounded-lg text-white transition-all duration-200 ${platform.color}`}
                    >
                      <span className="text-xl mb-1">{platform.icon}</span>
                      <span className="text-xs font-medium">{platform.name}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Copy Link */}
              <div className="p-4 border-t border-primary/10">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={copyToClipboard}
                  className="w-full flex items-center justify-center space-x-2 p-3 bg-primary/10 hover:bg-primary/20 rounded-lg transition-all duration-200"
                >
                  <span className="text-lg">📋</span>
                  <span className="text-sm font-medium text-foreground">Copy Link</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instagram Options Overlay */}
      <AnimatePresence>
        {showInstagramOptions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setShowInstagramOptions(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-xl shadow-2xl border border-primary/20 max-w-sm w-full"
            >
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">📸</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Share to Instagram</h3>
                  <p className="text-sm text-text-secondary">Choose where to share your meme</p>
                </div>

                <div className="space-y-3">
                  {/* Instagram Story */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      window.open('https://www.instagram.com/stories/camera/', '_blank');
                      copyToClipboard();
                      toast.success("Link copied! Paste it in your Instagram story", { duration: 4000 });
                      setShowInstagramOptions(false);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 rounded-lg transition-all duration-200 border border-purple-500/20"
                  >
                    <span className="text-xl">📖</span>
                    <div className="text-left">
                      <p className="font-medium text-foreground">Story</p>
                      <p className="text-xs text-text-secondary">Share to your Instagram story</p>
                    </div>
                  </motion.button>

                  {/* Instagram Post */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      window.open('https://www.instagram.com/', '_blank');
                      copyToClipboard();
                      toast.success("Link copied! Create a new post and paste the link", { duration: 4000 });
                      setShowInstagramOptions(false);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 rounded-lg transition-all duration-200 border border-purple-500/20"
                  >
                    <span className="text-xl">📷</span>
                    <div className="text-left">
                      <p className="font-medium text-foreground">Post</p>
                      <p className="text-xs text-text-secondary">Share as a new Instagram post</p>
                    </div>
                  </motion.button>

                  {/* Instagram Direct */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      window.open('https://www.instagram.com/direct/inbox/', '_blank');
                      copyToClipboard();
                      toast.success("Link copied! Paste it in your Instagram chat", { duration: 4000 });
                      setShowInstagramOptions(false);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 rounded-lg transition-all duration-200 border border-purple-500/20"
                  >
                    <span className="text-xl">💬</span>
                    <div className="text-left">
                      <p className="font-medium text-foreground">Direct Message</p>
                      <p className="text-xs text-text-secondary">Send in Instagram chat</p>
                    </div>
                  </motion.button>
                </div>

                {/* Back Button */}
                <div className="mt-6 pt-4 border-t border-primary/10">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowInstagramOptions(false)}
                    className="w-full p-3 text-text-secondary hover:text-foreground transition-colors text-sm font-medium"
                  >
                    ← Back to sharing options
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
