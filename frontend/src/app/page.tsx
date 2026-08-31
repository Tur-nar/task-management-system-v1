"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  BarChart3,
  ClipboardList,
  Users,
  Bell,
  Shield,
  ArrowRight,
  Target,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    title: "Task Management",
    description:
      "Create, assign, and track tasks across your team with deadlines, priorities, and status updates.",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description:
      "Real-time performance scoring, completion trends, and data-driven insights for every team member.",
  },
  {
    icon: Users,
    title: "Staff & Departments",
    description:
      "Register staff, organize departments, and assign supervisors with hierarchical team structures.",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    description:
      "Automated reminders for approaching deadlines and supervisor alerts when work is running late.",
  },
  {
    icon: Target,
    title: "Target Setting",
    description:
      "Set individual and team targets with progress tracking and performance benchmarking.",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    description:
      "Supervisor and staff roles with granular permissions to protect sensitive performance data.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm">
              TM
            </div>
            <span className="text-lg font-bold tracking-tight">
              TaskManager <span className="text-[hsl(var(--green))] dark:text-green">Pro</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" className="font-medium">
                Sign In
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button className="gap-2 bg-primary hover:bg-primary/90 font-medium shadow-md shadow-primary/20">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="relative overflow-hidden">
          {/* Background gradient effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green/5 rounded-full blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32 lg:py-40 text-center">

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6">
              Manage Tasks.{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 dark:from-green dark:to-green/70 bg-clip-text text-transparent">
                Track Performance.
              </span>
              <br />
              Drive Results.
            </h1>

            <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-10 leading-relaxed">
              A comprehensive task management system that helps your team stay on
              track with intelligent reminders, performance analytics, and
              supervisor oversight — all in one powerful dashboard.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="gap-2 bg-primary hover:bg-primary/90 font-semibold h-12 px-8 shadow-lg shadow-primary/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
                >
                  <Zap className="h-4 w-4" />
                  Open Dashboard
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="font-semibold h-12 px-8 border-border hover:bg-accent transition-all duration-200"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto max-w-7xl px-6 py-24">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Everything you need to{" "}
                <span className="text-primary dark:text-green">manage your team</span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                From task assignment to performance reviews — one platform for
                complete team management.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 hover:border-primary/20"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-green/10 dark:text-green transition-colors duration-200 group-hover:bg-primary/15 dark:group-hover:bg-green/15">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-6 py-8 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} TaskManager Pro. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-muted-foreground">System Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
