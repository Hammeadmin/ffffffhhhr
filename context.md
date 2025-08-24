# Momentum CRM - Project Context

## Project Overview
**Project Name**: Momentum  
**Type**: All-in-one CRM System for Swedish SMEs  
**Tech Stack**: React + TypeScript + Tailwind CSS + Supabase  
**Language**: Swedish UI, English code comments  
**Target**: Service-based companies (5-50 employees) in Sweden

## Core Principles

### Language Requirements
- **ALL user-facing text must be in Swedish**
- Form labels, buttons, navigation, error messages, notifications
- Keep code comments and variable names in English
- Use Swedish business terminology and conventions

### Design System
- **Color Scheme**: Blue and white primary, clean Swedish business aesthetic
- **Typography**: Clean, professional fonts with good readability
- **Icons**: Lucide React icons throughout
- **Layout**: Responsive, mobile-first design
- **Navigation**: Collapsible sidebar with main sections

### Technical Standards
- TypeScript for all components
- Tailwind CSS for styling (utility-first approach)
- Supabase for backend (database, auth, real-time)
- React hooks for state management
- Row Level Security (RLS) for data protection

## Database Schema Summary

### Core Tables
```
organisation (id, name, org_number, created_at)
user_profiles (id, organisation_id, full_name, phone_number, role, is_active)
customers (id, organisation_id, name, email, phone_number, address, postal_code, city)
leads (id, organisation_id, customer_id, assigned_to_user_id, title, description, source, status, estimated_value)
quotes (id, organisation_id, customer_id, lead_id, title, description, total_amount, status, valid_until)
jobs (id, organisation_id, customer_id, quote_id, assigned_to_user_id, title, description, status, value)
invoices (id, organisation_id, job_id, customer_id, invoice_number, status, due_date, amount)
calendar_events (id, organisation_id, assigned_to_user_id, title, type, start_time, end_time, related_lead_id, related_job_id)
```

### User Roles & Permissions
- **Admin**: Full access to all features, team management, settings
- **Sales**: Leads, quotes, customers, calendar, limited job view
- **Worker**: Jobs, calendar, limited customer view

## Swedish Terminology Reference

| English | Swedish | Context |
|---------|---------|---------|
| Dashboard | Dashboard | Main overview page |
| Orders | Ordrar | Unified order management |
| Customers | Kunder | Customer registry |
| Quotes | Offerter | Price quotes |
| Calendar | Kalender | Scheduling |
| Invoices | Fakturor | Billing |
| Team | Team | Team management |
| Settings | Inställningar | Configuration |
| Company | Företag | Business entity |
| Contact | Kontakt | Contact person |
| Phone | Telefon | Phone number |
| Email | E-post | Email address |
| Address | Adress | Street address |
| City | Stad | City name |
| Postal Code | Postnummer | ZIP code |
| Status | Status | Current state |
| Amount | Belopp | Money amount |
| Total | Summa | Sum total |
| Due Date | Förfallodatum | Payment deadline |
| Created | Skapad | Creation date |
| Assigned To | Tilldelad till | Person responsible |
| Description | Beskrivning | Details |
| Title | Titel | Name/header |
| Priority | Prioritet | Importance level |
| Active | Aktiv | Currently in use |
| Inactive | Inaktiv | Not in use |
| New | Ny/Nya | Brand new |
| Contacted | Kontaktad | Been reached |
| Qualified | Kvalificerad | Meets criteria |
| Won | Vunnen | Successfully closed |
| Lost | Förlorad | Unsuccessful |
| Open Order | Öppen Order | New order, not yet confirmed |
| Booked Confirmed | Bokad & Bekräftad | Order confirmed and scheduled |
| Cancelled by Customer | Avbokad av Kund | Customer cancelled |
| Not Completed | Ej Slutfört | Work not finished |
| Ready to Invoice | Redo att Fakturera | Completed, ready for billing |
| Draft | Utkast | Not finalized |
| Sent | Skickad | Delivered |
| Accepted | Accepterad | Approved |
| Declined | Avvisad | Rejected |
| Paid | Betald | Payment received |
| Overdue | Förfallen | Past due date |
| In Progress | Pågående | Currently working |
| Completed | Slutförd | Finished |
| Pending | Väntande | Waiting to start |
| Meeting | Möte | Scheduled meeting |
| Task | Uppgift | Work item |
| Reminder | Påminnelse | Memory aid |

## Status Enums

### Order Status
```typescript
'öppen_order' | 'bokad_bekräftad' | 'avbokad_kund' | 'ej_slutfört' | 'redo_fakturera'
// Swedish: 'Öppen Order' | 'Bokad & Bekräftad' | 'Avbokad av Kund' | 'Ej Slutfört' | 'Redo att Fakturera'
```

### Quote Status
```typescript
'draft' | 'sent' | 'accepted' | 'declined'
// Swedish: 'Utkast' | 'Skickad' | 'Accepterad' | 'Avvisad'
```

### Job Status
```typescript
'pending' | 'in_progress' | 'completed' | 'invoiced'
// Swedish: 'Väntande' | 'Pågående' | 'Slutförd' | 'Fakturerad'
```

### Invoice Status
```typescript
'draft' | 'sent' | 'paid' | 'overdue'
// Swedish: 'Utkast' | 'Skickad' | 'Betald' | 'Förfallen'
```

## Feature Requirements

### Must-Have Features (MVP)
- User authentication with org-based access
- Order management with Kanban board
- Customer registry with full CRUD
- Quote creation and management
- Order tracking and assignment
- Basic invoicing system
- Team member management
- Calendar/scheduling
- Dashboard with KPIs

### Key UX Requirements
- Drag-and-drop for Kanban boards
- Search and filtering on all list views
- Modal forms for creating/editing records
- Toast notifications for user feedback
- Loading states for all async operations
- Mobile-responsive design
- Print-friendly layouts for quotes/invoices
- Automatic order creation from accepted quotes

### Swedish Business Considerations
- VAT (moms) calculations at 25%
- Swedish postal code format validation
- SEK currency formatting (1 234,56 kr)
- Swedish date format (YYYY-MM-DD)
- Business registration number (organisationsnummer)
- Swedish phone number format (+46...)

## Navigation Structure
```
/dashboard - Main overview
/ordrar - Order management Kanban
/kunder - Customer registry  
/offerter - Quote management
/kalender - Calendar/scheduling
/fakturor - Invoice management
/team - Team overview
/installningar - Settings & config
```

## Styling Guidelines
- Use Swedish color preferences (blues, clean whites)
- Professional typography suitable for business use
- Consistent spacing using Tailwind's spacing scale
- Subtle shadows and borders for depth
- High contrast for accessibility
- Clear visual hierarchy with proper heading levels

## Data Formatting Standards
- Currency: Always in SEK with proper formatting
- Dates: Swedish format with Swedish month names
- Phone numbers: International format with +46
- Addresses: Swedish postal code and city format
- Numbers: Swedish decimal separator (comma)

## Common Component Patterns
- Modal dialogs for create/edit operations
- Data tables with sorting and filtering
- Card layouts for dashboard widgets
- Form components with Swedish labels
- Status badges with color coding
- Action buttons with Swedish text

This context should be referenced throughout development to ensure consistency.

### Design Principles:

- Swedish Business Aesthetic: Clean, minimalist, professional
- Color Psychology: Blue for trust, white for cleanliness, gold for premium
- Typography: Clear hierarchy, readable fonts, consistent sizing
- Spacing: Generous white space, consistent margins, 8px grid system

## Performance Goals:

- Loading Speed: Under 3 seconds first load
- Mobile Score: 90+ on Google PageSpeed Insights
- Accessibility: WCAG 2.1 AA compliance
- SEO Score: 90+ on Lighthouse audit

## Conversion Optimization:

- CTAs: Clear, action-oriented Swedish text
- Forms: Minimal fields, clear validation
- Trust Signals: Testimonials, security badges, guarantees
- Social Proof: Customer logos, usage statistics, reviews

## Swedish Market Considerations:

- GDPR Compliance: Clear privacy notices
- Local Integrations: Fortnox, BankID references
- Swedish Holidays: Respect in scheduling and marketing
- Business Culture: Professional, egalitarian, sustainability-focused

**This comprehensive guide will transform your functional CRM into a premium, market-ready solution that stands out in the Swedish business software market!**