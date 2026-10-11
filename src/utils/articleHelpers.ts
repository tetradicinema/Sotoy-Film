export function isArticleUnpublished(a: { status?: string; scheduledAt?: string }): boolean {
  if (!a) return false;
  const status = a.status;
  if (status === 'draft' || status === 'trash') return true;
  if (status === 'scheduled') {
    if (!a.scheduledAt) return true;
    try {
      const scheduledTime = new Date(a.scheduledAt).getTime();
      if (isNaN(scheduledTime) || scheduledTime > Date.now()) return true;
    } catch {
      return true;
    }
  }
  return false;
}
