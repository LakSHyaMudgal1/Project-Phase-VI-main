import React from 'react'
import { Link } from "react-router-dom";
import Button from "./ui/Button";
import Card from "./ui/Card";

const Home = () => {
  return (
    <div className="space-y-10">
      <section className="pt-6">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-mutedForeground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
              Focus tracking • Rooms • Analytics
            </div>

            <h1 className="mt-5 text-4xl sm:text-5xl font-semibold tracking-tight">
              Work with focus.
              <span className="block text-mutedForeground font-medium mt-2">
                See where your time goes — instantly.
              </span>
            </h1>

            <p className="mt-5 text-sm sm:text-base text-mutedForeground leading-relaxed max-w-xl">
              TabTrack is a premium productivity workspace that combines shared rooms,
              real-time collaboration, and elite-grade time analytics.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link to="/analytics">
                <Button size="lg">Open Analytics</Button>
              </Link>
              <Link to="/create-room">
                <Button size="lg" variant="secondary">
                  Create a Room
                </Button>
              </Link>
            </div>
          </div>

          <Card className="p-6">
            <div className="text-sm font-semibold">Today at a glance</div>
            <div className="mt-1 text-xs text-mutedForeground">
              A minimal dashboard preview (live data in Analytics).
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-mutedForeground">Focus Score</div>
                <div className="mt-2 text-2xl font-semibold">92</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-mutedForeground">Active Rooms</div>
                <div className="mt-2 text-2xl font-semibold">3</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-mutedForeground">Tracked Sites</div>
                <div className="mt-2 text-2xl font-semibold">14</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-mutedForeground">Deep Work</div>
                <div className="mt-2 text-2xl font-semibold">2h 18m</div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        {[
          {
            title: "Premium Analytics",
            desc: "Clear breakdowns, sessions, intervals, and raw data when you need it.",
          },
          {
            title: "Rooms & Invites",
            desc: "Create focused collaboration spaces with a clean activity trail.",
          },
          {
            title: "Dark-first UI",
            desc: "Polished, minimal, and consistent. Built for long sessions.",
          },
        ].map((f) => (
          <Card key={f.title} className="p-5">
            <div className="text-sm font-semibold">{f.title}</div>
            <div className="mt-2 text-sm text-mutedForeground leading-relaxed">{f.desc}</div>
          </Card>
        ))}
      </section>
    </div>
  )
}

export default Home