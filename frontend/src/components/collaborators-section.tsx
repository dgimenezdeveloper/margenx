import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link2, LoaderCircle, Mail, Send, UserMinus, Users, X } from 'lucide-react'
import { ErrorState } from '@/components/error-state'
import { EmailText } from '@/components/email-text'
import { useTokenGetter } from '@/hooks/useTokenGetter'
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { ApiError } from '@/services/api'
import { collaboratorService, type AccountMember, type PendingInvitation } from '@/services/collaboratorService'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INVALID_EMAIL = 'Ingresá un correo electrónico válido.'

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Argentina/Buenos_Aires',
})

function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso))
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

type PendingAction =
  | { kind: 'revoke'; invitation: PendingInvitation }
  | { kind: 'remove'; member: AccountMember }

interface CollaboratorsSectionProps {
  /** Aviso breve de la pantalla (toast de Perfil). */
  onNotify: (message: string) => void
}

/**
 * Sección "Colaboradores" de Perfil, solo para el ADMIN (ADR-008): invitar por mail,
 * ver invitaciones pendientes y colaboradores activos, revocar y dar de baja con confirmación.
 */
export function CollaboratorsSection({ onNotify }: CollaboratorsSectionProps) {
  const getToken = useTokenGetter()
  const emailInputRef = useRef<HTMLInputElement>(null)

  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [collaborators, setCollaborators] = useState<AccountMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [email, setEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [isInviting, setIsInviting] = useState(false)

  // Invitación creada sin mail (n8n caído o sin configurar): el ADMIN copia el enlace.
  const [mailNotSentTo, setMailNotSentTo] = useState<string | null>(null)
  // Enlace a la vista cuando el navegador no deja usar el portapapeles.
  const [manualCopy, setManualCopy] = useState<PendingInvitation | null>(null)

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  // Cada cambio vuelve a pedir el equipo; el efecto solo cambia el estado en los callbacks.
  const [reloadKey, setReloadKey] = useState(0)
  const reloadTeam = useCallback(() => setReloadKey((key) => key + 1), [])

  useEffect(() => {
    let active = true

    Promise.all([collaboratorService.listUsers(getToken), collaboratorService.listInvitations(getToken)])
      .then(([users, pending]) => {
        if (!active) return
        setCollaborators(users.filter((member) => member.role === 'COLLABORATOR'))
        setInvitations(pending)
        setLoadError(false)
      })
      .catch(() => {
        if (active) setLoadError(true)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [getToken, reloadKey])

  const retryLoad = () => {
    setIsLoading(true)
    setLoadError(false)
    reloadTeam()
  }

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(normalized)) {
      setInviteError(INVALID_EMAIL)
      return
    }

    setInviteError(null)
    setMailNotSentTo(null)
    setIsInviting(true)
    try {
      const { emailSent } = await collaboratorService.invite(getToken, normalized)
      setEmail('')
      if (emailSent) {
        onNotify(`Invitación enviada a ${normalized}`)
      } else {
        setMailNotSentTo(normalized)
      }
      reloadTeam()
    } catch (error) {
      setInviteError(errorMessage(error, 'No se pudo enviar la invitación. Probá de nuevo.'))
    } finally {
      setIsInviting(false)
    }
  }

  const copyInvitationLink = async (invitation: PendingInvitation) => {
    if (!invitation.url) return
    try {
      await navigator.clipboard.writeText(invitation.url)
      setManualCopy(null)
      onNotify(`Enlace copiado: mandáselo a ${invitation.email}`)
    } catch {
      setManualCopy(invitation)
    }
  }

  const closeDialog = () => {
    if (isConfirming) return
    setPendingAction(null)
    setActionError(null)
  }

  const handleConfirm = async () => {
    if (!pendingAction) return
    setIsConfirming(true)
    setActionError(null)
    try {
      if (pendingAction.kind === 'revoke') {
        await collaboratorService.revokeInvitation(getToken, pendingAction.invitation.id)
        onNotify('Invitación revocada')
      } else {
        await collaboratorService.removeUser(getToken, pendingAction.member.id)
        onNotify(`${pendingAction.member.email} ya no tiene acceso`)
      }
      setPendingAction(null)
      reloadTeam()
    } catch (error) {
      setActionError(errorMessage(error, 'No se pudo completar la acción. Probá de nuevo.'))
    } finally {
      setIsConfirming(false)
    }
  }

  const isEmpty = invitations.length === 0 && collaborators.length === 0

  return (
    <section
      aria-labelledby="colaboradores-titulo"
      className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex items-center gap-2">
        <Users className="size-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <h3 id="colaboradores-titulo" className="text-sm font-bold">Colaboradores</h3>
      </div>
      <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
        Invitá a tu personal por mail. Entran como colaboradores: ven los productos y sus precios de venta, pero no los costos ni los márgenes.
      </p>

      <form onSubmit={handleInvite} noValidate className="space-y-2">
        <label htmlFor="colaborador-email" className="block text-xs font-bold text-gray-700 dark:text-gray-300">
          Correo del colaborador
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 focus-within:border-indigo-600 dark:border-gray-700 dark:bg-gray-800">
            <Mail className="size-4 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
            <input
              ref={emailInputRef}
              id="colaborador-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="nombre@ejemplo.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                if (inviteError) setInviteError(null)
              }}
              disabled={isInviting}
              aria-invalid={inviteError !== null}
              aria-describedby={inviteError ? 'colaborador-email-error' : undefined}
              className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-gray-500 disabled:opacity-50 dark:placeholder:text-gray-400"
            />
          </div>
          <button
            type="submit"
            disabled={isInviting}
            className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isInviting ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="size-4" aria-hidden="true" />
            )}
            {isInviting ? 'Enviando...' : 'Invitar'}
          </button>
        </div>
        {inviteError && (
          <p id="colaborador-email-error" role="alert" className="text-xs font-bold text-rose-700 dark:text-rose-400">
            {inviteError}
          </p>
        )}
      </form>

      {mailNotSentTo && (
        <div
          role="status"
          aria-label="Aviso de invitación"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <p className="break-words font-bold">
            Creamos la invitación para <EmailText email={mailNotSentTo} />, pero no pudimos enviar el mail.
          </p>
          <p className="mt-1">
            Tocá <strong>Copiar enlace</strong> en Invitaciones pendientes y mandáselo por WhatsApp o por otro medio.
          </p>
        </div>
      )}

      {isLoading ? (
        <div role="status" aria-label="Cargando colaboradores" className="space-y-2">
          <div className="h-12 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-12 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        </div>
      ) : loadError ? (
        <ErrorState
          title="No pudimos cargar tu equipo"
          description="Revisá tu conexión y probá de nuevo."
          onRetry={retryLoad}
          className="py-6"
        />
      ) : isEmpty ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-center dark:border-gray-700">
          <p className="text-sm font-bold">Todavía no sumaste colaboradores</p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Cuando invites a alguien, vas a ver acá su invitación hasta que la acepte.
          </p>
          <button
            type="button"
            onClick={() => emailInputRef.current?.focus()}
            className="mt-4 min-h-11 cursor-pointer rounded-2xl border border-indigo-200 px-4 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950"
          >
            Invitar a mi primer colaborador
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {invitations.length > 0 && (
            <div className="space-y-2">
              <h4 id="invitaciones-pendientes" className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Invitaciones pendientes ({invitations.length})
              </h4>
              <ul aria-label="Invitaciones pendientes" className="space-y-2">
                {invitations.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl bg-gray-50 px-4 py-2 dark:bg-gray-800/50"
                  >
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="text-sm font-semibold">
                        <EmailText email={invitation.email} />
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Creada el {formatDate(invitation.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {invitation.url && (
                        <button
                          type="button"
                          onClick={() => void copyInvitationLink(invitation)}
                          // El nombre accesible empieza con el texto visible, para quien usa el control por voz (WCAG 2.5.3, #497).
                          aria-label={`Copiar enlace de la invitación de ${invitation.email}`}
                          className="flex min-h-11 cursor-pointer items-center gap-1 rounded-xl px-3 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
                        >
                          <Link2 className="size-4" aria-hidden="true" />
                          Copiar enlace
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPendingAction({ kind: 'revoke', invitation })}
                        aria-label={`Revocar la invitación de ${invitation.email}`}
                        className="flex min-h-11 cursor-pointer items-center gap-1 rounded-xl px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      >
                        <X className="size-4" aria-hidden="true" />
                        Revocar
                      </button>
                    </div>
                    {manualCopy?.id === invitation.id && invitation.url && (
                      <div className="w-full pt-1">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Tu navegador no dejó copiarlo. Mantené apretado el enlace o seleccionalo y copialo:
                        </p>
                        <input
                          readOnly
                          value={invitation.url}
                          aria-label={`Enlace de la invitación de ${invitation.email}`}
                          onFocus={(event) => event.currentTarget.select()}
                          className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Colaboradores activos ({collaborators.length})
            </h4>
            {collaborators.length === 0 ? (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Nadie aceptó una invitación todavía.
              </p>
            ) : (
              <ul aria-label="Colaboradores activos" className="space-y-2">
                {collaborators.map((member) => (
                  <li
                    key={member.id}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl bg-gray-50 px-4 py-2 dark:bg-gray-800/50"
                  >
                    {/* Como en las invitaciones: si no entran juntos, el botón baja y el correo usa todo el ancho (#497). */}
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="text-sm font-semibold">
                        <EmailText email={member.email} />
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Desde el {formatDate(member.createdAt)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingAction({ kind: 'remove', member })}
                      aria-label={`Dar de baja a ${member.email}`}
                      className="flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-xl px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    >
                      <UserMinus className="size-4" aria-hidden="true" />
                      Dar de baja
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <Dialog open={pendingAction !== null} onOpenChange={(isOpen) => { if (!isOpen) closeDialog() }}>
        <DialogPortal>
          <DialogBackdrop className="z-70" />
          <DialogPopup className="z-70">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
              {pendingAction?.kind === 'remove' ? <UserMinus className="size-7" /> : <X className="size-7" />}
            </div>
            <DialogTitle>
              {pendingAction?.kind === 'remove' ? '¿Dar de baja al colaborador?' : '¿Revocar la invitación?'}
            </DialogTitle>
            <DialogDescription className="break-words">
              {pendingAction?.kind === 'remove' ? (
                <>
                  <EmailText email={pendingAction.member.email} /> ya no va a poder entrar a MargenX. Si vuelve, lo podés
                  invitar de nuevo.
                </>
              ) : pendingAction?.kind === 'revoke' ? (
                <>
                  El enlace que le llegó a <EmailText email={pendingAction.invitation.email} /> deja de funcionar.
                </>
              ) : (
                ''
              )}
            </DialogDescription>
            {actionError && (
              <p role="alert" className="mt-3 text-xs font-bold text-rose-700 dark:text-rose-400">
                {actionError}
              </p>
            )}
            <div className="mt-6 flex gap-3">
              <DialogClose
                disabled={isConfirming}
                className="min-h-11 flex-1 cursor-pointer rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancelar
              </DialogClose>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={isConfirming}
                className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white shadow-md transition hover:bg-rose-700 disabled:opacity-50"
              >
                {isConfirming && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                {pendingAction?.kind === 'remove' ? 'Dar de baja' : 'Revocar'}
              </button>
            </div>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    </section>
  )
}
