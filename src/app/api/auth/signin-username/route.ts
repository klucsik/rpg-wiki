import { NextRequest, NextResponse } from 'next/server';

/**
 * Custom endpoint for username/password signin
 * Uses better-auth's email/password provider by converting username to email
 */
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    console.log('[signin-username] Request for username:', username);

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password required' },
        { status: 400 }
      );
    }

    // Convert username to email format for better-auth
    const email = `${username}@localhost.local`;
    
    // Use better-auth's email/password sign-in endpoint
    const baseUrl = process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const signInResult = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': baseUrl,
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!signInResult.ok) {
      const error = await signInResult.json();
      console.error('[signin-username] Better-auth sign-in error:', error);
      return NextResponse.json(
        { error: error.message || 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Get response data and cookies from better-auth
    const responseData = await signInResult.json();
    const setCookieHeader = signInResult.headers.get('set-cookie');
    
    console.log('[signin-username] Sign-in successful for username:', username);

    // Create response with better-auth data
    const response = NextResponse.json({
      success: true,
      user: responseData.user,
    });

    // Forward the session cookie from better-auth
    if (setCookieHeader) {
      response.headers.set('set-cookie', setCookieHeader);
    }

    return response;
  } catch (error) {
    console.error('[signin-username] Error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
