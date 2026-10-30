'use client'

import { ArrowLeft, Building2, Database, Mail, ShieldCheck, UserRound, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

const privacyPoints = [
  {
    title: 'Cuenta y acceso',
    description:
      'Guardamos la identidad del usuario activa en la cuenta, su email de contacto, el rol asignado (ADMIN o COLLABORATOR) y la relación con el comercio correspondiente. Clerk gestiona la autenticación y la sesión.',
    icon: UserRound,
  },
  {
    title: 'Comercio y negocio',
    description:
      'Registramos el nombre del comercio, el slug único, la información de la cuenta y la configuración operativa del negocio que se usa para personalizar la app y la seguridad por tenant.',
    icon: Building2,
  },
  {
    title: 'Insumos, recetas y proveedores',
    description:
      'Se almacenan los insumos, costos, unidades, recetas técnicas, productos, proveedores, precios y estados de cuarentena para calcular márgenes vigentes y avisar ante subas de costos.',
    icon: Database,
  },
  {
    title: 'Comunicaciones',
    description:
      'Cuando el sistema envía alertas o reportes por correo, se usan los datos necesarios para contactar al negocio y al usuario responsable. Brevo actúa como proveedor de envío de correos.',
    icon: Mail,
  },
] as const

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto flex w-full max-w-md flex-col px-4 pb-10 pt-5 md:max-w-4xl md:px-8 md:pt-8">
        <div className="mb-5 flex items-center justify-between gap-3 md:mb-7">
          <Link
            to="/"
            className="absolute left-5 top-5 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-indigo-600"
          >
            <ArrowLeft className="size-4" /> Volver a la web
          </Link>
        </div>

        <article className="rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
            <ShieldCheck className="size-3.5" /> Privacidad
          </div>

          <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white md:text-4xl">
            Privacidad y protección de datos
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300 md:text-base md:leading-7">
            MargenX ayuda a un comercio a controlar costos, márgenes y proveedores con la mínima información necesaria. Por eso solo guardamos los datos estrictamente requeridos para operar la cuenta, calcular márgenes y enviar alertas relevantes.
          </p>

          <section className="mt-6 space-y-3 md:mt-8">
            <h2 className="text-base font-bold text-gray-900 dark:text-white md:text-xl">Qué datos guarda MargenX</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {privacyPoints.map(({ title, description, icon: Icon }) => (
                <div key={title} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/60">
                  <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    <Icon className="size-4" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white md:text-base">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-gray-600 dark:text-gray-300 md:text-sm md:leading-6">{description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/60 md:mt-8">
            <h2 className="text-base font-bold text-gray-900 dark:text-white md:text-xl">Quiénes tratan esos datos</h2>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-gray-600 dark:text-gray-300 md:text-sm md:leading-6">
              <li>
                <span className="font-bold text-gray-900 dark:text-white">Clerk:</span> gestiona la autenticación, la sesión y la identidad del usuario dentro de la app.
              </li>
              <li>
                <span className="font-bold text-gray-900 dark:text-white">Brevo:</span> recibe y despacha correos de alertas y reportes del sistema, cuando corresponda.
              </li>
              <li>
                <span className="font-bold text-gray-900 dark:text-white">Vercel Analytics:</span> mide páginas visitadas y rendimiento de la app en todas las pantallas, incluidas estas públicas. No usa cookies ni identifica a la persona; no procesa datos de costos, productos ni proveedores.
              </li>
              <li>
                <span className="font-bold text-gray-900 dark:text-white">MargenX:</span> accede a la información necesaria para operar la gestión de costos, productos y proveedores del comercio.
              </li>
            </ul>
          </section>

          <section className="mt-6 md:mt-8">
            <h2 className="text-base font-bold text-gray-900 dark:text-white md:text-xl">Qué no hacemos</h2>
            <div className="mt-3 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200 md:text-sm md:leading-6">
              <Users className="mt-0.5 size-4 shrink-0 md:size-5" />
              <p>
                No vendemos ni comercializamos tus datos personales ni los del negocio. Tampoco compartimos la información de costos y proveedores con terceros ajenos al funcionamiento de la plataforma.
              </p>
            </div>
          </section>

          <section className="mt-6 md:mt-8">
            <h2 className="text-base font-bold text-gray-900 dark:text-white md:text-xl">Cómo pedir tu baja o corregir tus datos</h2>
            <p className="mt-3 text-xs leading-5 text-gray-600 dark:text-gray-300 md:text-sm md:leading-6">
              Si querés cerrar tu cuenta, solicitar la eliminación de tus datos o corregir información personal, podés contactarte con soporte desde la app o escribir a <a href="mailto:soporte@margenx.tech" className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-300">soporte@margenx.tech</a>.
              Revisaremos la solicitud y la atenderemos dentro de los plazos razonables del servicio.
            </p>
          </section>
        </article>
      </div>
    </main>
  )
}
