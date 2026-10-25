// Hosted mode (mtg.zekzek.net): Google sign-in through Cognito, data and art read from a private bucket.
// The local build (served by MTG/DeckSite/server.py) never loads any of this.
import config from "../hosted-config.json";

export const HOSTED = import.meta.env.PUBLIC_DECKSITE_MODE === "hosted";

let ready: Promise<void> | null = null;

/** Configure Amplify once, and handle the return from Google's sign-in page. */
export function setup(): Promise<void> {
  ready ??= (async () => {
    if (!config.userPoolId) throw new Error("hosted-config.json is empty: deploy sites/mtg/infra first");
    const { Amplify } = await import("aws-amplify");
    await import("aws-amplify/auth/enable-oauth-listener");
    const site = `${location.origin}/`;
    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId: config.userPoolId,
          userPoolClientId: config.userPoolClientId,
          identityPoolId: config.identityPoolId,
          loginWith: {
            oauth: {
              domain: config.signInDomain,
              scopes: ["openid", "email", "profile"],
              redirectSignIn: [site],
              redirectSignOut: [site],
              responseType: "code",
            },
          },
        },
      },
      Storage: { S3: { bucket: config.bucket, region: config.region } },
    });
  })();
  return ready;
}

export type AuthState = { signedIn: true; email: string } | { signedIn: false; error?: string };

/** Who's signed in. Also reports a refused sign-in (not on the allow-list) coming back from Google. */
export async function authState(): Promise<AuthState> {
  await setup();
  const { fetchAuthSession } = await import("aws-amplify/auth");
  const redirectError = await signInError();
  try {
    const session = await fetchAuthSession();
    const email = session.tokens?.idToken?.payload?.email;
    if (session.tokens && typeof email === "string") return { signedIn: true, email };
  } catch {}
  return { signedIn: false, error: redirectError };
}

/** Cognito sends refused sign-ins back as ?error_description=... on the site address. */
async function signInError(): Promise<string | undefined> {
  const params = new URLSearchParams(location.search);
  const text = params.get("error_description");
  if (!text) return undefined;
  history.replaceState(null, "", location.pathname + location.hash);
  if (/allow-list/i.test(text)) return "That Google account isn't allowed to use Deck Shelf.";
  return text.replace(/^PreSignUp failed with error /, "").replace(/\.\s*$/, "") + ".";
}

export async function signIn(): Promise<void> {
  await setup();
  const { signInWithRedirect } = await import("aws-amplify/auth");
  await signInWithRedirect({ provider: "Google" });
}

export async function signOut(): Promise<void> {
  await setup();
  const { signOut } = await import("aws-amplify/auth");
  await signOut();
}

/** A signed link to a private file in the bucket, good for an hour. */
export async function signedUrl(path: string): Promise<string> {
  await setup();
  const { getUrl } = await import("aws-amplify/storage");
  const { url } = await getUrl({ path, options: { expiresIn: 3600 } });
  return url.toString();
}

export async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(await signedUrl(path), { cache: "no-store" });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

/** Swap every "s3:<path>" string in loaded data for a signed link (proxy art, printed cards, PDFs). */
export async function signAll<T>(data: T): Promise<T> {
  const paths = new Set<string>();
  JSON.stringify(data, (_k, v) => {
    if (typeof v === "string" && v.startsWith("s3:")) paths.add(v);
    return v;
  });
  const signed = new Map(await Promise.all([...paths].map(async (p) => [p, await signedUrl(p.slice(3))] as const)));
  return JSON.parse(JSON.stringify(data), (_k, v) => (typeof v === "string" && signed.has(v) ? signed.get(v) : v));
}
