# Production VPS Deployment & Architectural Decoupling (Rad Suite vs Atlas)

This document specifies the production architecture deployed on the central VPS (`178.238.231.54`), detailing how **Rad Suite Core (Clinical)** and **DocEducates Atlas (Educational)** are completely decoupled across codebase, database, build artifacts, and process supervision.

---

## 1. System Overview & Physical Separation

Previously, both domains shared `/www/wwwroot/radiology.sehatai.org` and a Docker container, causing chunk hash mismatches (`HTTP 500 ENOENT` on CSS/JS) and route collisions. Both projects now operate from **independent directories and independent processes**:

| Dimension | Rad Suite Core (Clinical) | DocEducates Atlas (Educational) |
| :--- | :--- | :--- |
| **Domain** | `radiology.sehatai.org` | `atlas.doceducates.com` |
| **Local Path** | `d:\Projects\Rad-Reporting\rad-suite-core` | `d:\Projects\doceducates-atlas` |
| **VPS Path** | `/www/wwwroot/radiology.sehatai.org` | `/www/wwwroot/atlas.doceducates.com` |
| **Internal Port** | `4125` | `4128` |
| **Process Model** | Host Node process (`radiology.sh`) | Systemd service (`doceducates-atlas.service`) |
| **Database** | `radsuite.db` | `atlas.db` |
| **User Roles** | `radiologist`, `consultant`, `resident`, `admin` | `student`, `subscriber`, `admin` |
| **Scope** | Clinical hospital reporting, PACS DIMSE, HMIS | 2D eAnatomy cross-sectional viewer, 3D body atlas, quizzes |
| **Reverse Proxy** | `/www/server/panel/vhost/nginx/node_radiology.conf` | `/www/server/panel/vhost/nginx/atlas.doceducates.com.conf` |

---

## 2. Independent Build & Zero Cross-Talk Guarantee

1. **Independent Build Caches (`.next/`)**:
   - `radiology.sehatai.org` builds into `/www/wwwroot/radiology.sehatai.org/.next/`.
   - `atlas.doceducates.com` builds into `/www/wwwroot/atlas.doceducates.com/.next/`.
   - Rebuilding one will **never** touch, delete, or invalidate the chunk manifests of the other.

2. **Direct Nginx Static Serving**:
   - Each site's Nginx configuration directly serves `/_next/static/` via kernel `sendfile` from its own directory:
     - `alias /www/wwwroot/radiology.sehatai.org/.next/static/;`
     - `alias /www/wwwroot/atlas.doceducates.com/.next/static/;`

3. **High-Resolution Slice Streaming**:
   - Slice images are stored in `/www/wwwroot/radiology.sehatai.org/radatlas/cache/`.
   - Nginx uses internal redirects (`/_atlas_internal/` and `/radatlas/cache/`) to serve slices with zero memory copy, eliminating the need to duplicate 732MB of binary slice assets.

---

## 3. Operations & Maintenance

### Rad Suite Core (Clinical)
```bash
cd /www/wwwroot/radiology.sehatai.org
npm run build
# Restart host node process via aaPanel or kill PID in /www/server/nodejs/vhost/pids/radiology.pid
```

### DocEducates Atlas (Educational)
```bash
cd /www/wwwroot/atlas.doceducates.com
npm run build
systemctl restart doceducates-atlas
```
