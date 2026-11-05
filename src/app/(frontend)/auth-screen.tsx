'use client'

import { useActionState, useState } from 'react'
import { loginAction, registerAction, type ActionResult } from './actions'

const initialState: ActionResult = { ok: false, message: '' }

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, initialState)
  const [registerState, registerFormAction, registerPending] = useActionState(registerAction, initialState)
  const state = mode === 'login' ? loginState : registerState
  const pending = mode === 'login' ? loginPending : registerPending

  return (
    <main className="grid min-h-screen bg-[#f6f6f3] lg:grid-cols-[1.15fr_.85fr]">
      <section className="relative hidden overflow-hidden border-r border-black/8 bg-[#191919] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-white text-lg font-bold text-black">F</span>
          <span className="text-lg font-semibold tracking-tight">Finanzas</span>
        </div>
        <div className="relative max-w-xl">
          <p className="mb-5 text-sm font-medium uppercase tracking-[.2em] text-white/45">Tu centro financiero</p>
          <h1 className="text-5xl font-medium leading-[1.05] tracking-[-.045em]">
            Claridad para cada decisión con tu dinero.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-white/60">
            Cuentas, tarjetas, préstamos y facultad conectados en un único libro financiero.
          </p>
        </div>
        <p className="relative text-sm text-white/35">Privado por diseño. Tus registros pertenecen solo a tu cuenta.</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-[#191919] font-bold text-white">F</span>
            <span className="font-semibold">Finanzas</span>
          </div>
          <p className="text-sm font-medium text-[#84847f]">{mode === 'login' ? 'Bienvenido de nuevo' : 'Empezá hoy'}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-.035em] text-[#222220]">
            {mode === 'login' ? 'Ingresá a tu espacio' : 'Creá tu cuenta'}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#73736e]">
            {mode === 'login'
              ? 'Consultá tu situación financiera y registrá nuevos movimientos.'
              : 'Tus datos se guardarán de forma privada y persistente.'}
          </p>

          <form action={mode === 'login' ? loginFormAction : registerFormAction} className="mt-8 space-y-4">
            {mode === 'register' && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Nombre</span>
                <input className="auth-input" name="name" placeholder="Tu nombre" autoComplete="name" required />
              </label>
            )}
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Correo</span>
              <input className="auth-input" name="email" type="email" placeholder="nombre@correo.com" autoComplete="email" required />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Contraseña</span>
              <input
                className="auth-input"
                name="password"
                type="password"
                placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                minLength={mode === 'register' ? 8 : undefined}
                required
              />
            </label>
            {state.message && (
              <p className={`rounded-xl px-3 py-2.5 text-sm ${state.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {state.message}
              </p>
            )}
            <button className="h-12 w-full rounded-xl bg-[#20201e] text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50" disabled={pending}>
              {pending ? 'Procesando…' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
            </button>
          </form>

          <button
            className="mt-6 w-full text-center text-sm text-[#666660] underline decoration-black/20 underline-offset-4"
            type="button"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? '¿Todavía no tenés cuenta? Crear una' : 'Ya tengo una cuenta'}
          </button>
        </div>
      </section>
    </main>
  )
}
