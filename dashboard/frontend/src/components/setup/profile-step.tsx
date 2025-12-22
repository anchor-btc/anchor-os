"use client";

import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { User, Camera, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileStepProps {
  userName: string;
  userAvatar: string | null;
  onProfileChange: (name: string, avatar: string | null) => void;
  onNext: () => void;
}

// Predefined avatar options (emoji-based for simplicity)
const AVATAR_OPTIONS = [
  "🧑‍💻", "👨‍💻", "👩‍💻", "🧑‍🔧", "👨‍🔧", "👩‍🔧",
  "🦊", "🐺", "🦁", "🐯", "🐻", "🐼",
  "🚀", "⚡", "🔥", "💎", "🌟", "🎯",
  "₿", "🟠", "⛏️", "🔐", "🛡️", "🏴‍☠️",
];

export function ProfileStep({
  userName,
  userAvatar,
  onProfileChange,
  onNext,
}: ProfileStepProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(userName || "");
  const [avatar, setAvatar] = useState(userAvatar || "");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleNameChange = (value: string) => {
    setName(value);
    onProfileChange(value, avatar || null);
  };

  const handleAvatarSelect = (emoji: string) => {
    setAvatar(emoji);
    onProfileChange(name, emoji);
    setShowAvatarPicker(false);
  };

  const handleContinue = () => {
    if (name.trim()) {
      onProfileChange(name.trim(), avatar || null);
      onNext();
    }
  };

  const displayName = name.trim() || t("setup.profile.defaultName", "Bitcoiner");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <User className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">
          {t("setup.profile.title", "Let's get to know you")}
        </h2>
        <p className="text-muted-foreground">
          {t("setup.profile.description", "Tell us a bit about yourself to personalize your experience")}
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
            >
              <div className={cn(
                "w-20 h-20 rounded-2xl flex items-center justify-center text-4xl",
                "bg-card border-2 border-border transition-all",
                "group-hover:border-primary group-hover:scale-105"
              )}>
                {avatar || "🧑‍💻"}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <Camera className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
            </button>

            {/* Name Preview */}
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">
                {t("setup.profile.welcomePreview", "Welcome message preview")}
              </p>
              <p className="text-xl font-semibold text-foreground">
                {t("setup.profile.greeting", "Hello")}, {displayName}! 👋
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Picker */}
      {showAvatarPicker && (
        <div className="max-w-md mx-auto">
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {t("setup.profile.chooseAvatar", "Choose your avatar")}
            </p>
            <div className="grid grid-cols-8 gap-2">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleAvatarSelect(emoji)}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-xl",
                    "hover:bg-muted transition-colors",
                    avatar === emoji && "bg-primary/20 ring-2 ring-primary"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Name Input */}
      <div className="max-w-md mx-auto">
        <label className="block text-sm font-medium text-foreground mb-2">
          {t("setup.profile.nameLabel", "What should we call you?")}
        </label>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder={t("setup.profile.namePlaceholder", "Enter your name or nickname")}
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          maxLength={50}
          autoFocus
        />
        <p className="text-xs text-muted-foreground mt-2">
          {t("setup.profile.nameHint", "This will be displayed in the dashboard sidebar")}
        </p>
      </div>

      {/* Fun Fact */}
      <div className="max-w-md mx-auto flex items-start gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
        <span className="text-xl">₿</span>
        <p className="text-sm text-muted-foreground">
          {t("setup.profile.funFact", "Fun fact: Satoshi Nakamoto, Bitcoin's creator, remains anonymous to this day. Your node, your rules!")}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-4">
        <Button 
          onClick={handleContinue}
          disabled={!name.trim()}
          size="lg"
        >
          {t("setup.profile.continue", "Continue as {{name}}", { name: displayName })}
        </Button>
      </div>
    </div>
  );
}
