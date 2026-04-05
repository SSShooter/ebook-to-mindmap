import * as oauth from 'oauth4webapi'

/**
 * OAuth Configuration Placeholders
 * Fill these values with your actual OAuth server details.
 */
const OAUTH_CONFIG = {
  issuer: new URL('https://your-auth-server.com'),
  client_id: 'your-client-id',
  redirect_uri: window.location.origin + '/callback', // Make sure this is registered in your AS
  scope: 'openid profile email', // Adjust scopes as needed
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
  private as?: oauth.AuthorizationServer

  private constructor() {}

  public static getInstance(): AuthService {
    if (!this.instance) {
      this.instance = new AuthService()
    }
    return this.instance
  }

  /**
   * Discovers the authorization server metadata
   */
  private async getAuthorizationServer() {
    if (this.as) return this.as

    const response = await oauth.discoveryRequest(OAUTH_CONFIG.issuer)
    this.as = await oauth.processDiscoveryResponse(OAUTH_CONFIG.issuer, response)
    return this.as
  }

  /**
   * Starts the login flow by redirecting the user to the authorization server
   */
  public async login() {
    const as = await this.getAuthorizationServer()
    
    // 1. Generate PKCE values
    const code_verifier = oauth.generateRandomCodeVerifier()
    const code_challenge = await oauth.calculatePKCECodeChallenge(code_verifier)
    const code_challenge_method = 'S256'
    
    // 2. Generate State (Always recommended)
    const state = oauth.generateRandomState()
    
    // 3. Store these in localStorage so they survive the redirect
    localStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, code_verifier)
    localStorage.setItem(STORAGE_KEYS.STATE, state)

    // 4. Construct Authorization URL
    const authorizationUrl = new URL(as.authorization_endpoint!)
    authorizationUrl.searchParams.set('client_id', OAUTH_CONFIG.client_id)
    authorizationUrl.searchParams.set('redirect_uri', OAUTH_CONFIG.redirect_uri)
    authorizationUrl.searchParams.set('response_type', 'code')
    authorizationUrl.searchParams.set('scope', OAUTH_CONFIG.scope)
    authorizationUrl.searchParams.set('code_challenge', code_challenge)
    authorizationUrl.searchParams.set('code_challenge_method', code_challenge_method)
    authorizationUrl.searchParams.set('state', state)

    // Optional: Add Nonce if using OIDC
    if (OAUTH_CONFIG.scope.includes('openid')) {
        const nonce = oauth.generateRandomNonce()
        localStorage.setItem(STORAGE_KEYS.NONCE, nonce)
        authorizationUrl.searchParams.set('nonce', nonce)
    }

    // 5. Redirect the user
    window.location.href = authorizationUrl.href
  }

  /**
   * Handles the callback from the authorization server
   */
  public async handleCallback() {
    const as = await this.getAuthorizationServer()
    const client: oauth.Client = {
      client_id: OAUTH_CONFIG.client_id,
    }

    // 1. Retrieve stored PKCE state
    const code_verifier = localStorage.getItem(STORAGE_KEYS.CODE_VERIFIER)
    const storedState = localStorage.getItem(STORAGE_KEYS.STATE)
    const storedNonce = localStorage.getItem(STORAGE_KEYS.NONCE)

    if (!code_verifier || !storedState) {
      throw new Error('Initial auth session not found. Please try logging in again.')
    }

    // 2. Validate the auth response
    const currentUrl = new URL(window.location.href)
    let params: URLSearchParams
    try {
        params = oauth.validateAuthResponse(as, client, currentUrl, storedState)
    } catch (err: unknown) {
        if (err instanceof oauth.AuthorizationResponseError) {
            console.error('Authorization Response Error:', err.error, err.error_description)
            throw new Error(`Authentication error: ${err.error_description || err.error}`)
        }
        throw err
    }

    // 3. Exchange the code for tokens
    const response = await oauth.authorizationCodeGrantRequest(
      as,
      client,
      oauth.None(), // PKCE with public client usually doesn't need client authentication
      params,
      OAUTH_CONFIG.redirect_uri,
      code_verifier
    )

    // 4. Process the token response
    let result: oauth.TokenEndpointResponse
    try {
        result = await oauth.processAuthorizationCodeResponse(as, client, response, {
            expectedNonce: storedNonce || undefined,
            requireIdToken: OAUTH_CONFIG.scope.includes('openid')
        })
    } catch (err: unknown) {
        if (err instanceof oauth.ResponseBodyError) {
            console.error('Token Response Error:', err.error, err.error_description)
            throw new Error(`Token error: ${err.error_description || err.error}`)
        }
        throw err
    }

    // 5. Store the tokens
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, result.access_token)
    if (result.id_token) {
        localStorage.setItem(STORAGE_KEYS.ID_TOKEN, result.id_token)
    }

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
    // You might also want to redirect to the AS logout endpoint if supported
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
