// <plantilla-mail-margenx>
// Plantilla compartida de los mails de MargenX (resumen de ingesta y alertas de margen).
// Fuente única: infra/n8n/plantillas/mail-margenx.js. No editar este bloque en n8n:
// se copia a los workflows con `node infra/n8n/plantillas/sincronizar.mjs`.
const MX_APP = { prod: 'https://margenx.tech', dev: 'https://dev.margenx.tech' };
const MX_TONOS = {
  peligro: { fondo: '#fef2f2', borde: '#ef4444', titulo: '#991b1b', texto: '#7f1d1d', chipFondo: '#450a0a', chipTexto: '#fca5a5', chipBorde: '#7f1d1d' },
  aviso: { fondo: '#fffbeb', borde: '#f59e0b', titulo: '#92400e', texto: '#78350f', chipFondo: '#451a03', chipTexto: '#fcd34d', chipBorde: '#78350f' },
  info: { fondo: '#eef2ff', borde: '#4f46e5', titulo: '#3730a3', texto: '#312e81', chipFondo: '#1e1b4b', chipTexto: '#c7d2fe', chipBorde: '#3730a3' },
  ok: { fondo: '#f0fdf4', borde: '#22c55e', titulo: '#166534', texto: '#14532d', chipFondo: '#052e16', chipTexto: '#86efac', chipBorde: '#14532d' },
};
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// Número con separador de miles argentino: 2.500
function mxEntero(n) {
  return (Number(n) || 0).toLocaleString('es-AR');
}
// "1 fila" / "2 filas": el singular solo para exactamente 1
function mxCantidad(n, singular, plural) {
  return `${mxEntero(n)} ${Number(n) === 1 ? singular : plural}`;
}
function mxPorcentaje(n) {
  return (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}
function mxPesos(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
}
function mxBoton(href, etiqueta) {
  return `<a href="${escapeHtml(href)}" target="_blank" style="background-color: #4f46e5; color: #ffffff; padding: 10px 18px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 6px; display: inline-block;">${escapeHtml(etiqueta)}</a>`;
}
// Bloque destacado con título, contenido (HTML ya escapado) y un botón opcional
function mxAviso(tono, titulo, contenidoHtml, boton) {
  const t = MX_TONOS[tono] || MX_TONOS.info;
  const accion = boton ? `<p style="margin: 12px 0 0 0;">${mxBoton(boton.href, boton.etiqueta)}</p>` : '';
  return `<div style="background-color: ${t.fondo}; border-left: 4px solid ${t.borde}; padding: 12px 12px; border-radius: 0 8px 8px 0; margin: 0 0 16px 0;">
  <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${t.titulo};">${escapeHtml(titulo)}</p>
  <div style="margin: 6px 0 0 0; font-size: 14px; line-height: 1.5; color: ${t.texto};">${contenidoHtml}</div>${accion}
</div>`;
}
// Tabla de productos bajo su margen mínimo, con el botón "Ajustar" de cada uno
function mxTablaProductos(filas) {
  const cuerpo = filas.map((f) => `<tr style="border-bottom: 1px solid #e2e8f0;">
  <td style="padding: 10px 8px; font-size: 14px; font-weight: 600; color: #0f172a;">${escapeHtml(f.nombre)}<div style="font-size: 12px; font-weight: 400; color: #64748b;">Nuevo costo: ${escapeHtml(mxPesos(f.costo))}</div></td>
  <td style="padding: 10px 8px; font-size: 13px; text-align: right; white-space: nowrap;"><span style="background-color: #fee2e2; color: #b91c1c; font-weight: 700; padding: 3px 6px; border-radius: 4px; border: 1px solid #fecaca; display: inline-block;">${escapeHtml(mxPorcentaje(f.margen))}</span><div style="font-size: 12px; color: #475569; margin-top: 4px;">mín. ${escapeHtml(mxPorcentaje(f.minimo))}</div></td>
  <td style="padding: 10px 8px; text-align: right;"><a href="${escapeHtml(f.enlace)}" target="_blank" style="background-color: #4f46e5; color: #ffffff; padding: 6px 10px; font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 4px; display: inline-block;">Ajustar</a></td>
</tr>`).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; border: 1px solid #e2e8f0; width: 100%; background-color: #ffffff;">
<thead><tr style="background-color: #f1f5f9; text-align: left;">
  <th style="padding: 8px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Producto</th>
  <th style="padding: 8px; font-size: 11px; font-weight: 700; color: #b91c1c; text-transform: uppercase; text-align: right;">Margen</th>
  <th style="padding: 8px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: right;"></th>
</tr></thead>
<tbody>${cuerpo}</tbody>
</table>`;
}
// Documento completo: encabezado de marca, etiqueta de estado, contenido y pie
function mxDocumento({ titulo, etiqueta, tono, contenidoHtml, pieHtml }) {
  const t = MX_TONOS[tono] || MX_TONOS.info;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(titulo)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; padding: 16px 8px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <tr>
            <td style="background-color: #0f172a; padding: 18px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">MARGEN<span style="color: #6366f1;">X</span></span>
                    <span style="font-size: 11px; color: #94a3b8; display: block; margin-top: 2px; text-transform: uppercase; letter-spacing: 1px;">Control de rentabilidad en tiempo real</span>
                  </td>
                  <td align="right">
                    <span style="background-color: ${t.chipFondo}; color: ${t.chipTexto}; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; border: 1px solid ${t.chipBorde}; text-transform: uppercase; white-space: nowrap; display: inline-block;">${escapeHtml(etiqueta)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 16px; font-size: 14px; line-height: 1.5; color: #334155;">
              ${contenidoHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center;">
              ${pieHtml ? `<p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">${pieHtml}</p>` : ''}
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">MargenX &bull; Soporte: contacto@margenx.tech</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
// </plantilla-mail-margenx>
