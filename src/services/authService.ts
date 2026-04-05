import * as oauth from 'oauth4webapi'

/**
 * OAuth Configuration
 */
const OAUTH_CONFIG = {
  issuer: 'https://github.com',
  client_id: 'Ov23li550IAr9b9t41CR',
  redirect_uri: window.location.origin + '/callback',
  scope: 'api:read',
}

const AS: oauth.AuthorizationServer = {
  issuer: OAUTH_CONFIG.issuer,
  authorization_endpoint: 'https://github.com/login/oauth/authorize',
  token_endpoint: 'https://github.com/login/oauth/access_token',
  userinfo_endpoint: 'https://api.github.com/user',
}

// Storage keys for preserving PKCE state across redirects
const STORAGE_KEYS = {
  CODE_VERIFIER: 'oauth_code_verifier',
  STATE: 'oauth_state',
  NONCE: 'oauth_nonce',
  ACCESS_TOKEN: 'oauth_access_token',
  ID_TOKEN: 'oauth_id_token',
}

export class AuthService {
  private static instance: AuthService

  private constructor() {}

  public static getInstance(): AuthService {
    if (!this.instance) {
      this.instance = new AuthService()
    }
    return this.instance
  }

  /**
   * Starts the login flow by redirecting the user to the authorization server
   */
  public async login() {
    // 1. Generate PKCE values
    const code_verifier = oauth.generateRandomCodeVerifier()
    const code_challenge = await oauth.calculatePKCECodeChallenge(code_verifier)
    const code_challenge_method = 'S256'

    // 2. Store code_verifier so it survives the redirect
    localStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, code_verifier)

    // 3. Construct Authorization URL
    const authorizationUrl = new URL(AS.authorization_endpoint!)
    authorizationUrl.searchParams.set('client_id', OAUTH_CONFIG.client_id)
    authorizationUrl.searchParams.set('redirect_uri', OAUTH_CONFIG.redirect_uri)
    authorizationUrl.searchParams.set('response_type', 'code')
    authorizationUrl.searchParams.set('scope', OAUTH_CONFIG.scope)
    authorizationUrl.searchParams.set('code_challenge', code_challenge)
    authorizationUrl.searchParams.set(
      'code_challenge_method',
      code_challenge_method
    )

    /**
     * GitHub standard OAuth doesn't strictly follow PKCE but we'll use state for security.
     */
    const state = oauth.generateRandomState()
    localStorage.setItem(STORAGE_KEYS.STATE, state)
    authorizationUrl.searchParams.set('state', state)

    // 4. Redirect the user
    window.location.href = authorizationUrl.href
  }

  /**
   * Handles the callback from the authorization server
   */
  public async handleCallback() {
    const client: oauth.Client = {
      client_id: OAUTH_CONFIG.client_id,
    }

    // 1. Retrieve stored PKCE state
    const code_verifier = localStorage.getItem(STORAGE_KEYS.CODE_VERIFIER)
    const state = localStorage.getItem(STORAGE_KEYS.STATE) || undefined

    if (!code_verifier) {
      throw new Error(
        'Initial auth session not found. Please try logging in again.'
      )
    }

    // 2. Validate the auth response
    const currentUrl = new URL(window.location.href)
    const params = oauth.validateAuthResponse(AS, client, currentUrl, state)

    // 3. Exchange the code for tokens
    const response = await oauth.authorizationCodeGrantRequest(
      AS,
      client,
      oauth.None(), // Public client: no secret needed
      params,
      OAUTH_CONFIG.redirect_uri,
      code_verifier
    )

    // 4. Process the token response
    const result = await oauth.processAuthorizationCodeResponse(
      AS,
      client,
      response
    )

    console.log('Access Token Response', result)

    // 5. Store the access token
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, result.access_token)

    // 6. Cleanup PKCE state
    this.clearAuthState()

    return result
  }

  /**
   * Returns the current access token
   */
  public getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  }

  /**
   * Simple check if the user is logged in
   */
  public isLoggedIn(): boolean {
    return !!this.getAccessToken()
  }

  /**
   * Clears tokens and state, effectively logging out the user
   */
  public logout() {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.ID_TOKEN)
    this.clearAuthState()
  }

  private clearAuthState() {
    localStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER)
    localStorage.removeItem(STORAGE_KEYS.STATE)
    localStorage.removeItem(STORAGE_KEYS.NONCE)
  }

  /**
   * Example: Calls a protected resource with the access token
   */
  public async fetchWithAuth(url: string, options: RequestInit = {}) {
    const accessToken = this.getAccessToken()
    if (!accessToken) {
      throw new Error('Not authenticated')
    }

    const response = await oauth.protectedResourceRequest(
      accessToken,
      options.method || 'GET',
      new URL(url),
      options.headers ? new Headers(options.headers as HeadersInit) : undefined,
      options.body as oauth.ProtectedResourceRequestBody
    )

    return response
  }
}

export const authService = AuthService.getInstance()
