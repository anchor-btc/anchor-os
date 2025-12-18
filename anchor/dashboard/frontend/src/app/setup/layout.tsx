import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Setup - ANCHOR OS",
  description: "Initial setup wizard for Anchor OS",
};

export default function SetupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // This layout replaces the main layout for the setup page
  // The parent layout with Providers is still applied
  return (
    <div className="min-h-screen flex items-center justify-center bg-grid p-4">
      <div className="w-full max-w-4xl">
        {children}
      </div>
    </div>
  );
}
