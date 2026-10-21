'use client'

import { useState, type FormEvent } from 'react'
import { ArrowRight, Lock, Mail } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BRAND, DEMO_CREDENTIALS } from '@/config/brand'
import { useUIStore } from '@/store/ui-store'

/**
 * The gate in front of the demo.
 *
 * There is no backend behind it — the fields come pre-filled with the demo
 * identity so a walkthrough never stalls on "what's the password", but they
 * stay editable so the screen still reads as a real sign-in rather than a
 * click-through splash.
 */
export function LoginScreen() {
  const signIn = useUIStore((s) => s.signIn)
  const [email, setEmail] = useState<string>(DEMO_CREDENTIALS.email)
  const [password, setPassword] = useState<string>(DEMO_CREDENTIALS.password)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    signIn()
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-kpmg-navy px-4">
      <div className="w-full max-w-[400px]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-7 shadow-card"
        >
          <h1 className="text-[19px] font-bold tracking-[-0.01em] text-slate-900">
            Sign in to {BRAND.product}
          </h1>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
            {BRAND.appName}
          </p>

          <div className="mt-5 space-y-3.5">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-wider text-slate-500"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-9 text-[13.5px]"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-wider text-slate-500"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-9 text-[13.5px]"
                  autoComplete="current-password"
                />
              </div>
            </div>
          </div>

          <Button type="submit" size="lg" className="mt-5 w-full">
            Sign In
            <ArrowRight className="size-4" strokeWidth={2.2} />
          </Button>
        </form>
      </div>
    </div>
  )
}
