# /public/images — DriverNord Visual Assets

Place production image files here. The site wires up these exact paths.
Missing images degrade gracefully (the containers show the blue background fallback).

## Required assets

| File | Used on | Brief |
|------|---------|-------|
| `driver-hero.jpg` | `/chaufforer` hero (desktop right column) | Professional truck driver portrait. Diverse representation — Black or Arab-looking male, 30–45 y.o., professional workwear in site-blue tones (navy jacket/polo), neutral industrial or dockyard backdrop. No DriverNord logo on vehicle. Confident, forward-facing or three-quarter angle. Format: portrait 3:4, min 1200×1600 px. |
| `company-trust.jpg` | `/company` trust section (left column) | Professional interaction between two people in an industrial / logistics environment. Diverse pair — one person of colour, one light-skinned. Both professional attire, no exaggerated stock-photo energy. Handshake or discussion over a clipboard is fine. No DriverNord branding on vehicles. Format: landscape 4:3, min 1600×1200 px. |
| `about-portrait.jpg` | `/about` between "Vad vi gör" and "Varför vi finns" | Wide-format human scene in a transport / logistics yard or industrial exterior. Multiple people visible if possible, diverse crew. Relaxed professional tone — not staged. Clothing accents in dark navy / site blue. No large DriverNord branding on trucks. Format: landscape 16:7, min 1600×700 px. |

## Style rules
- Swedish professional tone: clean, realistic, human
- Blue clothing accents aligned with site blue (Tailwind blue-600/blue-800 = #2563eb / #1e40af)
- No fake DriverNord fleet branding on trucks
- Diverse representation — Black and/or Arab-looking professionals where fitting
- No exaggerated stock-photo energy
- Compressed for web: target < 300 KB per image (use WebP if possible)
