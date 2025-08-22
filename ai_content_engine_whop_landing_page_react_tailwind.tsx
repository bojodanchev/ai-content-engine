import { useState, Fragment } from "react";
import type { ReactNode } from "react";
import {
  Wand2,
  ShieldCheck,
  Zap,
  Database,
  Settings2,
  Upload,
  Download,
  FileCode2,
  Layers,
  Timer,
  BadgeCheck,
} from "lucide-react";

// Tailwind is assumed available in the host (Whop embeds support custom CSS).
// Drop this component into a Next.js/React page. Dark theme, gradients, glass, and Whop-native compact spacing.

export default function AIContentEngineLanding() {
  const [showPreview, setShowPreview] = useState(false);
  const [showTests, setShowTests] = useState(false);

  const beforeMeta = {
    filename: "video.mp4",
    size: "142.6 MB",
    container: "mp4",
    codec: "h264",
    duration: "00:01:12.340",
    creation_time: "2024-09-18T14:21:09Z",
    title: "VID_0918",
    comment: "export from phone",
  };

  const afterMeta = {
    filename: "ai-content-engine_export.mp4",
    size: "140.8 MB",
    container: "mp4",
    codec: "h264",
    duration: "00:01:12.340",
    creation_time: new Date().toISOString(),
    title: "Morning vlog – edited",
    comment: "Prepared for cross‑platform posting",
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-black/30 bg-black/20 border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-cyan-400" />
            <span className="font-semibold tracking-tight">AI Content Engine</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://whop.com/apps/app_MlBrjqKMGbX2MH/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm bg-white/10 hover:bg-white/15 border border-white/10 transition"
            >
              <BadgeCheck className="h-4 w-4" /> Install in my Whop
            </a>
            <a href="/dashboard" className="rounded-xl px-3 py-2 text-sm bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 text-black font-semibold hover:opacity-90 transition">
              Start Processing
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="demo" className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
              <span className="bg-gradient-to-r from-white via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                Prepare your videos for every platform
              </span>
            </h1>
            <p className="mt-4 text-white/70 max-w-xl">
              Batch‑edit and standardize video metadata, quickly export platform‑friendly files, and keep professional quality across TikTok, Instagram, and YouTube.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowPreview(true)}
                className="rounded-xl px-4 py-2.5 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 text-black font-semibold hover:opacity-90 transition"
              >
                See metadata preview
              </button>
              <a
                href="#features"
                className="rounded-xl px-4 py-2.5 border border-white/15 bg-white/5 hover:bg-white/10 transition"
              >
                Explore features
              </a>
            </div>

            {/* Trust indicators */}
            <div className="mt-6 grid grid-cols-3 gap-3 text-xs md:text-sm">
              {[
                { label: "Processing", value: "Fast turnaround" },
                { label: "Formats", value: "MP4, MOV, WebM" },
                { label: "Quality", value: "Pro‑grade pipeline" },
              ].map((i) => (
                <div
                  key={i.label}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <div className="text-white/40">{i.label}</div>
                  <div className="font-medium">{i.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Glass metadata card */}
          <div className="relative">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500/30 via-fuchsia-500/30 to-cyan-400/30 blur-xl" />
            <div className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500" />
                  <div>
                    <div className="text-sm font-semibold">Interactive preview</div>
                    <div className="text-xs text-white/60">Before → After</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowPreview(true)}
                  className="inline-flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5 border border-white/15 bg-white/5 hover:bg-white/10"
                >
                  <FileCode2 className="h-3.5 w-3.5" /> Open preview
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                <MetaBlock title="Before" data={beforeMeta} />
                <MetaBlock title="After" data={afterMeta} highlight />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <h2 className="text-xl font-semibold tracking-tight">Features</h2>
        <div className="mt-4 grid md:grid-cols-3 gap-4">
          <Feature
            icon={<Settings2 className="h-5 w-5" />}
            title="Complete metadata control"
            desc="Edit titles, comments, creation timestamps, language tags, rotation, color info, and more across batches."
          />
          <Feature
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Platform‑friendly presets"
            desc="Export with presets tailored for TikTok, Instagram, and YouTube without compromising quality."
          />
          <Feature
            icon={<Wand2 className="h-5 w-5" />}
            title="Smart suggestions"
            desc="Auto‑suggest realistic metadata fields you can accept, tweak, or lock per file."
          />
          <Feature
            icon={<Zap className="h-5 w-5" />}
            title="Fast processing"
            desc="Optimized pipeline built on a professional media stack for quick turnarounds."
          />
          <Feature
            icon={<Layers className="h-5 w-5" />}
            title="Batch operations"
            desc="Apply changes to hundreds of files with queues and progress tracking."
          />
          <Feature
            icon={<Database className="h-5 w-5" />}
            title="Audit trail"
            desc="SQLite‑backed history of jobs, inputs, and exports for easy rollbacks."
          />
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <h2 className="text-xl font-semibold tracking-tight">Plans</h2>
        <p className="mt-2 text-white/70 text-sm">Choose what fits your workflow. Start free and upgrade as you grow.</p>
        <div className="mt-4 grid md:grid-cols-3 gap-4">
          <PlanCard
            name="Free"
            price="$0"
            period="/month"
            highlight={false}
            ctaHref="/dashboard"
            ctaLabel="Get started"
            features={[
              "5 videos per month",
              "Basic metadata changes",
              "Standard processing speed",
            ]}
          />
          <PlanCard
            name="Pro"
            price="$9.99"
            period="/month"
            highlight
            badge="Most popular"
            ctaHref="/dashboard"
            ctaLabel="Upgrade to Pro"
            features={[
              "100 videos per month",
              "Advanced metadata options",
              "Priority processing",
              "Batch operations",
            ]}
          />
          <PlanCard
            name="Enterprise"
            price="$29.99"
            period="/month"
            highlight={false}
            ctaHref="/dashboard"
            ctaLabel="Contact & upgrade"
            features={[
              "Unlimited videos",
              "Custom metadata templates",
              "White‑label options",
            ]}
          />
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <h2 className="text-xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-4 grid md:grid-cols-4 gap-4 text-sm">
          <Step num={1} icon={<Upload className="h-4 w-4" />} title="Upload" desc="Drag & drop your videos or import from cloud." />
          <Step num={2} icon={<Settings2 className="h-4 w-4" />} title="Customize" desc="Edit fields or use smart suggestions." />
          <Step num={3} icon={<Timer className="h-4 w-4" />} title="Process" desc="Run the pipeline; track progress in real time." />
          <Step num={4} icon={<Download className="h-4 w-4" />} title="Download" desc="Grab exports, ready for your platforms." />
        </ol>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <h2 className="text-xl font-semibold tracking-tight">Benefits</h2>
        <div className="mt-4 grid md:grid-cols-3 gap-4 text-sm">
          <Benefit title="Cross‑platform ready" desc="Export per‑platform presets for smoother uploads." />
          <Benefit title="Consistent presentation" desc="Keep titles, timestamps, and tags uniform at scale." />
          <Benefit title="Speed and quality" desc="Time‑saving pipeline without sacrificing visuals." />
        </div>
      </section>

      {/* CTA strip */}
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Ready to prepare your content the professional way</div>
            <p className="text-white/70 text-sm">Sign in with Whop and start with a free test export.</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="rounded-xl px-4 py-2.5 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 text-black font-semibold hover:opacity-90 transition">
              Start Processing
            </a>
            <a href="#features" className="rounded-xl px-4 py-2.5 border border-white/15 bg-white/5 hover:bg-white/10 transition">
              Learn more
            </a>
          </div>
        </div>
      </section>

      {/* Footer + dev tests toggle */}
      <footer className="border-t border-white/10 bg-black/30">
        <div className="mx-auto max-w-6xl px-4 py-8 text-xs text-white/60 flex flex-col md:flex-row justify-between gap-2">
          <div>© {new Date().getFullYear()} AI Content Engine. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-white/90">Terms</a>
            <a href="#" className="hover:text-white/90">Privacy</a>
            <a href="#" className="hover:text-white/90">Support</a>
            <button
              onClick={() => setShowTests((v) => !v)}
              className="ml-2 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-white/70 hover:text-white hover:bg-white/5"
              aria-pressed={showTests}
            >
              {showTests ? "Hide component tests" : "Run component tests"}
            </button>
          </div>
        </div>
      </footer>

      {/* Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0C0C0C] p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Metadata preview</div>
              <button onClick={() => setShowPreview(false)} className="text-white/70 hover:text-white">Close</button>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <MetaBlock title="Before" data={beforeMeta} />
              <MetaBlock title="After" data={afterMeta} highlight />
            </div>
            <p className="mt-4 text-[11px] text-white/50">
              For best results, ensure you own the rights to all media. Exports are optimized for platform compatibility and professional quality.
            </p>
          </div>
        </div>
      )}

      {/* Development-only component smoke tests (toggle above) */}
      {showTests && (
        <section className="mx-auto max-w-6xl px-4 py-8" aria-label="component-tests" data-testid="component-tests">
          <h2 className="text-sm font-semibold tracking-tight text-white/70">Component tests</h2>
          <div className="mt-3 grid md:grid-cols-3 gap-4">
            <Feature icon={<Zap className="h-5 w-5" />} title="Feature component" desc="Renders icon, title, and description." />
            <Benefit title="Benefit component" desc="Renders title and description." />
            <MetaBlock title="MetaBlock component" data={{ a_key: "A value", b_key: "B value" }} />
          </div>
        </section>
      )}
    </div>
  );
}

function MetaBlock({ title, data, highlight }: { title: string; data: Record<string, string>; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border ${highlight ? "border-fuchsia-400/30" : "border-white/10"} bg-white/[0.04] p-4`}>
      <div className="text-xs mb-2 font-semibold">{title}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {Object.entries(data).map(([k, v]) => (
          <Fragment key={k}>
            <div className="text-white/50 capitalize">{k.replace(/_/g, " ")}</div>
            <div className="truncate" title={v}>{v}</div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5">{icon}</span>
        {title}
      </div>
      <p className="mt-2 text-white/70 text-sm">{desc}</p>
    </div>
  );
}

function Benefit({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-sm font-semibold">{title}</div>
      <p className="mt-2 text-white/70 text-sm">{desc}</p>
    </div>
  );
}

function Step({ num, icon, title, desc }: { num: number; icon: ReactNode; title: string; desc: string }) {
  return (
    <li className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[11px]">{num}</span>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-white/10 bg-white/5">{icon}</span>
        {title}
      </div>
      <p className="mt-2 text-white/70 text-sm">{desc}</p>
    </li>
  );
}

function PlanCard({ name, price, period, features, highlight, ctaHref, ctaLabel, badge }: {
  name: string;
  price: string;
  period?: string;
  features: string[];
  highlight?: boolean;
  ctaHref: string;
  ctaLabel: string;
  badge?: string;
}) {
  return (
    <div className={`relative rounded-2xl border ${highlight ? "border-fuchsia-400/40" : "border-white/10"} bg-white/[0.04] p-4`}> 
      {badge && (
        <div className="absolute -top-3 right-3 text-[10px] px-2 py-1 rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 text-black font-semibold">
          {badge}
        </div>
      )}
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-semibold">{name}</div>
        <div className="text-lg font-semibold">{price}<span className="text-white/60 text-xs font-normal">{period}</span></div>
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-white/80">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400" />
            {f}
          </li>
        ))}
      </ul>
      <a href={ctaHref} className={`mt-4 inline-block w-full text-center rounded-xl px-3 py-2 text-sm border ${highlight ? "border-fuchsia-400/30 bg-fuchsia-400/10 hover:bg-fuchsia-400/20" : "border-white/15 bg-white/5 hover:bg-white/10"}`}>{ctaLabel}</a>
    </div>
  );
}


