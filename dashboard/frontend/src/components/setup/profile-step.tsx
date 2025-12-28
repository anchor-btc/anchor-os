'use client';

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { User, Camera, Sparkles, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ProfileStepProps {
  userName: string;
  userAvatar: string | null;
  onProfileChange: (name: string, avatar: string | null) => void;
  onNext: () => void;
}

// Predefined avatar options (emoji-based for simplicity)
const AVATAR_OPTIONS = [
  '🧑‍💻',
  '👨‍💻',
  '👩‍💻',
  '🧑‍🔧',
  '👨‍🔧',
  '👩‍🔧',
  '🦊',
  '🐺',
  '🦁',
  '🐯',
  '🐻',
  '🐼',
  '🚀',
  '⚡',
  '🔥',
  '💎',
  '🌟',
  '🎯',
  '₿',
  '🟠',
  '⛏️',
  '🔐',
  '🛡️',
  '🏴‍☠️',
];

// Check if avatar is a data URL (uploaded image)
const isImageDataUrl = (avatar: string | null): boolean => {
  return avatar ? avatar.startsWith('data:image/') : false;
};

export function ProfileStep({ userName, userAvatar, onProfileChange, onNext }: ProfileStepProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(userName || '');
  const [avatar, setAvatar] = useState(userAvatar || '');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNameChange = (value: string) => {
    setName(value);
    onProfileChange(value, avatar || null);
  };

  const handleAvatarSelect = (emoji: string) => {
    setAvatar(emoji);
    onProfileChange(name, emoji);
    setShowAvatarPicker(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;

      // Create an image to resize if needed
      const img = document.createElement('img');
      img.onload = () => {
        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Max dimensions for the avatar
        const maxSize = 200;
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to data URL (JPEG for smaller size)
        const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);

        setAvatar(resizedDataUrl);
        onProfileChange(name, resizedDataUrl);
        setShowAvatarPicker(false);
        setIsUploading(false);
      };
      img.src = result;
    };
    reader.onerror = () => {
      setIsUploading(false);
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be selected again
    event.target.value = '';
  };

  const handleRemoveImage = () => {
    setAvatar('');
    onProfileChange(name, null);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleContinue = () => {
    if (name.trim()) {
      onProfileChange(name.trim(), avatar || null);
      onNext();
    }
  };

  const displayName = name.trim() || t('setup.profile.defaultName', 'Bitcoiner');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <User className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">{t('setup.profile.title', "Let's get to know you")}</h2>
        <p className="text-muted-foreground">
          {t(
            'setup.profile.description',
            'Tell us a bit about yourself to personalize your experience'
          )}
        </p>
      </div>

      {/* Profile Preview Card */}
      <div className="max-w-md mx-auto">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 border border-primary/20">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <button
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              className="relative group"
              disabled={isUploading}
            >
              <div
                className={cn(
                  'w-20 h-20 rounded-2xl flex items-center justify-center text-4xl overflow-hidden',
                  'bg-card border-2 border-border transition-all',
                  'group-hover:border-primary group-hover:scale-105',
                  isUploading && 'opacity-50'
                )}
              >
                {isUploading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                ) : isImageDataUrl(avatar) ? (
                  <Image
                    src={avatar}
                    alt="Avatar"
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  avatar || '🧑‍💻'
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <Camera className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              {/* Remove button for uploaded images */}
              {isImageDataUrl(avatar) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage();
                  }}
                  className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-destructive flex items-center justify-center shadow-lg hover:bg-destructive/90"
                >
                  <X className="w-3 h-3 text-destructive-foreground" />
                </button>
              )}
            </button>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            {/* Name Preview */}
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">
                {t('setup.profile.welcomePreview', 'Welcome message preview')}
              </p>
              <p className="text-xl font-semibold text-foreground">
                {t('setup.profile.greeting', 'Hello')}, {displayName}! 👋
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Picker */}
      {showAvatarPicker && (
        <div className="max-w-md mx-auto">
          <div className="p-4 rounded-xl bg-card border border-border space-y-4">
            {/* Upload Photo Button */}
            <div>
              <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                {t('setup.profile.uploadPhoto', 'Upload your photo')}
              </p>
              <button
                onClick={triggerFileUpload}
                disabled={isUploading}
                className={cn(
                  'w-full py-3 px-4 rounded-xl border-2 border-dashed border-border',
                  'flex items-center justify-center gap-2 text-sm text-muted-foreground',
                  'hover:border-primary hover:text-primary hover:bg-primary/5 transition-all',
                  isUploading && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    {t('setup.profile.uploading', 'Uploading...')}
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    {t('setup.profile.clickToUpload', 'Click to upload image')}
                  </>
                )}
              </button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {t('setup.profile.uploadHint', 'JPG, PNG or GIF. Max 2MB.')}
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">
                {t('setup.profile.orChooseEmoji', 'or choose an emoji')}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Emoji Options */}
            <div>
              <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                {t('setup.profile.chooseAvatar', 'Choose your avatar')}
              </p>
              <div className="grid grid-cols-8 gap-2">
                {AVATAR_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleAvatarSelect(emoji)}
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-xl',
                      'hover:bg-muted transition-colors',
                      avatar === emoji && 'bg-primary/20 ring-2 ring-primary'
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Name Input */}
      <div className="max-w-md mx-auto">
        <label className="block text-sm font-medium text-foreground mb-2">
          {t('setup.profile.nameLabel', 'What should we call you?')}
        </label>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder={t('setup.profile.namePlaceholder', 'Enter your name or nickname')}
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          maxLength={50}
          autoFocus
        />
        <p className="text-xs text-muted-foreground mt-2">
          {t('setup.profile.nameHint', 'This will be displayed in the dashboard sidebar')}
        </p>
      </div>

      {/* Fun Fact */}
      <div className="max-w-md mx-auto flex items-start gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
        <span className="text-xl">₿</span>
        <p className="text-sm text-muted-foreground">
          {t(
            'setup.profile.funFact',
            "Fun fact: Satoshi Nakamoto, Bitcoin's creator, remains anonymous to this day. Your node, your rules!"
          )}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleContinue} disabled={!name.trim()} size="lg">
          {t('setup.profile.continue', 'Continue as {{name}}', { name: displayName })}
        </Button>
      </div>
    </div>
  );
}
