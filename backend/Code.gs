// ═══════════════════════════════════════════════════════════════
// SplitGroup — Google Apps Script Backend
// ═══════════════════════════════════════════════════════════════
//
// SETUP:
// 1. Crea un nuevo proyecto en script.google.com
// 2. Conecta un Google Spreadsheet (Herramientas > Servicios)
// 3. Pega este código completo
// 4. Configura SPREADSHEET_ID con el ID de tu Sheets
// 5. Despliega como Web App:
//    - Ejecutar como: Yo (tu cuenta)
//    - Quién tiene acceso: Cualquier persona
// 6. Copia la URL del Web App y ponla en tu .env como VITE_GAS_URL
//
// ═══════════════════════════════════════════════════════════════

const SPREADSHEET_ID = '1L9PGw1YYc4p9KOj4j0aDxkfm9S9eBVWkNVXlMoWZShE';

// ── FUNCIÓN DE PRUEBA — Ejecuta esto una vez desde el editor GAS ──────────────
// Esto fuerza la pantalla de autorización de permisos (Gmail + Sheets)
function testSetup() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log('✅ Google Sheets conectado: ' + ss.getName());
    MailApp.getRemainingDailyQuota();
    Logger.log('✅ Gmail autorizado correctamente');
    Logger.log('✅ Todo listo. Ya puedes usar la app.');
  } catch (err) {
    Logger.log('❌ Error: ' + err.message);
  }
}

// Nombres de las hojas
const SHEETS = {
  USERS:                'Users',
  AUTH_TOKENS:          'AuthTokens',
  GROUPS:               'Groups',
  GROUP_MEMBERS:        'GroupMembers',
  EXPENSES:             'Expenses',
  EXPENSE_PARTICIPANTS: 'ExpenseParticipants',
  SETTLEMENTS:          'Settlements',
  EXPENSE_SETTLEMENTS:  'ExpenseSettlements',
};

// ── ENTRY POINT ────────────────────────────────────────────────

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const action = e.parameter.action;
  const params = e.parameter;

  try {
    let result;
    switch (action) {
      // Auth
      case 'sendMagicLink':   result = sendMagicLink(params.email); break;
      case 'verifyToken':     result = verifyToken(params.token); break;
      // Grupos
      case 'getGroups':       result = getGroups(params.userEmail); break;
      case 'createGroup':     result = createGroup(params.name, params.createdBy); break;
      case 'getGroupDetails': result = getGroupDetails(params.groupId); break;
      case 'inviteMember':    result = inviteMember(params.groupId, params.email); break;
      // Gastos
      case 'addExpense':      result = addExpense(JSON.parse(params.data)); break;
      case 'getExpenses':     result = getExpenses(params.groupId); break;
      case 'updateExpense':         result = updateExpense(JSON.parse(params.data)); break;
      case 'deleteExpense':         result = deleteExpense(params.expenseId); break;
      case 'updateExpenseSession':  result = updateExpenseSession(JSON.parse(params.data)); break;
      case 'deleteExpenseSession':  result = deleteExpenseSession(params.sessionId); break;
      // Balances
      case 'getBalances':           result = getBalances(params.groupId); break;
      case 'settleDebt':            result = settleDebt(params.groupId, params.fromUser, params.toUser, parseFloat(params.amount)); break;
      // Liquidaciones por gasto (sincronizadas entre miembros)
      case 'getExpenseSettlements': result = getExpenseSettlements(params.groupId); break;
      case 'markExpensePaid':       result = markExpensePaid(params.expenseId, params.groupId, params.settledBy); break;
      case 'unmarkExpensePaid':     result = unmarkExpensePaid(params.expenseId); break;
      default:
        result = { error: `Acción desconocida: ${action}` };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message || 'Error interno del servidor' });
  }
}

function jsonResponse(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ── HELPERS DE SHEETS ──────────────────────────────────────────

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    initSheet(sheet, name);
  }
  return sheet;
}

function initSheet(sheet, name) {
  const headers = {
    [SHEETS.USERS]:                ['email', 'name', 'created_at'],
    [SHEETS.AUTH_TOKENS]:          ['token', 'user_email', 'created_at', 'used', 'type', 'group_id'],
    [SHEETS.GROUPS]:               ['group_id', 'name', 'created_by', 'created_at'],
    [SHEETS.GROUP_MEMBERS]:        ['group_id', 'user_email', 'joined_at'],
    [SHEETS.EXPENSES]:             ['expense_id', 'group_id', 'amount', 'paid_by', 'date', 'description', 'session_id', 'category', 'created_at'],
    [SHEETS.EXPENSE_PARTICIPANTS]: ['expense_id', 'user_email', 'share_amount'],
    [SHEETS.SETTLEMENTS]:          ['settlement_id', 'group_id', 'from_user', 'to_user', 'amount', 'settled_at'],
    [SHEETS.EXPENSE_SETTLEMENTS]:  ['expense_id', 'group_id', 'settled_by', 'settled_at'],
  };
  if (headers[name]) {
    sheet.getRange(1, 1, 1, headers[name].length).setValues([headers[name]]);
  }
}

function getRows(sheetName) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row =>
    Object.fromEntries(headers.map((h, i) => [h, row[i]]))
  );
}

function appendRow(sheetName, rowData) {
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => rowData[h] !== undefined ? rowData[h] : '');
  sheet.appendRow(row);
}

function generateId() {
  return Utilities.getUuid();
}

// ── AUTH ───────────────────────────────────────────────────────

function sendMagicLink(email) {
  if (!email) throw new Error('Email requerido');

  const lowerEmail = email.toLowerCase().trim();

  // Crear usuario si no existe
  const users = getRows(SHEETS.USERS);
  const exists = users.find(u => u.email === lowerEmail);
  if (!exists) {
    appendRow(SHEETS.USERS, {
      email: lowerEmail,
      name: lowerEmail.split('@')[0],
      created_at: new Date().toISOString(),
    });
  }

  // Generar OTP de 6 digitos
  const otp = String(Math.floor(100000 + Math.random() * 900000));

  // Invalidar OTPs anteriores del mismo usuario
  const sheet   = getSheet(SHEETS.AUTH_TOKENS);
  const data    = sheet.getDataRange().getValues();
  const hdr     = data[0];
  const emailIdx = hdr.indexOf('user_email');
  const usedIdx  = hdr.indexOf('used');
  const typeIdx  = hdr.indexOf('type');
  for (let i = 1; i < data.length; i++) {
    if (data[i][emailIdx] === lowerEmail && data[i][typeIdx] === 'login' && !data[i][usedIdx]) {
      sheet.getRange(i + 1, usedIdx + 1).setValue(true);
    }
  }

  appendRow(SHEETS.AUTH_TOKENS, {
    token: otp,
    user_email: lowerEmail,
    created_at: new Date().toISOString(),
    used: false,
    type: 'login',
    group_id: '',
  });

  // Enviar email con el codigo OTP
  MailApp.sendEmail({
    to: lowerEmail,
    subject: 'Tu codigo de acceso a SplitGroup',
    htmlBody: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0c0c14;color:#f0f0ff;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:2.5rem;">&#x1F4B8;</span>
          <h1 style="color:#7c5cfc;margin:8px 0 4px;font-size:1.5rem;">SplitGroup</h1>
          <p style="color:#9898b8;margin:0;font-size:0.9rem;">Gastos compartidos, sin drama</p>
        </div>
        <div style="background:#1a1a2e;border-radius:12px;padding:24px;margin:16px 0;border:1px solid rgba(255,255,255,0.07);text-align:center;">
          <p style="margin:0 0 16px;color:#9898b8;">Tu codigo de acceso es:</p>
          <div style="font-size:2.8rem;font-weight:900;letter-spacing:0.25em;color:#7c5cfc;font-family:monospace;background:rgba(124,92,252,0.12);border-radius:12px;padding:20px 28px;display:inline-block;border:1px solid rgba(124,92,252,0.3);">
            ${otp}
          </div>
          <p style="margin:16px 0 0;font-size:0.78rem;color:#5a5a7a;">
            Expira en 10 minutos. No lo compartas con nadie.
          </p>
        </div>
        <p style="font-size:0.78rem;color:#5a5a7a;text-align:center;margin:16px 0 0;">
          Si no solicitaste este codigo, ignora este email.
        </p>
      </div>
    `,
  });

  return { success: true };
}

function verifyToken(token) {
  if (!token) throw new Error('Token requerido');

  const tokens = getRows(SHEETS.AUTH_TOKENS);
  const tokenRow = tokens.find(t => t.token === token && !t.used);

  if (!tokenRow) throw new Error('Codigo invalido o ya utilizado');

  // Verificar expiracion (10 minutos para OTP)
  const created = new Date(tokenRow.created_at);
  const now = new Date();
  const diff = (now - created) / 1000 / 60;
  if (diff > 10) throw new Error('El codigo ha expirado. Solicita uno nuevo.');


  // Marcar como usado
  const sheet = getSheet(SHEETS.AUTH_TOKENS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const usedIdx = headers.indexOf('used');
  const tokenIdx = headers.indexOf('token');
  for (let i = 1; i < data.length; i++) {
    if (data[i][tokenIdx] === token) {
      sheet.getRange(i + 1, usedIdx + 1).setValue(true);
      break;
    }
  }

  // Si es invitación a grupo, agregar al grupo
  if (tokenRow.type === 'invite' && tokenRow.group_id) {
    const members = getRows(SHEETS.GROUP_MEMBERS);
    const alreadyMember = members.find(
      m => m.group_id === tokenRow.group_id && m.user_email === tokenRow.user_email
    );
    if (!alreadyMember) {
      appendRow(SHEETS.GROUP_MEMBERS, {
        group_id: tokenRow.group_id,
        user_email: tokenRow.user_email,
        joined_at: new Date().toISOString(),
      });
    }
  }

  // Obtener datos del usuario
  const users = getRows(SHEETS.USERS);
  const user = users.find(u => u.email === tokenRow.user_email);

  return {
    success: true,
    email: tokenRow.user_email,
    name: user ? user.name : tokenRow.user_email.split('@')[0],
  };
}

// ── GRUPOS ────────────────────────────────────────────────────

function getGroups(userEmail) {
  if (!userEmail) throw new Error('userEmail requerido');

  const memberRows = getRows(SHEETS.GROUP_MEMBERS);
  const groupRows  = getRows(SHEETS.GROUPS);
  const expenses   = getRows(SHEETS.EXPENSES);
  const participants = getRows(SHEETS.EXPENSE_PARTICIPANTS);
  const settlements  = getRows(SHEETS.SETTLEMENTS);

  const userGroups = memberRows
    .filter(m => m.user_email === userEmail)
    .map(m => {
      const group = groupRows.find(g => g.group_id === m.group_id);
      if (!group) return null;

      // Calcular balance del usuario en este grupo
      const memberCount = memberRows.filter(mb => mb.group_id === m.group_id).length;
      const groupExpenses = expenses.filter(e => e.group_id === m.group_id);
      let balance = 0;

      for (const exp of groupExpenses) {
        if (exp.paid_by === userEmail) {
          // Sumar lo que otros le deben al usuario
          const parts = participants.filter(p =>
            p.expense_id === exp.expense_id && p.user_email !== userEmail
          );
          parts.forEach(p => { balance += parseFloat(p.share_amount) || 0; });
        } else {
          // Restar lo que el usuario debe
          const userPart = participants.find(p =>
            p.expense_id === exp.expense_id && p.user_email === userEmail
          );
          if (userPart) balance -= parseFloat(userPart.share_amount) || 0;
        }
      }

      // Ajustar por liquidaciones
      const groupSettlements = settlements.filter(s => s.group_id === m.group_id);
      for (const s of groupSettlements) {
        if (s.from_user === userEmail) balance += parseFloat(s.amount) || 0;
        if (s.to_user === userEmail)   balance -= parseFloat(s.amount) || 0;
      }

      return {
        ...group,
        memberCount,
        myBalance: balance.toFixed(2),
      };
    })
    .filter(Boolean);

  return { groups: userGroups };
}

function createGroup(name, createdBy) {
  if (!name || !createdBy) throw new Error('name y createdBy son requeridos');

  const groupId = generateId();
  const now = new Date().toISOString();

  appendRow(SHEETS.GROUPS, {
    group_id: groupId,
    name: name.trim(),
    created_by: createdBy,
    created_at: now,
  });

  // Agregar al creador como miembro
  appendRow(SHEETS.GROUP_MEMBERS, {
    group_id: groupId,
    user_email: createdBy,
    joined_at: now,
  });

  return { success: true, groupId };
}

function getGroupDetails(groupId) {
  if (!groupId) throw new Error('groupId requerido');

  const groups  = getRows(SHEETS.GROUPS);
  const members = getRows(SHEETS.GROUP_MEMBERS);

  const group  = groups.find(g => g.group_id === groupId);
  if (!group) throw new Error('Grupo no encontrado');

  const groupMembers = members.filter(m => m.group_id === groupId);

  return { group, members: groupMembers };
}

function inviteMember(groupId, email) {
  if (!groupId || !email) throw new Error('groupId y email son requeridos');

  const lowerEmail = email.toLowerCase().trim();

  // Crear usuario si no existe
  const users = getRows(SHEETS.USERS);
  if (!users.find(u => u.email === lowerEmail)) {
    appendRow(SHEETS.USERS, {
      email: lowerEmail,
      name: lowerEmail.split('@')[0],
      created_at: new Date().toISOString(),
    });
  }

  // Generar token de invitación
  const token = Utilities.base64Encode(
    lowerEmail + ':invite:' + groupId + ':' + Math.random()
  ).replace(/[+/=]/g, '').substring(0, 48);

  appendRow(SHEETS.AUTH_TOKENS, {
    token,
    user_email: lowerEmail,
    created_at: new Date().toISOString(),
    used: false,
    type: 'invite',
    group_id: groupId,
  });

  // Obtener nombre del grupo
  const groups = getRows(SHEETS.GROUPS);
  const group  = groups.find(g => g.group_id === groupId);
  const groupName = group ? group.name : 'un grupo';

  const appUrl = 'https://split-group-gilt.vercel.app';
  const inviteLink = `${appUrl}?token=${token}`;

  MailApp.sendEmail({
    to: lowerEmail,
    subject: `💸 Te invitaron a "${groupName}" en SplitGroup`,
    htmlBody: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0c0c14;color:#f0f0ff;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:2.5rem;">💸</span>
          <h1 style="color:#7c5cfc;margin:8px 0 4px;font-size:1.5rem;">SplitGroup</h1>
        </div>
        <div style="background:#1a1a2e;border-radius:12px;padding:20px;margin:16px 0;border:1px solid rgba(255,255,255,0.07);">
          <p style="margin:0 0 16px;color:#9898b8;">
            Te invitaron a unirte al grupo <strong style="color:#f0f0ff;">"${groupName}"</strong>.
          </p>
          <a href="${inviteLink}" style="display:block;background:linear-gradient(135deg,#7c5cfc,#5a3ed4);color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;text-align:center;font-weight:700;font-size:1rem;">
            👥 Unirme al grupo
          </a>
        </div>
      </div>
    `,
  });

  return { success: true };
}

// ── GASTOS ────────────────────────────────────────────────────

// Helper: añade columna session_id a la hoja Expenses si no existe
function ensureSessionIdColumn() {
  const sheet   = getSheet(SHEETS.EXPENSES);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.indexOf('session_id') === -1) {
    sheet.getRange(1, sheet.getLastColumn() + 1).setValue('session_id');
  }
}

// Helper: añade columna category a la hoja Expenses si no existe (retrocompatibilidad)
function ensureCategoryColumn() {
  const sheet   = getSheet(SHEETS.EXPENSES);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.indexOf('category') === -1) {
    sheet.getRange(1, sheet.getLastColumn() + 1).setValue('category');
  }
}

function addExpense(data) {
  ensureSessionIdColumn();
  ensureCategoryColumn();
  const { group_id, amount, paid_by, description, date, participants, session_id, category } = data;
  if (!group_id || !amount || !paid_by || !participants?.length) {
    throw new Error('Datos del gasto incompletos');
  }

  const expenseId = generateId();
  const now = new Date().toISOString();

  appendRow(SHEETS.EXPENSES, {
    expense_id:  expenseId,
    group_id:    group_id,
    amount:      parseFloat(amount),
    paid_by:     paid_by,
    date:        date || now.split('T')[0],
    description: description || '',
    session_id:  session_id || '',
    category:    category   || '',
    created_at:  now,
  });

  for (const p of participants) {
    appendRow(SHEETS.EXPENSE_PARTICIPANTS, {
      expense_id:   expenseId,
      user_email:   p.user_email,
      share_amount: parseFloat(p.share_amount),
    });
  }

  return { success: true, expenseId };
}

function getExpenses(groupId) {
  if (!groupId) throw new Error('groupId requerido');

  const expenses    = getRows(SHEETS.EXPENSES).filter(e => e.group_id === groupId);
  const participants = getRows(SHEETS.EXPENSE_PARTICIPANTS);

  const result = expenses
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(exp => ({
      ...exp,
      participants: participants.filter(p => p.expense_id === exp.expense_id),
    }));

  return { expenses: result };
}

// ── BALANCES ──────────────────────────────────────────────────

function getBalances(groupId) {
  if (!groupId) throw new Error('groupId requerido');

  const members     = getRows(SHEETS.GROUP_MEMBERS).filter(m => m.group_id === groupId);
  const expenses    = getRows(SHEETS.EXPENSES).filter(e => e.group_id === groupId);
  const participants = getRows(SHEETS.EXPENSE_PARTICIPANTS);
  const settlements  = getRows(SHEETS.SETTLEMENTS).filter(s => s.group_id === groupId);

  const balances = {};
  members.forEach(m => { balances[m.user_email] = 0; });

  // Calcular desde gastos
  for (const exp of expenses) {
    const expParticipants = participants.filter(p => p.expense_id === exp.expense_id);
    for (const p of expParticipants) {
      if (p.user_email === exp.paid_by) continue;
      const amount = parseFloat(p.share_amount) || 0;
      balances[exp.paid_by]  = (balances[exp.paid_by]  || 0) + amount;
      balances[p.user_email] = (balances[p.user_email] || 0) - amount;
    }
  }

  // Ajustar por liquidaciones
  for (const s of settlements) {
    const amount = parseFloat(s.amount) || 0;
    balances[s.from_user] = (balances[s.from_user] || 0) + amount;
    balances[s.to_user]   = (balances[s.to_user]   || 0) - amount;
  }

  // Calcular deudas directas simplificadas
  const debts = [];
  const memberEmails = members.map(m => m.user_email);
  const debtMap = {};

  for (const exp of expenses) {
    const expParticipants = participants.filter(p => p.expense_id === exp.expense_id);
    for (const p of expParticipants) {
      if (p.user_email === exp.paid_by) continue;
      if (!debtMap[p.user_email]) debtMap[p.user_email] = {};
      debtMap[p.user_email][exp.paid_by] =
        (debtMap[p.user_email][exp.paid_by] || 0) + (parseFloat(p.share_amount) || 0);
    }
  }

  // Ajustar por liquidaciones
  for (const s of settlements) {
    if (!debtMap[s.from_user]) debtMap[s.from_user] = {};
    debtMap[s.from_user][s.to_user] =
      Math.max(0, (debtMap[s.from_user][s.to_user] || 0) - parseFloat(s.amount));
  }

  const processed = new Set();
  for (const from of Object.keys(debtMap)) {
    for (const to of Object.keys(debtMap[from])) {
      const key = [from, to].sort().join('|');
      if (processed.has(key)) continue;
      processed.add(key);
      const ab = debtMap[from]?.[to]   || 0;
      const ba = debtMap[to]?.[from]   || 0;
      const net = ab - ba;
      if (Math.abs(net) < 0.01) continue;
      debts.push(net > 0
        ? { from, to, amount: parseFloat(net.toFixed(2)) }
        : { from: to, to: from, amount: parseFloat(Math.abs(net).toFixed(2)) }
      );
    }
  }

  return { balances, debts };
}

function settleDebt(groupId, fromUser, toUser, amount) {
  if (!groupId || !fromUser || !toUser || !amount) {
    throw new Error('Parámetros incompletos para liquidar deuda');
  }

  appendRow(SHEETS.SETTLEMENTS, {
    settlement_id: generateId(),
    group_id:      groupId,
    from_user:     fromUser,
    to_user:       toUser,
    amount:        parseFloat(amount),
    settled_at:    new Date().toISOString(),
  });

  return { success: true };
}

// ── ACTUALIZAR GASTO ──────────────────────────────────────────

function updateExpense(data) {
  const { expense_id, amount, paid_by, description, date, participants, category } = data;
  if (!expense_id) throw new Error('expense_id requerido');

  ensureCategoryColumn();

  const sheet   = getSheet(SHEETS.EXPENSES);
  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idIdx   = headers.indexOf('expense_id');

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idIdx]) === String(expense_id)) {
      if (amount !== undefined)      sheet.getRange(i + 1, headers.indexOf('amount')      + 1).setValue(parseFloat(amount));
      if (paid_by)                   sheet.getRange(i + 1, headers.indexOf('paid_by')     + 1).setValue(paid_by);
      if (description !== undefined) sheet.getRange(i + 1, headers.indexOf('description') + 1).setValue(description);
      if (date)                      sheet.getRange(i + 1, headers.indexOf('date')        + 1).setValue(date);
      if (category !== undefined)    sheet.getRange(i + 1, headers.indexOf('category')    + 1).setValue(category);
      break;
    }
  }

  if (participants && participants.length) {
    const partSheet = getSheet(SHEETS.EXPENSE_PARTICIPANTS);
    const partRows  = partSheet.getDataRange().getValues();
    const partHdr   = partRows[0];
    const partIdIdx = partHdr.indexOf('expense_id');
    for (let i = partRows.length - 1; i >= 1; i--) {
      if (String(partRows[i][partIdIdx]) === String(expense_id)) {
        partSheet.deleteRow(i + 1);
      }
    }
    for (const p of participants) {
      appendRow(SHEETS.EXPENSE_PARTICIPANTS, {
        expense_id,
        user_email:   p.user_email,
        share_amount: parseFloat(p.share_amount),
      });
    }
  }

  return { success: true };
}

// ── ELIMINAR GASTO ────────────────────────────────────────────

function deleteExpense(expenseId) {
  if (!expenseId) throw new Error('expenseId requerido');

  const sheet   = getSheet(SHEETS.EXPENSES);
  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idIdx   = headers.indexOf('expense_id');
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][idIdx]) === String(expenseId)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }

  const partSheet = getSheet(SHEETS.EXPENSE_PARTICIPANTS);
  const partRows  = partSheet.getDataRange().getValues();
  const partHdr   = partRows[0];
  const partIdIdx = partHdr.indexOf('expense_id');
  for (let i = partRows.length - 1; i >= 1; i--) {
    if (String(partRows[i][partIdIdx]) === String(expenseId)) {
      partSheet.deleteRow(i + 1);
    }
  }

  return { success: true };
}

// ── ACTUALIZAR SESIÓN DE GASTO MÚLTIPLE ───────────────────────
// Actualiza descripción y fecha de todos los sub-gastos del session_id,
// y el amount de cada sub-gasto individual (por expenseId).

function updateExpenseSession(data) {
  const { session_id, group_id, description, date, payers } = data;
  if (!session_id) throw new Error('session_id requerido');

  const sheet   = getSheet(SHEETS.EXPENSES);
  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];

  const idIdx   = headers.indexOf('expense_id');
  const sesIdx  = headers.indexOf('session_id');
  const descIdx = headers.indexOf('description');
  const dateIdx = headers.indexOf('date');
  const amtIdx  = headers.indexOf('amount');

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][sesIdx]) !== String(session_id)) continue;

    // Actualizar campos comunes
    if (description !== undefined) sheet.getRange(i + 1, descIdx + 1).setValue(description);
    if (date)                       sheet.getRange(i + 1, dateIdx + 1).setValue(date);

    // Actualizar monto individual si se pasó
    if (payers && payers.length) {
      const expId = String(rows[i][idIdx]);
      const payerEntry = payers.find(p => String(p.expense_id) === expId);
      if (payerEntry && payerEntry.amount !== undefined) {
        sheet.getRange(i + 1, amtIdx + 1).setValue(parseFloat(payerEntry.amount));
        // También actualizar el solo-participante (self-pay)
        const partSheet = getSheet(SHEETS.EXPENSE_PARTICIPANTS);
        const partRows  = partSheet.getDataRange().getValues();
        const partHdr   = partRows[0];
        const partIdIdx = partHdr.indexOf('expense_id');
        const shareIdx  = partHdr.indexOf('share_amount');
        for (let j = 1; j < partRows.length; j++) {
          if (String(partRows[j][partIdIdx]) === expId) {
            partSheet.getRange(j + 1, shareIdx + 1).setValue(parseFloat(payerEntry.amount));
          }
        }
      }
    }
  }

  return { success: true };
}

// ── ELIMINAR SESIÓN DE GASTO MÚLTIPLE ────────────────────────

function deleteExpenseSession(sessionId) {
  if (!sessionId) throw new Error('sessionId requerido');

  const sheet   = getSheet(SHEETS.EXPENSES);
  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idIdx   = headers.indexOf('expense_id');
  const sesIdx  = headers.indexOf('session_id');

  const expenseIds = [];
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][sesIdx]) === String(sessionId)) {
      expenseIds.push(String(rows[i][idIdx]));
      sheet.deleteRow(i + 1);
    }
  }

  // Borrar participantes de cada sub-gasto
  const partSheet = getSheet(SHEETS.EXPENSE_PARTICIPANTS);
  const partRows  = partSheet.getDataRange().getValues();
  const partHdr   = partRows[0];
  const partIdIdx = partHdr.indexOf('expense_id');
  for (let i = partRows.length - 1; i >= 1; i--) {
    if (expenseIds.includes(String(partRows[i][partIdIdx]))) {
      partSheet.deleteRow(i + 1);
    }
  }

  return { success: true };
}

// ── LIQUIDACIONES POR GASTO (sincronizadas) ───────────────────

function getExpenseSettlements(groupId) {
  if (!groupId) throw new Error('groupId requerido');
  const rows = getRows(SHEETS.EXPENSE_SETTLEMENTS);
  const settled = {};
  rows.filter(r => String(r.group_id) === String(groupId))
      .forEach(r => { settled[r.expense_id] = { settled: true, settledAt: r.settled_at, settledBy: r.settled_by }; });
  return { settlements: settled };
}

function markExpensePaid(expenseId, groupId, settledBy) {
  if (!expenseId || !groupId) throw new Error('expenseId y groupId requeridos');
  // Idempotente: si ya existe, no duplicar
  const rows = getRows(SHEETS.EXPENSE_SETTLEMENTS);
  if (rows.find(r => String(r.expense_id) === String(expenseId))) return { success: true };
  appendRow(SHEETS.EXPENSE_SETTLEMENTS, {
    expense_id: expenseId,
    group_id:   groupId,
    settled_by: settledBy || '',
    settled_at: new Date().toISOString(),
  });
  return { success: true };
}

function unmarkExpensePaid(expenseId) {
  if (!expenseId) throw new Error('expenseId requerido');
  const sheet = getSheet(SHEETS.EXPENSE_SETTLEMENTS);
  const rows  = sheet.getDataRange().getValues();
  const idIdx = rows[0].indexOf('expense_id');
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][idIdx]) === String(expenseId)) sheet.deleteRow(i + 1);
  }
  return { success: true };
}
