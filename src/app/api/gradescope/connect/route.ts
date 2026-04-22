import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createAdminClient } from '@/lib/appwrite/server'
import { encryptToken, isEncryptionKeyConfigured } from '@/lib/gradescope/encryption'
import { ConnectRequest, ConnectResponse } from '@/types/gradescope'

export async function POST(request: NextRequest): Promise<NextResponse<ConnectResponse>> {
  try {
    // Check encryption key is configured
    if (!isEncryptionKeyConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Gradescope integration is not configured. Contact admin.' },
        { status: 500 }
      )
    }

    // Get current user
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      )
    }

    // Parse request body
    const body: ConnectRequest = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      )
    }

    // Attempt to login to Gradescope
    // Gradescope requires a multi-step login process with CSRF tokens
    
    // Step 1: Get the initial page to fetch the CSRF token and initial cookies
    const initialResponse = await fetch('https://www.gradescope.com/', {
      method: 'GET',
    });

    if (!initialResponse.ok) {
        throw new Error('Failed to reach Gradescope');
    }

    const initialHtml = await initialResponse.text();
    const initialCookies = initialResponse.headers.getSetCookie();
    
    // Parse the authenticity_token
    const tokenMatch = initialHtml.match(/name="authenticity_token" value="([^"]+)"/);
    if (!tokenMatch || !tokenMatch[1]) {
      throw new Error('Could not find authenticity token');
    }

    const authenticityToken = tokenMatch[1];
    
    // Clean cookies: keep only name=value, remove attributes like Path, HttpOnly
    const cookieHeader = initialCookies.map(c => c.split(';')[0]).join('; ');
    
    console.log('Gradescope Connect: Got initial cookies', initialCookies.length, 'and auth token');

    // Step 2: Login
    const loginParams = new URLSearchParams();
    loginParams.append('utf8', '✓');
    loginParams.append('session[email]', email);
    loginParams.append('session[password]', password);
    loginParams.append('session[remember_me]', '0');
    loginParams.append('commit', 'Log In');
    loginParams.append('session[remember_me_sso]', '0');
    loginParams.append('authenticity_token', authenticityToken);

    // Don't follow redirects automatically so we can capture the 302 cookies
    const loginResponse = await fetch('https://www.gradescope.com/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieHeader,
        'Origin': 'https://www.gradescope.com',
        'Referer': 'https://www.gradescope.com/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: loginParams,
      redirect: 'manual' 
    });
    
    // Handle the response
    let setCookieHeader = loginResponse.headers.getSetCookie().join('; ');
    console.log(`Gradescope Connect: Login status ${loginResponse.status}`);
    // console.log('Gradescope Connect: Set-Cookie headers:', setCookieHeader); 

    // If we get a 302, it means login was likely successful (redirect to dashboard)
    // If we get 200, we might be on the login page with an error
    if (loginResponse.status === 200) {
       const loginBody = await loginResponse.text();
       if (loginBody.includes('Invalid email or password')) {
          console.error('Gradescope Connect: Invalid credentials');
          return NextResponse.json(
            { success: false, error: 'Invalid Gradescope credentials. Please check your email and password. Ensure you have set a password for your account if you use SSO.' },
            { status: 400 }
          )
       }
    } else if (loginResponse.status !== 302) {
       // Unexpected status
       const errorText = await loginResponse.text();
       console.error('Gradescope login unexpected status:', loginResponse.status, errorText);
       return NextResponse.json(
        { success: false, error: 'Failed to connect to Gradescope. Please try again later.' },
        { status: 500 }
      )
    }

    // Combine initial cookies with new cookies to extract all required tokens
    // We need _gradescope_session, signed_token, and remember_me
    const allCookiesRaw = [
        ...initialCookies,
        ...loginResponse.headers.getSetCookie()
    ];
    
    const cookiesToStore: Record<string, string> = {};
    const targetCookies = ['_gradescope_session', 'signed_token', 'remember_me'];

    allCookiesRaw.forEach(cookieStr => {
        // cookieStr is like "name=value; Path=/; HttpOnly"
        const parts = cookieStr.split(';');
        const firstPart = parts[0];
        const [name, ...valueParts] = firstPart.split('=');
        const value = valueParts.join('='); // Rejoin in case value has =
        
        if (targetCookies.includes(name.trim()) && value) {
            // Overwrite ensures we keep the latest value (authenticated session)
             cookiesToStore[name.trim()] = value.trim();
        }
    });

    // Verify we have the critical authenticated tokens
    // _gradescope_session might exist even for unauthenticated sessions
    // signed_token is the proof of successful login
    if (!cookiesToStore['_gradescope_session'] || !cookiesToStore['signed_token']) {
      console.error('Failed to extract authenticated tokens. Missing signed_token or session.');
      console.error('Tokens found:', Object.keys(cookiesToStore));
      
      return NextResponse.json(
        { success: false, error: 'Login failed. Please check your password. (Missing authentication signals)' },
        { status: 401 }
      )
    }

    console.log('Gradescope Connect: storage payload keys:', Object.keys(cookiesToStore));

    // Encrypt the session cookies as a JSON string
    const encryptedToken = encryptToken(JSON.stringify(cookiesToStore))

    // Calculate token expiry (Gradescope sessions typically last 30 days)
    const tokenExpiry = new Date()
    tokenExpiry.setDate(tokenExpiry.getDate() + 30)

    // Store in user preferences using Admin SDK
    const { users } = createAdminClient()
    await users.updatePrefs(user.$id, {
      ...user.prefs,
      gradescopeConnected: true,
      gradescopeEmail: email,
      gradescopeSessionToken: encryptedToken,
      gradescopeTokenExpiry: tokenExpiry.toISOString(),
      gradescopeLastSync: null
    })

    return NextResponse.json({
      success: true,
      email: email
    })

  } catch (error) {
    console.error('Error connecting to Gradescope:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
