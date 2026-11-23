/* Ficha de producto de King Quepoa: MISMO texto e imagen en la PC y en el celular.
   Archivo compartido. Se copia igual a public/ficha.js y app-celular/web/ficha.js. */
(function(){
  const FUENTE = "'Segoe UI', Roboto, Arial, sans-serif";
  const EMOJI = [
    [/c[íi]tric|lim[óo]n|mandarin|naranj|bergamot|toronj|pomelo/i, "🍋"],
    [/frut/i, "🍓"],
    [/floral|flor|rosa|jazm|peon/i, "🌸"],
    [/gourmand|dulce|vainilla|caramelo|miel|chocolat/i, "🍯"],
    [/[áa]mbar|oriental|tonka|inciens/i, "🔥"],
    [/especiad|pimienta|canela|cardamom|jengibre|nuez|flame/i, "🌶️"],
    [/amaderad|madera|oud|s[áa]ndalo|cedro|vetiver|pachul/i, "🪵"],
    [/acu[áa]tic|aquatic|fresc|marin|oz[óo]nic/i, "💧"],
    [/foug|arom[áa]tic|verde|hierba|lavanda|romero|salvia/i, "🌿"],
    [/cuero|leather|tabaco/i, "🧥"],
  ];
  const money = n => "₡" + Math.round(Number(n) || 0).toLocaleString("de-DE");
  const redondearMil = n => Math.round((Number(n) || 0) / 1000) * 1000;
  const norm = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const emoji = fam => { const f = String(fam || ""); for (const [re, e] of EMOJI) if (re.test(f)) return e; return "🔥"; };
  const nombreSinTamano = nombre => String(nombre || "").replace(/\s*\b\d+\s*ml\b/gi, " ").replace(/\s{2,}/g, " ").trim();
  const generoTxt = cat => cat === "Hombre" ? "Fragancia de hombre" : cat === "Mujer" ? "Fragancia de mujer" : cat === "Unisex" ? "Perfume unisex" : "";

  // Precios: contado y a 2 pagos (usa los del servidor si vienen; si no, los calcula)
  function precios(p, recargo){
    const contado = Math.round(Number(p.precio_venta_crc ?? p.precio_crc) || 0);
    const pagos = Number(p.precio_pagos_crc) || redondearMil(contado * (1 + (Number(recargo) || 0) / 100));
    return { contado, pagos };
  }

  function texto(p, opciones){
    const o = opciones || {};
    const { contado, pagos } = precios(p, o.recargo);
    const em = emoji(p.familia);
    const nombre = nombreSinTamano(p.nombre);
    const simplificar = s => norm(s).replace(/\b(?:y|and|e|the)\b/g, "").replace(/[^a-z0-9]+/g, "");
    const marca = (p.marca && !simplificar(nombre).includes(simplificar(p.marca))) ? ` DE ${String(p.marca).toUpperCase()}` : "";
    const med = p.ml ? ` (${p.ml} ML)` : "";
    const gen = generoTxt(p.categoria);
    const genEmoji = p.categoria === "Hombre" ? "👨 " : p.categoria === "Mujer" ? "👩 " : p.categoria === "Unisex" ? "⚥ " : "";
    const l = [];
    l.push(`${em} ${nombre}${marca}${med} ${em}`);
    if (gen) l.push(genEmoji + gen);
    l.push("");
    if (p.descripcion) l.push(String(p.descripcion).trim());
    l.push("");
    l.push(`📦 Presentación: ${p.ml || "?"} ML`);
    if (contado) l.push(`💸 Precio: ${money(contado)}`);
    if (pagos) l.push(`💳 A 2 pagos: ${money(pagos)}`);
    if (o.envios) l.push(`🚚 Envíos: ${o.envios}`);
    l.push("");
    l.push("💬 Escribinos si querés asesoría para elegir tu perfume.");
    return l.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  function envolver(ctx, t, ancho){
    const palabras = String(t || "").split(/\s+/).filter(Boolean);
    const lineas = []; let actual = "";
    for (const w of palabras){
      const prueba = actual ? actual + " " + w : w;
      if (ctx.measureText(prueba).width <= ancho || !actual) actual = prueba;
      else { lineas.push(actual); actual = w; }
    }
    if (actual) lineas.push(actual);
    return lineas;
  }
  function rrect(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // Imagen: foto arriba (si hay), nombre, género, tamaño, precio y "A pagos", descripción.
  // opciones.bmp = ImageBitmap de la foto o null (sin foto: la ficha empieza arriba).
  async function imagen(p, opciones){
    const o = opciones || {};
    const bmp = o.bmp || null;
    const { contado, pagos } = precios(p, o.recargo);
    const W = 1080, M = 60, maxLado = 980;
    const esc = bmp ? Math.min(maxLado / bmp.width, maxLado / bmp.height, 1) : 1;
    const iw = bmp ? Math.round(bmp.width * esc) : 0, ih = bmp ? Math.round(bmp.height * esc) : 0;
    const anchoTexto = W - M * 2;
    const nombre = p.nombre || "";
    const precio = money(contado);
    const pagosTxt = money(pagos);
    const desc = String(p.descripcion || "").trim();
    const genImg = generoTxt(p.categoria);
    const mlTxt = p.ml ? `${p.ml} ML` : "";

    const cm = document.createElement("canvas"); cm.width = W; cm.height = 10;
    const mc = cm.getContext("2d");
    mc.font = "bold 50px " + FUENTE;
    const lNombre = envolver(mc, nombre, anchoTexto);
    mc.font = "bold 46px " + FUENTE;
    const wMl = mlTxt ? Math.ceil(mc.measureText(mlTxt).width) + 64 : 0;
    mc.font = "30px " + FUENTE;
    const lDesc = [];
    if (desc){
      for (const parrafo of desc.split("\n")){
        const t = parrafo.trim();
        if (!t){ lDesc.push(""); continue; }
        lDesc.push(...envolver(mc, t, anchoTexto));
      }
    }

    const hFoto = bmp ? ih + 34 : 0;
    const hNombre = lNombre.length * 60;
    const hGen = genImg ? 48 : 0;
    const hMl = mlTxt ? 88 : 0;
    const hPrecio = 92, hPagos = 52;
    const DESC_LH = 42, DESC_GAP = 16;
    const hDesc = lDesc.length ? 30 + lDesc.reduce((s, ln) => s + (ln ? DESC_LH : DESC_GAP), 0) : 0;
    const H = M + hFoto + hNombre + hGen + hMl + 24 + hPrecio + hPagos + hDesc + M;

    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
    if (bmp) ctx.drawImage(bmp, (W - iw) / 2, M, iw, ih);

    let y = M + hFoto;
    ctx.textBaseline = "top";
    ctx.fillStyle = "#171a21"; ctx.font = "bold 50px " + FUENTE;
    for (const ln of lNombre){ ctx.fillText(ln, M, y); y += 60; }
    if (genImg){
      ctx.fillStyle = "#8a6b1e"; ctx.font = "bold 36px " + FUENTE;
      ctx.fillText(genImg, M, y); y += 48;
    }
    if (mlTxt){
      const bh = 74, by = y + 2;
      ctx.fillStyle = "#c9a24b";
      rrect(ctx, M, by, wMl, bh, 20); ctx.fill();
      ctx.fillStyle = "#171a21"; ctx.font = "bold 46px " + FUENTE;
      ctx.fillText(mlTxt, M + 32, by + 13);
      y = by + bh + 12;
    }
    y += 24;
    ctx.fillStyle = "#c9a24b"; ctx.font = "bold 72px " + FUENTE;
    ctx.fillText(precio, M, y); y += 92;
    ctx.fillStyle = "#1f7a48"; ctx.font = "bold 34px " + FUENTE;
    ctx.fillText("A pagos: " + pagosTxt, M, y); y += 52;
    if (lDesc.length){
      y += 30; ctx.fillStyle = "#333a45"; ctx.font = "30px " + FUENTE;
      for (const ln of lDesc){
        if (!ln){ y += DESC_GAP; continue; }
        ctx.fillText(ln, M, y); y += DESC_LH;
      }
    }
    return await new Promise(res => cv.toBlob(res, "image/png"));
  }

  window.FichaKQ = { texto, imagen, precios, money, emoji };
})();
