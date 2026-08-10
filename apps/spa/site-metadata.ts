import { SITE_URL } from '../../packages/shared/src/constants/site'

const SITE_HOME_URL = new URL('/', SITE_URL).toString()
const OG_IMAGE_URL = new URL('/og-image.png', SITE_URL).toString()

const siteMetadataMarkup = `    <link rel="canonical" href="${SITE_HOME_URL}" />
    <meta property="og:url" content="${SITE_HOME_URL}" />
    <meta property="og:image" content="${OG_IMAGE_URL}" />
    <meta name="twitter:image" content="${OG_IMAGE_URL}" />`

export function injectSiteMetadata(html: string) {
  return html.replace('  </head>', `${siteMetadataMarkup}\n  </head>`)
}
