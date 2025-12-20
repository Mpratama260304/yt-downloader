import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, verifyPassword } from '@/lib/db';
import { createToken, setSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    console.log('[Auth] Login attempt...');
    
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      console.log('[Auth] Missing credentials');
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    console.log('[Auth] Looking up user:', username);
    
    // Get user from database
    const user = await getUserByUsername(username);
    if (!user) {
      console.log('[Auth] User not found:', username);
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    console.log('[Auth] Verifying password...');
    
    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      console.log('[Auth] Invalid password for user:', username);
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    console.log('[Auth] Creating token...');
    
    // Create JWT token
    const token = await createToken({
      userId: user.id,
      username: user.username,
    });

    // Set session cookie
    await setSessionCookie(token);

    console.log('[Auth] Login successful for:', username);
    
    return NextResponse.json({
      success: true,
      data: {
        username: user.username,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[Auth] Login error:', errorMessage);
    console.error('[Auth] Stack:', errorStack);
    return NextResponse.json(
      { success: false, error: 'Login failed: ' + errorMessage },
      { status: 500 }
    );
  }
}
