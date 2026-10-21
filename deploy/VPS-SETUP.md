# Enable quotes and rental admin on bikeboxbath.co.uk

Automatic quotes work with the static website. The password-protected admin, stored requests and availability need the included server service.

No paid packages or external database are required. The server uses Node.js 24 LTS and its built-in SQLite database. PayPal, BACS and cash payments remain manual; the admin records payment and refunds, and does not move money. Customer emails are sent separately.

## 1. Upload the files

Unzip Bike-Box-Bath-VPS.zip. Upload its home, server and deploy folders into your Ubuntu user directory using SFTP.

Only home belongs in the public website directory. Keep server and the password configuration outside the web root.

Back up the existing site, then update it:

    sudo install -d -m 700 /var/backups/bikeboxbath
    sudo cp -a /var/www/bikeboxbath/home "/var/backups/bikeboxbath/home-$(date +%Y%m%d-%H%M%S)"
    sudo cp -a ~/home/. /var/www/bikeboxbath/home/
    sudo find /var/www/bikeboxbath/home -type d -exec chmod 755 {} \;
    sudo find /var/www/bikeboxbath/home -type f -exec chmod 644 {} \;

Leave runtime.json set to {"apiEnabled":false} until step 6. The automatic calculator and email enquiry fallback work while the service is off.

## 2. Check Node

    node --version
    command -v node

Use a system-wide Node.js 24 LTS installation. If missing or older, use the official instructions at https://nodejs.org/en/download. No npm install is needed.

The supplied service uses /usr/bin/node. If command -v node reports another system-wide location, edit ExecStart in deploy/bikeboxbath.service to that absolute path. A Node binary inside a personal home directory will not work with the protected service configuration.

## 3. Install the private service and create the account

Create the dedicated service user if it does not already exist:

    id bikeboxbath

If that reports no such user:

    sudo useradd --system --user-group --home-dir /var/lib/bikeboxbath --shell /usr/sbin/nologin bikeboxbath

Then install:

    sudo install -d -m 755 /opt/bikeboxbath
    sudo cp -a ~/server/. /opt/bikeboxbath/
    sudo chown -R root:bikeboxbath /opt/bikeboxbath
    sudo find /opt/bikeboxbath -type d -exec chmod 750 {} \;
    sudo find /opt/bikeboxbath -type f -exec chmod 640 {} \;
    sudo install -d -o bikeboxbath -g bikeboxbath -m 700 /var/lib/bikeboxbath
    sudo node /opt/bikeboxbath/api/setup-admin.mjs /etc/bikeboxbath.env

Enter https://bikeboxbath.co.uk as the origin, choose the username and set a password of at least 14 characters. Password input is hidden. Only a salted scrypt hash is saved; do not share the password or configuration file in chat or GitHub.

    sudo chmod 600 /etc/bikeboxbath.env
    sudo cp ~/deploy/bikeboxbath.service /etc/systemd/system/bikeboxbath.service
    sudo systemctl daemon-reload
    sudo systemctl enable --now bikeboxbath
    sudo systemctl status bikeboxbath --no-pager
    curl http://127.0.0.1:4174/health

Health should return ready:true and the £11 / £150 / £40 / 5-day pricing. The API only listens on loopback; do not open port 4174 to the Internet.

## 4. Connect Nginx

Back up the existing Nginx site configuration. Add the contents of deploy/nginx-api.conf INSIDE the existing HTTPS server block for bikeboxbath.co.uk. Keep the existing /home/ static location, certificate and unrelated routes.

    sudo nginx -t

If it passes:

    sudo systemctl reload nginx
    curl https://bikeboxbath.co.uk/home/api/health

That URL must return JSON, not the website HTML. Its response must have Cache-Control: no-store. If Cloudflare is in front of the VPS, bypass caching for /home/api/* and use HTTPS end-to-end with Full (strict) and a valid origin certificate.

Reference: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass

## 5. Configure inventory and check sign-in

The database starts empty with one active case named Easyfit 01. No sample customers or bookings are installed. In admin, rename/add cases to match the actual inventory before accepting requests. Disable a case to stop new allocations; active hires must be completed or reallocated first.

After step 6, admin is at:

    https://bikeboxbath.co.uk/home/#/admin

It uses secure, HttpOnly, SameSite cookies, expiring sessions, rate-limited login and server-checked permissions/CSRF tokens. Passwords, sessions and customer data are never kept in browser storage. Restarting the service clears sign-in sessions.

## 6. Switch the connection on

Only after the API and HTTPS checks pass:

    printf '{"apiEnabled":true}\n' | sudo tee /var/www/bikeboxbath/home/runtime.json

Refresh without cache. Open /home/#/admin and sign in. Add your real case inventory. Test one request with your own email and a future five-day range, confirm it in admin, and check those dates become unavailable. Cancel the test record afterwards if it is not a real hire.

If the site cannot connect, keep email enquiries available by switching back:

    printf '{"apiEnabled":false}\n' | sudo tee /var/www/bikeboxbath/home/runtime.json

## Using admin

- Pending requests do not reserve stock. Confirming allocates a case and checks date overlaps. Inclusive collection/return dates cannot overlap on the same case.
- Collection requires payment and deposit received, photo ID, case inspection notes, and a cash authenticity check when paying cash.
- Return requires an actual return date, inspection and notes. Late fees are £40 for each calendar day after the due date.
- Damage charges need a written reason. The system calculates the remaining deposit and any charges beyond it.
- Record the amount actually refunded and mark settlement complete only after doing the refund separately.
- Active hires can be searched and filtered. A manual-entry form handles requests received by email or phone.
- Personal details can be removed from cancelled or settled returned hires. Keep a retention policy and private backups; backups may retain older records until their retention period ends.

The screen shows the latest 1,000 records. Confirmations, invoices, payment collection and refunds are manual. The admin does not upload ID documents or case photographs; it stores inspection notes. Keep any condition photographs securely outside the public website.

## Backups and password reset

The database is /var/lib/bikeboxbath/rentals.sqlite. Never copy it into /var/www or GitHub. For a consistent private backup:

    sudo systemctl stop bikeboxbath
    sudo install -d -m 700 /var/backups/bikeboxbath
    sudo cp -a /var/lib/bikeboxbath "/var/backups/bikeboxbath/data-$(date +%Y%m%d-%H%M%S)"
    sudo systemctl start bikeboxbath

Ensure backups are readable only by authorised administrators, and agree how long they are retained. A backup should also include the current service/configuration privately; never publish it.

To reset the account deliberately:

    sudo node /opt/bikeboxbath/api/setup-admin.mjs /etc/bikeboxbath.env --replace
    sudo chmod 600 /etc/bikeboxbath.env
    sudo systemctl restart bikeboxbath

## Existing public-launch details

Confirm image reuse permission or use owned photographs of the rental case. Finalise cancellation/insurance terms and the rental privacy/retention policy. The existing proprietary software licence and third-party asset licences remain included.
