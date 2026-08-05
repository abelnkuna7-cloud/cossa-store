# Cossa Storefront

Build Phase 1 of the Cossa Store production platform for Cossa Nexus Holdings.

PROJECT PURPOSE

Cossa Store must become a standalone South African e-commerce platform operating under Cossa Nexus Holdings. It must not be designed as a generic dropshipping store.

Its core positioning is:

“Products, services and intelligent solutions for building, maintaining and improving homes and businesses.”

Cossa Store will initially serve South African customers and later expand across Africa and internationally.

The primary domain will eventually be:

store.cossanexusholdings.co.za

BUSINESS CONNECTIONS

Cossa Store must support and cross-sell the services of:

Cossa Construction & DIY

Cossa Facility Services

Cossa Tech

Future Cossa Logistics services

Cossa AI and Cossa Marketing integrations

Do not add unrelated Cossa subsidiaries during this phase.

CORE PRODUCT CATEGORIES

Create the initial store structure around these categories:

Construction & DIY

Tools and accessories

Measuring equipment

Safety and PPE

Hardware

Painting supplies

Home-improvement products

Storage and organisation

Cleaning & Facility Supplies

Cleaning tools

Janitorial supplies

Cleaning equipment

Hygiene products

Waste-management products

PPE

Office and commercial cleaning supplies

Technology & Smart Solutions

Smart-home products

Security and monitoring products

Computer and mobile accessories

Productivity equipment

Smart construction technology

Smart facility-management technology

PHASE 1 PAGES

Build the following real frontend structure:

Homepage

Shop

Category page

Product detail page

Search results

Shopping cart

Checkout

Customer login and registration

Customer account dashboard

Orders

Wishlist

Request a Quote

Business Account Application

Supplier Application

Track Order

About Cossa Store

Contact and WhatsApp Support

Delivery Information

Returns and Refunds

Privacy Policy

Terms and Conditions

HOMEPAGE STRUCTURE

Build the homepage with:

Professional hero section

Strong value proposition

Shop Products button

Request a Quote button

Main product categories

“Shop by Project” section
Examples:

Paint a room

Clean an office

Equip a construction team

Improve workplace hygiene

Upgrade a smart home

Set up a productive workspace

Featured products section

Business buying section
Explain:

Bulk orders

Quotations

VAT invoices

Repeat purchasing

Business support

Cossa service ecosystem section

Need installation or construction? Refer to Cossa Construction.

Need professional cleaning? Refer to Cossa Facility Services.

Need technology support? Refer to Cossa Tech.

Supplier partnership section

Trust section

South African business

Secure checkout

Local support

Clear delivery information

Transparent returns

WhatsApp support call-to-action

Newsletter and product updates

DESIGN SYSTEM

Use the established Cossa Nexus Holdings identity:

Deep navy: #0A1F44

Luxury gold: #D4AF37

White and neutral backgrounds

Playfair Display-style typography for major headings

Inter-style typography for body text

Premium, professional and modern

Mobile-first

Clear, accessible and conversion-focused

Avoid excessive gradients, glowing effects and decorative animations

Do not make it look like a luxury fashion store

It must look credible for construction, facility supplies, technology and business procurement

NAVIGATION

Main navigation:

Home

Shop

Construction & DIY

Cleaning & Facility Supplies

Technology & Smart Solutions

Shop by Project

Business Buying

Request a Quote

Support

HEADER UTILITIES

Include:

Search

Account

Wishlist

Cart

WhatsApp support

PRODUCT DATA STRUCTURE

Prepare the frontend and TypeScript types for products containing:

id

sku

name

slug

short_description

full_description

category

subcategory

brand

supplier_id

supplier_sku

cost_price

selling_price

compare_at_price

VAT status

stock status

stock quantity

fulfilment type

estimated delivery

images

specifications

features

warranty

return eligibility

status

SEO title

SEO description

created_at

updated_at

Fulfilment type must support:

Cossa stock

Local supplier

Local dropshipping

International dropshipping

Print on demand

Affiliate product

QUOTE REQUEST

Create a professional quotation-request workflow.

Customers must be able to:

Add store products to a quotation.

Enter quantities.

Explain their project.

Upload supporting information later.

Provide name, company, email, phone and location.

Indicate whether they require products only or products plus Cossa services.

Submit the request.

Do not pretend the quote has been generated if no backend is connected. Show a clear submission or pending state.

BUSINESS ACCOUNTS

Create a business account application form containing:

Registered business name

Trading name

Registration number

VAT number if applicable

Contact person

Email

Phone

Billing address

Delivery address

Industry

Estimated monthly purchasing

Required product categories

Bulk-order requirements

Preferred payment method

SUPPLIER APPLICATION

Create a supplier application page containing:

Company name

Registration details

Contact person

Email

Phone

Website

Product categories

Brands supplied

Wholesale availability

Dropshipping availability

Minimum order requirements

Delivery areas

Lead times

Catalogue-upload availability

API, CSV or inventory-feed availability

DATA AND BACKEND PREPARATION

Use Supabase-ready architecture.

Prepare clear service and data-access layers for:

Users

Products

Categories

Suppliers

Customers

Business accounts

Carts

Wishlists

Orders

Order items

Quote requests

Quote items

Supplier applications

Addresses

Reviews

Do not insert fake operational data into production tables.

Temporary UI examples may be clearly marked as development seed data and must be stored separately from production data.

ENGINEERING RULES

Do not create display-only buttons.

Every button must navigate, submit, open a defined interaction or be visibly marked as unavailable.

Do not show fake customer counts, revenue, reviews, sales or inventory.

Do not claim that payment, delivery tracking or AI is active unless it is actually connected.

Use reusable components.

Use TypeScript.

Maintain mobile responsiveness.

Include loading, empty and error states.

Prepare for GitHub and Vercel deployment.

Do not remove existing working project configuration.

Do not add advanced marketplace or AI features during this phase.

Do not redesign unrelated Cossa products.

Prioritise functional architecture over visual decoration.

DEFINITION OF DONE

Phase 1 is complete only when:

All listed pages exist.

Navigation works.

Product browsing interfaces work.

Cart interactions work locally.

Quote and application forms validate correctly.

No major button is decorative or misleading.

The site is responsive.

No fake live business information is presented.

The code is organised for Supabase integration.

The project builds without TypeScript or deployment errors.

Before modifying code, audit the current project and preserve any working components that meet these requirements. Then implement Phase 1 systematically. Do not expand the scope.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bec89300-8bf2-4da9-90b7-195fc11d1c87).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
