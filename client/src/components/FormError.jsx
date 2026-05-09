export function FormError({ errors, field }) {
  const fieldError = errors?.find(e => e.field === field)
  if (!fieldError) return null
  return <p className="text-red-400 text-xs mt-1">{fieldError.message}</p>
}