# Implementation Plan: Smart Law Enforcement Vehicle Identification System (SLEVIS)

## 1. Goal Description
The Smart Law Enforcement Vehicle Identification System (SLEVIS) is a next-generation command center application designed for traffic monitoring and management. It leverages a futuristic **3D Holographic User Interface** to visualize vehicle data, violation statistics, and public complaints. The system demands high-security authentication with a custom One-Time Password (OTP) flow via SMTP, rigorous role-based access control (RBAC), and a seamless, cinematic user experience.

## 2. User Review Required (Critical Configuration)

> [!IMPORTANT]
> **Supabase Configuration & Secrets**
> To fully enable the backend logic described below, you will need to configure the following in your Supabase project dashboard later:
> 
> **Environment Variables:**
> - `NEXT_PUBLIC_SUPABASE_URL`: Your project URL.
> - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public API key.
> - `SUPABASE_SERVICE_ROLE_KEY`: Secret key for Admin operations (Bypass RLS).
> - `SMTP_HOST`: `smtp.gmail.com`
> - `SMTP_PORT`: `587`
> - `SMTP_USER`: `jayajrushna1622@gmail.com`
> - `SMTP_PASS`: `wlpvsxequycydhvo` (App Password)
>
> **Super Admin Credentials:**
> - Email: `jayakrushna1622@gmail.com`
> - Initial Password: `jk@12345`

## 3. Detailed Architecture & Design

### 3.1. The 3D User Experience (The "Wow" Factor)
The application will not look like a standard website. It will feel like a video game or a sci-fi movie interface.

*   **Technology**: React Three Fiber (R3F) for the 3D scene, `drei` for helpers, and `framer-motion` for HTML UI overlays.
*   **Global Scene**: A dark, cyberpunk/futuristic city or digital grid that rotates slowly.
*   **Navigation as Camera Movement**:
    *   **Landing**: Camera orbits a central "Holographic Globe" or "City Model".
    *   **Login Click**: Camera "flies" (dolly in) through a digital gate into the "Command Console".
    *   **Dashboard**: The view settles on a desk or heads-up display (HUD) where data floats in glass panels.
*   **UI Components**:
    *   **Glassmorphism**: All panels (Login, Stats, Lists) will be semi-transparent blurred glass with glowing neon borders (Cyan/Magenta).
    *   **Holograms**: Vehicle 3D models (low poly) displayed when analyzing data.
    *   **Particles**: Background data streams/matrix rain effects to simulate "processing".

### 3.2. Authentication & Security Logic
This module is the gatekeeper and must be implemented with strict logic.

**State Machine Flow:**
1.  **Initial Screen**: User enters Email.
2.  **Check Phase**: System queries DB/Auth to check if email exists.
    *   *Case A: Email Exists* -> Transition to **Login Mode**.
        *   Show Password Input.
        *   Show "Forgot Password" link.
    *   *Case B: Email Does NOT Exist* -> Transition to **Signup Mode**.
        *   Show "Sign Up" Heading.
        *   Inputs: Username, Password (min 8 chars), Confirm Password.
        *   Action: User clicks "Register".
        *   **OTP Phase**: System generates 6-digit OTP, sends via SMTP (Nodemailer Edge Function) to email.
        *   **Verify Phase**: User enters OTP.
        *   **Success**: Account created in `auth.users` and `public.profiles`.

**Role-Based Access Control (RBAC):**
*   **Super Admin**: (`jayakrushna1622@gmail.com`)
    *   Can access special "Admin Management" 3D Panel.
    *   Can add new Admins by setting their email/password directly.
    *   Visibility: Only Super Admin can see the list of other Admins.
*   **Admin**:
    *   Created by Super Admin.
    *   Can view all Traffic Complaints and reply to them.
    *   Can view global Analytics.
    *   Can manage Users (ban/delete).
*   **User**:
    *   Sign up via OTP flow.
    *   Can Upload Vehicle Images.
    *   Can Submit Complaints.
    *   View personal "Inbox" for Admin replies.

### 3.3. Database Schema (Supabase PostgreSQL)

We will use Supabase's `auth` schema for authentication and `public` schema for application data.

#### `public.profiles`
*   `id` (uuid, PK, references `auth.users.id`): Links to Supabase Auth.
*   `username` (text): Display name.
*   `role` (text): `'super_admin' | 'admin' | 'user'`. Default `'user'`.
*   `created_at` (timestamptz).

#### `public.admin_directory` (Super Admin Only)
*   `id` (uuid, PK).
*   `admin_email` (text): Email of the admin.
*   `added_by` (uuid): References Super Admin's ID.
*   *Note*: This table is strictly protected by RLS so only Super Admin can `SELECT`.

#### `public.vehicles` (Analysis Results)
*   `id` (uuid, PK).
*   `image_url` (text): Path to storage bucket.
*   `uploader_id` (uuid, FK to profiles).
*   `license_plate` (text).
*   `model` (text).
*   `color` (text).
*   `helmet_detected` (boolean).
*   `violation_type` (text): e.g., 'No Helmet', 'Speeding', 'None'.
*   `timestamp` (timestamptz).

#### `public.complaints`
*   `id` (uuid, PK).
*   `user_id` (uuid, FK to profiles).
*   `description` (text).
*   `category` (text): e.g., 'Reckless Driving', 'Signal Jump'.
*   `status` (text): 'Pending', 'Resolved'.
*   `admin_reply` (text).
*   `created_at` (timestamptz).

### 3.4. Module Implementation Strategy

#### Module 1: Vehicle & Plate Detector (Simulated -> Real)
*   **Phase 1 (UI Demo)**: User uploads image -> System waits 2s (simulating processing) -> Returns randomized/mock data (e.g., "Plate: KA-01-AB-1234", "Violation: No Helmet"). This allows demonstrating the *UI* without a heavy Python backend immediately.
*   **Phase 2 (Real)**: Connect to a python backend (Flask/FastAPI) running YOLO/OCR models.

#### Module 2: NLP Complaint Classifier
*   **Frontend**: Text area for user.
*   **Backend**: Supabase Edge Function calls an NLP service (or basic keyword matching for V1) to tag the complaint category automatically.

#### Module 3: Violation Visualization
*   **3D Charts**: Use Three.js primitives to build 3D Bar Charts that rise from the "floor" of the dashboard.
*   **Heatmap**: A holographic map overlay showing "Red Zones" for violations.

## 4. UI Design Master Plan (The "Perfect" Interface)

This section details the specific visual and interactive experience for each screen.

### 4.1. Global Aesthetic
*   **Theme**: "Cyberpunk Command Center". Dark mode only.
*   **Palette**: Deep Void (#020205) background, Neon Cyan (#00F0FF) primary accents, Hot Pink (#FF0099) for alerts/violations.
*   **Typography**: `Orbitron` (Headers) and `Rajdhani` (Data/Body) for a tech-industrial look.
*   **Effects**:
    *   **Scanlines**: Subtle CRT scanline overlay on the entire screen.
    *   **Chromatic Aberration**: Slight RGB shift on edges of glass panels.
    *   **Glassmorphism**: All containers are translucent (backdrop-filter: blur(12px)) with thin, glowing 1px borders.

### 4.2. Landing Page (The "Entry")
*   **Scene**: A rotating, low-poly wireframe Earth or City Block suspended in a digital void. Floating particles orbit it.
*   **UI Overlay**: Minimalist. "SLEVIS" title in glitch-text effect in the center.
*   **Interaction**: A "System Login" button that, when hovered, intensifies the rotation speed of the background object.
*   **Transition**: Clicking Login zooms the camera *into* the city model, dissolving the title and revealing the Auth Modal.

### 4.3. Authentication Experience
*   **Layout**: Not a separate page. A floating glass pane centered on screen.
*   **Step 1: Identity Check**:
    *   Input: "Enter Identification (Email)".
    *   Animation: Typing sounds (subtle tech clicks).
*   **Step 2: Security Verification (OTP/Password)**:
    *   The pane *flips* 3D or slides sideways to reveal the next step.
    *   **OTP Field**: 6 glowing boxes. Auto-focus next box on type.
*   **Success**: The glass pane shatters digitally or fades out, and the camera pans down to the "Dashboard View".

### 4.4. User Dashboard (The "Agent HUD")
*   **Layout**: Heads-Up Display (HUD) style. Content is not in blocks, but "floating" in 3D space.
*   **Top Bar**: Holographic user badge (Avatar + Rank).
*   **Central Workspace**:
    *   **Upload Zone**: A drop zone that looks like a scanning pad. When an image is dropped, a 3D laser scanner effect sweeps across it.
    *   **Result Display**: The vehicle image is projected as a 2D plane in 3D space. Annotated bounding boxes "float" in front of the image.
*   **Sidebar**: Collapsible glass ribbon on the left for "My Complaints" and "History".

### 4.5. Super Admin "God Mode"
*   **Layout**: Wide-angle view of the 3D City.
*   **Live Feed**: Multiple floating video feeds (simulated) curved around the user's view.
*   **Analytics Table**: A 3D topographical map on the "floor". Bars rise up to show violation frequency.
    *   *Interaction*: Hovering over a bar shows a tooltip that looks like a floating label.
*   **Admin Management**: A circular "Council" view where other admins are represented by floating avatars. Clicking one opens their permissions panel.

### 4.6. Complaint Inbox (Admin View)
*   **List View**: Not a traditional table. A stack of "Data Cards".
*   **Interaction**: Clicking a card brings it to the foreground (Z-index transition) and blurs the background.
*   **Reply Action**: The reply box looks like a terminal command line.

## 5. Proposed File Structure
```
/src
  /components
    /canvas        # All 3D R3F components (Scene, Lights, Holograms)
    /dom           # HTML Overlays (Forms, HUDs)
    /layout        # Structure (CanvasLayout, DomLayout)
  /hooks           # useAuth, useStore (Zustand state)
  /lib             # supabaseClient, smtpService (API calls)
  /pages           # Next.js Routes
    index.tsx      # Landing + Auth (3D Scene A)
    dashboard.tsx  # Main App (3D Scene B)
```

## 5. Next Steps
Since you requested to "just create the perfect plan", no code will be written yet.
1.  **Approval**: Confirm this plan covers all specific constraints.
2.  **Supabase Setup**: You (User) will set up the project and provide the keys.
3.  **Development**: We will start with the "3D Foundation" and "Auth Flow" once you are ready.
