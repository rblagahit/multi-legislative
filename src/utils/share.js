export function buildPublicShareUrl(type, id) {
  const url = new URL(window.location.href);
  url.searchParams.delete('member');
  url.searchParams.delete('doc');
  if (type && id) url.searchParams.set(type, id);
  return url.toString();
}

export async function sharePublicEntity({
  channel = 'copy',
  title,
  text,
  url,
  onSuccess,
  onError,
}) {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  const encodedTitle = encodeURIComponent(title);

  try {
    if (channel === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`, '_blank', 'noopener');
      return;
    }
    if (channel === 'x') {
      window.open(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`, '_blank', 'noopener');
      return;
    }
    if (channel === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, '_blank', 'noopener');
      return;
    }
    if (channel === 'email') {
      window.location.href = `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(`${text}\n\n${url}`)}`;
      return;
    }
    if (channel === 'messenger') {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        onSuccess?.('Opened the share sheet. Select Messenger to continue.');
        return;
      }
      await navigator.clipboard.writeText(url);
      onSuccess?.('Messenger direct share is not supported here. Link copied so you can paste it into Messenger.');
      return;
    }
    if (channel === 'native' && navigator.share) {
      await navigator.share({ title, text, url });
      return;
    }

    await navigator.clipboard.writeText(`${text}\n${url}`);
    onSuccess?.('Share details copied to clipboard.');
  } catch (error) {
    console.error('[sharePublicEntity]', error);
    onError?.('Unable to share right now.');
  }
}
