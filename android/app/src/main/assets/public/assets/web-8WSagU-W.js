import { C as inferUserCancelledError, S as createUserCancelledError, _ as OAUTH_STATE_KEY, a as isTikTokOAuthResult, b as shouldAutoFinishOAuthRedirect, c as buildLinkedInLoginOptions, d as isLinkedInOAuthResult, f as markLinkedInRedirectPending, g as GoogleSocialLogin, h as OAuth2SocialLogin, i as buildTikTokOAuthConfig, l as buildLinkedInOAuthConfig, m as TelegramSocialLogin, n as asTikTokLoginResult, o as LINKEDIN_PROVIDER_ID, p as TwitterSocialLogin, r as buildTikTokLoginOptions, s as asLinkedInLoginResult, t as TIKTOK_PROVIDER_ID, u as consumeLinkedInRedirectPending, v as clearOAuthPopupMarker, w as WebPlugin, x as BaseSocialLogin, y as deliverOAuthResult } from "./index-fMdin3gl.js";
// node_modules/@capgo/capacitor-social-login/dist/esm/apple-provider.js
var AppleSocialLogin = class extends BaseSocialLogin {
	constructor() {
		super(...arguments);
		this.clientId = null;
		this.redirectUrl = null;
		this.scriptLoaded = false;
		this.scriptUrl = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
		this.useProperTokenExchange = false;
	}
	async initialize(clientId, redirectUrl, useProperTokenExchange = false) {
		this.clientId = clientId;
		this.redirectUrl = redirectUrl || null;
		this.useProperTokenExchange = useProperTokenExchange;
		if (clientId) await this.loadAppleScript();
	}
	async login(options) {
		if (!this.clientId) throw new Error("Apple Client ID not set. Call initialize() first.");
		if (!this.scriptLoaded) throw new Error("Apple Sign-In script not loaded.");
		return new Promise((resolve, reject) => {
			var _a, _b;
			AppleID.auth.init({
				clientId: (_a = this.clientId) !== null && _a !== void 0 ? _a : "",
				scope: ((_b = options.scopes) === null || _b === void 0 ? void 0 : _b.join(" ")) || "name email",
				redirectURI: this.redirectUrl || window.location.href,
				state: options.state,
				nonce: options.nonce,
				usePopup: true
			});
			AppleID.auth.signIn().then((res) => {
				var _a, _b, _c, _d, _e;
				let accessToken;
				if (this.useProperTokenExchange) accessToken = null;
				else accessToken = { token: res.authorization.code || "" };
				resolve({
					provider: "apple",
					result: Object.assign({
						profile: {
							user: res.user || "",
							email: ((_a = res.user) === null || _a === void 0 ? void 0 : _a.email) || null,
							givenName: ((_c = (_b = res.user) === null || _b === void 0 ? void 0 : _b.name) === null || _c === void 0 ? void 0 : _c.firstName) || null,
							familyName: ((_e = (_d = res.user) === null || _d === void 0 ? void 0 : _d.name) === null || _e === void 0 ? void 0 : _e.lastName) || null
						},
						accessToken,
						idToken: res.authorization.id_token || null
					}, this.useProperTokenExchange && { authorizationCode: res.authorization.code })
				});
			}).catch((error) => {
				var _a, _b, _c;
				const message = (_c = (_b = (_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error === null || error === void 0 ? void 0 : error.localizedDescription) !== null && _b !== void 0 ? _b : error === null || error === void 0 ? void 0 : error.error) !== null && _c !== void 0 ? _c : "Apple login failed";
				reject(inferUserCancelledError(message));
			});
		});
	}
	async logout() {
		console.log("Apple logout: Session should be managed on the client side");
	}
	async isLoggedIn() {
		console.log("Apple login status should be managed on the client side");
		return { isLoggedIn: false };
	}
	async getAuthorizationCode() {
		console.log("Apple authorization code should be stored during login");
		throw new Error("Apple authorization code not available");
	}
	async refresh() {
		console.log("Apple refresh not available on web");
	}
	async loadAppleScript() {
		if (this.scriptLoaded) return;
		return this.loadScript(this.scriptUrl).then(() => {
			this.scriptLoaded = true;
		});
	}
};
// node_modules/@capgo/capacitor-social-login/dist/esm/facebook-provider.js
var FacebookSocialLogin = class extends BaseSocialLogin {
	constructor() {
		super(...arguments);
		this.appId = null;
		this.scriptLoaded = false;
		this.locale = "en_US";
	}
	async initialize(appId, locale) {
		this.appId = appId;
		if (locale) this.locale = locale;
		if (appId) {
			await this.loadFacebookScript(this.locale);
			FB.init({
				appId: this.appId,
				version: "v17.0",
				xfbml: true,
				cookie: true
			});
		}
	}
	async login(options) {
		if (!this.appId) throw new Error("Facebook App ID not set. Call initialize() first.");
		return new Promise((resolve, reject) => {
			var _a;
			let settled = false;
			let waitingForStatus = false;
			const resolveWithProfile = (authResponse) => {
				if (settled) return;
				if (!(authResponse === null || authResponse === void 0 ? void 0 : authResponse.accessToken) || !authResponse.userID) {
					settled = true;
					reject(/* @__PURE__ */ new Error("Facebook login failed"));
					return;
				}
				const accessToken = authResponse.accessToken;
				const userId = authResponse.userID;
				FB.api("/me", { fields: "id,name,email,picture" }, (userInfo) => {
					var _a, _b;
					settled = true;
					resolve({
						provider: "facebook",
						result: {
							accessToken: {
								token: accessToken,
								userId
							},
							profile: {
								userID: userInfo.id,
								name: userInfo.name,
								email: userInfo.email || null,
								imageURL: ((_b = (_a = userInfo.picture) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.url) || null,
								friendIDs: [],
								birthday: null,
								ageRange: null,
								gender: null,
								location: null,
								hometown: null,
								profileURL: null
							},
							idToken: null
						}
					});
				});
			};
			const waitForConnected = () => {
				if (settled || waitingForStatus) return;
				waitingForStatus = true;
				this.waitForConnection().then((statusResponse) => resolveWithProfile(statusResponse.authResponse)).catch((error) => {
					if (settled) return;
					settled = true;
					reject(error);
				});
			};
			FB.login((response) => {
				if (response.status === "connected") resolveWithProfile(response.authResponse);
				else if (response.status === "not_authorized" || response.status === "unknown") reject(createUserCancelledError("Facebook login was cancelled."));
				else waitForConnected();
			}, ((_a = options.permissions) === null || _a === void 0 ? void 0 : _a.length) ? { scope: options.permissions.join(",") } : void 0);
		});
	}
	async logout() {
		return new Promise((resolve) => {
			FB.logout(() => resolve());
		});
	}
	async isLoggedIn() {
		return new Promise((resolve) => {
			FB.getLoginStatus((response) => {
				resolve({ isLoggedIn: response.status === "connected" });
			});
		});
	}
	async getAuthorizationCode() {
		return new Promise((resolve, reject) => {
			FB.getLoginStatus((response) => {
				var _a;
				if (response.status === "connected") resolve({ accessToken: ((_a = response.authResponse) === null || _a === void 0 ? void 0 : _a.accessToken) || "" });
				else reject(/* @__PURE__ */ new Error("No Facebook authorization code available"));
			});
		});
	}
	async refresh(options) {
		await this.login(options);
	}
	async getProfile(fields) {
		if (!this.appId) throw new Error("Facebook App ID not set. Call initialize() first.");
		const requestedFields = Array.isArray(fields) && fields.length > 0 ? fields : [
			"id",
			"name",
			"email",
			"picture"
		];
		return new Promise((resolve, reject) => {
			FB.getLoginStatus((statusResponse) => {
				if (statusResponse.status !== "connected") {
					reject(/* @__PURE__ */ new Error("User is not logged in. Call login() before fetching profile."));
					return;
				}
				FB.api("/me", { fields: requestedFields.join(",") }, (profile) => {
					var _a, _b, _c, _d, _e, _f, _g;
					if (profile && !profile.error) resolve({ profile: Object.assign(Object.assign({}, profile), {
						id: (_a = profile.id) !== null && _a !== void 0 ? _a : null,
						name: (_b = profile.name) !== null && _b !== void 0 ? _b : null,
						email: (_c = profile.email) !== null && _c !== void 0 ? _c : null,
						first_name: (_d = profile.first_name) !== null && _d !== void 0 ? _d : null,
						last_name: (_e = profile.last_name) !== null && _e !== void 0 ? _e : null
					}) });
					else {
						const errorMessage = (_g = (_f = profile === null || profile === void 0 ? void 0 : profile.error) === null || _f === void 0 ? void 0 : _f.message) !== null && _g !== void 0 ? _g : "Failed to fetch Facebook profile";
						reject(new Error(errorMessage));
					}
				});
			});
		});
	}
	async requestTracking() {
		if (!this.appId) throw new Error("Facebook App ID not set. Call initialize() first.");
		return { status: "authorized" };
	}
	waitForConnection(timeoutMs = 12e4, pollIntervalMs = 500) {
		const start = Date.now();
		return new Promise((resolve, reject) => {
			let finished = false;
			const pollStatus = () => {
				if (finished) return;
				FB.getLoginStatus((response) => {
					var _a;
					if (finished) return;
					if (response.status === "connected" && ((_a = response.authResponse) === null || _a === void 0 ? void 0 : _a.accessToken)) {
						finished = true;
						resolve(response);
						return;
					}
					if (response.status === "not_authorized" || response.status === "unknown") {
						finished = true;
						reject(createUserCancelledError("Facebook login was cancelled."));
						return;
					}
					if (Date.now() - start >= timeoutMs) {
						finished = true;
						reject(/* @__PURE__ */ new Error("Facebook login failed or timed out"));
						return;
					}
					setTimeout(pollStatus, pollIntervalMs);
				});
			};
			pollStatus();
		});
	}
	async loadFacebookScript(locale) {
		if (this.scriptLoaded) return;
		const existingScript = document.querySelector("script[src*=\"connect.facebook.net\"]");
		if (existingScript) existingScript.remove();
		return this.loadScript(`https://connect.facebook.net/${locale}/sdk.js`).then(() => {
			this.scriptLoaded = true;
		});
	}
};
// node_modules/@capgo/capacitor-social-login/dist/esm/web-auth-popup-close.js
/** Grace period before treating popup.closed as user cancellation (COOP can sever opener early). */
var POPUP_CLOSED_CANCEL_GRACE_MS = 2500;
function nextPopupClosePollState(closed, state, nowMs, graceMs = POPUP_CLOSED_CANCEL_GRACE_MS) {
	if (!closed) return {
		state: { graceStartedAtMs: null },
		shouldCancel: false
	};
	if (state.graceStartedAtMs == null) return {
		state: { graceStartedAtMs: nowMs },
		shouldCancel: false
	};
	if (nowMs - state.graceStartedAtMs >= graceMs) return {
		state,
		shouldCancel: true
	};
	return {
		state,
		shouldCancel: false
	};
}
// node_modules/@capgo/capacitor-social-login/dist/esm/web.js
var SocialLoginWeb = class SocialLoginWeb extends WebPlugin {
	constructor() {
		super();
		this.webAuthPopupInProgress = false;
		this.googleProvider = new GoogleSocialLogin();
		this.appleProvider = new AppleSocialLogin();
		this.facebookProvider = new FacebookSocialLogin();
		this.twitterProvider = new TwitterSocialLogin();
		this.telegramProvider = new TelegramSocialLogin();
		this.oauth2Provider = new OAuth2SocialLogin();
		if (shouldAutoFinishOAuthRedirect()) this.finishOAuthRedirectInPopup().catch((error) => {
			console.error("Failed to finish OAuth redirect", error);
			try {
				window.close();
			} catch (_a) {}
		});
	}
	async parseRedirectResult() {
		var _a;
		const url = new URL(window.location.href);
		const stateRaw = localStorage.getItem(SocialLoginWeb.OAUTH_STATE_KEY);
		let provider = null;
		let state;
		let nonce;
		if (stateRaw) try {
			const parsed = JSON.parse(stateRaw);
			provider = (_a = parsed.provider) !== null && _a !== void 0 ? _a : null;
			state = parsed.state;
			nonce = parsed.nonce;
		} catch (_b) {
			provider = stateRaw === "true" ? "google" : null;
		}
		let result;
		switch (provider) {
			case "twitter":
				result = await this.twitterProvider.handleOAuthRedirect(url, state);
				break;
			case "telegram":
				result = await this.telegramProvider.handleOAuthRedirect(url, state);
				break;
			case "oauth2":
				result = await this.oauth2Provider.handleOAuthRedirect(url, state);
				break;
			default: result = this.googleProvider.handleOAuthRedirect(url);
		}
		return {
			provider,
			state,
			nonce,
			result
		};
	}
	async finishOAuthRedirectInPopup() {
		var _a, _b, _c;
		const parsed = await this.parseRedirectResult();
		const nonceOrState = (_a = parsed.nonce) !== null && _a !== void 0 ? _a : parsed.state;
		let message;
		if (!parsed.result) message = {
			type: "oauth-error",
			provider: parsed.provider,
			error: "OAuth redirect did not contain expected parameters."
		};
		else if ("error" in parsed.result) {
			const resolvedProvider = (_b = parsed.provider) !== null && _b !== void 0 ? _b : null;
			const error = inferUserCancelledError(parsed.result.error);
			message = Object.assign({
				type: "oauth-error",
				provider: resolvedProvider,
				error: error.message
			}, error.code ? { code: error.code } : null);
		} else message = Object.assign({
			type: "oauth-response",
			provider: parsed.result.provider
		}, parsed.result.result);
		deliverOAuthResult((_c = parsed.provider) !== null && _c !== void 0 ? _c : "google", nonceOrState, message);
		clearOAuthPopupMarker();
		try {
			window.close();
		} catch (_d) {}
	}
	async initialize(options) {
		var _a, _b, _c, _d, _e, _f;
		const initPromises = [];
		if ((_a = options.google) === null || _a === void 0 ? void 0 : _a.webClientId) initPromises.push(this.googleProvider.initialize(options.google.webClientId, options.google.mode, options.google.hostedDomain, options.google.redirectUrl));
		if ((_b = options.apple) === null || _b === void 0 ? void 0 : _b.clientId) initPromises.push(this.appleProvider.initialize(options.apple.clientId, options.apple.redirectUrl, options.apple.useProperTokenExchange));
		if ((_c = options.facebook) === null || _c === void 0 ? void 0 : _c.appId) initPromises.push(this.facebookProvider.initialize(options.facebook.appId, options.facebook.locale));
		if ((_d = options.twitter) === null || _d === void 0 ? void 0 : _d.clientId) initPromises.push(this.twitterProvider.initialize(options.twitter.clientId, options.twitter.redirectUrl, options.twitter.defaultScopes, options.twitter.forceLogin, options.twitter.audience));
		if ((_e = options.telegram) === null || _e === void 0 ? void 0 : _e.botId) this.telegramProvider.initialize(options.telegram.botId, options.telegram.requestAccess, options.telegram.redirectUrl, options.telegram.origin, options.telegram.languageCode);
		const oauth2Configs = Object.assign({}, (_f = options.oauth2) !== null && _f !== void 0 ? _f : {});
		if (options.linkedin && !oauth2Configs["linkedin"]) oauth2Configs[LINKEDIN_PROVIDER_ID] = buildLinkedInOAuthConfig(options.linkedin);
		if (options.tiktok) {
			if (!options.tiktok.clientKey || !options.tiktok.redirectUrl) throw new Error("tiktok.clientKey and tiktok.redirectUrl are required");
			if (!oauth2Configs["tiktok"]) oauth2Configs[TIKTOK_PROVIDER_ID] = buildTikTokOAuthConfig(options.tiktok);
		}
		if (Object.keys(oauth2Configs).length > 0) initPromises.push(this.oauth2Provider.initializeProviders(oauth2Configs));
		await Promise.all(initPromises);
	}
	async login(options) {
		var _a;
		switch (options.provider) {
			case "google": return this.googleProvider.login(options.options);
			case "apple": return this.appleProvider.login(options.options);
			case "facebook": return this.facebookProvider.login(options.options);
			case "twitter": return this.twitterProvider.login(options.options);
			case "telegram": return this.telegramProvider.login(options.options);
			case "linkedin": {
				const linkedInOptions = (_a = options.options) !== null && _a !== void 0 ? _a : {};
				const oauthOptions = buildLinkedInLoginOptions(linkedInOptions);
				if (oauthOptions.flow === "redirect" && oauthOptions.state) markLinkedInRedirectPending(oauthOptions.state);
				const response = await this.oauth2Provider.login(oauthOptions);
				return asLinkedInLoginResult(response);
			}
			case "tiktok": {
				const response = await this.oauth2Provider.login(buildTikTokLoginOptions(options.options));
				return asTikTokLoginResult(response);
			}
			case "oauth2": return this.oauth2Provider.login(options.options);
			default: throw new Error(`Login for ${options.provider} is not implemented on web`);
		}
	}
	async logout(options) {
		switch (options.provider) {
			case "google": return this.googleProvider.logout();
			case "apple": return this.appleProvider.logout();
			case "facebook": return this.facebookProvider.logout();
			case "twitter": return this.twitterProvider.logout();
			case "telegram": return this.telegramProvider.logout();
			case "linkedin": return this.oauth2Provider.logout(LINKEDIN_PROVIDER_ID);
			case "tiktok": return this.oauth2Provider.logout(TIKTOK_PROVIDER_ID);
			case "oauth2":
				if (!options.providerId) throw new Error("providerId is required for oauth2 logout");
				return this.oauth2Provider.logout(options.providerId);
			default: throw new Error(`Logout for ${options.provider} is not implemented`);
		}
	}
	async isLoggedIn(options) {
		switch (options.provider) {
			case "google": return this.googleProvider.isLoggedIn();
			case "apple": return this.appleProvider.isLoggedIn();
			case "facebook": return this.facebookProvider.isLoggedIn();
			case "twitter": return this.twitterProvider.isLoggedIn();
			case "telegram": return this.telegramProvider.isLoggedIn();
			case "linkedin": return this.oauth2Provider.isLoggedIn(LINKEDIN_PROVIDER_ID);
			case "tiktok": return this.oauth2Provider.isLoggedIn(TIKTOK_PROVIDER_ID);
			case "oauth2":
				if (!options.providerId) throw new Error("providerId is required for oauth2 isLoggedIn");
				return this.oauth2Provider.isLoggedIn(options.providerId);
			default: throw new Error(`isLoggedIn for ${options.provider} is not implemented`);
		}
	}
	async getAuthorizationCode(options) {
		switch (options.provider) {
			case "google": return this.googleProvider.getAuthorizationCode();
			case "apple": return this.appleProvider.getAuthorizationCode();
			case "facebook": return this.facebookProvider.getAuthorizationCode();
			case "twitter": return this.twitterProvider.getAuthorizationCode();
			case "linkedin": return this.oauth2Provider.getAuthorizationCode(LINKEDIN_PROVIDER_ID);
			case "tiktok": return this.oauth2Provider.getAuthorizationCode(TIKTOK_PROVIDER_ID);
			case "oauth2":
				if (!options.providerId) throw new Error("providerId is required for oauth2 getAuthorizationCode");
				return this.oauth2Provider.getAuthorizationCode(options.providerId);
			default: throw new Error(`getAuthorizationCode for ${options.provider} is not implemented`);
		}
	}
	async refresh(options) {
		switch (options.provider) {
			case "google": return this.googleProvider.refresh();
			case "apple": return this.appleProvider.refresh();
			case "facebook": return this.facebookProvider.refresh(options.options);
			case "twitter": return this.twitterProvider.refresh();
			case "telegram": return this.telegramProvider.refresh();
			case "linkedin": return this.oauth2Provider.refresh(LINKEDIN_PROVIDER_ID);
			case "tiktok": return this.oauth2Provider.refresh(TIKTOK_PROVIDER_ID);
			case "oauth2": {
				const oauth2Options = options.options;
				if (!(oauth2Options === null || oauth2Options === void 0 ? void 0 : oauth2Options.providerId)) throw new Error("providerId is required for oauth2 refresh");
				return this.oauth2Provider.refresh(oauth2Options.providerId);
			}
			default: throw new Error(`Refresh for ${options.provider} is not implemented`);
		}
	}
	async providerSpecificCall(options) {
		var _a;
		switch (options.call) {
			case "facebook#getProfile": {
				const fields = (_a = options.options) === null || _a === void 0 ? void 0 : _a.fields;
				return this.facebookProvider.getProfile(fields);
			}
			case "facebook#requestTracking": return this.facebookProvider.requestTracking();
			case "google#createRestoreCredential":
			case "google#getRestoreCredential":
			case "google#clearRestoreCredential": throw new Error(`${options.call} is only available on Android`);
			default: throw new Error(`Provider specific call for ${options.call} is not implemented`);
		}
	}
	async refreshToken(options) {
		if (options.provider === "linkedin") return this.oauth2Provider.refreshToken(LINKEDIN_PROVIDER_ID, options.refreshToken, options.additionalParameters);
		if (options.provider === "tiktok") return this.oauth2Provider.refreshToken(TIKTOK_PROVIDER_ID, options.refreshToken, options.additionalParameters);
		if (options.provider !== "oauth2") throw new Error("refreshToken is only implemented for oauth2, linkedin, and tiktok on web");
		return this.oauth2Provider.refreshToken(options.providerId, options.refreshToken, options.additionalParameters);
	}
	async handleRedirectCallback() {
		var _a;
		const parsed = await this.parseRedirectResult();
		const callbackState = (_a = parsed.state) !== null && _a !== void 0 ? _a : new URL(window.location.href).searchParams.get("state");
		const pendingLinkedInRedirect = consumeLinkedInRedirectPending(callbackState);
		const result = parsed.result;
		if (!result) return null;
		if ("error" in result) throw inferUserCancelledError(result.error);
		if (pendingLinkedInRedirect && isLinkedInOAuthResult(result)) return asLinkedInLoginResult(result);
		if (isTikTokOAuthResult(result)) return asTikTokLoginResult(result);
		return result;
	}
	async decodeIdToken(options) {
		var _a;
		const token = (_a = options === null || options === void 0 ? void 0 : options.idToken) !== null && _a !== void 0 ? _a : options === null || options === void 0 ? void 0 : options.token;
		if (!token) throw new Error("idToken (or token) is required");
		return { claims: this.oauth2Provider.decodeIdToken(token) };
	}
	async getAccessTokenExpirationDate(options) {
		if (typeof (options === null || options === void 0 ? void 0 : options.accessTokenExpirationDate) !== "number") throw new Error("accessTokenExpirationDate is required");
		return { date: new Date(options.accessTokenExpirationDate).toISOString() };
	}
	async isAccessTokenAvailable(options) {
		var _a;
		const token = (_a = options === null || options === void 0 ? void 0 : options.accessToken) !== null && _a !== void 0 ? _a : null;
		return { isAvailable: typeof token === "string" && token.length > 0 };
	}
	async isAccessTokenExpired(options) {
		if (typeof (options === null || options === void 0 ? void 0 : options.accessTokenExpirationDate) !== "number") throw new Error("accessTokenExpirationDate is required");
		return { isExpired: options.accessTokenExpirationDate <= Date.now() };
	}
	async isRefreshTokenAvailable(options) {
		var _a;
		const token = (_a = options === null || options === void 0 ? void 0 : options.refreshToken) !== null && _a !== void 0 ? _a : null;
		return { isAvailable: typeof token === "string" && token.length > 0 };
	}
	async getPluginVersion() {
		return { version: "web" };
	}
	async openSecureWindow(options) {
		return { redirectedUri: await this.runWebAuthPopup({
			url: options.authEndpoint,
			redirectPrefix: options.redirectUri,
			broadcastChannelName: options.broadcastChannelName
		}) };
	}
	async openAuthSession(options) {
		var _a;
		const redirectPrefixes = [`${options.callbackURLScheme}://`];
		try {
			const redirectUri = new URL(options.url).searchParams.get("redirect_uri");
			if (redirectUri && /^https?:\/\//i.test(redirectUri) && !redirectPrefixes.includes(redirectUri)) redirectPrefixes.unshift(redirectUri);
		} catch (_b) {}
		return { callbackURL: await this.runWebAuthPopup({
			url: options.url,
			redirectPrefixes,
			broadcastChannelName: (_a = options.broadcastChannelName) !== null && _a !== void 0 ? _a : "capgo-auth-session"
		}) };
	}
	runWebAuthPopup(options) {
		var _a;
		if (this.webAuthPopupInProgress) return Promise.reject(/* @__PURE__ */ new Error("Another auth session is already in progress"));
		this.webAuthPopupInProgress = true;
		let popup = null;
		let bc = null;
		let pollTimer = 0;
		let timeoutTimer = 0;
		const releasePopupGuard = () => {
			this.webAuthPopupInProgress = false;
			if (pollTimer) {
				window.clearInterval(pollTimer);
				pollTimer = 0;
			}
			if (timeoutTimer) {
				window.clearTimeout(timeoutTimer);
				timeoutTimer = 0;
			}
			if (bc) {
				try {
					bc.close();
				} catch (_a) {}
				bc = null;
			}
		};
		try {
			const w = 600;
			const h = 550;
			const settings = [
				["width", w],
				["height", h],
				["left", screen.width / 2 - w / 2],
				["top", screen.height / 2 - h / 2]
			].map((x) => x.join("=")).join(",");
			popup = window.open(options.url, "Authorization", settings);
			if (!popup) {
				releasePopupGuard();
				return Promise.reject(/* @__PURE__ */ new Error("Unable to open authorization popup. Allow popups for this origin."));
			}
			if (typeof popup.focus === "function") popup.focus();
			const channelName = (_a = options.broadcastChannelName) !== null && _a !== void 0 ? _a : "oauth-channel";
			bc = new BroadcastChannel(channelName);
		} catch (error) {
			releasePopupGuard();
			if (popup && !popup.closed) try {
				popup.close();
			} catch (_b) {}
			throw error;
		}
		const activePopup = popup;
		const activeBc = bc;
		if (!activeBc) {
			releasePopupGuard();
			return Promise.reject(/* @__PURE__ */ new Error("Unable to open authorization channel"));
		}
		return new Promise((resolve, reject) => {
			var _a;
			let settled = false;
			const prefixes = (_a = options.redirectPrefixes) !== null && _a !== void 0 ? _a : options.redirectPrefix != null ? [options.redirectPrefix] : [];
			const finish = (handler) => {
				if (settled) return;
				settled = true;
				releasePopupGuard();
				handler();
			};
			activeBc.addEventListener("message", (event) => {
				var _a;
				const data = typeof event.data === "string" ? event.data : String((_a = event.data) !== null && _a !== void 0 ? _a : "");
				if (prefixes.some((prefix) => data.startsWith(prefix))) {
					finish(() => resolve(data));
					return;
				}
				if (/^https?:\/\//i.test(data) || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(data)) finish(() => reject(/* @__PURE__ */ new Error("Redirect URI does not match expected prefix. Received: " + data + " Expected one of: " + prefixes.join(", "))));
			});
			let popupClosePollState = { graceStartedAtMs: null };
			pollTimer = window.setInterval(() => {
				try {
					const closed = activePopup.closed;
					const pollResult = nextPopupClosePollState(closed, popupClosePollState, Date.now());
					popupClosePollState = pollResult.state;
					if (pollResult.shouldCancel) finish(() => reject(createUserCancelledError("User cancelled authorization")));
				} catch (_a) {
					window.clearInterval(pollTimer);
					pollTimer = 0;
				}
			}, 500);
			timeoutTimer = window.setTimeout(() => {
				finish(() => reject(/* @__PURE__ */ new Error("The sign-in flow timed out")));
			}, 3e5);
		});
	}
};
SocialLoginWeb.OAUTH_STATE_KEY = OAUTH_STATE_KEY;
export { SocialLoginWeb };
