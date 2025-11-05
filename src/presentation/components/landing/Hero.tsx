"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Github, LogIn, Play, Shield } from "lucide-react";
import Link from "next/link";

interface HeroProps {
  onTryDemo: () => void;
  onTryAdminDemo: () => void;
}

export function Hero({ onTryDemo, onTryAdminDemo }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/20 py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border bg-background/50 px-4 py-2 text-sm backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            </span>
            <span className="font-medium">Portfolio Demo Project</span>
          </div>

          {/* Title */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="block">Stock Management</span>
            <span className="block bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Demo System
            </span>
          </h1>

          {/* Description */}
          <p className="mb-8 text-lg text-muted-foreground sm:text-xl md:text-2xl">
            A production-ready ERP system built with{" "}
            <span className="font-semibold text-foreground">Next.js 15</span>,{" "}
            <span className="font-semibold text-foreground">TypeScript</span>,
            and{" "}
            <span className="font-semibold text-foreground">Supabase</span>.
            <br className="hidden sm:inline" />
            Showcasing Clean Architecture and modern best practices.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3">
            {/* Primary Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="group gap-2 text-base sm:text-lg"
                onClick={onTryDemo}
              >
                <Play className="h-5 w-5" />
                Try as User
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>

              <Button
                size="lg"
                variant="default"
                className="group gap-2 bg-gradient-to-r from-orange-600 to-red-600 text-base hover:from-orange-700 hover:to-red-700 sm:text-lg"
                onClick={onTryAdminDemo}
              >
                <Shield className="h-5 w-5" />
                Try as Admin
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            {/* Secondary Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 text-base sm:text-lg"
                asChild
              >
                <Link
                  href="https://github.com/yourusername/stock-portfolio-demo"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-5 w-5" />
                  View on GitHub
                </Link>
              </Button>

              <Button
                size="lg"
                variant="ghost"
                className="gap-2 text-base sm:text-lg"
                asChild
              >
                <Link href="/login">
                  <LogIn className="h-5 w-5" />
                  Manual Login
                </Link>
              </Button>
            </div>
          </div>

          {/* Demo Credentials */}
          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <div className="inline-flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2 text-sm backdrop-blur-sm">
              <span className="text-muted-foreground">User:</span>
              <code className="font-mono font-semibold">Demo User</code>
              <span className="text-muted-foreground">/</span>
              <code className="font-mono font-semibold">Demo123!</code>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm backdrop-blur-sm dark:border-orange-800 dark:bg-orange-950/50">
              <Shield className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span className="text-orange-600 dark:text-orange-400">Admin:</span>
              <code className="font-mono font-semibold text-orange-700 dark:text-orange-300">Demo Admin</code>
              <span className="text-orange-600 dark:text-orange-400">/</span>
              <code className="font-mono font-semibold text-orange-700 dark:text-orange-300">Admin123!</code>
            </div>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[50%] top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-primary/5 blur-3xl"></div>
      </div>
    </section>
  );
}
