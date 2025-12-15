const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://base-piggy-bank.vercel.app';

export default function Head() {
  const miniappEmbed = {
    version: 'next',
    imageUrl: `${APP_URL}/miniapp-preview.png`,
    button: {
      title: 'Open App',
      action: {
        type: 'launch_frame',
        url: APP_URL,
        name: 'Base Piggy Bank',
        splashImageUrl: `${APP_URL}/icon-512.png`,
        splashBackgroundColor: '#2563EB',
      },
    },
  };

  return (
    <>
      {/* Base app ownership */}
      <meta name="base:app_id" content="693aa07d8a7c4e55fec73dfe" />

      {/* Base Mini App embed metadata (must be present on homeUrl) */}
      <meta name="fc:miniapp" content={JSON.stringify(miniappEmbed)} />

      {/* Farcaster Frame metadata (optional, but kept for compatibility) */}
      <meta name="fc:frame" content="vNext" />
      <meta name="fc:frame:image" content={`${APP_URL}/og-image.png`} />
      <meta name="fc:frame:image:aspect_ratio" content="1.91:1" />
      <meta name="fc:frame:post_url" content={`${APP_URL}/api/frame`} />
      <meta name="fc:frame:button:1" content="Launch Piggy Bank 🚀" />
      <meta name="fc:frame:button:1:action" content="link" />
      <meta name="fc:frame:button:1:target" content={APP_URL} />
    </>
  );
}


