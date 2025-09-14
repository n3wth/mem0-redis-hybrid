# Creating Favicon Files for Recall

## Quick Method (Online)
1. Use the SVG from `recall-logo-assets.svg` (16x16 or 32x32 version)
2. Go to https://realfavicongenerator.net or https://favicon.io/favicon-converter/
3. Upload the SVG
4. Download the favicon package

## Manual Method (Command Line)

### Install ImageMagick (if not installed)
```bash
brew install imagemagick
```

### Create ICO file from SVG
```bash
# Create multiple sizes and combine into ICO
convert -density 256x256 -background transparent recall-logo-assets.svg -resize 16x16 favicon-16.png
convert -density 256x256 -background transparent recall-logo-assets.svg -resize 32x32 favicon-32.png
convert -density 256x256 -background transparent recall-logo-assets.svg -resize 48x48 favicon-48.png
convert favicon-16.png favicon-32.png favicon-48.png favicon.ico

# Or in one command
convert -density 256x256 -background transparent recall-logo-assets.svg \
  -define icon:auto-resize=48,32,16 favicon.ico
```

## For Web Use

### HTML Head Tags
```html
<!-- Favicon -->
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">

<!-- Apple Touch Icon -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

<!-- Android Chrome -->
<link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
<link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">

<!-- Other sizes -->
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">

<!-- Web Manifest -->
<link rel="manifest" href="/site.webmanifest">
```

### Web Manifest (site.webmanifest)
```json
{
  "name": "Recall",
  "short_name": "Recall",
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "theme_color": "#4F46E5",
  "background_color": "#ffffff",
  "display": "standalone"
}
```

## Color Palette

- **Primary:** #4F46E5 (Indigo)
- **Secondary:** #FF6B6B (Coral)
- **Success:** #10B981 (Emerald)
- **Dark Mode:** #ffffff on dark backgrounds
- **Light Mode:** #4F46E5 on light backgrounds

## Logo Usage Guidelines

1. **Minimum Size:** 16x16px for favicon, 40x40px for general use
2. **Clear Space:** Keep at least 1/4 of the logo's width as clear space around it
3. **Background:** Works on both light and dark backgrounds
4. **Animation:** Use sparingly, only for loading states or special emphasis
5. **Consistency:** Always use the official color palette