import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createSessionClient } from '@/lib/appwrite/server'
import { encryptData, decryptData } from '@/lib/moodle/encryption' 

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser(request)
        if (!user) {
            return NextResponse.json({ connected: false })
        }
        
        if (user.prefs.moodleSessionData) {
            try {
                const sessionStr = decryptData(user.prefs.moodleSessionData)
                const session = JSON.parse(sessionStr)
                return NextResponse.json({ 
                    connected: true, 
                    url: session.url,
                    username: session.username || 'Connected User'
                })
            } catch (e) {
                console.error("Failed to decrypt moodle session", e)
                return NextResponse.json({ connected: false })
            }
        }
        
        return NextResponse.json({ connected: false })
    } catch (e) {
        return NextResponse.json({ connected: false, error: String(e) }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { url, username, password, token: manualToken } = await request.json()

    if (!url || !username || (!password && !manualToken)) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Clean URL
    let cleanUrl = url.replace(/\/$/, '')
    if (!cleanUrl.startsWith('http')) {
        cleanUrl = 'https://' + cleanUrl
    }
    
    let token = manualToken;

    // 1. Get Token from Moodle (If password provided)
    if (!token && password) {
        const tokenUrl = `${cleanUrl}/login/token.php`
        const params = new URLSearchParams()
        params.append('username', username)
        params.append('password', password)
        params.append('service', 'moodle_mobile_app')

        console.log(`Connecting to Moodle at: ${tokenUrl}`)

        const tokenRes = await fetch(tokenUrl, {
            method: 'POST',
            body: params
        })

        if (!tokenRes.ok) {
            return NextResponse.json({ success: false, error: `Failed to connect to Moodle (Status: ${tokenRes.status})` }, { status: 400 })
        }

        const tokenData = await tokenRes.json()

        if (tokenData.error) {
            return NextResponse.json({ success: false, error: `Moodle Error: ${tokenData.error}` }, { status: 400 })
        }

        token = tokenData.token

        if (!token) {
            return NextResponse.json({ success: false, error: 'No token received from Moodle' }, { status: 400 })
        }
    }
    
    // 2. Get User ID (needed for fetching courses)
    // Function: core_webservice_get_site_info
    const infoUrl = `${cleanUrl}/webservice/rest/server.php`
    const infoParams = new URLSearchParams()
    infoParams.append('wstoken', token)
    infoParams.append('wsfunction', 'core_webservice_get_site_info')
    infoParams.append('moodlewsrestformat', 'json')
    
    const infoRes = await fetch(infoUrl, {
        method: 'POST',
        body: infoParams
    })
    
    const infoData = await infoRes.json()
    if (infoData.exception || infoData.errorcode) {
        return NextResponse.json({ success: false, error: `Moodle Info Error: ${infoData.message || infoData.errorcode}` }, { status: 400 })
    }

    const userid = infoData.userid

    // 3. Encrypt and Store
    const sessionData = JSON.stringify({
        token,
        url: cleanUrl,
        userid,
        username
    })

    const encryptedToken = encryptData(sessionData)

    const { account } = await createSessionClient(request)
    
    // Update user preferences
    await account.updatePrefs({
        ...user.prefs,
        moodleSessionData: encryptedToken
    })

    return NextResponse.json({ 
        success: true, 
        url: cleanUrl,
        username 
    })

  } catch (error) {
    console.error('Moodle Connection Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error during connection' }, { status: 500 })
  }
}
