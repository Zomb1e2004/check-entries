const sql = require("mssql");

const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS) || 8500;

let cachedData = null;
let lastFetch = 0;
let inFlightPromise = null;

async function fetchFromSP(config) {
  const pool = await sql.connect(config);
  const result = await pool
    .request()
    .input("movimiento_ubicacion_sistema", sql.Int, 1000)
    .execute("SOLMAR.dbo.USP_OCLOCK_LISTAR_PERSONAL_DENTRO_DEL_EDIFICIO_S");
  return result.recordset;
}

async function getPersonalData(config, { forceRefresh = false } = {}) {
  const now = Date.now();
  const isStale = now - lastFetch > CACHE_TTL_MS;

  if (!forceRefresh && cachedData && !isStale) {
    return cachedData;
  }

  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = fetchFromSP(config)
    .then((data) => {
      cachedData = data;
      lastFetch = Date.now();
      return data;
    })
    .finally(() => {
      inFlightPromise = null;
    });

  return inFlightPromise;
}

function invalidateCache() {
  cachedData = null;
  lastFetch = 0;
}

module.exports = { getPersonalData, invalidateCache };