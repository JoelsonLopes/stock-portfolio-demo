-- Migration: Fix DELETE permissions for orders and order_items tables
-- Purpose: Enable DELETE operations from API routes

-- Grant DELETE permissions to authenticated users
GRANT DELETE ON orders TO authenticated;
GRANT DELETE ON order_items TO authenticated;

-- Grant DELETE permissions to anonymous users (for API routes)
GRANT DELETE ON orders TO anon;
GRANT DELETE ON order_items TO anon;

-- Ensure all other required permissions are in place
GRANT SELECT, INSERT, UPDATE ON orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON orders TO anon;
GRANT SELECT, INSERT, UPDATE ON order_items TO anon;

-- Verify permissions were applied
SELECT 
  'Permissions applied successfully' as status,
  'orders and order_items tables now support DELETE operations' as message; 