"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const techStack = {
  frontend: [
    { name: "Next.js 15", color: "bg-black text-white dark:bg-white dark:text-black" },
    { name: "React 18", color: "bg-blue-500 text-white" },
    { name: "TypeScript", color: "bg-blue-600 text-white" },
    { name: "Tailwind CSS", color: "bg-cyan-500 text-white" },
    { name: "shadcn/ui", color: "bg-slate-900 text-white" },
    { name: "Radix UI", color: "bg-purple-600 text-white" },
  ],
  backend: [
    { name: "Supabase", color: "bg-green-600 text-white" },
    { name: "PostgreSQL", color: "bg-blue-700 text-white" },
    { name: "Row Level Security", color: "bg-red-600 text-white" },
    { name: "Server Components", color: "bg-orange-600 text-white" },
  ],
  stateManagement: [
    { name: "TanStack Query", color: "bg-red-500 text-white" },
    { name: "React Context", color: "bg-blue-500 text-white" },
    { name: "React Hook Form", color: "bg-pink-600 text-white" },
    { name: "Zod Validation", color: "bg-indigo-600 text-white" },
  ],
  tools: [
    { name: "ESLint", color: "bg-purple-700 text-white" },
    { name: "Husky", color: "bg-amber-700 text-white" },
    { name: "Commitlint", color: "bg-teal-600 text-white" },
    { name: "Git Hooks", color: "bg-slate-700 text-white" },
  ],
};

export function TechStack() {
  return (
    <section className="bg-muted/30 py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Modern Tech Stack
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Built with cutting-edge technologies and industry best practices for
            performance, scalability, and developer experience.
          </p>
        </div>

        {/* Tech Stack Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Frontend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Frontend</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {techStack.frontend.map((tech, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className={`${tech.color} border-0`}
                >
                  {tech.name}
                </Badge>
              ))}
            </CardContent>
          </Card>

          {/* Backend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Backend & Database</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {techStack.backend.map((tech, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className={`${tech.color} border-0`}
                >
                  {tech.name}
                </Badge>
              ))}
            </CardContent>
          </Card>

          {/* State Management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">State & Forms</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {techStack.stateManagement.map((tech, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className={`${tech.color} border-0`}
                >
                  {tech.name}
                </Badge>
              ))}
            </CardContent>
          </Card>

          {/* Development Tools */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dev Tools</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {techStack.tools.map((tech, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className={`${tech.color} border-0`}
                >
                  {tech.name}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Architecture Highlight */}
        <div className="mt-12">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🏗️</span>
                Clean Architecture
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This project follows <strong>Clean Architecture</strong>{" "}
                principles with clear separation of concerns: Domain entities,
                Application use cases, and Infrastructure implementations.
                Each module (Auth, Inventory, Clients) maintains its own
                boundaries and dependencies flow inward.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
