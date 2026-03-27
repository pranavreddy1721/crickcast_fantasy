import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-b98629dd/health", (c) => {
  return c.json({ status: "ok" });
});

// Admin signup endpoint - creates new admin users (ONLY if no users exist)
app.post("/make-server-b98629dd/admin/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    // Create Supabase admin client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Check if any users already exist - if yes, block signup
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error checking existing users:', listError);
      return c.json({ error: 'Failed to verify signup eligibility' }, 500);
    }

    if (existingUsers && existingUsers.users && existingUsers.users.length > 0) {
      console.log('Signup blocked: Admin user already exists');
      return c.json({ 
        error: 'Admin signup is disabled. An admin account already exists.' 
      }, 403);
    }

    // Create user with admin privileges
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: { name: name || 'Admin', role: 'admin' },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.error('Error creating admin user:', error);
      return c.json({ error: error.message }, 400);
    }

    console.log('First admin user created successfully:', data.user?.email);
    return c.json({ 
      success: true, 
      message: 'Admin user created successfully',
      user: { id: data.user?.id, email: data.user?.email }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Failed to create admin user' }, 500);
  }
});

Deno.serve(app.fetch);