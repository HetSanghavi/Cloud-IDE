"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getProviders, signIn, useSession } from "next-auth/react";
import { loginFormMessage, oauthFormMessage } from "@/lib/auth-messages";

const Workspace = dynamic(() => import("@/components/cloud-ide").then(module => module.CloudIDE), { ssr: false, loading: () => <div className="loading"><div className="brand-mark">⌘</div></div> });

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
}

function ThemeIcon({ theme }: { theme: "dark" | "light" }) {
  return theme === "dark" ? <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v2m0 14v2M3 12h2m14 0h2m-3.64-5.64 1.42-1.42M5.22 18.78l1.42-1.42m0-10.72L5.22 5.22m13.56 13.56-1.42-1.42M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0" /></svg> : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 15.3A8.8 8.8 0 0 1 8.7 3.2 8.8 8.8 0 1 0 20.8 15.3z" /></svg>;
}

function GoogleIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.23c0-.71-.06-1.2-.19-1.71H12v3.24h5.38c-.11.8-.7 2-2 2.81l-.02.11 2.91 2.25.2.02c1.84-1.7 2.88-4.2 2.88-7.72Z" /><path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.46-2.37l-3.08-2.38c-.82.57-1.93.97-3.38.97a5.87 5.87 0 0 1-5.55-4.05l-.1.01-3.03 2.34-.04.09A9.75 9.75 0 0 0 12 21.75Z" /><path fill="#FBBC05" d="M6.45 13.92A5.92 5.92 0 0 1 6.14 12c0-.67.12-1.32.3-1.92l-.01-.13-3.07-2.38-.1.05A9.74 9.74 0 0 0 2.25 12c0 1.57.37 3.05 1.01 4.38l3.19-2.46Z" /><path fill="#EA4335" d="M12 6.03c1.82 0 3.05.79 3.75 1.45l2.74-2.67C16.83 3.25 14.63 2.25 12 2.25a9.74 9.74 0 0 0-8.74 5.37l3.18 2.46A5.9 5.9 0 0 1 12 6.03Z" /></svg>;
}

function LandingWorkspaceDemo() {
  return <aside className="landing-workspace" aria-label="Cloud IDE workspace demonstration"><header className="landing-demo-bar"><span><i></i><i></i><i></i></span><b>My landing page</b><small>Preview ready</small></header><div className="landing-demo-body"><section className="landing-demo-editor"><header><span>index.html</span><small>HTML</small></header><pre><code><span><b>01</b><em>&lt;main&gt;</em></span><span><b>02</b>  <em>&lt;h1&gt;</em>Make it real<em>&lt;/h1&gt;</em></span><span><b>03</b>  <em>&lt;p&gt;</em>Build from an idea.<em>&lt;/p&gt;</em></span><span><b>04</b>  <em>&lt;a&gt;</em>Start creating<em>&lt;/a&gt;</em></span><span><b>05</b><em>&lt;/main&gt;</em></span></code></pre></section><section className="landing-demo-preview"><header><span><i></i> Live preview</span></header><div className="landing-preview-page"><p>STUDIO / 01</p><h2>Make your next<br/>idea <em>real.</em></h2><span>Build focused web experiences in one place.</span><b>Start creating <strong>→</strong></b></div></section></div></aside>;
}

function LandingScreen() {
  const [signup, setSignup] = useState(true); const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [message, setMessage] = useState(""); const [submitting, setSubmitting] = useState(false); const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => { const timer = window.setTimeout(() => { try { const savedTheme = localStorage.getItem("cloudide-theme"); if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme); } catch {} const code = new URLSearchParams(window.location.search).get("error"); if (code) setMessage(oauthFormMessage(code)); }, 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem("cloudide-theme", theme); }, [theme]);
  const authenticate = async () => {
    if (signup) {
      try {
        const registration = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
        if (!registration.ok) { const body = await registration.json().catch(() => null) as { error?: string } | null; return body?.error || "Unable to create this account. Please try again."; }
      } catch { return "Unable to create this account. Please try again."; }
    }
    try { const result = await signIn("credentials", { email, password, redirect: false }); return result?.error ? loginFormMessage(result.code) : null; } catch { return "Unable to log in. Please try again."; }
  };
  const authenticateWithGoogle = async () => {
    try { const providers = await getProviders(); if (!providers?.google) return "Google sign-in is not configured. Please use email and password for now."; await signIn("google", { redirectTo: "/" }); return null; } catch { return "Google sign-in could not be started. Please try again."; }
  };
  return <main className="auth-page"><button className="auth-theme" onClick={() => setTheme(value => value === "dark" ? "light" : "dark")}><ThemeIcon theme={theme} /></button><section className="auth-copy"><button className="logo-button"><span className="brand-mark">⌘</span><span>cloud<span>ide</span></span></button><div><span className="auth-pill">The modern web workspace</span><h1>Ideas deserve<br/><em>momentum.</em></h1><p>Design, build and share beautiful web projects in one focused browser workspace.</p></div><LandingWorkspaceDemo /></section><section className="auth-form-wrap"><form className="auth-form" onSubmit={async event => { event.preventDefault(); setSubmitting(true); setMessage(""); try { const result = await authenticate(); if (result) setMessage(result); } finally { setSubmitting(false); } }}><div className="form-heading"><p>{signup ? "GET STARTED FOR FREE" : "WELCOME BACK"}</p><h2>{signup ? "Create your space." : "Pick up where you left off."}</h2></div>{signup && <label>Username<input value={name} onChange={event => setName(event.target.value)} placeholder="alexmorgan" required minLength={2} maxLength={60} /></label>}<label>Email address<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" required /></label><label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••" required minLength={8} maxLength={72} /></label>{message && <p className="form-error" role="alert" aria-live="polite">{message}</p>}<button className="auth-submit" type="submit" disabled={submitting}>{submitting ? "Please wait" : signup ? "Create account" : "Log in"}<ArrowIcon /></button><div className="auth-divider"><span>or</span></div><button className="oauth-button" type="button" disabled={submitting} onClick={async () => { setSubmitting(true); setMessage(""); try { const result = await authenticateWithGoogle(); if (result) setMessage(result); } finally { setSubmitting(false); } }}><GoogleIcon /> Continue with Google</button><p className="form-switch">{signup ? "Already have an account?" : "New to Cloud IDE?"} <button type="button" onClick={() => { setSignup(value => !value); setMessage(""); }}>{signup ? "Log in" : "Create account"}</button></p></form></section></main>;
}

export function LandingPage() {
  const { status } = useSession();
  return status === "authenticated" ? <Workspace /> : <LandingScreen />;
}
