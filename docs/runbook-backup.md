# Runbook — Backup Diario, Retención y Recuperación ante Desastres (Disaster Recovery)

**Documento:** Procedimiento de respaldos de base de datos, política de rotación y ensayo de restauración  
**Proyecto:** MargenX (Producción VPS)  
**Issue de referencia:** #239 [SPRINT5-DEVOPS-03]  
**Última actualización:** 28 de Octubre de 2026  
**Responsable:** Darío Giménez (DevOps / Tech Lead)  

---

## 1. Política de Respaldo y Rotación

- **Base de datos objetivo:** `margenx_prod` (PostgreSQL 16 en contenedor `margenx_postgres_prod`).
- **Frecuencia:** Diaria a las **03:00 hs ART** (06:00 UTC), momento de menor concurrencia operativa de los comercios gastronómicos.
- **Formato del dump:** Formato Custom de PostgreSQL (`pg_dump -Fc`), el cual incluye compresión nativa zlib, soporta restauración selectiva de tablas y reordenamiento seguro por dependencias.
- **Ruta unificada:** `/opt/margenx-infra/backups`
  - `/opt/margenx-infra/backups/daily/`: conserva los últimos 7 dumps diarios.
  - `/opt/margenx-infra/backups/weekly/`: conserva los 4 dumps semanales más recientes (emitidos los domingos).
  - `/opt/margenx-infra/backups/logs/`: bitácora de ejecución con rotación natural.
- **Permisos de seguridad:** Carpeta `700` (`drwx------`) y archivos `600` (`-rw-------`), impidiendo el acceso a usuarios sin privilegios `root` en el servidor host.

---

## 2. Configuración en Crontab del Host (VPS)

En la VPS Donweb, el backup se programa en el cron de `root` mediante:

```bash
crontab -e
```

Añadir la siguiente línea:

```cron
# MargenX: Backup diario de base de datos a las 03:00 hs (ART)
0 6 * * * /opt/margenx-infra/scripts/backup-db.sh >> /opt/margenx-infra/backups/logs/cron.log 2>&1
```

---

## 3. Ensayo de Restauración y Benchmark de Tiempos

El ensayo de restauración se ejecuta de forma controlada mediante `infra/scripts/restore-test.sh`, levantando la base temporal efímera `margenx_restore_test` sin interferir con la base de staging (`margenx_dev`) ni de producción (`margenx_prod`).

### Resultados del Ensayo de Integridad

| Métrica / Ensayo | Valor Obtenido | Observaciones |
|---|---|---|
| **Base origen** | `margenx_prod` | Contenedor `margenx_postgres_prod` |
| **Tamaño del dump (-Fc)** | ~180 KB – 2.5 MB | Con compresión zlib activa |
| **Tiempo de restauración (`pg_restore`)** | < 1.2 segundos | Ejecución local sobre disco SSD VPS |
| **Discrepancias de conteo de tuplas** | **0** | Coincidencia en las 8 tablas de dominio |
| **Limpieza de base temporal** | Inmediata | Eliminada vía trap al finalizar el script |

---

## 4. Procedimiento de Recuperación ante Desastres (Disaster Recovery)

Si la base de datos de producción sufre corrupción, borrado accidental o falla catastrófica:

1. **Detener temporalmente el backend de producción para congelar escrituras:**
   ```bash
   cd /opt/margenx-infra
   docker compose stop backend-prod
   ```

2. **Identificar el dump a restaurar:**
   ```bash
   ls -la /opt/margenx-infra/backups/daily/
   # Seleccionar el archivo deseado, ej: margenx_prod_2026-10-28_030000.dump
   ```

3. **Recrear y restaurar la base de producción:**
   ```bash
   # Recrear la base limpia
   docker exec -i margenx_postgres_prod psql -U postgres -c "DROP DATABASE IF EXISTS margenx_prod;"
   docker exec -i margenx_postgres_prod psql -U postgres -c "CREATE DATABASE margenx_prod;"

   # Restaurar desde el dump seleccionado
   docker exec -i margenx_postgres_prod pg_restore -U postgres -d margenx_prod < /opt/margenx-infra/backups/daily/<ARCHIVO_DUMP>.dump
   ```

4. **Reactivar servicios y verificar estado:**
   ```bash
   docker compose start backend-prod
   curl -I https://api.margenx.tech/api/health
   ```

---

## 5. Riesgos Identificados y Deuda Técnica (Sprint 6)

- **Copia Externa Fuera de la VPS (Offsite Backup):** Actualmente los dumps residen en el mismo disco SSD que el sistema operativo y las bases de datos. Si el servidor físico sufriese una destrucción total, los backups locales se perderían.
- **Uso de disco en VPS:** El volumen se encuentra al 77% de ocupación. La política de retención (7 diarios + 4 semanales) acota el espacio a menos de 50 MB adicionales, pero exige monitoreo.
- **Mitigación para Sprint 6:** Automatizar el despacho cifrado de la copia semanal hacia almacenamiento S3 (Cloudflare R2 / AWS S3) a costo $0.