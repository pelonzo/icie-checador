/**
 * Lista centralizada de correos con privilegios de administrador.
 * Solo los usuarios cuyo email esté aquí podrán ver el Panel Admin
 * y editar registros horarios en la vista de Historial.
 *
 * Para agregar un nuevo admin, simplemente añade su correo a este arreglo.
 */
export const ADMIN_EMAILS: readonly string[] = [
  'a.olvera@icie.mx',
  'e.martinez@icie.mx',
] as const;

/**
 * Verifica si un correo electrónico tiene permisos de administrador.
 * La comparación se hace en minúsculas para evitar falsos negativos
 * por diferencias de capitalización.
 */
export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.some(
    (adminEmail) => adminEmail.toLowerCase() === email.toLowerCase()
  );
}
