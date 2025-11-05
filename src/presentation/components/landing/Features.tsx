"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  FileSpreadsheet,
  Lock,
  Package,
  Search,
  ShoppingCart,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Lock,
    title: "Secure Authentication",
    description:
      "Dual authentication system with custom login + Supabase Auth. Row Level Security at database level.",
    gradient: "from-red-500 to-orange-500",
  },
  {
    icon: Package,
    title: "Product Management",
    description:
      "Comprehensive product catalog with search, filtering, bulk CSV import, and stock tracking.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: ShoppingCart,
    title: "Order Management",
    description:
      "Create orders with bulk product addition, automatic discounts, real-time totals, and status tracking.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: BarChart3,
    title: "Real-time Dashboard",
    description:
      "Live business metrics, monthly sales statistics, top products tracking, and order analytics.",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: Search,
    title: "Smart Search",
    description:
      "Advanced product search with equivalences mapping, autocomplete, and integrated results.",
    gradient: "from-amber-500 to-yellow-500",
  },
  {
    icon: FileSpreadsheet,
    title: "Export Capabilities",
    description:
      "Generate PDFs for orders and Excel spreadsheets for price lists with custom formatting.",
    gradient: "from-indigo-500 to-violet-500",
  },
  {
    icon: Users,
    title: "Client Management",
    description:
      "Complete customer database with CSV import, search functionality, and order history.",
    gradient: "from-rose-500 to-red-500",
  },
  {
    icon: Zap,
    title: "Performance Optimized",
    description:
      "Server components, optimized queries with indexes, React Query caching, and lazy loading.",
    gradient: "from-teal-500 to-cyan-500",
  },
  {
    icon: Sparkles,
    title: "Modern UI/UX",
    description:
      "Fully responsive design with dark/light theme, accessible components, and mobile-optimized navigation.",
    gradient: "from-fuchsia-500 to-purple-500",
  },
];

export function Features() {
  return (
    <section className="bg-background py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Production-Ready Features
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            A complete ERP system with enterprise-grade features, built with
            modern technologies and best practices.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="group transition-all hover:shadow-lg hover:shadow-primary/5"
              >
                <CardHeader>
                  <div
                    className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${feature.gradient} text-white shadow-lg`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
