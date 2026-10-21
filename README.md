# Bike Box Bath

Light sports design with electric lime accents. Original product photographs have no tint, filters or decoration over them.

## Hire journey

The homepage quote carries directly into a three-step dates, details and review flow. A collection date starts a five-day quote; 5/7/10/14-day shortcuts check the selected range. Desktop shows two calendar months. Mobile shows one month and keeps the total and next action at the bottom of the screen. Personal details stay in page memory across route and step changes, and are cleared by a full reload.

The optional flight/message fields are collapsed by default. Terms must be accepted before a website request is sent; the server records the terms version and acceptance time. Existing databases are migrated without claiming acceptance for older records. Request retries reuse a reference, while changing the details generates a new request identity.

With the VPS API connected, submission creates a pending hire and returns a real reference. Without it, the action explicitly opens an email draft. This release does not process PayPal payments, send automatic emails, create checkout stock holds or automatically confirm bookings. Those integrations still require implementation, business credentials and end-to-end testing before a self-service launch.

## Quoting

Fixed £11 per calendar day; minimum 5 days. Collection and return dates both count. Refundable deposit £150. Late returns £40 per calendar day after the due date.

Five days: £55 hire + £150 deposit = £205. Seven days: £77 hire + £150 deposit = £227. Late fees are additional, not an extra charge on an on-time quote. Pricing uses integer pennies and the same calculation on the client and rental server.

## Run and check

Node.js 24 LTS, no npm install or third-party packages required:

    npm run dev
    npm run build
    npm test

The static preview runs at http://127.0.0.1:4173/home/ . Tests cover pricing, minimum hire, date arithmetic, overlapping allocations, physical checks, late fees, deposit balances, stale updates, authentication, origin and CSRF checks, request retries and client-price tampering.

## Admin and stored requests

Admin is at /home/#/admin. The included Node/SQLite service stores requests and protects admin data behind password sign-in. It supports pending/confirmed/collected/returned/cancelled statuses, case inventory, overlapping-date checks, payment/deposit records, cash checks, ID and condition notes, actual return dates, late charges, damage notes, deposit refunds and anonymisation of eligible records. All admin reads and writes are checked on the server. No ID scans or case photo upload are provided; keep condition photos securely outside the public site.

No default live password, sample customers or sample hires are installed. One case, Easyfit 01, is created initially; configure actual inventory before taking requests. Admin lists the most recent 1,000 records. There is one operator account; user roles and multiple staff accounts are not included.

No card checkout, PayPal integration, bank verification, automatic emails or refund transfers are connected. PayPal, BACS and cash are handled separately. The payment and refund fields are records only. A request does not reserve stock; confirmation allocates a case. Pending requests do not hold dates. Client calendars are advisory; availability is checked again when a request is stored and a case confirmed.

## VPS versus hosted preview

The Sites preview remains static and owner-private. Automatic quotes and email enquiry drafts work there. The admin explains that its service needs connecting; it does not expose a pretend working login or browser-stored rental data.

For the VPS, follow deploy/VPS-SETUP.md. Upload public dist files as home, install private server code under /opt/bikeboxbath, configure the admin password locally, and connect Nginx to the loopback API. Runtime is disabled by default in dist/runtime.json. Enable it only after the server and HTTPS checks pass. No VPS changes have been made from this chat.

In the VPS ZIP: home is public; server and deploy must stay outside the web root. Database and environment configuration are private and must never enter Git, public files or the ZIP. Back up /var/lib/bikeboxbath privately. Restarting the service clears sessions. Passwords use salted scrypt; production sessions use Secure, HttpOnly, SameSite cookies and CSRF tokens, with rate-limited sign-in and bounded requests.

## Privacy and launch

Publish the final operator/retention and cancellation/insurance arrangements before trading. The website collects no ID numbers, scans, card data or banking credentials. Enquiries and rental records contain personal data; limit access and agree deletion/backup retention. Noindex remains enabled while launch details are unfinished.

Product photographs are exact model references from Bike Box Alan. Commercial reuse permission has not been established: obtain permission or use owned photographs of the actual rental unit before public commercial use. Hire-unit decals and wear may differ. No manufacturer partnership is claimed.

## Sources and licences

Product: https://bikeboxalan.com/product/triathlon-easyfit/
Technical information: https://bikeboxalan.com/about-bike-box-alan/technical-information-new/
Bath: https://commons.wikimedia.org/wiki/File:Pulteney_Bridge,_Bath,_front_view.jpg — Fahdshariff, public domain.
Barlow / Barlow Condensed: SIL Open Font License, included with the font assets.
Airline policy links and date checked are in the airline guide; they are not live airline quotes.

The George Aston / Bike Box Bath proprietary software licence is retained in LICENSE.txt. Third-party assets retain their own licences.
