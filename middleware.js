export const config = {
    matcher: '/((?!_vercel|favicon\\.svg|robots\\.txt|sitemap\\.xml|og\\.png|og-square\\.png).*)',
    runtime: 'edge'
};

export default function middleware(req) {
    const user = process.env.SITE_USER || 'hubmerto';
    const pass = process.env.SITE_PASSWORD;

    // If no password is set on the deploy, the site is public.
    if (!pass) return;

    const auth = req.headers.get('authorization');
    const expected = 'Basic ' + btoa(user + ':' + pass);

    if (auth === expected) return;

    return new Response('Authentication required.', {
        status: 401,
        headers: {
            'WWW-Authenticate': 'Basic realm="hubmerto.com", charset="UTF-8"',
            'Content-Type': 'text/plain; charset=utf-8'
        }
    });
}
