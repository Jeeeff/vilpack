# AI Chat Auto-Session Creation - Fix Documentation

## Problem Identified

**Error:** `POST /api/ai/chat` returning 500 with message "Sessão não encontrada"

**Root Cause:** Backend was requiring session to exist in database before responding to chat. No fallback or auto-creation logic.

**Impact:** New users couldn't start chatting - chat flow broken on first interaction.

---

## Solution Implemented

### File Modified
`vilpack-bot-backend/src/services/aiService.ts` - `generateSellerResponse()` function

### Change Summary
- **Before:** Direct session lookup → throw error if not found
- **After:** Lookup session → auto-create if not found → continue normally

### Exact Logic Added

```typescript
// 🔎 Busca ou cria sessão automaticamente
let session = await prisma.session.findUnique({
  where: { id: sessionId },
  include: { store: true },
});

if (!session) {
  console.log(`[AI] Sessão não encontrada. Criando nova sessão: ${sessionId}`);
  
  // Find or create default store 'vilpack'
  let store = await prisma.store.findUnique({
    where: { slug: 'vilpack' },
  });

  if (!store) {
    console.log(`[AI] Loja 'vilpack' não encontrada. Criando...`);
    store = await prisma.store.create({
      data: {
        name: 'Vilpack',
        slug: 'vilpack',
        phoneNumber: '5511996113977',
      }
    });
    console.log(`[AI] Loja 'vilpack' criada com sucesso.`);
  }

  // Create session with provided UUID
  session = await prisma.session.create({
    data: {
      id: sessionId, // Uses UUID from frontend
      storeId: store.id,
      cart: { create: {} }
    },
    include: { store: true, cart: true }
  });
  
  console.log(`[AI] Nova sessão criada: ${sessionId} (Store: ${store.slug})`);
}
```

---

## How It Works Now

### New User Chat Flow

1. **Frontend** generates UUID and sends:
   ```json
   POST /api/ai/chat
   {
     "sessionId": "550e8400-e29b-41d4-a716-446655440000",
     "message": "Olá!"
   }
   ```

2. **Backend** receives request:
   - Checks if session exists in database
   - If not found:
     - Checks if 'vilpack' store exists
     - If store missing, creates it with default data
     - Creates session with provided UUID
     - Creates empty cart

3. **Response**: `200 OK` with AI response (no 500 error)

4. **Session persisted**: All future messages with same sessionId use existing session

---

## Fields Required for Session Creation

| Field | Source | Required | Notes |
|-------|--------|----------|-------|
| `id` | Frontend (UUID) | Yes | Provided in POST body |
| `storeId` | Database lookup | Yes | Uses 'vilpack' store or creates it |
| `cart` | Auto-created | Yes | Empty cart created automatically |
| `createdAt` | Database | Auto | Prisma default |
| `updatedAt` | Database | Auto | Prisma default |

---

## Store Auto-Creation Logic

If 'vilpack' store doesn't exist in database:
- **Name:** "Vilpack"
- **Slug:** "vilpack" (used for lookup)
- **Phone:** "5511996113977" (default Vilpack number)

This ensures every new session has a store to associate with.

---

## Testing the Fix

### Test Case 1: New Session (Should Return 200)

```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "message": "Olá, preciso de ajuda com embalagens"
  }'
```

**Expected Response:** `200 OK` with AI reply (not 500)

**Console Log:** Should show:
```
[AI] Sessão não encontrada. Criando nova sessão: 550e8400-e29b-41d4-a716-446655440000
[AI] Nova sessão criada: 550e8400-e29b-41d4-a716-446655440000 (Store: vilpack)
```

### Test Case 2: Existing Session (Should Return 200)

Use same sessionId again:
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "message": "E quanto ao prazo de entrega?"
  }'
```

**Expected Response:** `200 OK` with AI reply

**Console Log:** Should NOT show creation logs (session already exists)

### Test Case 3: Get Chat History

```bash
curl http://localhost:3000/api/ai/history/550e8400-e29b-41d4-a716-446655440000
```

**Expected Response:** `200 OK` with conversation history

---

## Database Validation

### Check Session Was Created

```sql
SELECT * FROM Session 
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

Should return one row with:
- `id`: provided UUID
- `storeId`: ID of 'vilpack' store
- `createdAt`: current timestamp
- `updatedAt`: current timestamp

### Check Store Was Created (if needed)

```sql
SELECT * FROM Store WHERE slug = 'vilpack';
```

Should return:
- `name`: "Vilpack"
- `slug`: "vilpack"
- `phoneNumber`: "5511996113977"

---

## Backend Build Status

```
✅ TypeScript compilation successful
✅ No type errors
✅ Ready for deployment
```

**Commit:** `6d5bcc6`
**Message:** "Fix: Auto-create session on first chat message instead of throwing 500"

---

## Notes

1. **Backward Compatible**: If frontend pre-creates session, it will still work
2. **Store Management**: 'vilpack' store is created once and reused
3. **Logging**: All auto-creation actions are logged for debugging
4. **Cart**: Empty cart created automatically for each new session
5. **No More 500 Errors**: Chat flow works seamlessly for new users

---

## Frontend Checklist

- [ ] Frontend generates valid UUID for sessionId
- [ ] sessionId persists across page refreshes (localStorage/sessionStorage)
- [ ] Same sessionId used for all chat messages in one conversation
- [ ] sessionId sent to both POST /api/ai/chat and GET /api/ai/history/:sessionId
- [ ] Verify no console errors after fix

