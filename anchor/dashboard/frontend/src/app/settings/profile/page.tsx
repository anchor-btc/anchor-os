"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Camera,
  Sparkles,
  Check,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { fetchUserProfile, updateUserProfile } from "@/lib/api";
import { cn } from "@/lib/utils";

// Predefined avatar options (emoji-based)
const AVATAR_OPTIONS = [
  "🧑‍💻", "👨‍💻", "👩‍💻", "🧑‍🔧", "👨‍🔧", "👩‍🔧",
  "🦊", "🐺", "🦁", "🐯", "🐻", "🐼",
  "🚀", "⚡", "🔥", "💎", "🌟", "🎯",
  "₿", "🟠", "⛏️", "🔐", "🛡️", "🏴‍☠️",
];

export default function ProfilePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: fetchUserProfile,
  });

  const updateMutation = useMutation({
    mutationFn: ({ name, avatar }: { name: string; avatar?: string }) =>
      updateUserProfile(name, avatar),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      setSuccess(t("settings.profile.saved", "Profile saved successfully!"));
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : t("common.error"));
      setTimeout(() => setError(null), 5000);
    },
  });

  // Load profile data when available
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setAvatar(profile.avatar_url || "");
    }
  }, [profile]);

  const handleSave = () => {
    if (!name.trim()) {
      setError(t("settings.profile.nameRequired", "Name is required"));
      return;
    }
    setError(null);
    updateMutation.mutate({ name: name.trim(), avatar: avatar || undefined });
  };

  const handleAvatarSelect = (emoji: string) => {
    setAvatar(emoji);
    setShowAvatarPicker(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Status Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-error text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-success text-sm flex items-center gap-2">
          <Check className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {t("settings.profile.title", "Profile")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("settings.profile.description", "Personalize how you appear in the dashboard")}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Avatar Section */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              {t("settings.profile.avatar", "Avatar")}
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="relative group"
              >
                <div className={cn(
                  "w-20 h-20 rounded-2xl flex items-center justify-center text-4xl",
                  "bg-gradient-to-br from-primary/20 to-orange-500/20",
                  "border-2 border-border transition-all",
                  "group-hover:border-primary group-hover:scale-105"
                )}>
                  {avatar || "🧑‍💻"}
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
                  <Camera className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
              </button>
              <div className="text-sm text-muted-foreground">
                {t("settings.profile.clickToChange", "Click to change your avatar")}
              </div>
            </div>

            {/* Avatar Picker */}
            {showAvatarPicker && (
              <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  {t("settings.profile.chooseAvatar", "Choose your avatar")}
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
            )}
          </div>

          {/* Name Section */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t("settings.profile.name", "Display Name")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("settings.profile.namePlaceholder", "Enter your name or nickname")}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {t("settings.profile.nameHint", "This name will be displayed in the sidebar")}
            </p>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t("settings.profile.preview", "Preview")}
            </label>
            <div className="p-4 rounded-xl bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-orange-500/20 flex items-center justify-center text-xl border border-primary/10">
                  {avatar || "🧑‍💻"}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("sidebar.welcome", "Welcome back")}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {name.trim() || t("settings.profile.defaultName", "Bitcoiner")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-border">
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {t("common.save", "Save")}
            </button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
        <span className="text-xl">₿</span>
        <p className="text-sm text-muted-foreground">
          {t("settings.profile.funFact", "Fun fact: Satoshi Nakamoto, Bitcoin's creator, remains anonymous to this day. Your node, your identity!")}
        </p>
      </div>
    </div>
  );
}
