# Ātmanya Yoga

Movement to Stillness.

Traditional Hatha Yoga practices for developing strength, awareness, balance and inner stillness.

## About

Ātmanya Yoga offers live online traditional Hatha Yoga group classes for beginners and practitioners at all levels. Through guided sessions of asana, pranayama, concentration and yogic philosophy, students build a consistent and sustainable practice.

## Local development

The site is a set of static pages and needs no build step.

- Open `index.html` directly, or
- Serve the folder with any static server, for example:

  ```bash
  npx serve .
  ```

## Deploying to GitHub Pages

The site is ready to be hosted on GitHub Pages.

1. Push these files to a repository (for example `kartheekthangella/atmanya-yoga`).
2. In the repository on GitHub, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to:

   - `Deploy from a branch` → Branch: `main` / folder: `/` , or
   - GitHub Actions, using the included workflow.

4. Save and wait for the deployment to complete.

A `.nojekyll` file is included so GitHub Pages serves the static files directly.

If deploying via the `gh-pages` branch instead, push the contents of this folder to the `gh-pages` branch.

## Site structure

| File | Purpose |
|---|---|
| `index.html` | Home page |
| `courses.html` | Online courses, schedules, membership and fees |
| `contact.html` | Contact, registration and enquiry form, payment and membership terms |
| `privacy-policy.html` | Privacy Policy |
| `terms-conditions.html` | Terms & Conditions |
| `css/style.css` | Styles |
| `js/main.js` | Navigation, form and footer behaviour |
| `assets/favicon.svg` | Favicon |

## Placeholder content

The following values are intentionally left as placeholders and need to be filled before launch:

- Official email address
- Instagram link
- UPI ID and UPI QR code
- Bank transfer details (Europe)
