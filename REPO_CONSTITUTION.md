REPO_CONSTITUTION.md

(The Immutable Laws of the Instant Utilities Codebase)

Preamble: Authority, Precedence, & Fitness Functions

This document serves as the absolute governing authority for all architectural, structural, and implementation decisions within the Instant Utilities repository. Any AI agent or human developer modifying this codebase must read, acknowledge, and obey these rules before execution.

Constitution Precedence: If implementation requests conflict with this constitution, the constitution takes priority. The conflict must be explicitly identified, and proposed deviations require written justification.

Architectural Fitness Functions: All architectural decisions must continuously optimize for: removability, readability, scalability, operational simplicity, mobile responsiveness, tenant isolation, and low cognitive overhead.

Human Override: AI recommendations are advisory. Final architectural authority belongs to the repository owner.

Constitution Evolution: Changes to this document must include a rationale, document the expected impact, and preserve backward architectural coherence.

Article I: Boundary Integrity & Anti-Monolith Doctrine

Feature Admission Criteria: New features must justify business necessity, architectural impact, maintenance cost, and mobile UX impact. Features without clear ownership or isolation boundaries will be rejected.

Deletion Bias: Prefer removable systems over permanent systems. Every feature must have clear ownership, minimize coupling, and be independently removable.

Single Source of Truth: Business rules, permissions, and validation logic must exist in one authoritative location only (/core or /domains). Duplicate validation or permission logic is strictly prohibited.

Temporal Coupling Awareness: Avoid architectures where features depend on execution order, hidden lifecycle timing, or implicit initialization. Systems should remain stable regardless of load order.

Multi-Tenant Strictness: The architecture assumes a multi-building ecosystem. Every database query, RLS policy, and server action must inherently isolate buildings, managers, and residents. Cross-tenant access is denied by default.

Article II: Data Integrity, Security, & Schema Ownership

Schema Ownership: Database schemas represent business truth. UI structure must adapt to schema design—not the reverse.

Security by Default: All systems must assume untrusted clients, untrusted networks, malformed requests, and unauthorized access attempts. Authorization must be enforced server-side only.

No Mock Data: Scaffolded placeholder logic is forbidden. If implementation details are unknown, define explicit TypeScript interfaces and contracts.

Database Migrations: Schema evolution requires explicit, version-controlled migration files. Destructive changes require written justification.

Article III: Resilience, Communications, & Async Discipline

The Priority Hierarchy: Communication systems execute in strict priority: (1) SOS Emergency Alerts, (2) Urgent Requests, (3) Manager Announcements, (4) Standard Notifications.

Failure Transparency: Systems must fail visibly, predictably, and traceably. Silent failures are prohibited. When failures occur, the system must log securely, expose safe UI feedback, and avoid ambiguous system states.

Emergency System Hardening: The mission-critical SOS system must degrade safely, log failures securely, and remain operational independently of all other notification systems.

Async Boundary Discipline: Async workflows (e.g., Twilio delivery, urgent escalations) must define ownership clearly, handle retries safely, avoid duplicated side effects, and preserve idempotency where possible.

Article IV: Rendering, State, & Operational Economics

Server First: Next.js Server Components are the default. Client Components are used strictly for localized interactivity. Server Actions handle all mutations. Each App Router segment strictly owns its data fetching and error boundaries.

State & Realtime Jurisdiction: Global client state (Zustand) is restricted to UI state, active SOS sessions, and notification counters. It must not duplicate database state. Realtime subscriptions are restricted to SOS status, Urgent updates, and Notifications.

Performance & Mobile UX: Optimize for minimal client-side JavaScript, low hydration costs, and thumb-friendly interaction zones (large tap targets, low-scroll interfaces).

Cost Awareness: Favor architectures that minimize unnecessary realtime subscriptions, excessive API calls, redundant storage, infrastructure complexity, and operational expense.

Article V: AI Governance, Memory, & Observability

Documentation as Infrastructure: Critical architectural knowledge must not exist solely in chat history. Major architectural shifts or dependency introductions require an Architectural Decision Record (ADR) in /docs/architecture-decisions.

AI Output Discipline: When implementing features, AI agents must explain the architectural impact before major changes, summarize modified systems, identify potential boundary violations, and avoid speculative improvements outside the requested scope.

Observability Ownership: Critical systems must emit sufficient logs, events, and traceable state transitions to support debugging, incident investigation, and operational monitoring.

Refactor Safety: When modifying existing systems, preserve public interfaces. Avoid cascading rewrites and unrelated file mutations.