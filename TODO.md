# 📋 TABLA MAESTRA – GAPS KÜPA POS vs MERCADO CHILENO

*(Prioridad 1 = bloqueante legal/comercial; Prioridad 2 = crítico operativo; Prioridad 3 = mejora competitiva)*

| ID | Área | Punto / Requisito | Estado Actual | Acción a Realizar | Prioridad | Esfuerzo* | Responsable sugerido |
|----|------|-------------------|---------------|-------------------|-----------|-----------|----------------------|
| 1 | Legal-Tributario | Emisión inmediata de boleta electrónica (DTE) al SII | ❌ No existe | Integrar LibreDTE o SDK SII; generar XML, firmar con P12, enviar, almacenar. | 1 | 3 s | Backend Dev |
| 2 | Legal-Tributario | Certificado digital P12 | ❌ No existe | Comprar certificado (SII o AC); cargar en servidor; usar en firma. | 1 | 0.5 s | DevOps |
| 3 | Legal-Tributario | Carga y control de archivos CAF (folios) | ❌ No existe | Pantalla para subir CAF; validar rango; descontar folios. | 1 | 1 s | Backend Dev |
| 4 | Legal-Tributario | Generación de TED (QR + firma) en boleta | ❌ No existe | Incluir QR oficial y firma ECDSA en PDF/XML. | 1 | 1 s | Backend Dev |
| 5 | Legal-Tributario | Nota de Crédito / Débito por devoluciones | ❌ No existe | Nuevo endpoint `/credit-notes`; descontar de libro IVA. | 1 | 2 s | Backend Dev |
| 6 | Legal-Tributario | Libro de Ventas mensual (formato SII) | ❌ No existe | Exportar CSV/Excel oficial; incluir IVA. | 1 | 1 s | Backend Dev |
| 7 | Legal-Tributario | Cierre Z (cierre diario de caja) | ❌ No existe | Endpoint `/z-close`; totalizar ventas, medios de pago; número único. | 1 | 1.5 s | Backend Dev |
| 8 | Pago | Integración Webpay Plus REST (transaccional) | ❌ No existe | Flujo init-redirect-confirm; almacenar token; modo certificación → prod. | 1 | 3 s | Backend Dev + QA |
| 9 | Pago | Oneclick (opcional recurrente) | ❌ No existe | Si se desea suscripción/delivery. | 2 | 2 s | Backend Dev |
| 10 | Pago | Flow / Kiphu como alternativa | ❌ No existe | Adaptar `payment-service` con Strategy pattern. | 2 | 2 s | Backend Dev |
| 11 | Pago | Webhook idempotente y firmado | ❌ No existe | Validar MAC Transbank; guardar estado idempotente. | 1 | 0.5 s | Backend Dev |
| 12 | Seguridad | Mover JWT de localStorage a HttpOnly cookie + CSRF | ❌ No existe | Cambiar `auth.ts`, middleware SameSite=Strict. | 1 | 1 s | Frontend + Backend |
| 13 | Seguridad | Rotación de tokens (lista negra Redis) | ❌ No existe | JWT corto (15 min) + refresh token en Redis. | 2 | 1 s | Backend Dev |
| 14 | Seguridad | Encriptación de datos sensibles (costo, email cliente) | ❌ No existe | AES-256-GCM vía Prisma middleware o pg_crypto. | 2 | 1 s | Backend Dev |
| 15 | Seguridad | Backup diario cifrado (RDS + S3) | ❌ No existe | Lambda + AWS Backup; retención 7 años. | 1 | 0.5 s | DevOps |
| 16 | Seguridad | Auditoría de caja (who/when/what) | ❌ No existe | Tabla `cash_audit_log`; triggers en cierre y anulaciones. | 1 | 1 s | Backend Dev |
| 17 | Funcional | Apertura de caja (efectivo inicial) | ❌ No existe | Pantalla modal al iniciar día; guardar monto. | 1 | 0.5 s | Frontend + Backend |
| 18 | Funcional | Arqueo de caja (diferencias) | ❌ No existe | Comparar esperado vs contado; reportar diferencias. | 1 | 0.5 s | Frontend + Backend |
| 19 | Funcional | Devolución / anulación de venta | ❌ No existe | Botón “Anular”; crear Nota Crédito y re-ingresar stock. | 1 | 1.5 s | Frontend + Backend |
| 20 | Funcional | Descuentos por línea o total | ❌ No existe | Campo `discount` en `SaleItem` y `Sale`. | 2 | 1 s | Frontend + Backend |
| 21 | Funcional | Propina electrónica (restaurantes) | ❌ No existe | Campo `tip` en `Sale`; incluir en DTE si aplica. | 2 | 0.5 s | Frontend + Backend |
| 22 | Funcional | Precios por lista (mayorista/minorista) | ❌ No existe | Tabla `price_lists`; selector en venta. | 3 | 2 s | Backend Dev |
| 23 | Funcional | Validar y formatear RUT chileno | ❌ No existe | Helper `formatRut`; validar dígito verificador. | 2 | 0.5 s | Frontend |
| 24 | Funcional | Selector de regiones/comunas oficiales | ❌ No existe | JSON oficial INE; cargar en `Customer` form. | 2 | 0.5 s | Frontend |
| 25 | Funcional | Bloquear venta si stock = 0 (configurable) | ⚠️ Solo alerta | Agregar flag `blockZeroStock` en `Business`. | 2 | 0.5 s | Backend |
| 26 | Testing | Tests unitarios (Jest + RTL) | ❌ 0 % | Cubrir servicios críticos (`sales`, `auth`, `invoice`). | 1 | 2 s | QA |
| 27 | Testing | Tests E2E (Cypress) – flujo venta + pago + DTE | ❌ 0 % | Pipeline CI; mínimo 10 casos. | 1 | 2 s | QA |
| 28 | Testing | Tests de carga (k6) – 500 TPS | ❌ 0 % | Escenario venta + Webpay; latency < 500 ms. | 2 | 1 s | QA |
| 29 | DevOps | Dockerfile + docker-compose.dev | ❌ No existe | Multi-stage build; hot-reload. | 2 | 0.5 s | DevOps |
| 30 | DevOps | CI/CD GitHub Actions (lint → test → build → deploy) | ❌ No existe | Separar jobs; usar OIDC para AWS. | 2 | 1 s | DevOps |
| 31 | DevOps | Infraestructura como código (Terraform) | ❌ No existe | RDS, ECS, S3, CloudFront, Secrets Manager. | 2 | 2 s | DevOps |
| 32 | DevOps | Observabilidad (Prometheus + Grafana + Alertmanager) | ❌ No existe | Métricas custom: ventas/hora, errores DTE, pago. | 3 | 1.5 s | DevOps |
| 33 | Documentación | Manual de usuario (admin/cajero) | ❌ No existe | PDF + videos cortos. | 2 | 1 s | PM |
| 34 | Documentación | Guía de certificación Transbank | ❌ No existe | Checklist oficial + script de pruebas. | 1 | 0.5 s | QA |
| 35 | Documentación | Política de privacidad LGPD | ❌ No existe | Adaptar a ley 19.983 chilena. | 1 | 0.5 s | Legal |
| 36 | Documentación | Contrato de licencia / SLA | ❌ No existe | Definir soporte, uptime, penalidades. | 2 | 1 s | Legal |

---

# 🗓️ PLAN DE DESARROLLO 

**Equipo sugerido**: 1 Backend Sr, 1 Frontend Sr, 1 DevOps, 1 QA, 0.5 PM (≈ 3.5 FTE).

| Semana | Objetivos / Entregables | Dependencias | Riesgos |
|--------|-------------------------|--------------|---------|
| 1 | Setup ambiente certificación SII y Transbank. Integrar LibreDTE básico (XML sin firma). | — | Obtener código de comercio demo puede tardar. |
| 2 | Firma P12 + CAF + generar TED (QR) en PDF. Endpoint `/invoice/preview`. | Sem 1 | Certificado P12 (externo). |
| 3 | Envío real al SII (modo certificación). Control de folios. Tabla `invoice` + `dte_log`. | Sem 2 | Rechazos por formato. |
| 4 | Apertura/cierre de caja + arqueo. Tabla `cash_session`, `cash_audit_log`. | — | — |
| 5 | Nota de Crédito + anulación de venta (re-ingreso stock). | Sem 4 | — |
| 6 | Webpay Plus REST (modo integración) – flujo completo. | — | Cambios de API Transbank. |
| 7 | Webhook idempotente + actualización estado venta. Tests unitarios cobertura > 70 %. | Sem 6 | — |
| 8 | Seguridad: HttpOnly cookie + CSRF + rotación tokens. Pen-test interno. | — | Breaking change en frontend. |
| 9 | Backup diario cifrado (RDS + S3) + política retención. Docker + CI básico. | — | — |
| 10 | Tests E2E (Cypress) – flujo crítico. Documentación guía certificación. | Sem 7 | — |
| 11 | Certificación Transbank (ambiente producción) – 5 días hábiles. | Sem 10 | Puede requerir 2 iteraciones. |
| 12 | Certificación SII – envío 1 000 DTE de prueba. | Sem 5 | Rechazos por formato (iterar). |
| 13 | Manual usuario + capacitación cliente piloto. Contrato y política privacidad. | — | — |
| 14 | Go-live cliente piloto (1 tienda) con rollback automático. Post-mortem y plan de escalado. | Todas | Incidentes de caja o pago. |
