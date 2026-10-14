# CampusRide — Smart Campus Transportation System
### Official Project for Sambhram Institute of Technology (Vidyaranyapura, Bengaluru)

CampusRide is a full-stack smart campus ride-sharing web application built for students and faculty of **Sambhram Institute of Technology**. It features peer-to-peer ride matching, women-safety Pink Rides, verifiable college credentials (USN), and an academic suite of 8 algorithms powering proximity matching, routing, telemetry smoothing, and reputation scoring.

---

## 🚀 How to Demonstrate CampusRide in 5 Minutes (Project Review Guide)

Follow this exact step-by-step sequence during your project evaluation:

### Step 1: Boot the Application
Run one command from the project root:
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser (or open on your phone via the Network URL printed in the terminal).

### Step 2: Show the Welcome / Splash Screen (Figma Page 1)
- Point out the **Sambhram Institute of Technology** polo shirts and helmets illustration.
- Click **"Get Started"** to reach the Login Screen.

### Step 3: Demonstrate 1-Click Fast Review Login
- On the Login screen, show the **Figma Page 3** phone number (`+91`) and OTP input boxes (`[ 3 ] [ 0 ] [ 6 ] [ 0 ]`).
- Under **"1-Click Demo Evaluation Logins"**, click **"Meghana (Passenger)"**. You are immediately logged in!

### Step 4: Show the Campus Location Rule & Pink Ride (Figma Page 4 & 5)
- Explain the **Campus Policy**: Either the Pickup or Drop location must be **Sambhram Institute of Technology**.
- Predefined locations: Sambhram Institute of Technology, MS Palya Circle, Lakshmipura Cross, Jalahalli Cross, 8th Mile, BEL Circle.
- Toggle **"PINK RIDE"** (Women-Safety feature): Explain that Pink Ride filters exclusively for verified female riders (Ananya, Sneha).
- Select **Bike** (₹5/km) or **Car** (₹5/km) and click **"Search Rides & Match Captain"**.

### Step 5: Explain the Algorithm Matching Screen (Figma Page 6 & 7)
- Show the **"Pickup: SURVEY 131, Sambhram Institute of Technology"** confirmation card.
- Expand **"Algorithm Insights"** to show:
  - **Algorithm 1 (Haversine Distance)**: Computes accurate geographical distance between GPS coordinates.
  - **Algorithm 2 (K-Nearest Neighbors / KNN)**: Selects the nearest $K=4$ available drivers based on proximity, rating, and ETA.
  - **Algorithm 3 (Greedy Driver Matching)**: Ranks drivers using the scoring formula:
    $$\text{Score} = \left(\frac{1}{\text{Distance} + 0.1}\right) \times 0.50 + \left(\frac{\text{Rating}}{5}\right) \times 0.35 + \left(\frac{1}{\text{ETA} + 1}\right) \times 0.15$$
  - Best match badge awarded to **Ananya** (⭐ 4.9).
- Click **"Book ride"**.

### Step 6: Demonstrate Captain Arriving & SHA-256 PIN (Figma Page 8)
- Screen displays: **"Pickup in 2 mins, Captain on the way"**.
- Point out the **4-digit Ride Start PIN** in individual boxes (`[ 3 ] [ 0 ] [ 6 ] [ 0 ]`).
- Explain that the backend stores a **SHA-256 hash** of this PIN, guaranteeing that the driver cannot start the ride without the student's PIN.
- Click **"Simulate Driver Starts Ride (PIN Verified ✓)"** (or on Device 2, enter the PIN in Driver mode).

### Step 7: Demonstrate Live Tracking & Drop-off (Figma Page 9 & 10)
- Status changes to **"En Route to Drop-off"**, showing **"1.5 km to destination, 5 min remaining"** with vehicle moving on the map.
- Click the red **"SOS"** button to showcase the Campus Emergency Dispatch modal (Campus Security `080-23648444`, Women Helpline `1091`, Police `112`).
- Click **"Simulate Ride Completed"**.
- Celebration confetti fires! Show the **"Ride Completed"** banner.
- Demonstrate **UPI QR Code** payment modal or Cash Paid.
- Select **5 Stars**, enter feedback: *"Very safe and comfortable ride!"*, and click **"Submit Feedback"**.
- Point out that **Algorithm 7 (Bayesian Weighted Average Rating)** updates the driver's reputation score dynamically!

### Step 8: Open the "Algorithms" Showcase Tab
- Click the **"Algorithms"** tab in the bottom navigation.
- Demonstrate each of the 8 algorithms with interactive live execution:
  1. **Haversine**: Great-circle distance calculation
  2. **KNN**: Multi-attribute classification of candidate riders
  3. **Greedy Matching**: Multi-factor candidate score
  4. **Dijkstra**: Shortest path on the Sambhram road network graph
  5. **A\***: Heuristic-optimized pathfinding
  6. **Kalman Filter**: GPS noise and jitter smoothing
  7. **Weighted Average**: Bayesian reputation weighting
  8. **SHA-256**: Cryptographic OTP and token verification
  9. **ACID Transaction Manager**: Simulated atomic payment and rollback

---

## 📱 Two-Device Demonstration (Passenger & Driver Simultaneous Sync)

CampusRide includes **Socket.IO** real-time sync for 2 devices:
1. **Device 1 (Passenger)**: Open [http://localhost:5173](http://localhost:5173) in Chrome. Login as **Passenger** (`passenger@campusride.demo`).
2. **Device 2 (Driver)**: Open [http://localhost:5173](http://localhost:5173) in an Incognito window or phone on the same Wi-Fi. Login as **Bike Driver** (`driver@campusride.demo`) or **Pink Ride Driver** (`ananya@campusride.demo`).
3. On Device 1, book a ride from Sambhram Institute to MS Palya.
4. On Device 2, the **"New Ride Request!"** card immediately alerts the driver!
5. Driver clicks **"Accept Ride"** → Device 1 immediately updates to **"Captain on the way"** and displays the PIN!
6. Driver inputs the passenger's PIN on Device 2 → Ride starts on both screens.
7. Driver clicks **"Complete Ride"** → Passenger screen immediately transitions to **"Ride Completed"** and rating.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 5, Tailwind CSS, React Router v6, Google Maps JS API (Leaflet fallback), Lucide Icons, Canvas Confetti |
| **Backend** | Node.js (v24), Express.js, Socket.IO, JWT, bcryptjs |
| **Database** | MongoDB & Mongoose (with automated High-Reliability MockStore fallback) |
| **Security** | bcrypt password hashing (10 salt rounds), JWT Bearer auth, SHA-256 token verification |
| **Algorithms** | Haversine, KNN, Greedy Matching, Dijkstra, A*, Kalman Filter, Bayesian Weighted Rating, SHA-256, ACID Transaction Manager |

---

## 📁 Project Structure

```text
major_prj/
├── package.json              # Root orchestration (dev, seed, install:all)
├── README.md                 # Complete documentation & 5-minute review guide
├── server/
│   ├── package.json          # Backend dependencies
│   ├── .env                  # Configuration (PORT, MONGO_URI, JWT_SECRET)
│   ├── .env.example          # Sample environment configuration
│   └── src/
│       ├── index.js          # Express app, HTTP server & Socket.IO
│       ├── seed.js           # Database seed script with demo dataset
│       ├── config/
│           └── db.js         # MongoDB connection + fallback handler
│       ├── store/
│           └── mockStore.js  # In-memory high-reliability demo store
│       ├── algorithms/       # The 8 academic algorithms
│           ├── haversine.js
│           ├── knn.js
│           ├── greedyMatching.js
│           ├── dijkstra.js
│           ├── aStar.js
│           ├── kalmanFilter.js
│           ├── weightedAverage.js
│           ├── sha256.js
│           ├── acidTransaction.js
│           └── index.js
│       ├── models/           # Mongoose schemas
│           ├── User.js
│           ├── DriverProfile.js
│           ├── Ride.js
│           └── Feedback.js
│       ├── controllers/
│           ├── authController.js
│           ├── driverController.js
│           ├── rideController.js
│           └── algorithmController.js
│       └── routes/
│           ├── authRoutes.js
│           ├── driverRoutes.js
│           ├── rideRoutes.js
│           └── algorithmRoutes.js
└── client/
    ├── package.json          # Frontend dependencies
    ├── vite.config.js        # Vite + API proxy configuration
    ├── tailwind.config.js    # Tailwind styling with Figma colors
    ├── index.html            # HTML entry point with Leaflet & Inter fonts
    └── src/
        ├── main.jsx          # React DOM root
        ├── App.jsx           # Main router & mobile shell
        ├── index.css         # Custom animations & mobile viewport frame
        ├── services/
        │   ├── api.js        # Axios instance with JWT interceptor
        │   └── socket.js     # Socket.IO client
        ├── context/
        │   ├── AuthContext.jsx # Auth state & 1-click demo logins
        │   └── RideContext.jsx # Ride state, locations, algorithm bindings
        ├── components/
        │   ├── Header.jsx    # Top app bar matching Figma
        │   ├── BottomNav.jsx # Bottom navigation bar
        │   ├── MapView.jsx   # Leaflet interactive map with custom pins
        │   └── SOSModal.jsx  # Campus emergency numbers modal
        └── pages/
            ├── SplashScreen.jsx       # Figma Page 1 (SIT students & helmets)
            ├── LoginScreen.jsx        # Figma Page 3 (Phone + OTP + Demo logins)
            ├── RegisterScreen.jsx     # Registration with USN & gender
            ├── RoleSelectScreen.jsx   # Passenger vs Driver role selector
            ├── RiderRegistration.jsx  # Figma Page 2 (Green document checklist)
            ├── PassengerHome.jsx      # Figma Page 4 & 5 (Bike/Car + Pink Ride)
            ├── RideConfirmation.jsx   # Figma Page 6 & 7 (Fares + Algorithm list)
            ├── RideTracking.jsx       # Figma Page 8 & 9 (Driver arriving + PIN)
            ├── RideCompleted.jsx      # Figma Page 10 (Star rating + Feedback)
            ├── RiderDashboard.jsx     # Driver dashboard & incoming requests
            ├── RideHistory.jsx        # Historical rides with dates & ratings
            ├── AlgorithmShowcase.jsx  # Interactive suite of all 8 algorithms
            └── ProfileScreen.jsx      # Profile details & mode switch
```

---

## 🔑 Demo Credentials

All demo accounts use password: `password123`

| User | Role | Gender | Vehicle | USN | Email |
|---|---|---|---|---|---|
| **Meghana** | Passenger | Female | — | `1ST23CS001` | `passenger@campusride.demo` |
| **Ajay Kumar** | Driver | Male | TVS Jupiter (`KA02AB1234`) | `1ST23CS042` | `driver@campusride.demo` |
| **Ananya** | Pink Ride Driver | Female | Activa 6G (`KA04EN4567`) | `1ST23AI018` | `ananya@campusride.demo` |
| **Sneha** | Pink Ride Driver | Female | Jupiter 125 (`KA04EF9876`) | `1ST23IS033` | `sneha@campusride.demo` |
| **Kiran** | Car Driver | Male | Swift (`KA03XY5678`) | `1ST23EC055` | `kiran@campusride.demo` |

*(Tip: On the login screen, simply tap any of the 4 quick login buttons for instant 1-click access!)*

---

## ⚙️ Installation & Running

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (Optional: The application automatically switches to High-Reliability MockStore mode if MongoDB is not running!)

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Seed the Database
```bash
npm run seed
```

### 3. Start the Application
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`
- API Health Check: `http://localhost:5000/api/health`

---

## 🐳 Run with Docker (Single-Command, No Local Node/Mongo Needed)

The whole app (React SPA + Express API + MongoDB) runs as containers. A single
`app` container serves the built SPA and the API on port `5000`.

### Quick start
```bash
copy .env.docker.example .env      # then edit values if needed (Firebase/Maps keys)
docker compose up --build          # build + start app + mongo
```
Open **[http://localhost:5000](http://localhost:5000)**.

### Common commands
```bash
docker compose up -d               # start in the background
docker compose logs -f app         # tail app logs
docker compose down                # stop and remove containers
docker compose down -v             # stop and also wipe the MongoDB volume
docker compose up --build          # rebuild after code changes
```

### How it works
- `Dockerfile` is a 2-stage build: stage 1 runs `npm ci && npm run build` for
  `client/`; stage 2 installs server deps (`--omit=dev`) and copies the built SPA
  into the runtime image, which Express serves.
- Vite inlines `VITE_*` values at **build time**, so they are passed as build
  args from the project-root `.env` (see `build.args` in `docker-compose.yml`).
  Change a key → rebuild (`docker compose up --build`).
- **MongoDB is optional.** If it is unreachable the server falls back to its
  in-memory store. To run fully stateless, delete the `mongo` service and the
  `MONGO_URI` line from `docker-compose.yml`.
- The image exposes a health check at `/api/health` (`docker compose ps` shows
  `(healthy)`).

> Note: `client/.env` (used by `npm run dev`) and the root `.env` (used by Docker)
> are both git-ignored — never commit them.

---

## 🧮 The 8 Academic Algorithms

### 1. Haversine Distance Formula
- **Formula**:
  $$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)$$
  $$c = 2 \cdot \text{atan2}(\sqrt{a}, \sqrt{1-a}), \quad d = R \cdot c \quad (R = 6371\text{ km})$$
- **Where Used**: Computes great-circle distances between GPS coordinates for rider proximity and fare calculations (Bike: ₹5/km, Car: ₹5/km).

### 2. K-Nearest Neighbors (KNN)
- **Input**: Candidate drivers pool, target distance, minimum rating threshold, $K=3$ or $4$.
- **Suitability Distance Metric**:
  $$\text{Suitability} = 0.6 \cdot |\Delta\text{Distance}| + 0.2 \cdot |\Delta\text{Rating}| + 0.2 \cdot |\Delta\text{ETA}|$$
- **Where Used**: Selects the top $K$ nearest and most suitable available drivers when a ride is requested.

### 3. Greedy Driver Matching
- **Formula**:
  $$\text{Score} = \left(\frac{1}{\text{Distance} + 0.1}\right) \cdot 0.50 + \left(\frac{\text{Rating}}{5}\right) \cdot 0.35 + \left(\frac{1}{\text{ETA} + 1}\right) \cdot 0.15$$
- **Where Used**: Automatically recommends the single best driver from the KNN candidates.

### 4. Dijkstra's Algorithm
- **Where Used**: Finds the guaranteed shortest road route on the campus adjacency network connecting Sambhram Institute of Technology with MS Palya, Lakshmipura Cross, Jalahalli Cross, 8th Mile, BEL Circle, and Nelamangala.

### 5. A* (A-Star) Search Algorithm
- **Formula**: $f(n) = g(n) + h(n)$, where $g(n)$ is actual travel distance from start and $h(n)$ is Euclidean coordinate straight-line distance to destination.
- **Where Used**: Heuristically optimized path calculation.

### 6. 1D Kalman Filter (GPS Smoothing)
- **State Estimation**:
  $$K_k = \frac{P_k^-}{P_k^- + R}, \quad \hat{x}_k = \hat{x}_k^- + K_k(z_k - \hat{x}_k^-), \quad P_k = (1 - K_k)P_k^-$$
- **Where Used**: Eliminates GPS sensor noise and measurement fluctuations before evaluating rider distances.

### 7. Bayesian Weighted Average Rating
- **Formula**:
  $$\text{WR} = \left(\frac{v}{v + m}\right) \cdot R + \left(\frac{m}{v + m}\right) \cdot C$$
  where $v$ is total completed rides, $m=5$ is credibility threshold, $R$ is average rating, and $C=4.5$ is campus benchmark.
- **Where Used**: Dynamically recalculates driver reputation when new passenger ratings are submitted, preventing a single 5-star review from unfairly outranking experienced drivers.

### 8. SHA-256 Cryptographic Hash
- **Where Used**: Secures the 4-digit Ride Start PIN (`generateRidePIN()` / `verifyRidePIN()`) and verifies identity document checksums. Passwords are encrypted with `bcrypt` (10 rounds).

### Simulated ACID Transaction Manager
- **Properties**:
  - **Atomicity**: Atomic ride booking and balance deduction; automatic rollback on any failure.
  - **Consistency**: Invariants enforce valid positive fare and sufficient wallet funds.
  - **Isolation**: Per-transaction execution logs.
  - **Durability**: Persistent commit logging.

---

## 🛡️ Campus Safety Features
- **100% USN College Authentication**: Format validation for `1ST[YY][DEPT][XXX]` (SIT college format).
- **Pink Ride**: Women-only peer rides. Female passengers are matched exclusively with verified female campus riders.
- **Ride Start PIN**: Driver cannot begin the ride without the student's 4-digit PIN.
- **Campus Emergency SOS**: 1-click access to SIT Campus Security, Women Safety Helpline (`1091`), and Emergency (`112`).
- **Vehicle Document Verification**: DL, RC, and Aadhaar mock verification workflow.

---

## 🧪 API Endpoints Reference

### Authentication
- `POST /api/auth/register` — Register student/faculty
- `POST /api/auth/login` — Login user (returns JWT)
- `GET /api/auth/me` — Current user profile
- `POST /api/auth/switch-role` — Switch between passenger and driver mode

### Drivers
- `GET /api/drivers/nearby` — Get nearby drivers using Haversine + KNN + Greedy Matching
- `GET /api/drivers/profile` — Get driver vehicle profile
- `POST /api/drivers/profile` — Register vehicle & documents
- `PATCH /api/drivers/availability` — Toggle Online / Offline

### Rides
- `POST /api/rides` — Book a ride (calculates fare, Dijkstra/A* path, generates PIN)
- `GET /api/rides/:id` — Get ride details
- `PATCH /api/rides/:id/status` — Update status (`DRIVER_ARRIVING`, `RIDE_STARTED` with PIN check, `RIDE_COMPLETED`)
- `POST /api/rides/:id/feedback` — Submit 1-5 star rating & execute Bayesian rating algorithm
- `GET /api/rides/history` — Get user ride history

### Algorithms Evaluation
- `POST /api/algorithms/haversine`
- `POST /api/algorithms/knn`
- `POST /api/algorithms/greedy`
- `POST /api/algorithms/dijkstra`
- `POST /api/algorithms/astar`
- `POST /api/algorithms/kalman`
- `POST /api/algorithms/weighted-average`
- `POST /api/algorithms/sha256`
- `POST /api/algorithms/acid`

---

## 🔧 Troubleshooting

1. **MongoDB is not installed or not running?**
   - No problem! The application automatically detects that MongoDB is offline and runs in **High-Reliability In-Memory MockStore Mode**. The demo will continue to function 100% smoothly without any errors.
2. **Port 5000 or 5173 is in use?**
   - You can edit `.env` in `server/` to change `PORT=5001`. The client proxy will automatically adjust.
3. **Reset demo data:**
   - Run `npm run seed` to reset the database to clean demo state.
