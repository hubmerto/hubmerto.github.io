import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default function handler(request) {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'hubmerto';
    const subtitle = searchParams.get('subtitle') || 'Creative direction at the edge of code.';
    const eyebrow = searchParams.get('eyebrow') || '';

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    background: '#0a0a0a',
                    color: '#ffffff',
                    fontFamily: 'sans-serif',
                    position: 'relative',
                }}
            >
                {/* Bust image as background, right-anchored */}
                <img
                    src="https://hubmerto.com/og.png"
                    width="1200"
                    height="630"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: 0.55,
                    }}
                />

                {/* Left-aligned text overlay */}
                <div
                    style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        padding: '72px 80px',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(90deg, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.65) 55%, rgba(10,10,10,0) 100%)',
                    }}
                >
                    {eyebrow ? (
                        <div
                            style={{
                                fontSize: 22,
                                color: '#888',
                                letterSpacing: '0.2em',
                                textTransform: 'uppercase',
                                marginBottom: 28,
                            }}
                        >
                            {eyebrow}
                        </div>
                    ) : null}

                    <div
                        style={{
                            fontSize: 84,
                            fontWeight: 600,
                            color: '#ffffff',
                            lineHeight: 1.05,
                            marginBottom: 24,
                            letterSpacing: '-0.01em',
                            maxWidth: '85%',
                        }}
                    >
                        {title}
                    </div>

                    <div
                        style={{
                            fontSize: 30,
                            color: '#bbbbbb',
                            lineHeight: 1.35,
                            maxWidth: '70%',
                        }}
                    >
                        {subtitle}
                    </div>

                    <div
                        style={{
                            position: 'absolute',
                            top: 56,
                            left: 80,
                            fontSize: 22,
                            color: '#777',
                            letterSpacing: '0.25em',
                            textTransform: 'uppercase',
                        }}
                    >
                        hubmerto
                    </div>
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        },
    );
}
