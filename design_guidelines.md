# TCSYGO Design Guidelines

## Design Approach

**Reference-Based Hybrid**: Drawing from ride-sharing leaders (BlaBlaCar, Uber) and booking platforms (Airbnb) to create a trustworthy, map-centric experience. Primary focus: clarity, speed, and trust-building.

**Core Principles**:
- Map-first interface design
- Instant information hierarchy
- Trust through transparency
- Mobile-optimized interactions

---

## Typography

**Font System**: Google Fonts via CDN
- **Primary**: Inter (400, 500, 600, 700) - UI, body text, data
- **Display**: Poppins (600, 700) - headings, CTAs, hero text

**Scale**:
- Hero/Display: text-5xl to text-6xl (Poppins)
- Section Headers: text-3xl to text-4xl (Poppins)
- Card Titles: text-xl to text-2xl (Inter 600)
- Body/Details: text-base to text-lg (Inter 400)
- Labels/Meta: text-sm to text-base (Inter 500)
- Captions: text-xs to text-sm (Inter 400)

---

## Layout System

**Spacing Primitives**: Tailwind units of **2, 4, 6, 8, 12, 16**
- Component padding: p-4, p-6
- Section spacing: py-12, py-16, py-20
- Card gaps: gap-4, gap-6
- Element margins: m-2, m-4, m-8

**Container Strategy**:
- Max-width: max-w-7xl for main content
- Map containers: Full viewport width
- Cards/Lists: max-w-6xl
- Forms: max-w-2xl

**Grid Patterns**:
- Trip listings: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Driver dashboard: grid-cols-1 lg:grid-cols-4 (sidebar + main)
- Feature sections: grid-cols-1 md:grid-cols-3
- Mobile: Always single column stack

---

## Component Library

### Navigation
**Web Header**:
- Sticky top navigation with logo, search bar, and user menu
- Height: h-16 to h-20
- Padding: px-6 to px-8
- CTA buttons in header (Sign Up, Post a Ride)

**Mobile Bottom Nav** (React Native):
- Fixed bottom tab bar
- 4-5 primary actions: Home (Map), Search, My Trips, Profile
- Icon + label format

**Admin Sidebar**:
- Fixed left sidebar (w-64)
- Collapsible on tablet
- Grouped navigation sections

### Map Interface
**Primary Map View**:
- Full viewport height minus header (h-[calc(100vh-4rem)])
- Floating search bar overlay (absolute positioning, top-6)
- Pickup/drop markers with route polyline
- Driver location markers (animated pulse)
- Bottom sheet for trip details (mobile) or side panel (web)

**Map Controls**:
- Zoom controls: Fixed bottom-right
- Location button: Floating action button
- Filter chips: Top overlay below search

### Cards & Listings

**Trip Cards**:
- Rounded corners: rounded-xl to rounded-2xl
- Shadow: shadow-md hover:shadow-lg
- Padding: p-6
- Structure: Driver photo (left) + trip details (center) + price (right)
- Includes: Departure time, route, seats available, price per seat
- Action button: Book Now (prominent)

**Booking Summary Cards**:
- Border-based design with accent borders
- Itemized pricing breakdown
- Total prominently displayed (text-2xl, font-bold)

**Driver Profile Cards**:
- Photo circle: w-16 h-16 to w-20 h-20
- Rating stars with count
- Verification badges
- Trip count and member since

### Forms

**Search/Booking Flow**:
- Multi-step wizard with progress indicator
- Steps: Location → Date/Time → Seats → Review
- Large touch targets (min-h-12)
- Auto-complete dropdowns for locations
- Date/time pickers: Native on mobile, custom on web
- Seat selector: Visual seat layout

**Driver Trip Creation**:
- Map-based route selection
- Price calculator with distance input
- Available seats selector (1-7)
- Departure time picker
- Optional: Preferences (smoking, pets, music)

**Input Fields**:
- Height: h-12 to h-14
- Padding: px-4
- Labels above inputs (text-sm, font-medium)
- Error states with helper text below
- Icons inside inputs (left side, text-gray-400)

### Buttons

**Primary CTA**: Large, rounded-lg, font-semibold, px-8 py-3
**Secondary**: Outlined or ghost variant
**Icon Buttons**: Circular, p-3, used for map controls and actions
**Floating Action Button** (Mobile): Fixed bottom-right, rounded-full, shadow-xl

### Real-time Elements

**Live Location Indicator**:
- Pulsing animation on driver marker
- Trail line showing recent movement
- ETA countdown badge

**Status Badges**:
- Pill-shaped (rounded-full)
- Small padding: px-3 py-1
- Status text: text-xs font-medium
- States: Upcoming, In Progress, Completed, Cancelled

**Notification Toasts**:
- Top-right on web, top-center on mobile
- Auto-dismiss after 4-5 seconds
- Icon + message + action button

### Data Displays

**Rating System**:
- Star icons (Heroicons or Font Awesome)
- 5-star scale with half-star precision
- Count in parentheses: (342 reviews)

**Driver Stats Dashboard**:
- Stat cards in grid: 4 columns on desktop
- Large number (text-4xl) + label (text-sm)
- Icon at top of each card

**Trip Timeline**:
- Vertical stepper design
- Nodes for: Pickup → Checkpoints → Drop
- Time estimates between nodes

**Payment Receipt**:
- Table-like structure with dividers
- Line items: Label (left) + Amount (right)
- Total row highlighted with border-top

### Admin Dashboard

**Data Tables**:
- Alternating row backgrounds for readability
- Sortable columns
- Pagination controls at bottom
- Action buttons (approve/reject) in last column
- Filters: Dropdown filters above table

**Charts/Analytics**:
- Use Chart.js or Recharts
- Trip volume over time (line chart)
- Revenue breakdown (donut chart)
- Top routes (bar chart)

---

## Icons

**Library**: Heroicons (via CDN) for consistency
- Navigation: outline variant
- Actions: solid variant
- Status indicators: mini variant
- Sizes: w-5 h-5 (standard), w-6 h-6 (prominent), w-4 h-4 (compact)

---

## Images

**Hero Section** (Marketing Landing):
- Large hero image showing people carpooling/traveling
- Image treatment: Subtle overlay for text readability
- Dimensions: Full viewport width, 70vh height
- CTA buttons with backdrop blur effect (backdrop-blur-sm, bg-white/20)
- Image description: "Group of diverse travelers in a car, smiling, modern vehicle interior visible, bright natural lighting"

**Driver Photos**:
- Circular avatars throughout
- Fallback: Initials on solid background
- Upload interface: Drag-and-drop with preview

**Empty States**:
- Illustration placeholders for:
  - No trips found
  - No bookings yet
  - Verification pending
- Style: Simple line illustrations or icons

**Vehicle Photos** (Driver Profile):
- Rectangular cards, aspect ratio 4:3
- Grid display: 2 columns on mobile, 3 on desktop
- Upload: Max 5 photos per vehicle

---

## Responsive Behavior

**Breakpoints**:
- Mobile: base (default)
- Tablet: md: (768px)
- Desktop: lg: (1024px)
- Wide: xl: (1280px)

**Mobile-First Patterns**:
- Stack all columns on mobile
- Bottom sheets replace modals
- Hamburger menu for navigation
- Floating action buttons for primary actions
- Swipeable trip cards
- Full-screen map on mobile search

**Web Enhancements**:
- Side-by-side layouts (map + results)
- Hover states on cards and buttons
- Expanded navigation menu
- Multi-column grids

---

## Animations

**Minimal & Purposeful**:
- Map marker entrance: Fade + drop (200ms)
- Card hover: Subtle lift with shadow transition (150ms)
- Button press: Scale down slightly (100ms)
- Route drawing: Animated polyline (500ms)
- Page transitions: Fade or slide (200ms)

**No animations on**:
- Data updates
- List rendering
- Form inputs
- Status changes

---

## Accessibility

- Minimum touch target: 44x44px (mobile)
- Focus states: Ring offset pattern
- Labels on all form inputs
- Alt text on all images
- Semantic HTML throughout
- Keyboard navigation support
- Screen reader announcements for real-time updates