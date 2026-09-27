// Web: open the generated plan in its own tab, then launch that tab's print dialog.
export async function printHtml(html, { printLabel = 'Print this plan', blocked = 'The plan tab was blocked. Allow pop-ups and tap Print again.' } = {}) {
  // This runs directly in the button press, before any await, to avoid pop-up blockers.
  const page = window.open('', '_blank');
  if (!page) throw new Error(blocked);

  page.document.open();
  page.document.write(html);
  page.document.close();

  // Some mobile browsers suppress automatic print dialogs. Leave a visible fallback.
  const style = page.document.createElement('style');
  style.textContent = '@media print { .firepath-print-action { display: none !important; } }';
  page.document.head.appendChild(style);
  const button = page.document.createElement('button');
  button.className = 'firepath-print-action';
  button.textContent = printLabel;
  button.style.cssText = 'display:block;margin:14px 0;padding:10px 16px;border:0;border-radius:8px;background:#1D5B4D;color:white;font:700 15px sans-serif;cursor:pointer';
  button.addEventListener('click', () => page.print());
  page.document.body.prepend(button);
  page.focus();
  page.print();
}
