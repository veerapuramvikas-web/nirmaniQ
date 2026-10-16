# Ottobon BuildTrack — Construction Management Prototype

**Ottobon BuildTrack** is a high-fidelity, interactive construction management web application built for Indian contractors, builders, and project owners. It provides end-to-end visibility into budgets, expenses, material deliveries, daily site progress, and issue resolution.

---

## 🏗️ Core Features & Workflows

### 1. Builder's Command Center (Dashboard)
- **Top Financial KPIs:** Total Project Budget, Approved Expenditure, Remaining Budget, Pending Approvals, Projects Over Budget, and Today's Site Reports.
- **Visual Analytics:** Budget vs Approved Expenditure comparison per project (Recharts bar chart) and Expenditure Breakdown by category (donut chart).
- **Recent Transactions & Pending Approvals:** Live feed of incoming expenses with direct quick-action links.
- **Budget Overrun Alerts:** Automated alerts highlighting categories exceeding budget allocations.

### 2. Project Portfolio & Project Details
- **Portfolio Overview:** Filter projects by status (`planning`, `active`, `on_hold`, `completed`), view budgets, percent complete, assigned supervisor, and completion deadlines.
- **Deep-Dive Tabs:**
  - **Overview:** Project health, quick stats, supervisor, site address, and key milestones.
  - **Budget:** Interactive category-wise budget allocation editor (`Cement & Concrete`, `Steel & Metal`, `Sand & Aggregate`, `Labour`, etc.) and variance tracking with overrun indicators.
  - **Expenses:** Filterable list of project expenses with status chips.
  - **Materials:** Real-time stock status, quantities received, and remaining units.
  - **Daily Reports:** Chronological logs of site progress.
  - **Issues & Delays:** Track site blockers, priority levels, and resolution status.

### 3. Expenses & Multi-Level Approval Workflow
- **Consistent Rule:** Only **Approved Expenses** count toward project expenditure totals and budget variances.
- **Submission & Approval:**
  - Site Supervisors submit expenses or bills (supporting attachments, invoice numbers, payment methods, and suppliers).
  - Project Owners approve or reject (with required reason) expenses.
  - Full audit trail logging approval events with timestamps.
- **Real-Time Filtering:** Filter by project, expense category, status (`draft`, `pending_approval`, `approved`, `rejected`), and payment status (`unpaid`, `partial`, `paid`).

### 4. Material Orders & Inventory Reconciliation
- **Formula-Driven Stock Calculation:**
  $$\text{Closing Stock} = \text{Opening Stock} + \text{Quantity Received} - \text{Quantity Used}$$
  $$\text{Outstanding Delivery} = \max(0, \text{Quantity Ordered} - \text{Quantity Received})$$
- **Receipt & Usage Tracking:** Supervisors record partial or full material receipts against purchase orders and deduct daily usage.
- **Negative Stock & Over-delivery Safeguards:** Proactive validation prevents recording more usage than available stock.

### 5. Daily Site Reports & Photo Documentation
- **Rich Logging:** Track daily work completed, quantities measured, worker headcount, weather conditions, equipment operations, and site issues.
- **Photo Gallery & Lightbox:** Upload and preview up to 8 site photos with captions and full-screen preview.

### 6. Issues & Delays Log
- **Priority-Based Tracking:** Classify issues by priority (`critical`, `high`, `medium`, `low`) and category (`Safety`, `Quality`, `Material Shortage`, `Labour`, `Equipment`).
- **Resolution Tracking:** Record resolution notes, target dates, and assignees.

### 7. Executive Reports & Export Engine
- **Report Types:** Expense Summary, Budget Variance Analysis, Material Delivery, Daily Progress, Pending Approvals, and Issues & Delays.
- **Export Formats:**
  - **CSV Export:** Clean structured export for spreadsheet analysis.
  - **PDF Export:** Formatted branded documents with header banners, tabular layouts, page numbers, and demo notices powered by `jspdf` and `jspdf-autotable`.

---

## 👥 Demo Role Switching

Experience the prototype from different organizational perspectives using the **Role Switcher** in the top-right header:
1. **Rajesh Nair (Project Owner):** Full administrative control, project creation, expense approval/rejection.
2. **Suresh Kumar / Priya Menon (Site Supervisors):** Daily site logging, photo uploads, material receipts/usage, and draft expense submissions.
3. **Anitha Rao (Accountant):** Financial review, bill tracking, payment status audits, and report exports.

> **Reset Demo Data:** Click **"Reset Demo Data"** at the bottom of the navigation sidebar anytime to return all state back to the original seed data.

---

## 💻 Tech Stack

- **Framework:** React 19 + TypeScript + Vite
- **Routing:** React Router v7
- **Styling:** Tailwind CSS + Vanilla Design System (Indian Rupee `₹` formatting, curated palette, custom components)
- **Charts:** Recharts
- **PDF Generation:** jsPDF + jspdf-autotable
- **Icons:** Lucide React
- **State Management:** Reactive local store with localStorage persistence

---

## 🚀 Getting Started

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

### Build Production Bundle
```bash
npm run build
```

---

*Note: This prototype runs with illustrative sample data for "Sri Lakshmi Residency" and other demonstration projects.*
