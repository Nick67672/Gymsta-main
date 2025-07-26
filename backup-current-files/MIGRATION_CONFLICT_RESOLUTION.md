# Migration Conflict Resolution Guide

## Problem
The previous migration attempts failed with 409 (Conflict) and 403 (Forbidden) errors, indicating that some database objects already exist or there are permission issues.

## Error Analysis
From the screenshot, we can see:
- **409 Conflict**: Indicates objects (tables, columns, functions) already exist
- **403 Forbidden**: Indicates permission issues with creating/modifying objects

## Solution Approaches

### Option 1: Safe Migration (`20250101000037_safe_messaging_sharing_fix.sql`)
**Recommended for production environments**

- Uses explicit schema checking (`information_schema`)
- Handles existing objects gracefully
- Includes comprehensive error handling
- Creates all necessary constraints and indexes
- More thorough but potentially slower

### Option 2: Minimal Migration (`20250101000038_minimal_sharing_fix.sql`)
**Recommended for quick fixes**

- Focuses only on essential changes
- Uses `IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS`
- Simpler policies with basic names
- Faster execution
- Less comprehensive but sufficient for basic functionality

## Migration Strategy

### Step 1: Try the Minimal Migration First
1. Apply `20250101000038_minimal_sharing_fix.sql`
2. This should resolve most conflicts quickly
3. Test functionality using the debug component

### Step 2: If Minimal Migration Fails
1. Check the specific error messages
2. Manually drop conflicting objects if safe to do so
3. Re-run the migration

### Step 3: Verify Functionality
1. Use the debug component on the main screen
2. Test each function:
   - Database Structure Test
   - Message Sending Test
   - Sharing Test

## Common Issues and Solutions

### Issue: "relation already exists"
**Solution**: The migration includes `IF NOT EXISTS` checks

### Issue: "policy already exists"  
**Solution**: The migration includes `DROP POLICY IF EXISTS` before creating new ones

### Issue: "function already exists"
**Solution**: Uses `CREATE OR REPLACE FUNCTION`

### Issue: "permission denied"
**Solution**: Includes `SECURITY DEFINER` on functions and graceful permission handling

## Testing After Migration

### 1. Database Structure Test
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('a_chat_messages', 'post_shares');

-- Check if columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'a_chat_messages' 
AND column_name IN ('post_id', 'message_type');
```

### 2. Function Test
```sql
-- Test the share stats function
SELECT * FROM get_post_share_stats('00000000-0000-0000-0000-000000000000'::uuid);
```

### 3. Component Testing
Use the debug component in the app to verify:
- Database structure is correct
- Message sending works
- Sharing functionality works

## Rollback Strategy

If the migration causes issues:

1. **Rollback Tables** (if needed):
```sql
DROP TABLE IF EXISTS post_shares;
DROP TABLE IF EXISTS chat_message_reactions;
```

2. **Rollback Columns** (if needed):
```sql
ALTER TABLE a_chat_messages DROP COLUMN IF EXISTS post_id;
ALTER TABLE a_chat_messages DROP COLUMN IF EXISTS message_type;
ALTER TABLE posts DROP COLUMN IF EXISTS share_count;
```

3. **Rollback Functions** (if needed):
```sql
DROP FUNCTION IF EXISTS get_post_share_stats(uuid);
DROP FUNCTION IF EXISTS update_post_share_count();
```

## Next Steps

1. **Apply the minimal migration** first
2. **Test using the debug component**
3. **Verify messaging and sharing work**
4. **If issues persist**, check the console logs for specific errors
5. **Apply the safe migration** if more comprehensive fixes are needed

The minimal migration should resolve the immediate conflicts and get the functionality working quickly. 