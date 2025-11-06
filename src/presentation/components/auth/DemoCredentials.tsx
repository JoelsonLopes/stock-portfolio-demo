"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, LogIn, Shield, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface DemoCredentialsProps {
  onQuickLogin: (username: string, password: string, type: "user" | "admin") => void;
  isLoading?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function DemoCredentials({ onQuickLogin, isLoading, onMouseEnter, onMouseLeave }: DemoCredentialsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const demoAccounts = {
    user: {
      username: "Demo User",
      password: "Demo123!",
      label: "Usuário Regular",
      icon: User,
    },
    admin: {
      username: "Demo Admin",
      password: "Admin123!",
      label: "Usuário Admin",
      icon: Shield,
    },
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Card
      className="border-dashed border-2 border-muted-foreground/20 bg-muted/30 h-full flex flex-col"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <CardContent className="pt-6 space-y-4 flex-1 flex flex-col justify-between">
        {/* Header */}
        <div className="text-center space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Credenciais Demo</h3>
          <p className="text-xs text-muted-foreground">
            Use as credenciais abaixo ou clique para login rápido
          </p>
        </div>

        {/* Credentials Cards */}
        <div className="space-y-3">
          {Object.entries(demoAccounts).map(([type, account]) => {
            const Icon = account.icon;
            const isAdmin = type === "admin";

            return (
              <div
                key={type}
                className={`rounded-lg border p-3 space-y-2 ${
                  isAdmin
                    ? "border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20"
                    : "border-muted bg-background/50"
                }`}
              >
                {/* Account Type Header */}
                <div className="flex items-center gap-2">
                  <Icon
                    className={`h-4 w-4 ${
                      isAdmin
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-primary"
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold ${
                      isAdmin
                        ? "text-orange-700 dark:text-orange-300"
                        : "text-foreground"
                    }`}
                  >
                    {account.label}
                  </span>
                </div>

                {/* Credentials */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Usuário:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() =>
                          handleCopy(account.username, `${type}-username`)
                        }
                        disabled={isLoading}
                      >
                        <Copy
                          className={`h-3 w-3 ${
                            copiedField === `${type}-username`
                              ? "text-green-600"
                              : ""
                          }`}
                        />
                      </Button>
                    </div>
                    <code
                      className={`block font-mono text-xs px-2 py-1 rounded ${
                        isAdmin
                          ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {account.username}
                    </code>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Senha:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() =>
                          handleCopy(account.password, `${type}-password`)
                        }
                        disabled={isLoading}
                      >
                        <Copy
                          className={`h-3 w-3 ${
                            copiedField === `${type}-password`
                              ? "text-green-600"
                              : ""
                          }`}
                        />
                      </Button>
                    </div>
                    <code
                      className={`block font-mono text-xs px-2 py-1 rounded ${
                        isAdmin
                          ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {account.password}
                    </code>
                  </div>
                </div>

                {/* Quick Login Button */}
                <Button
                  variant={isAdmin ? "default" : "outline"}
                  size="sm"
                  className={`w-full ${
                    isAdmin
                      ? "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                      : ""
                  }`}
                  onClick={() =>
                    onQuickLogin(
                      account.username,
                      account.password,
                      type as "user" | "admin"
                    )
                  }
                  disabled={isLoading}
                >
                  <LogIn className="h-3.5 w-3.5 mr-1.5" />
                  Login Rápido como {account.label}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Separator */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-muted-foreground/20" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-muted/30 px-2 text-muted-foreground">
              ou use o formulário ao lado
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
