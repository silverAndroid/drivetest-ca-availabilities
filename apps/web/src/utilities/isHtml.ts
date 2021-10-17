export function isHtml(s: string | undefined): s is string {
  if (!s) return false;

  const doc = new DOMParser().parseFromString(s, "text/html");
  return Array.from(doc.body.childNodes).some((node) => node.nodeType === 1);
}
