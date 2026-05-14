"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Zap,
  Calendar,
  Image as ImageIcon,
  MessageSquare,
  Users,
  Video,
  Award,
  ChevronDown,
  LayoutTemplate,
  BrainCircuit,
  Bot,
  BarChart,
  Camera,
  Share2,
  Inbox,
} from "lucide-react";

// --- ANIMATION VARIANTS ---
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

// --- MAIN PAGE COMPONENT ---
export default function AIRealtorOS() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 selection:bg-blue-500/30 font-sans overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-neutral-950/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="font-bold text-xl tracking-tight flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
            AI Realtor OS
          </div>
          <a
            href="#payment"
            className="px-5 py-2.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-neutral-200 transition-colors"
          >
            Get Instant Access
          </a>
        </div>
      </nav>

      <main>
        <HeroSection />
        <TrustBar />
        <ProblemSection />
        <SolutionSection />
        <ModulesSection />
        <PreviewSection />
        <DailySystemSection />
        <WorkflowSection />
        <SocialProofSection />
        <PricingSection />
        <FAQSection />
        <FinalCTA />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-neutral-500 text-sm">
            © 2026 AI Realtor Growth OS. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-neutral-500">
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- SECTIONS ---

function HeroSection() {
  return (
    <section className="relative pt-40 pb-24 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Cinematic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-neutral-950 to-neutral-950" />
      <div className="absolute top-0 w-full h-[500px] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="max-w-4xl"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm font-medium mb-8">
            <Zap size={14} />
            <span>The #1 Operating System for Elite Agents</span>
          </motion.div>
          
          <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
            Run Your Real Estate Brand Like a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">Media Company</span> Using AI
          </motion.h1>
          
          <motion.p variants={fadeUp} className="text-lg md:text-xl text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            The complete AI operating system for modern real estate agents — content, branding, lead generation, automation, and growth.
          </motion.p>
          
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#payment" className="w-full sm:w-auto px-8 py-4 bg-white text-black rounded-full font-semibold text-lg hover:bg-neutral-200 transition-all flex items-center justify-center gap-2">
              Get Instant Access <ArrowRight size={18} />
            </a>
            <a href="#modules" className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-white rounded-full font-semibold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2 backdrop-blur-sm">
              <Play size={18} /> View Inside
            </a>
          </motion.div>
        </motion.div>

        {/* Floating Mockup Visual */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="w-full max-w-5xl mt-20 relative"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-2xl blur-2xl opacity-20" />
          <div className="relative rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur-xl p-4 md:p-8 shadow-2xl overflow-hidden flex flex-col gap-6">
            
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="text-xs text-neutral-500 font-mono">os.realtormedia.ai</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-2 space-y-6">
                <div className="h-48 rounded-xl border border-white/5 bg-neutral-800/50 p-6 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
                  <div>
                    <div className="text-sm text-neutral-400 mb-1">Content Pipeline</div>
                    <div className="text-2xl font-bold">365 Content System Active</div>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-2 flex-1 rounded-full bg-blue-500/20 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.random() * 60 + 40}%` }} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="h-32 rounded-xl border border-white/5 bg-neutral-800/50 p-6 flex flex-col justify-center">
                    <div className="text-sm text-neutral-400 mb-2">Automated Leads</div>
                    <div className="text-3xl font-bold text-white">+124</div>
                    <div className="text-xs text-green-400 mt-2 flex items-center gap-1"><TrendingUp size={12}/> 12% this week</div>
                  </div>
                  <div className="h-32 rounded-xl border border-white/5 bg-neutral-800/50 p-6 flex flex-col justify-center">
                    <div className="text-sm text-neutral-400 mb-2">AI Workflows</div>
                    <div className="text-3xl font-bold text-white">12 Active</div>
                    <div className="text-xs text-blue-400 mt-2 flex items-center gap-1"><Bot size={12}/> Running smoothly</div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {['Listing Caption Generated', 'Lead Follow-up Sent', 'Reel Script Created', 'Newsletter Scheduled'].map((item, i) => (
                  <div key={i} className="p-4 rounded-xl border border-white/5 bg-neutral-800/30 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <CheckCircle2 size={16} />
                    </div>
                    <div className="text-sm font-medium">{item}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </section>
  );
}

function TrustBar() {
  const trusts = [
    { text: "Built for modern agents", icon: <Award size={20} /> },
    { text: "AI-powered workflows", icon: <BrainCircuit size={20} /> },
    { text: "365 content systems", icon: <Calendar size={20} /> },
    { text: "Lead gen templates", icon: <Users size={20} /> },
    { text: "Automation ready", icon: <Zap size={20} /> },
  ];

  return (
    <div className="border-y border-white/10 bg-black py-8 relative z-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-wrap justify-center gap-8 md:gap-16">
          {trusts.map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-neutral-400">
              <span className="text-neutral-600">{item.icon}</span>
              <span className="text-sm font-medium tracking-wide uppercase">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProblemSection() {
  const pains = [
    "Inconsistent posting schedule",
    "Content burnout & block",
    "Weak personal branding",
    "Slow lead follow-up",
    "No scalable system in place",
    "Overwhelmed by AI tools",
  ];

  return (
    <section className="py-24 lg:py-32 bg-neutral-950 relative">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Most Agents Are <span className="text-red-500/90">Invisible Online</span></h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">The traditional real estate playbook is dead. If you aren't capturing attention daily, you are losing market share to agents who do.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pains.map((pain, i) => (
            <motion.div
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { delay: i * 0.1 } }
              }}
              className="p-6 rounded-2xl border border-red-900/20 bg-neutral-900/30 hover:border-red-500/30 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-red-950/50 flex items-center justify-center text-red-500 mb-4 group-hover:scale-110 transition-transform">
                <span className="text-lg font-bold">✕</span>
              </div>
              <h3 className="text-lg font-medium text-neutral-200">{pain}</h3>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SolutionSection() {
  const solutions = [
    { title: "Content Systems", desc: "Never guess what to post. Pre-built calendars for every platform.", icon: <LayoutTemplate size={24} /> },
    { title: "Prompt Vaults", desc: "Elite AI prompts tuned specifically for high-ticket real estate.", icon: <MessageSquare size={24} /> },
    { title: "Luxury Branding", desc: "Templates that make you look like a top 1% producer instantly.", icon: <ImageIcon size={24} /> },
    { title: "Lead Generation", desc: "Funnels and magnets that convert passive viewers into buyers.", icon: <Users size={24} /> },
    { title: "Outreach Scripts", desc: "Tested psychology-based scripts for DMs and follow-ups.", icon: <MessageSquare size={24} /> },
    { title: "Automation OS", desc: "Connect your tools so the system runs while you sell.", icon: <Zap size={24} /> },
  ];

  return (
    <section className="py-24 lg:py-32 bg-black relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-black to-black" />
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">The AI Operating System <br className="hidden md:block"/>for Realtors</h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">Everything you need to build authority, capture leads, and automate your workflow in one centralized ecosystem.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {solutions.map((item, i) => (
            <motion.div
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{
                hidden: { opacity: 0, scale: 0.95 },
                visible: { opacity: 1, scale: 1, transition: { delay: i * 0.1 } }
              }}
              className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm hover:bg-white/[0.04] transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6">
                {item.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
              <p className="text-neutral-400 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ModulesSection() {
  const modules = [
    "24-Hour Launch System", "Realtor AI Prompt Vault", "365 Reel Hooks", 
    "Luxury Branding Kit", "Realtor Content Calendar", "Lead Generation Scripts", 
    "AI Automation Stack", "Monthly Realtor Operating System", "Canva Templates", 
    "Outreach Systems", "Listing Caption Vault", "Buyer Psychology Scripts"
  ];

  return (
    <section id="modules" className="py-24 lg:py-32 bg-neutral-950 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Inside The Vault</h2>
          <p className="text-neutral-400">A comprehensive suite of premium tools.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {modules.map((mod, i) => (
            <motion.div
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{
                hidden: { opacity: 0, x: -20 },
                visible: { opacity: 1, x: 0, transition: { delay: i * 0.05 } }
              }}
              className="flex items-center gap-4 p-4 rounded-xl bg-neutral-900/50 border border-neutral-800 hover:border-blue-500/30 transition-colors"
            >
              <CheckCircle2 size={20} className="text-blue-500 flex-shrink-0" />
              <span className="font-medium text-neutral-200">{mod}</span>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-16 flex justify-center">
           <a href="#payment" className="px-8 py-4 bg-white text-black rounded-full font-semibold text-lg hover:bg-neutral-200 transition-all">
              Get the Complete Vault
            </a>
        </div>
      </div>
    </section>
  );
}

function PreviewSection() {
  return (
    <section className="py-24 lg:py-32 bg-black overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Premium Assets, Ready to Deploy</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="p-8 rounded-2xl bg-neutral-900 border border-neutral-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Bot size={100} /></div>
              <h3 className="text-xl font-semibold mb-4 text-white relative z-10">AI Prompt Engineer</h3>
              <div className="space-y-3 relative z-10">
                <div className="bg-neutral-800 rounded-lg p-3 text-sm text-neutral-300 font-mono">
                  &gt; Act as a luxury real estate copywriter...
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-200 font-mono">
                  [Generated] "Nestled in the prestigious hills, this architectural masterpiece redefines modern living..."
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
             <div className="p-8 rounded-2xl bg-neutral-900 border border-neutral-800">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2"><Video className="text-blue-400"/> 365 Reel Hooks</h3>
              <div className="space-y-4">
                {[
                  "The #1 mistake buyers make in [City]...",
                  "Tour this $5M estate with me...",
                  "Why I tell my clients NOT to buy right now..."
                ].map((hook, i) => (
                  <div key={i} className="flex gap-4 items-center pb-4 border-b border-neutral-800 last:border-0 last:pb-0">
                    <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-500">{i+1}</div>
                    <div className="text-neutral-300 text-sm font-medium">{hook}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function DailySystemSection() {
  const days = [
    { day: "Monday", type: "Market Update Reel", desc: "Data-driven authority content." },
    { day: "Tuesday", type: "Luxury Listing Content", desc: "High-end visual storytelling." },
    { day: "Wednesday", type: "Buyer Education Reel", desc: "Trust-building advice." },
    { day: "Thursday", type: "Personal Branding", desc: "Behind the scenes / lifestyle." },
    { day: "Friday", type: "Local Authority Content", desc: "Neighborhood spotlights." },
    { day: "Saturday", type: "Open Home Content", desc: "Live walkthroughs & hype." },
    { day: "Sunday", type: "Lifestyle / Trust", desc: "Client stories & testimonials." },
  ];

  return (
    <section className="py-24 lg:py-32 bg-neutral-950 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mb-16"
        >
          <h2 className="text-4xl font-bold tracking-tight mb-4">The Daily Operating System</h2>
          <p className="text-lg text-neutral-400">Your exact weekly roadmap to dominate your local market.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {days.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`p-6 rounded-2xl border ${i === 0 ? 'bg-blue-600/10 border-blue-500/30' : 'bg-neutral-900/30 border-neutral-800'} flex flex-col h-full`}
            >
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-4">{item.day}</div>
              <div className="text-lg font-semibold text-white mb-2">{item.type}</div>
              <div className="text-sm text-neutral-400 mt-auto">{item.desc}</div>
            </motion.div>
          ))}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-500 flex flex-col items-center justify-center text-center h-full"
          >
            <div className="text-2xl font-bold text-white mb-2">Repeat & Grow</div>
            <p className="text-blue-200 text-sm">Consistent execution scales your brand.</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  const steps = [
    { icon: <Camera size={24} />, text: "Property Photos" },
    { icon: <Bot size={24} />, text: "AI Caption System" },
    { icon: <Video size={24} />, text: "Reel Generator" },
    { icon: <Share2 size={24} />, text: "Social Posting" },
    { icon: <Inbox size={24} />, text: "Lead Capture" },
    { icon: <Zap size={24} />, text: "Follow-Up Auto" },
    { icon: <Calendar size={24} />, text: "Client Booking" },
  ];

  return (
    <section className="py-24 lg:py-32 bg-black">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Automated AI Workflows</h2>
          <p className="text-neutral-400">Turn raw inputs into booked appointments.</p>
        </div>

        <div className="hidden lg:flex items-center justify-between max-w-6xl mx-auto relative px-4">
          <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-blue-900 via-blue-500 to-blue-900 opacity-20 z-0" />
          {steps.map((step, i) => (
            <div key={i} className="relative z-10 flex flex-col items-center gap-4 group">
              <motion.div 
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-700 flex items-center justify-center text-neutral-300 group-hover:border-blue-500 group-hover:text-blue-400 group-hover:scale-110 transition-all"
              >
                {step.icon}
              </motion.div>
              <div className="text-xs font-medium text-neutral-400 text-center w-20">{step.text}</div>
            </div>
          ))}
        </div>

        {/* Mobile Workflow */}
        <div className="flex lg:hidden flex-col items-center gap-6 relative">
           <div className="absolute top-10 bottom-10 left-1/2 -translate-x-1/2 w-0.5 bg-neutral-800 z-0" />
           {steps.map((step, i) => (
            <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative z-10 flex items-center gap-4 bg-neutral-900 border border-neutral-800 p-4 rounded-xl w-64"
              >
                <div className="text-blue-400">{step.icon}</div>
                <div className="text-sm font-medium text-white">{step.text}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SocialProofSection() {
  const reviews = [
    { name: "Sarah J.", role: "Luxury Agent", stat: "+140% Lead Gen", text: "I used the listing caption vault and daily content OS. I've doubled my inbound leads in 30 days. It literally runs my marketing." },
    { name: "Michael T.", role: "Broker Associate", stat: "$12M Volume Added", text: "The automation stack alone is worth 10x the price. I stopped manually following up and let the AI workflow handle it." },
    { name: "Elena R.", role: "Independent Realtor", stat: "30k New Followers", text: "I was overwhelmed by Instagram. The 365 reel hooks and content calendar gave me my life back. Pure premium quality." }
  ];

  return (
    <section className="py-24 lg:py-32 bg-neutral-950">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Elite Agents, Elite Results</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((review, i) => (
            <motion.div
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { delay: i * 0.1 } }
              }}
              className="p-8 rounded-2xl bg-neutral-900/50 border border-neutral-800 flex flex-col"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-neutral-700 to-neutral-600 flex items-center justify-center text-lg font-bold">
                  {review.name[0]}
                </div>
                <div>
                  <div className="font-semibold text-white">{review.name}</div>
                  <div className="text-xs text-neutral-400">{review.role}</div>
                </div>
              </div>
              <div className="text-blue-400 font-bold text-lg mb-4">{review.stat}</div>
              <p className="text-neutral-300 text-sm leading-relaxed italic">"{review.text}"</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="payment" className="py-24 lg:py-32 bg-black relative">
       <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-blue-900/10 via-black to-black pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Choose Your OS</h2>
          <p className="text-lg text-neutral-400">One-time investments. No monthly subscriptions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
          {/* Starter */}
          <div className="p-8 rounded-3xl bg-neutral-900/50 border border-neutral-800 hover:border-neutral-600 transition-all">
            <h3 className="text-xl font-medium text-neutral-300 mb-2">Starter</h3>
            <div className="text-4xl font-bold text-white mb-6">$29</div>
            <ul className="space-y-4 mb-8">
              {['Launch guide', 'AI Prompt Vault', 'Basic Canva Templates'].map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-neutral-300">
                  <CheckCircle2 size={16} className="text-neutral-500" /> {f}
                </li>
              ))}
            </ul>
            <a href="https://stripe.com" className="block w-full py-3 px-4 bg-white/10 text-white text-center font-medium rounded-xl hover:bg-white/20 transition-colors">
              Get Instant Access
            </a>
          </div>

          {/* Operator */}
          <div className="p-8 rounded-3xl bg-neutral-900 border-2 border-blue-500 relative transform md:-translate-y-4 shadow-2xl shadow-blue-900/20">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Most Popular
            </div>
            <h3 className="text-xl font-medium text-blue-400 mb-2">Operator</h3>
            <div className="text-5xl font-bold text-white mb-6">$79</div>
            <ul className="space-y-4 mb-8">
              {['Everything in Starter', '365 Content Systems', 'Automation Workflows', 'KPI Tracking Systems', 'Luxury Branding Kit'].map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-white">
                  <CheckCircle2 size={16} className="text-blue-500" /> {f}
                </li>
              ))}
            </ul>
            <a href="https://stripe.com" className="block w-full py-4 px-4 bg-white text-black text-center font-bold rounded-xl hover:bg-neutral-200 transition-colors">
              Get Instant Access
            </a>
          </div>

          {/* Lifetime */}
          <div className="p-8 rounded-3xl bg-neutral-900/50 border border-neutral-800 hover:border-neutral-600 transition-all">
            <h3 className="text-xl font-medium text-neutral-300 mb-2">Lifetime</h3>
            <div className="text-4xl font-bold text-white mb-6">$149</div>
            <ul className="space-y-4 mb-8">
              {['Everything in Operator', 'All future updates', 'Premium workflow systems', 'Future prompt vaults', 'Lifetime access guarantee'].map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-neutral-300">
                  <CheckCircle2 size={16} className="text-neutral-500" /> {f}
                </li>
              ))}
            </ul>
            <a href="https://stripe.com" className="block w-full py-3 px-4 bg-white/10 text-white text-center font-medium rounded-xl hover:bg-white/20 transition-colors">
              Get Instant Access
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    { q: "Is this beginner friendly?", a: "Absolutely. Everything is built with step-by-step instructions. You don't need to be a tech expert to copy and paste our proven prompts and templates." },
    { q: "Do I need AI experience?", a: "No prior experience required. We provide the exact inputs, workflows, and tools you need. It's essentially a plug-and-play system." },
    { q: "What tools do I need?", a: "Most of our systems use free tools like ChatGPT, Canva, and basic social media apps. We show you how to leverage them like a pro." },
    { q: "Is this updated regularly?", a: "Yes, the Lifetime tier includes all future updates to prompt vaults, strategies, and templates as AI evolves." },
    { q: "How fast can I implement this?", a: "You can set up the basic 24-Hour Launch System in one afternoon and start generating content immediately." },
    { q: "Does this work for small agencies?", a: "Yes, many boutique brokerages and small teams use our OS to standardize their branding and marketing output." },
  ];

  return (
    <section className="py-24 bg-neutral-950 border-t border-white/5">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <FAQItem key={i} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-neutral-800 rounded-xl bg-neutral-900/50 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 text-left flex justify-between items-center focus:outline-none"
      >
        <span className="font-medium text-white">{question}</span>
        <ChevronDown 
          size={20} 
          className={`text-neutral-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} 
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 pb-4 text-neutral-400 text-sm leading-relaxed"
          >
            {answer}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FinalCTA() {
  return (
    <section className="py-32 relative overflow-hidden bg-black text-center">
      <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-black pointer-events-none" />
      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-white">
          The Modern Realtor Is a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">Media Brand</span>
        </h2>
        <p className="text-xl text-neutral-400 mb-10 max-w-2xl mx-auto">
          Start building your AI-powered real estate business today. Step into the future of luxury real estate.
        </p>
        <a 
          href="#payment" 
          className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-white text-black rounded-full font-bold text-xl hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.3)]"
        >
          Get Instant Access <ArrowRight size={24} />
        </a>
      </div>
    </section>
  );
}