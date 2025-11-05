"use client";

import { DemoBanner } from "@/presentation/components/demo/DemoBanner";
import { Features } from "@/presentation/components/landing/Features";
import { Hero } from "@/presentation/components/landing/Hero";
import { TechStack } from "@/presentation/components/landing/TechStack";
import { LoadingSpinner } from "@/shared/presentation/components/ui/loading-spinner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Landing Page
 *
 * Public landing page for the stock management demo.
 * Features:
 * - Hero section with auto-login demo button
 * - Features showcase
 * - Tech stack display
 * - No authentication required
 */
export default function LandingPage() {
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  /**
   * Auto-login function (generic)
   * @param userName - User name to login with
   * @param password - Password to use
   * @param userType - Type of user for toast message
   */
  const handleAutoLogin = async (userName: string, password: string, userType: string) => {
    setIsLoggingIn(true);

    try {
      // Call the login API
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: userName,
          password: password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Welcome, ${userType}!`, {
          description: "Redirecting to dashboard...",
        });

        // Small delay for better UX
        setTimeout(() => {
          router.push("/dashboard");
        }, 500);
      } else {
        throw new Error(data.message || "Login failed");
      }
    } catch (error) {
      console.error("Auto-login error:", error);
      toast.error("Failed to start demo", {
        description: "Please try manual login or contact support.",
        action: {
          label: "Manual Login",
          onClick: () => router.push("/login"),
        },
      });
      setIsLoggingIn(false);
    }
  };

  /**
   * Auto-login as regular user
   */
  const handleTryDemo = () => {
    const demoUserName =
      process.env.NEXT_PUBLIC_DEMO_USER_NAME || "Demo User";
    const demoPassword =
      process.env.NEXT_PUBLIC_DEMO_USER_PASSWORD || "Demo123!";
    handleAutoLogin(demoUserName, demoPassword, "Demo User");
  };

  /**
   * Auto-login as admin user
   */
  const handleTryAdminDemo = () => {
    const adminUserName =
      process.env.NEXT_PUBLIC_DEMO_ADMIN_NAME || "Demo Admin";
    const adminPassword =
      process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD || "Admin123!";
    handleAutoLogin(adminUserName, adminPassword, "Admin User");
  };

  if (isLoggingIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-lg text-muted-foreground">
          Starting demo session...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Demo Banner */}
      <DemoBanner />

      {/* Hero Section */}
      <Hero onTryDemo={handleTryDemo} onTryAdminDemo={handleTryAdminDemo} />

      {/* Features Section */}
      <Features />

      {/* Tech Stack Section */}
      <TechStack />

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="text-center md:text-left">
              <h3 className="mb-2 text-lg font-semibold">
                Stock Management Demo
              </h3>
              <p className="text-sm text-muted-foreground">
                A portfolio project showcasing modern web development practices.
              </p>
            </div>

            <div className="flex flex-col items-center gap-4 text-sm text-muted-foreground md:flex-row">
              <span>Built with Next.js 15 & TypeScript</span>
              <span className="hidden md:inline">•</span>
              <span>Clean Architecture</span>
              <span className="hidden md:inline">•</span>
              <span>© 2025 Portfolio Demo</span>
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-muted-foreground">
            <p className="mb-2">
              ⚠️ This is a sanitized portfolio version. All client data has
              been removed and replaced with demo data.
            </p>
            <p>
              <strong>Demo Credentials:</strong> Demo User / Demo123!
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
