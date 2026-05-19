import { useEffect, useRef } from "react";
import { HOME_FEATURES, HOME_STEPS, PRODUCT_FULL_NAME, PRODUCT_NAME } from "../../lib/constants";
import { BrandLockup } from "../common/BrandLockup";

export function HomePage({
  isAuthenticated,
  hasCompletedOnboarding,
  authProfile,
  workspaceName,
  pairCode,
  onPrimaryAction,
  onOpenAuth,
  onDownloadPlugin,
  onCopyPairCode,
  onCopyPluginPath,
}) {
  const pageRef = useRef(null);

  useEffect(() => {
    const page = pageRef.current;
    if (!page || typeof window === "undefined") {
      return undefined;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const revealTargets = Array.from(page.querySelectorAll("[data-reveal]"));
    let frame = 0;
    let observer = null;

    const updateScrollMotion = () => {
      frame = 0;
      const progress = Math.min(window.scrollY / 960, 1);
      page.style.setProperty("--home-scroll-progress", progress.toFixed(3));
    };

    if (!reducedMotion.matches) {
      updateScrollMotion();

      const handleScroll = () => {
        if (frame) {
          return;
        }
        frame = window.requestAnimationFrame(updateScrollMotion);
      };

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
      );

      revealTargets.forEach((target) => observer.observe(target));
      window.addEventListener("scroll", handleScroll, { passive: true });

      return () => {
        window.removeEventListener("scroll", handleScroll);
        observer?.disconnect();
        if (frame) {
          window.cancelAnimationFrame(frame);
        }
        page.style.removeProperty("--home-scroll-progress");
      };
    }

    revealTargets.forEach((target) => target.classList.add("is-visible"));

    return () => page.style.removeProperty("--home-scroll-progress");
  }, []);

  const ctaLabel = isAuthenticated
    ? hasCompletedOnboarding
      ? "Open workspace"
      : "Finish setup"
    : "Start prototyping";

  return (
    <div className="home-page" ref={pageRef}>
      <nav className="home-nav">
        <div className="home-nav-inner">
          <BrandLockup />
          <button className="primary-button home-nav-cta" type="button" onClick={isAuthenticated ? onPrimaryAction : onOpenAuth}>
            {isAuthenticated ? "Dashboard" : "Sign up"}
          </button>
        </div>
      </nav>

      <section className="home-hero">
        <div className="home-progress-line" aria-hidden="true" />
        <div className="home-hero-eyebrow motion-reveal" data-reveal>
          Sign in with Roblox · Build in Studio
        </div>
        <h1 className="home-hero-headline motion-reveal" data-reveal style={{ "--reveal-delay": "80ms" }}>
          The easiest AI builder
          <br />
          <span className="home-hero-accent">for Roblox Studio.</span>
        </h1>
        <p className="home-hero-sub motion-reveal" data-reveal style={{ "--reveal-delay": "140ms" }}>
          Keep the clean product surface you already like, then jump into a calmer workspace with chat,
          system packs, Studio pairing, and mock Roblox outputs.
        </p>
        <div className="home-hero-actions motion-reveal" data-reveal style={{ "--reveal-delay": "200ms" }}>
          <button className="primary-button home-hero-btn" type="button" onClick={isAuthenticated ? onPrimaryAction : onOpenAuth}>
            {ctaLabel}
          </button>
          <span className="home-hero-note home-hero-note-dynamic">
            {isAuthenticated
              ? `Signed in as @${authProfile.username}`
              : "Frontend-only preview · Official auth can come later"}
          </span>
        </div>

        <div className="home-terminal motion-reveal" data-reveal style={{ "--reveal-delay": "260ms" }}>
          <div className="home-terminal-bar">
            <span className="home-terminal-dot" style={{ background: "#ff5f56" }} />
            <span className="home-terminal-dot" style={{ background: "#ffbd2e" }} />
            <span className="home-terminal-dot" style={{ background: "#27c93f" }} />
            <span className="home-terminal-title">{PRODUCT_FULL_NAME} · Workspace</span>
          </div>
          <div className="home-terminal-body">
            <div className="home-terminal-msg home-terminal-msg-user">
              <span className="home-terminal-tag">You</span>
              <p>Make shift-to-run with stamina UI and a clear sprint state.</p>
            </div>
            <div className="home-terminal-msg home-terminal-msg-ai">
              <span className="home-terminal-tag" style={{ color: "#c7ef5d" }}>
                {PRODUCT_NAME}
              </span>
              <p>Drafting client sprint UI, shared config, and a lightweight server state preview. Studio sync ready when you are.</p>
            </div>
            <div className="home-terminal-status">
              <span className="status-dot status-dot-live" />
              Mock build preview · Calm workspace · Studio pairing drawer
            </div>
          </div>
        </div>
      </section>

      <section className="home-auth-band">
        <div className="home-section-inner">
          <div className="home-auth-card motion-reveal" data-reveal>
            <div className="home-auth-copy">
              <span className={`home-auth-status ${isAuthenticated ? "home-auth-status-live" : ""}`}>
                {isAuthenticated ? "Signed in with Roblox" : "Waiting for login"}
              </span>
              <h2>{isAuthenticated ? "Your workspace preview is ready." : "Sign in before you start building."}</h2>
              <p>
                {isAuthenticated
                  ? `You are signed in as ${authProfile.displayName}. Open ${workspaceName}, preview the Studio flow, and keep everything local for now.`
                  : "Use the mock sign-in flow to enter the frontend preview, then install the plugin and pair Studio when you want to test the setup UX."}
              </p>

              <div className="home-auth-action-row">
                {isAuthenticated ? (
                  <button className="primary-button home-auth-enter" type="button" onClick={onPrimaryAction}>
                    {hasCompletedOnboarding ? "Continue to workspace" : "Finish setup"}
                  </button>
                ) : (
                  <button className="primary-button home-auth-enter" type="button" onClick={onOpenAuth}>
                    Sign in with Roblox
                  </button>
                )}
                <button className="secondary-button" type="button" onClick={onDownloadPlugin}>
                  Download plugin
                </button>
                <button className="text-button" type="button" onClick={onCopyPluginPath}>
                  Copy plugin folder path
                </button>
              </div>
            </div>

            <div className="home-auth-steps">
              <div className="home-auth-step">
                <span>01</span>
                <strong>Open the workspace</strong>
                <p>Keep the site-first flow, then enter the calmer builder once you are ready.</p>
              </div>
              <div className="home-auth-step">
                <span>02</span>
                <strong>Copy the pair code</strong>
                <div className="home-auth-pair">{pairCode}</div>
                <p>Use the Studio drawer when you want the pairing preview without cluttering the main screen.</p>
              </div>
              <div className="home-auth-step">
                <span>03</span>
                <strong>Install the plugin</strong>
                <p>Download the current plugin file, place it into Roblox Plugins, then reconnect from the Studio page.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-features">
        <div className="home-section-inner">
          <h2 className="home-section-title motion-reveal" data-reveal>
            Everything you need in one clean surface
          </h2>
          <div className="home-feature-grid">
            {HOME_FEATURES.map((feature, index) => (
              <div className="home-feature-card motion-reveal" data-reveal key={feature.title} style={{ "--reveal-delay": `${80 + index * 70}ms` }}>
                <div className="home-feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-steps">
        <div className="home-section-inner">
          <h2 className="home-section-title motion-reveal" data-reveal>
            How it works
          </h2>
          <div className="home-steps-grid">
            {HOME_STEPS.map((step, index) => (
              <div className="home-step motion-reveal" data-reveal key={step.num} style={{ "--reveal-delay": `${80 + index * 70}ms` }}>
                <div className="home-step-num">{step.num}</div>
                <h3>{step.label}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
