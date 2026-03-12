# Restaurant QR Bestelsysteem - PRD

## Oorspronkelijke Opdracht
Bouw een web app restaurant QR bestel tafel systeem als white label, volledig in het Nederlands.

## Architectuur
- **Frontend**: React met Tailwind CSS en Shadcn/UI componenten
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Taal**: Nederlands (NL)

## Gebruikerspersonas
1. **Restaurantgast** - Scant QR-code, bekijkt menu, plaatst bestellingen
2. **Restaurantbeheerder** - Beheert menu, tafels, instellingen
3. **Keukenpersoneel** - Bekijkt en verwerkt bestellingen via KDS

## Kernfuncties

### Klant (Gast)
- [x] QR-code scannen voor tafelidentificatie
- [x] Digitaal menu met categorieën
- [x] Menu items met afbeeldingen, prijzen, dieet tags
- [x] Item modifiers/aanpassingen
- [x] Winkelwagen beheer
- [x] Bestelling plaatsen
- [x] Bestelstatus volgen

### Beheerder (Admin)
- [x] Login/registratie systeem
- [x] Dashboard met statistieken
- [x] Menu beheer (categorieën, items, modifiers)
- [x] Tafel beheer met QR-codes
- [x] Bestellingen overzicht
- [x] White label instellingen (logo, kleuren, naam)

### Keuken (KDS)
- [x] Real-time bestel overzicht
- [x] Status updates (Nieuw → In Bereiding → Klaar → Geserveerd)
- [x] Timer per bestelling
- [x] Bestelling annuleren

## Geïmplementeerd
- Volledige Nederlandse vertaling van alle UI tekst
- Euro valuta met komma decimaal (€12,99)
- Demo modus voor testen zonder QR-code
- Moderne UI met sage green kleurenschema
- Responsief design (mobiel-vriendelijk)
- Sample data seeding

## Technische Stack
- React 18
- FastAPI
- MongoDB (Motor async driver)
- JWT authenticatie
- Tailwind CSS + Shadcn/UI
- Lucide React icons

## API Endpoints
- `/api/auth/*` - Authenticatie
- `/api/settings` - Restaurant instellingen
- `/api/categories` - Categorieën CRUD
- `/api/menu-items` - Menu items CRUD
- `/api/tables` - Tafels CRUD
- `/api/orders` - Bestellingen CRUD

## Volgende Stappen (Backlog)
- P1: Online betalingen (Stripe/iDEAL)
- P1: Meertalige ondersteuning
- P2: Voorraad beheer
- P2: Rapportages en analytics
- P3: Push notificaties
- P3: Meerdere restaurants (multi-tenant)
