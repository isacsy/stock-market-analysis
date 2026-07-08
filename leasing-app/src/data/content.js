// All lesson content, quiz questions, and glossary terms for the app.
// Kept fully separate from UI components — edit this file to change content
// without touching any screen/component code.

export const content = {
  lessons: [
    // ───────────────────────────── Lesson 1 ─────────────────────────────
    {
      id: 1,
      title: 'Types of Leases',
      subtitle: 'Lessee, lessor & lease structures',
      icon: '📝',
      xp: 20,
      slides: [
        {
          title: 'The Basics',
          blocks: [
            {
              type: 'text',
              text: 'A **lease** is a contract between two parties.',
            },
            {
              type: 'chips',
              items: ['Lessor = owner (receives payment)', 'Lessee = user (pays fee)'],
            },
            {
              type: 'tip',
              label: 'Memory aid',
              text: '"**Lessee** = less control." The lessee uses the asset but doesn\'t own it.',
            },
          ],
        },
        {
          title: 'Operating Lease',
          blocks: [
            {
              type: 'feature',
              color: 'teal',
              heading: 'Operating Lease',
              text: 'A short-term, flexible arrangement where the lessor keeps most of the responsibility.',
            },
            {
              type: 'steps',
              items: [
                'Not fully amortized',
                'Lease life is shorter than the asset\'s useful life',
                'Lessor maintains & insures the asset',
                'Lessee CAN cancel the lease',
                'OFF the balance sheet',
              ],
            },
          ],
        },
        {
          title: 'Financial (Capital) Lease',
          blocks: [
            {
              type: 'feature',
              color: 'coral',
              heading: 'Financial (Capital) Lease',
              text: 'The opposite of an operating lease — closer to a purchase financed by the lessor.',
            },
            {
              type: 'steps',
              items: [
                'Fully amortized',
                'Lessor provides no maintenance',
                'Lessee canNOT cancel the lease',
                'Lessee can renew at the end',
                'ON the balance sheet (asset + liability)',
              ],
            },
          ],
        },
        {
          title: 'Operating vs Financial',
          blocks: [
            {
              type: 'comparison',
              leftTitle: 'Operating Lease',
              rightTitle: 'Financial Lease',
              rows: [
                ['Partially amortized', 'Fully amortized'],
                ['Lessor maintains', 'No maintenance from lessor'],
                ['Cancellable', 'Not cancellable'],
                ['Off balance sheet', 'On balance sheet'],
              ],
            },
          ],
        },
        {
          title: 'Sale & Leaseback',
          blocks: [
            {
              type: 'text',
              text: 'A company **sells** an asset it owns, then **immediately leases it back** from the buyer.',
            },
            {
              type: 'chips',
              items: ['Cash today from the sale', 'Periodic lease payments to keep using it'],
            },
            {
              type: 'tip',
              label: 'Example',
              text: 'An airline sells its planes to a leasing company, then leases them back so it can keep flying while freeing up cash.',
            },
          ],
        },
        {
          title: 'Leveraged Lease',
          blocks: [
            {
              type: 'text',
              text: 'A leveraged lease involves **three parties**: the lessee, the lessor, and lenders.',
            },
            {
              type: 'steps',
              items: [
                'The lessor borrows money to buy the asset',
                'The lender uses a nonrecourse loan',
                'If the lessee defaults, lease payments go directly to the lender',
              ],
            },
          ],
        },
      ],
      quiz: [
        {
          question: 'Who is the lessee?',
          options: [
            'The user of the asset who pays the fee',
            'The owner of the asset who receives payment',
            'The bank that finances the purchase',
            'The company that insures the asset',
          ],
          correctIndex: 0,
          explanation: 'The lessee is the party who uses the asset and pays for that right. "Lessee = less control."',
        },
        {
          question: 'Which lease is OFF the balance sheet?',
          options: ['Financial (capital) lease', 'Operating lease', 'Leveraged lease', 'Sale & leaseback'],
          correctIndex: 1,
          explanation: 'Operating leases are not fully amortized and stay off the balance sheet — they show up as rent expense instead.',
        },
        {
          question: 'In a sale & leaseback, what happens first?',
          options: [
            'The company leases an asset, then buys it',
            'The company sells an asset it owns, then leases it back',
            'The lessor sells the asset to the lessee',
            'The lender repossesses the asset',
          ],
          correctIndex: 1,
          explanation: 'The company first sells an asset it already owns to raise cash, then immediately leases the same asset back so it can keep using it.',
        },
        {
          question: 'A leveraged lease involves how many parties?',
          options: ['2', '3', '4', '5'],
          correctIndex: 1,
          explanation: '3 parties: the lessee, the lessor, and the lenders who finance the lessor\'s purchase of the asset.',
        },
      ],
    },

    // ───────────────────────────── Lesson 2 ─────────────────────────────
    {
      id: 2,
      title: 'Accounting & Capital Lease',
      subtitle: 'Balance sheet treatment & the 4 conditions',
      icon: '📊',
      xp: 20,
      slides: [
        {
          title: 'Accounting Treatment',
          blocks: [
            {
              type: 'comparison',
              leftTitle: 'Operating Lease',
              rightTitle: 'Capital Lease',
              rows: [
                ['Booked as rent expense', 'Appears on both sides of balance sheet'],
                ['Nothing on balance sheet', 'Asset + liability recorded'],
              ],
            },
          ],
        },
        {
          title: 'FAS 13 (1976)',
          blocks: [
            {
              type: 'text',
              text: '**FAS 13** is the FASB standard that classifies leases as capital or operating.',
            },
            {
              type: 'tip',
              label: 'Malaysia equivalent',
              text: 'MFRS 16 / IFRS 16 — the modern international standards that serve the same purpose.',
            },
          ],
        },
        {
          title: 'The 4 Capital-Lease Conditions',
          blocks: [
            {
              type: 'text',
              text: 'A lease is classified as a **capital lease** if it meets ANY ONE of these four conditions:',
            },
            {
              type: 'steps',
              items: [
                'PV of lease payments ≥ 90% of fair market value',
                'Ownership transfers to lessee at end of lease',
                'Lease term ≥ 75% of the asset\'s economic life',
                'Bargain purchase option at expiry',
              ],
            },
          ],
        },
        {
          title: 'Exam Warning',
          blocks: [
            {
              type: 'tip',
              label: '⚠️ Exam trap',
              text: 'Only **ONE** of the four conditions needs to be met — NOT all four. Many students lose marks assuming all conditions must hold.',
            },
          ],
        },
      ],
      quiz: [
        {
          question: 'How does a capital lease appear on the balance sheet?',
          options: [
            'Only as a footnote',
            'Only as a liability',
            'On both sides — asset AND liability',
            'It never appears on the balance sheet',
          ],
          correctIndex: 2,
          explanation: 'A capital lease is recorded on both sides of the balance sheet: the leased asset and the corresponding lease liability.',
        },
        {
          question: 'How many of the 4 capital-lease conditions must be met?',
          options: ['All 4', 'At least 3', 'At least 2', 'Just 1'],
          correctIndex: 3,
          explanation: 'Meeting ANY ONE of the four conditions is enough to classify the lease as a capital lease.',
        },
        {
          question: 'A lease term is 80% of the asset\'s economic life. How is it classified?',
          options: ['Operating lease', 'Capital lease', 'Leveraged lease', 'Cannot be determined'],
          correctIndex: 1,
          explanation: '80% is at or above the 75% threshold, so this alone qualifies it as a capital lease.',
        },
        {
          question: 'Operating lease payments are booked as what on the income statement?',
          options: ['Depreciation', 'Interest expense', 'Rent expense', 'Capital expenditure'],
          correctIndex: 2,
          explanation: 'Operating leases are simply booked as rent expense — no asset or liability is created.',
        },
      ],
    },

    // ───────────────────────────── Lesson 3 ─────────────────────────────
    {
      id: 3,
      title: 'Tax & IRS Rules',
      subtitle: 'Why companies lease — and the limits',
      icon: '🧾',
      xp: 20,
      slides: [
        {
          title: 'The Main Benefit',
          blocks: [
            {
              type: 'feature',
              color: 'teal',
              heading: 'Tax Reduction',
              text: 'The principal benefit of long-term leasing is tax reduction — lease payments are tax-deductible.',
            },
          ],
        },
        {
          title: 'Tax Transfer',
          blocks: [
            {
              type: 'text',
              text: 'Firms with **low taxable income** can\'t fully use depreciation shields on their own.',
            },
            {
              type: 'steps',
              items: [
                'Leasing lets the lessor claim the depreciation instead',
                'The lessor passes the benefit to the lessee via lower payments',
                'The IRS limits leases set up purely to avoid tax',
              ],
            },
          ],
        },
        {
          title: '6 IRS Conditions for a Qualified Lease',
          blocks: [
            {
              type: 'steps',
              items: [
                'Term is under 30 years',
                'No bargain purchase option',
                'Payments are not front-loaded',
                'Lessor earns a fair market return',
                'Lease doesn\'t restrict lessee\'s right to issue debt or pay dividends',
                'Renewal options reflect fair market value',
              ],
            },
          ],
        },
        {
          title: 'Malaysia Context',
          blocks: [
            {
              type: 'tip',
              label: 'Local equivalent',
              text: 'In Malaysia, the IRS equivalent is **LHDN** (Lembaga Hasil Dalam Negeri) — the tax authority that applies similar rules.',
            },
          ],
        },
      ],
      quiz: [
        {
          question: 'What is the principal benefit of long-term leasing?',
          options: [
            'Lower interest rates than loans',
            'Tax reduction (deductible payments)',
            'No need for insurance',
            'Guaranteed higher resale value',
          ],
          correctIndex: 1,
          explanation: 'Lease payments are tax-deductible, making tax reduction the main driver of long-term leasing decisions.',
        },
        {
          question: 'What is the maximum lease term for IRS deductibility?',
          options: ['Under 10 years', 'Under 20 years', 'Under 30 years', 'Under 50 years'],
          correctIndex: 2,
          explanation: 'A qualified lease must have a term under 30 years to be treated as a true lease for tax purposes.',
        },
        {
          question: 'Can a qualifying lease include a bargain purchase option?',
          options: ['Yes, always', 'No', 'Only for real estate', 'Only if approved by the lessee'],
          correctIndex: 1,
          explanation: 'A bargain purchase option disqualifies a lease from being treated as a true lease by the IRS.',
        },
        {
          question: "What is Malaysia's equivalent of the IRS?",
          options: ['Bank Negara Malaysia', 'LHDN (Lembaga Hasil Dalam Negeri)', 'Securities Commission Malaysia', 'EPF'],
          correctIndex: 1,
          explanation: 'LHDN is Malaysia\'s tax authority, playing the same role as the IRS does in the US.',
        },
      ],
    },

    // ───────────────────────────── Lesson 4 ─────────────────────────────
    {
      id: 4,
      title: 'NPV: Lease vs Buy',
      subtitle: 'The ClumZee Movers worked example',
      icon: '🧮',
      xp: 30,
      slides: [
        {
          title: 'The Setup',
          blocks: [
            {
              type: 'text',
              text: '**ClumZee Movers** is deciding whether to lease or buy a delivery truck. Here are the numbers:',
            },
            {
              type: 'formula',
              lines: [
                'Truck cost:            $25,000',
                'Useful life:            5 years',
                'Depreciation:  straight-line to zero',
                'Cost savings:      $4,500 / yr',
                'Lease payment:     $6,250 / yr',
                'Tax rate:                 21%',
                'After-tax discount rate:  5%',
              ],
            },
          ],
        },
        {
          title: 'BUY Cash Flows',
          blocks: [
            {
              type: 'text',
              text: '**Year 0:** −$25,000 (purchase price)',
            },
            {
              type: 'formula',
              lines: [
                'After-tax savings:',
                '  $4,500 × (1 − 0.21) = $3,555',
                'Depreciation tax shield:',
                '  ($25,000 ÷ 5) × 0.21 = $1,050',
                '',
                'Net cash flow, Years 1–5:',
                '  $3,555 + $1,050 = $4,605 / yr',
              ],
            },
          ],
        },
        {
          title: 'LEASE Cash Flows',
          blocks: [
            {
              type: 'text',
              text: '**Year 0:** $0 (nothing to buy)',
            },
            {
              type: 'formula',
              lines: [
                'After-tax lease payment:',
                '  −$6,250 × (1 − 0.21) = −$4,937.50',
                'Plus after-tax savings:',
                '  + $3,555',
                '',
                'Net cash flow, Years 1–5:',
                '  −$4,937.50 + $3,555 = −$1,382.50 / yr',
              ],
            },
          ],
        },
        {
          title: 'Leasing Instead of Buying',
          blocks: [
            {
              type: 'text',
              text: 'Compare the two strategies directly — "leasing minus buying":',
            },
            {
              type: 'formula',
              lines: [
                'Year 0:  +$25,000 (purchase avoided)',
                '',
                'Years 1–5:',
                '  −$1,382.50 − $4,605',
                '  = −$5,987.50 / yr',
              ],
            },
          ],
        },
        {
          title: 'Calculating the NPV',
          blocks: [
            {
              type: 'text',
              text: 'Discount the Years 1–5 cash flows at the after-tax secured-debt rate (5%) using the annuity factor.',
            },
            {
              type: 'formula',
              lines: [
                'Annuity factor (5%, 5 yrs) = 4.3295',
                '',
                'NPV = $25,000 − ($5,987.50 × 4.3295)',
                'NPV = $25,000 − $25,922.74',
                'NPV = −$922.74',
              ],
            },
          ],
        },
        {
          title: 'The Decision Rule',
          blocks: [
            {
              type: 'comparison',
              leftTitle: 'NPV(lease − buy) > 0',
              rightTitle: 'NPV(lease − buy) < 0',
              rows: [['→ LEASE', '→ BUY']],
            },
            {
              type: 'text',
              text: 'Here NPV = **−$922.74**, which is negative → **BUY** the truck.',
            },
            {
              type: 'tip',
              label: '⚠️ Exam trap',
              text: 'Always discount at the **after-tax rate on secured debt**, NOT the company\'s WACC.',
            },
          ],
        },
      ],
      quiz: [
        {
          question: "What is the after-tax lease payment per year?",
          options: ['$6,250.00', '$4,937.50', '$3,555.00', '$1,382.50'],
          correctIndex: 1,
          explanation: '$6,250 × (1 − 0.21) = $4,937.50 per year.',
        },
        {
          question: 'What is the depreciation tax shield?',
          options: ['$5,250', '$4,605', '$1,050', '$3,555'],
          correctIndex: 2,
          explanation: '($25,000 ÷ 5 years) × 21% tax rate = $1,050 per year.',
        },
        {
          question: 'NPV(leasing − buying) = −$922.74. What should ClumZee Movers do?',
          options: ['Lease the truck', 'Buy the truck', 'Do neither', 'Not enough information'],
          correctIndex: 1,
          explanation: 'A negative NPV means leasing is worse than buying by $922.74 in present-value terms — so buy.',
        },
        {
          question: 'What discount rate should be used in a lease-vs-buy NPV analysis?',
          options: [
            "The company's WACC",
            'The risk-free rate',
            'The after-tax rate on secured debt',
            'The lessor\'s cost of capital',
          ],
          correctIndex: 2,
          explanation: 'Lease cash flows are debt-like and low-risk, so they should be discounted at the after-tax secured-debt rate — never WACC.',
        },
        {
          question: 'What is the net BUY cash flow per year (Years 1–5)?',
          options: ['$1,382.50', '$3,555.00', '$4,605.00', '$4,937.50'],
          correctIndex: 2,
          explanation: 'After-tax savings ($3,555) + depreciation tax shield ($1,050) = $4,605 per year.',
        },
      ],
    },
  ],

  glossary: [
    { term: 'Lessee', definition: 'The party who uses the asset under a lease and pays the lease fee to the lessor.' },
    { term: 'Lessor', definition: 'The party who owns the asset and receives lease payments in exchange for its use.' },
    { term: 'Operating Lease', definition: 'A short-term lease that is not fully amortized, is cancellable, and stays off the balance sheet.' },
    { term: 'Financial / Capital Lease', definition: 'A long-term, non-cancellable lease that is fully amortized and appears on the balance sheet as both an asset and a liability.' },
    { term: 'Sale & Leaseback', definition: 'A transaction where a company sells an asset it owns and immediately leases it back from the buyer.' },
    { term: 'Leveraged Lease', definition: 'A three-party lease (lessee, lessor, lenders) where the lessor borrows money via a nonrecourse loan to buy the asset.' },
    { term: 'Capital Lease Conditions', definition: 'The four tests (any one qualifies) used to classify a lease as a capital lease: 90% PV rule, ownership transfer, 75% economic life rule, or bargain purchase option.' },
    { term: 'Nonrecourse Loan', definition: 'A loan where, if the borrower defaults, the lender can only claim the collateral — not the borrower\'s other assets. Used in leveraged leases.' },
    { term: 'Depreciation Tax Shield', definition: 'The tax savings generated by depreciation expense, calculated as depreciation × tax rate.' },
    { term: 'After-tax Lease Payment', definition: 'The lease payment adjusted for its tax deductibility: lease payment × (1 − tax rate).' },
    { term: 'NPV Decision Rule', definition: 'If NPV(leasing − buying) > 0, lease the asset; if it is < 0, buy the asset instead.' },
    { term: 'LHDN', definition: "Lembaga Hasil Dalam Negeri — Malaysia's tax authority, equivalent to the IRS in the United States." },
  ],
}

export const TOTAL_LESSONS = content.lessons.length
