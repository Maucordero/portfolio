/* Renderer de factura/proforma/aviso para la app del celular.
   Copia del facturaPagoUnico de la PC, adaptado para usar datos.config y ./logo.png.
   Requiere: money(), envolverTexto() y un canvas del navegador. */
const fmtFecha = s => {
  const v = String(s || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "—";
  const [y, m, d] = v.split("-");
  return d + "/" + m + "/" + y;
};
function cargarImagenURL(url){
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });
}
function telefonoNegocio(){
  const cfg = (window.datos && datos.config) || {};
  for (const raw of [cfg.wa_numero, cfg.catalogo_wa, cfg.whatsapp]){
    const m = String(raw || "").match(/(\d{8,15})/);
    if (!m) continue;
    let d = m[1];
    if (d.startsWith("506") && d.length === 11) d = d.slice(3);
    if (d.length === 8) return d.slice(0,4) + "-" + d.slice(4);
    return d;
  }
  return "6443-1076";
}

async function facturaPagoUnicoCel(datos, opts = {}){
  const proforma = opts.proforma !== false;
  const pagada = !!opts.pagada;
  const cliente = String((datos && datos.cliente) || "").trim();
  const tel = String((datos && datos.tel) || "").trim();
  const items = Array.isArray(datos && datos.items) ? datos.items : [];
  const fecha = String((datos && datos.fecha) || hoyISO()).slice(0, 10);
  const vencimiento = String(opts.vencimiento || fecha).slice(0, 10);
  const envio = Math.max(0, Math.round(Number(opts.envio) || 0));
  const saldoOpt = (datos && datos.saldo != null) ? datos.saldo : opts.saldo;
  const saldo = Math.max(0, Math.round(Number(saldoOpt) || 0));
  const terminos = String(opts.terminos || "Contado");
  const cuotas = Array.isArray(opts.cuotas) ? opts.cuotas.filter(c => Math.round(Number(c && c.monto) || 0) > 0) : null;
  const titulo = String(opts.titulo || (proforma ? "PROFORMA" : "FACTURA"));
  const etiquetaCabecera = String(opts.etiquetaCabecera || (proforma ? "TOTAL A PAGAR" : (pagada ? "TOTAL PAGADO" : "SALDO ADEUDADO")));
  const a = opts.config || (window.datos && datos.config) || (window.D && D.ajustes) || {};
  const pago = String(a.datos_pago || "").trim();
  const W = 1080, M = 80, RIGHT = W - M;
  const FUENTE = "'Segoe UI', Arial, sans-serif";
  const TEXTO = "#171a21", GRIS = "#8a8f99", GRIS2 = "#5b5f66", DORADO = "#c9a24b", DORADO_OSC = "#8a6b1e";

  const cv = document.createElement("canvas"); cv.width = W; cv.height = 6000;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, cv.height);
  ctx.textBaseline = "top";
  let y = 50;

  // --- Encabezado: logo + datos del negocio + título ---
  let logo = null;
  try { logo = await cargarImagenURL(opts.logo || "./logo.png"); } catch(e){}
  const ladoLogo = 132;
  if (logo){
    const esc = Math.min(ladoLogo / logo.width, ladoLogo / logo.height);
    const lw = logo.width * esc, lh = logo.height * esc;
    ctx.drawImage(logo, M + (ladoLogo - lw) / 2, y + (ladoLogo - lh) / 2, lw, lh);
  }
  const xNeg = M + ladoLogo + 26;
  const telNeg = telefonoNegocio();
  ctx.textAlign = "left";
  ctx.fillStyle = TEXTO; ctx.font = "bold 28px " + FUENTE;
  ctx.fillText("King Quepoa", xNeg, y + 4);
  ctx.fillStyle = GRIS2; ctx.font = "20px " + FUENTE;
  let yn = y + 44;
  for (const ln of ["Perfumería · Quepos, Costa Rica", telNeg ? "WhatsApp " + telNeg : ""].filter(Boolean)){
    ctx.fillText(ln, xNeg, yn); yn += 26;
  }

  ctx.textAlign = "right";
  ctx.fillStyle = TEXTO; ctx.font = "bold " + (titulo.length > 14 ? 32 : 46) + "px " + FUENTE;
  ctx.fillText(titulo, RIGHT, y);
  const ref = opts.numero || (() => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2,"0"), mm = String(d.getMinutes()).padStart(2,"0"), ss = String(d.getSeconds()).padStart(2,"0");
    return "PRO-" + fecha.replace(/-/g, "") + "-" + hh + mm + ss + "-" + String(Date.now()).slice(-4);
  })();
  ctx.fillStyle = GRIS; ctx.font = "19px " + FUENTE;
  ctx.fillText("# " + ref, RIGHT, y + 54);
  ctx.fillStyle = GRIS; ctx.font = "18px " + FUENTE;
  ctx.fillText(etiquetaCabecera, RIGHT, y + 88);

  // Total de la factura: suma de los ítems (o el total que venga del formulario).
  let subtotal = 0;
  const lista = items.length ? items : [{ nombre: "Perfume", cantidad: 1, precio_unitario_crc: 0 }];
  for (const it of lista){
    const cant = Math.max(1, Math.round(Number(it.cantidad) || 1));
    subtotal += Math.round(Number(it.precio_unitario_crc) || 0) * cant;
  }
  const totalFinal = Number(datos && datos.total) > 0 ? Math.round(Number(datos.total)) : subtotal + envio;
  const montoCabecera = opts.montoCabecera != null
    ? Math.round(Number(opts.montoCabecera))
    : (proforma ? totalFinal : (pagada ? totalFinal : saldo));
  ctx.fillStyle = TEXTO; ctx.font = "bold 38px " + FUENTE;
  ctx.fillText(money(montoCabecera), RIGHT, y + 110);

  y += Math.max(ladoLogo, 158) + 18;
  ctx.strokeStyle = "#e6d6a8"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(M, y); ctx.lineTo(RIGHT, y); ctx.stroke();
  y += 26;

  // --- Cliente y fechas ---
  ctx.textAlign = "left";
  ctx.fillStyle = GRIS; ctx.font = "18px " + FUENTE;
  ctx.fillText("Facturar a", M, y);
  ctx.fillStyle = TEXTO; ctx.font = "bold 28px " + FUENTE;
  const lineasCliente = envolverTexto(ctx, cliente || "Cliente", 500);
  let yc = y + 24;
  for (const ln of lineasCliente){ ctx.fillText(ln, M, yc); yc += 32; }
  if (tel){
    ctx.fillStyle = GRIS2; ctx.font = "20px " + FUENTE;
    ctx.fillText(tel, M, yc + 2); yc += 28;
  }

  ctx.textAlign = "right";
  const filasFecha = [
    ["Fecha:", fmtFecha(fecha)],
    ["Términos:", terminos],
  ];
  if (pagada) filasFecha.push(["Estado:", "Pagado"]);
  else filasFecha.push(["Vencimiento:", fmtFecha(vencimiento)]);
  let yf = y + 4;
  for (const [lab, val] of filasFecha){
    ctx.fillStyle = GRIS; ctx.font = "19px " + FUENTE;
    const wVal = ctx.measureText(val).width;
    ctx.fillText(lab, RIGHT - wVal - 12, yf);
    ctx.fillStyle = TEXTO; ctx.font = "19px " + FUENTE;
    ctx.fillText(val, RIGHT, yf);
    yf += 28;
  }
  y = Math.max(yc, yf) + 22;

  // --- Tabla de perfumes: precio al contado, precio a pagos y Total ---
  const esPlan = !!(cuotas && cuotas.length);
  const factorPagos = esPlan && subtotal > 0 ? totalFinal / subtotal : 1;
  const lineasPrecios = lista.map(it => {
    const cant = Math.max(1, Math.round(Number(it.cantidad) || 1));
    const precioContado = Math.round(Number(it.precio_unitario_crc) || 0);
    return { it, cant, precioContado, precioPagos: precioContado, totalPagos: precioContado * cant };
  });
  if (esPlan){
    let acum = 0;
    lineasPrecios.forEach((l, i) => {
      if (i < lineasPrecios.length - 1){
        const totalPagos = Math.round((l.precioContado * l.cant) * factorPagos);
        const precioPagos = l.cant > 0 ? Math.round(totalPagos / l.cant) : totalPagos;
        l.precioPagos = precioPagos;
        l.totalPagos = precioPagos * l.cant;
        acum += l.totalPagos;
      } else {
        l.totalPagos = totalFinal - acum;
        l.precioPagos = l.cant > 0 ? Math.round(l.totalPagos / l.cant) : l.totalPagos;
      }
    });
  }

  const colNum = M + 16, colArt = M + 64;
  const colCant = esPlan ? M + 470 : M + 560;
  const colContado = esPlan ? M + 630 : M + 780;
  const colPagos = M + 800;
  const colTotal = RIGHT - 18;
  const maxArt = colCant - colArt - 24;
  const headerH = 60;
  ctx.fillStyle = "#2f3338"; ctx.fillRect(M, y, RIGHT - M, headerH);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left"; ctx.font = "bold 17px " + FUENTE;
  ctx.fillText("#", colNum, y + 22);
  ctx.fillText("Artículo & Descripción", colArt, y + 22);
  ctx.textAlign = "right";
  ctx.fillText("Cant.", colCant, y + 22);
  ctx.font = "bold 15px " + FUENTE;
  ctx.fillText("Precio unitario", colContado, y + 10);
  ctx.fillText("al contado", colContado, y + 30);
  if (esPlan){
    ctx.fillText("Precio unitario", colPagos, y + 10);
    ctx.fillText("a pagos", colPagos, y + 30);
  }
  ctx.font = "bold 17px " + FUENTE;
  ctx.fillText("Total", colTotal, y + 22);
  y += headerH;

  lineasPrecios.forEach((l, i) => {
    const it = l.it, cant = l.cant, precioContado = l.precioContado;
    ctx.font = "20px " + FUENTE;
    const lineas = envolverTexto(ctx, String(it.nombre || "Perfume"), maxArt);
    const rowH = Math.max(56, lineas.length * 26 + 22);
    if (i % 2 === 1){ ctx.fillStyle = "#fafafa"; ctx.fillRect(M, y, RIGHT - M, rowH); }
    ctx.textAlign = "left"; ctx.fillStyle = GRIS2; ctx.font = "18px " + FUENTE;
    ctx.fillText(String(i + 1), colNum, y + (rowH - 18) / 2);
    ctx.fillStyle = TEXTO; ctx.font = "20px " + FUENTE;
    let yi = y + (rowH - lineas.length * 26) / 2 + 2;
    for (const ln of lineas){ ctx.fillText(ln, colArt, yi); yi += 26; }
    ctx.textAlign = "right";
    ctx.fillStyle = TEXTO; ctx.font = "19px " + FUENTE;
    ctx.fillText(String(cant), colCant, y + (rowH - 19) / 2);
    ctx.font = (esPlan ? "19px " : "bold 19px ") + FUENTE;
    ctx.fillText(money(precioContado), colContado, y + (rowH - 19) / 2);
    if (esPlan){
      ctx.font = "bold 19px " + FUENTE;
      ctx.fillText(money(l.precioPagos), colPagos, y + (rowH - 19) / 2);
    }
    ctx.fillStyle = TEXTO; ctx.font = "19px " + FUENTE;
    ctx.fillText(money(l.totalPagos), colTotal, y + (rowH - 19) / 2);
    ctx.strokeStyle = "#e5e5e5"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(M, y + rowH); ctx.lineTo(RIGHT, y + rowH); ctx.stroke();
    y += rowH;
  });

  // Abajo va la tabla de pagos o el recuadro de contado.
  y += 20;

  if (cuotas && cuotas.length){
    // --- Tabla de pagos (proforma/factura con plan) ---
    const filasPago = cuotas.map((c, i) => ({
      etiqueta: String(c.etiqueta || ("Pago " + (i + 1))),
      vencimiento: String(c.vencimiento || "").slice(0, 10),
      monto: Math.max(0, Math.round(Number(c.monto) || 0)),
      pagada: !!c.pagada || !!pagada,
      estado: String(c.estado || ""),
      tipo: String(c.tipo || "pago"),
    })).filter(c => c.monto > 0);
    const nextIdx = filasPago.findIndex(c => !c.pagada);
    const headerH2 = 44, rowH2 = 46;
    ctx.fillStyle = "#2f3338"; ctx.fillRect(M, y, RIGHT - M, headerH2);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 17px " + FUENTE;
    ctx.textAlign = "left"; ctx.fillText("#", M + 16, y + 13);
    ctx.fillText("Concepto", M + 64, y + 13);
    ctx.fillText("Fecha", M + 330, y + 13);
    ctx.textAlign = "right"; ctx.fillText("Monto", RIGHT - 18, y + 13);
    y += headerH2;
    filasPago.forEach((c, i) => {
      const esProx = i === nextIdx && !c.pagada;
      if (esProx){
        ctx.fillStyle = "#e8f5ee"; ctx.fillRect(M, y, RIGHT - M, rowH2);
      }
      const col = c.pagada ? GRIS : TEXTO;
      ctx.textAlign = "left"; ctx.fillStyle = c.pagada ? GRIS : GRIS2; ctx.font = "19px " + FUENTE;
      ctx.fillText(String(i + 1), M + 16, y + 13);
      ctx.fillStyle = col; ctx.font = (esProx ? "bold " : "") + "20px " + FUENTE;
      ctx.fillText(c.etiqueta, M + 64, y + 13);
      ctx.fillStyle = c.pagada ? GRIS : GRIS2; ctx.font = "19px " + FUENTE;
      ctx.fillText(fmtFecha(c.vencimiento), M + 330, y + 13);
      ctx.textAlign = "right"; ctx.fillStyle = col; ctx.font = (esProx ? "bold " : "") + "21px " + FUENTE;
      ctx.fillText(money(c.monto), RIGHT - 18, y + 13);
      if (c.pagada){
        ctx.strokeStyle = "#c9a24b"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(M + 16, y + rowH2 / 2); ctx.lineTo(RIGHT - 18, y + rowH2 / 2); ctx.stroke();
      }
      ctx.strokeStyle = "#e5e5e5"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(M, y + rowH2); ctx.lineTo(RIGHT, y + rowH2); ctx.stroke();
      y += rowH2;
    });

    // Fila del total del plan (suma del abono + pagos)
    y += 10;
    ctx.strokeStyle = "#e6d6a8"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(M + 64, y); ctx.lineTo(RIGHT - 18, y); ctx.stroke();
    y += 12;
    ctx.textAlign = "left"; ctx.fillStyle = TEXTO; ctx.font = "bold 20px " + FUENTE;
    ctx.fillText("TOTAL", M + 64, y);
    ctx.textAlign = "right"; ctx.fillStyle = TEXTO; ctx.font = "bold 22px " + FUENTE;
    ctx.fillText(money(totalFinal), RIGHT - 18, y);
    y += 38;
  } else {
    // --- Caja de pago único ---
    const boxH = 104;
    ctx.fillStyle = "#fbf4df"; ctx.fillRect(M, y, RIGHT - M, boxH);
    ctx.strokeStyle = "#ecd9a8"; ctx.lineWidth = 3; ctx.strokeRect(M, y, RIGHT - M, boxH);
    ctx.textAlign = "left";
    ctx.fillStyle = DORADO_OSC; ctx.font = "bold 22px " + FUENTE;
    ctx.fillText(proforma ? "PAGO ÚNICO · CONTADO" : (pagada ? "PAGADO" : "SALDO ADEUDADO"), M + 28, y + 24);
    ctx.fillStyle = GRIS2; ctx.font = "20px " + FUENTE;
    ctx.fillText(proforma ? "Un solo pago, sin cuotas." : (pagada ? "Gracias por tu compra." : "Pendiente de pago."), M + 28, y + 58);
    ctx.textAlign = "right";
    ctx.fillStyle = GRIS; ctx.font = "18px " + FUENTE;
    ctx.fillText(proforma ? "TOTAL A PAGAR" : "SALDO", RIGHT - 28, y + 24);
    ctx.fillStyle = proforma ? TEXTO : (pagada ? "#1f7a48" : "#c0392b");
    ctx.font = "bold 34px " + FUENTE;
    ctx.fillText(money(proforma ? totalFinal : (pagada ? 0 : saldo)), RIGHT - 28, y + 48);
    y += boxH + 22;
  }

  // --- Datos para pagar (en la factura pagada no hace falta) ---
  if (pago && (proforma || !pagada)){
    ctx.textAlign = "center";
    ctx.fillStyle = DORADO; ctx.font = "bold 21px " + FUENTE;
    ctx.fillText("Datos para pagar (SINPE):", W / 2, y); y += 28;
    ctx.fillStyle = GRIS2; ctx.font = "20px " + FUENTE;
    for (const ln of pago.split("\n")){ ctx.fillText(ln, W / 2, y); y += 26; }
    y += 8;
  }

  // --- Pie ---
  ctx.textAlign = "center"; ctx.fillStyle = DORADO_OSC; ctx.font = "22px " + FUENTE;
  for (const ln of envolverTexto(ctx, "¡Gracias por tu preferencia en King Quepoa, tu esencia, tu estilo, tu reino!", RIGHT - M)){
    ctx.fillText(ln, W / 2, y); y += 30;
  }

  const H = Math.ceil(y) + 40;
  const final = document.createElement("canvas"); final.width = W; final.height = H;
  final.getContext("2d").drawImage(cv, 0, 0, W, H, 0, 0, W, H);
  return await new Promise(r => final.toBlob(r, "image/png"));
}
