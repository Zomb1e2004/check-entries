require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { getPersonalData, invalidateCache } = require("./cache");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const config = {
  server: process.env.DB_SERVER,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const tipoMovMap = {
  1000: { tipo: "Ingreso", desc: "Primer Ingreso" },
  1001: { tipo: "Salida", desc: "Primera Salida" },
  1002: { tipo: "Ingreso", desc: "Segundo Ingreso" },
  1003: { tipo: "Salida", desc: "Segunda Salida" },
  1004: { tipo: "Salida", desc: "Comisión Salida" },
  1005: { tipo: "Ingreso", desc: "Comisión Retorno" },
  1006: { tipo: "Salida", desc: "Permiso Salida" },
  1007: { tipo: "Ingreso", desc: "Permiso Retorno" },
  1008: { tipo: "Salida", desc: "Servicio Salida" },
  1009: { tipo: "Ingreso", desc: "Servicio Retorno" },
  1019: { tipo: "Salida", desc: "Salida Vehicular" },
  1020: { tipo: "Ingreso", desc: "Retorno Vehicular" },
  1021: { tipo: "Ingreso", desc: "Ingreso Operativo" },
  1022: { tipo: "Salida", desc: "Salida Operativo" },
  1023: { tipo: "Ingreso", desc: "Ingreso Visitante" },
  1024: { tipo: "Salida", desc: "Salida Visitante" },
  1025: { tipo: "Ingreso", desc: "Ingreso Especial" },
  1026: { tipo: "Salida", desc: "Salida Especial" },
};

function mapPersona(p) {
  const mov = tipoMovMap[p.TIPO_MOV] || { tipo: "Desconocido", desc: "" };
  return {
    CODI_PERS: p.CODI_PERS,
    APELLIDOS_Y_NOMBRES: p.APELLIDOS_Y_NOMBRES,
    CARGO: p.CARGO,
    FECHA: p.FECHA,
    HORA: p.HORA,
    TIPO_MOV: mov.tipo,
    TIPO_MOV_DESC: mov.desc,
    FECHA_LARGA: p.FECHA_LARGA,
    DNI: String(p.DNI),
  };
}

app.get("/api/personal", async (req, res) => {
  try {
    const { cargo, tipo_mov_desc, dni, apellidos_y_nombres } = req.query;

    let personas = await getPersonalData(config);

    if (cargo)
      personas = personas.filter(
        (p) => String(p.CARGO).toUpperCase() === cargo.toUpperCase(),
      );
    if (tipo_mov_desc)
      personas = personas.filter(
        (p) =>
          String(p.TIPO_MOV_DESC).toUpperCase() === tipo_mov_desc.toUpperCase(),
      );
    if (dni) personas = personas.filter((p) => String(p.DNI) === String(dni));
    if (apellidos_y_nombres)
      personas = personas.filter((p) =>
        String(p.APELLIDOS_Y_NOMBRES)
          .toUpperCase()
          .includes(apellidos_y_nombres.toUpperCase()),
      );

    console.log("✓ API llamada: /api/personal");
    res.json({ success: true, personal: personas.map(mapPersona) });
  } catch (err) {
    console.log(`✖ Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/cargos", async (req, res) => {
  try {
    const personas = await getPersonalData(config);
    const cargos = [...new Set(personas.map((p) => p.CARGO))].sort();
    console.log("✓ API llamada: /api/cargos");
    res.json({ success: true, cargos });
  } catch (err) {
    console.log(`✖ Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/personal-dni", async (req, res) => {
  try {
    const { dni } = req.body;
    if (!Array.isArray(dni) || dni.length === 0)
      return res.status(400).json({
        success: false,
        message: "Se requiere un array de DNIs en el body",
      });

    const personas = await getPersonalData(config);
    const dniSet = new Set([...dni.map(String), "41882033"]);
    const filtradas = personas.filter((p) => dniSet.has(String(p.DNI)));

    if (filtradas.length === 0)
      return res.status(404).json({
        success: false,
        message: "No se encontró personal con los DNIs proporcionados",
      });

    console.log("✓ API llamada: /api/personal-dni");
    res.json({ success: true, personal: filtradas.map(mapPersona) });
  } catch (err) {
    console.log(`✖ Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/refresh-cache", async (req, res) => {
  try {
    invalidateCache();
    await getPersonalData(config, { forceRefresh: true });
    console.log("✓ API llamada: /api/refresh-cache");
    res.json({ success: true, message: "Cache actualizado" });
  } catch (err) {
    console.log(`✖ Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  if (process.env.NODE_ENV === "production") {
    console.log("✓ Servidor en marcha ");
  } else {
    console.log(`✓ Servidor corriendo en http://localhost:${PORT}`);
  }
});
