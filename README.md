# 💸 SplitGroup

> Gastos compartidos, sin drama.

Registra gastos grupales con tu pareja o roommates y sabe exactamente **quién le debe cuánto a quién**.

---

## Stack

- **Frontend**: React + Vite (mobile-first)
- **Backend**: Google Apps Script (API REST-like)
- **Base de datos**: Google Sheets

---

## Configuración inicial

### 1. Preparar Google Sheets

1. Ve a [sheets.google.com](https://sheets.google.com) y crea un nuevo Spreadsheet
2. Copia el **ID** del Spreadsheet de la URL:
   ```
   https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit
   ```

### 2. Configurar Google Apps Script

1. Ve a [script.google.com](https://script.google.com) → **Nuevo proyecto**
2. Borra el contenido del editor y pega el contenido de `backend/Code.gs`
3. Reemplaza `TU_SPREADSHEET_ID_AQUI` con el ID de tu Sheets
4. Reemplaza `https://tu-app.vercel.app` con la URL de tu frontend (o `http://localhost:5173` para desarrollo)
5. **Desplegar como Web App**:
   - Menú: `Implementar` → `Nueva implementación`
   - Tipo: `Aplicación web`
   - Ejecutar como: `Yo (tucuenta@gmail.com)`
   - Quién tiene acceso: **Cualquier persona**
   - Clic en `Implementar`
   - Copia la **URL del Web App**

### 3. Configurar el Frontend

```bash
# Clonar / entrar al proyecto
cd finanzas-grupal

# Instalar dependencias
npm install

# Crear archivo de variables de entorno
cp .env.example .env
```

Edita `.env` y pega la URL de tu Web App:
```
VITE_GAS_URL=https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec
```

### 4. Iniciar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173)

---

## Flujos principales

### Autenticación
1. Ingresa tu email en la pantalla de login
2. Recibes un **magic link** por Gmail
3. Haz clic → quedas autenticado (token en `localStorage`)

### Crear grupo
1. En el Dashboard → botón `+` (FAB) o `Crear grupo`
2. Escribe el nombre e invita miembros por email
3. Cada miembro recibe un link de invitación

### Registrar gasto
1. Entra al grupo → botón `+ Gasto`
2. Ingresa monto, quién pagó, descripción y participantes
3. Elige modo **S/.** (montos exactos) o **%** (porcentajes)
4. Usa "Dividir equitativamente" para calcular automáticamente

### Ver balances y liquidar
1. En la vista del grupo → tab **Deudas**
2. Verás exactamente quién le debe cuánto a quién
3. Clic en **✓ Pagar** para marcar una deuda como saldada

---

## Estructura del proyecto

```
finanzas-grupal/
├── backend/
│   └── Code.gs              # Google Apps Script (copiar a GAS)
├── src/
│   ├── components/
│   │   └── ui/              # Modal, Toast, Avatar, Skeleton
│   ├── context/
│   │   └── AuthContext.jsx  # Auth con magic link + localStorage
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── GroupPage.jsx
│   │   └── AddExpensePage.jsx
│   ├── services/
│   │   └── api.js           # Llamadas al GAS
│   ├── utils/
│   │   └── balanceCalculator.js  # Lógica de deudas
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css            # Design system completo
├── .env.example
└── index.html
```

---

## Modelo de datos (Google Sheets)

| Hoja | Columnas |
|------|---------|
| Users | email, name, created_at |
| AuthTokens | token, user_email, created_at, used, type, group_id |
| Groups | group_id, name, created_by, created_at |
| GroupMembers | group_id, user_email, joined_at |
| Expenses | expense_id, group_id, amount, paid_by, date, description, created_at |
| ExpenseParticipants | expense_id, user_email, share_amount |
| Settlements | settlement_id, group_id, from_user, to_user, amount, settled_at |

> Las hojas se crean automáticamente al primer uso del endpoint correspondiente.

---

## Deploy (Vercel)

```bash
npm run build
# Sube la carpeta dist/ a Vercel, o conecta el repo con Vercel
```

Configura la variable de entorno `VITE_GAS_URL` en el dashboard de Vercel.

---

## Roadmap

- **Fase 1 (MVP actual)**: Auth magic link, grupos, gastos, balances, liquidaciones
- **Fase 2**: Simplificación de deudas, resumen financiero, aportes por miembro
- **Fase 3**: Migración a Supabase, app móvil
