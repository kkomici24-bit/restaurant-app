# Restorant Management - Demo (Tirane)

Projekt i vogël demo për menaxhimin e një restoranti: meny, rezervime, aktivitete dhe panel admin.

Për të provuar lokalisht:

1. Sigurohu që ke Node.js (v18+ rekomandohet).
2. Hap terminal dhe shko në folderin `restaurant-app`:

```bash
cd restaurant-app
npm install
npm run seed   # mbush DB me të dhëna demo
npm start      # ose npm run dev për nodemon
```

3. Hap http://localhost:3000 në shfletues.

Fjalëkalimi admin parazgjedhje: `admin123` (ndrysho në .env)

Struktura e thjeshtë:
- server.js - shërbimi Express
- db.js - inicializon SQLite dhe tabelat
- seed.js - mbush të dhëna demo
- views/ - pamjet EJS
- public/ - CSS dhe JS

Në qoftë se dëshiron: unë mund të shtoj pagesë online, eksport PDF të faturave, ose modul rezervimesh me email konfirmim.

Funksionalitete të reja të shtuara:
- Konfirmim rezervimesh me email (përdor `nodemailer`).
- Gjenerim PDF për rezervimet (përdor `pdfkit`).

Shtesa e shpejtë (minimal):
- Pagesë online e thjeshtë me Stripe Checkout (opsionale). Konfiguroni `STRIPE_SECRET_KEY` në `.env` për ta aktivizuar.
- Porosi/dorëzim i thjeshtë: karroca klienti, krijim porosie, listim porosish për admin dhe buton për të shënuar si dorëzuar.
Funksionalitete të reja të shtuara:
- Konfirmim rezervimesh me email (përdor `nodemailer`).
- Gjenerim PDF për rezervimet (përdor `pdfkit`).

Konfigurimi i env:
- Kopjo `.env.example` në `.env` dhe plotëso vlerat për `EMAIL_SMTP_*` dhe `FROM_EMAIL` nëse dëshironi të dërgoni email konfirmimi.

Si test:
- Pasi të keni konfiguruar `.env`, ndizni serverin dhe bëni një rezervim; nëse SMTP është i konfiguruar, përdoruesi do të marrë një email me konfirmimin dhe PDF të bashkangjitur.

Automatic setup scripts
-----------------------
This repository includes helper scripts to bootstrap Node.js/npm (when possible), install dependencies, seed the database, and start the app.

- Windows (PowerShell): scripts/setup-windows.ps1
	- Example: open PowerShell as Administrator and run:

		```powershell
		.\scripts\setup-windows.ps1 -Seed -Start
		```

- Unix / macOS (bash): scripts/setup-unix.sh
	- Example:

		```bash
		bash scripts/setup-unix.sh --seed --start
		```

- Quick dev start (Windows PowerShell): scripts/start-dev.ps1
	- Example:

		```powershell
		.\scripts\start-dev.ps1
		```

Notes:
- The scripts try to automate what is safe without requiring interactive approvals. System package managers (winget, choco) may require admin privileges.
- If automatic Node installation is not available on the machine, install Node.js LTS manually from https://nodejs.org/ or using your preferred package manager, then re-run the scripts.

If you want, I can try to run the appropriate setup script here — give me permission to run the Windows PowerShell script now, or tell me which platform to target.
