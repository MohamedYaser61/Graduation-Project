# Implementation Status — "needs of donor .md"

This document lists features from `needs of donor .md` and whether they exist in the repository.

Legend: Implemented / Partial / Missing

- **Dashboard API — GET /dashboard**: Partial
  - Present: donor dashboard route and aggregation in [src/controllers/donor.controller.js](src/controllers/donor.controller.js)
  - Notes: returns `donationStats`, `pointsSummary`, `badges`, `latestActivity` but may not exactly match requested lightweight payload fields (firstName, bloodType, donationStatus, recentActivity fields).

- **Urgent Requests (separate module)**: Partial
  - Present: routes and handlers in [src/routes/donor.routes.js](src/routes/donor.routes.js) and [src/controllers/donor.controller.js](src/controllers/donor.controller.js)
  - Supports: GET `/urgent-requests`, GET `/urgent-requests/:id`, POST accept (`respondToRequest`), POST decline (`declineUrgentRequest`).
  - Notes: distance and geo calculations for requests/hospitals are not using Mongo 2dsphere; acceptance logic creates Donation records and notifications.

- **Activity System — GET /activity**: Implemented
  - Present: activity routes and services ([src/routes/activity.routes.js](src/routes/activity.routes.js), [src/services/activity.service.js](src/services/activity.service.js)).

- **Scheduling / Appointments**: Partial
  - Present: booking, listing and cancellation in [src/controllers/appointment.controller.js](src/controllers/appointment.controller.js) and [src/services/appointment.service.js](src/services/appointment.service.js).
  - Missing/Partial: no explicit `available-slots` endpoint or per-slot capacity locking; transactional slot locking not implemented.

- **Nearby Hospitals / Find Hospitals**: Partial
  - Present: discovery routes/controller for nearby hospitals in [src/routes/discovery.routes.js](src/routes/discovery.routes.js) and [src/controllers/discovery.controller.js](src/controllers/discovery.controller.js).
  - Notes: Hospitals use `lat`/`long` fields (see [src/models/Hospital.model.js](src/models/Hospital.model.js)) but not GeoJSON `location` + `2dsphere` index recommended in spec.

- **Donation Eligibility Validation**: Partial
  - Present: eligibility logic used by donation flows (`donationService.validateEligibility`), and an endpoint `getDonationEligibility` in [src/controllers/donor.controller.js](src/controllers/donor.controller.js).

- **QR Donation Confirmation (POST /donations/qr/scan)**: Missing
  - No dedicated QR donation scan endpoint found. Current QR usage is for auth/OTP ([src/services/auth.service.js](src/services/auth.service.js)).

- **Rewards & Redeem**: Implemented (mostly)
  - Present: reward routes/controllers/services ([src/routes/reward.routes.js](src/routes/reward.routes.js), [src/controllers/reward.controller.js](src/controllers/reward.controller.js), [src/services/reward.service.js](src/services/reward.service.js)).
  - Redeem endpoint exists: `/rewards/catalog/:rewardId/redeem` and compatibility alias `/rewards/:rewardId/redeem`.

- **Badges System**: Implemented
  - Present: `Badge` model and badge-checking logic in [src/models/Badge.model.js](src/models/Badge.model.js) and [src/services/reward.service.js](src/services/reward.service.js).

- **Donor Profile (GET/PUT)**: Implemented
  - Present: `getProfile` and `updateProfile` in [src/controllers/donor.controller.js](src/controllers/donor.controller.js).

- **Donor Settings (pushNotifications, emergencyAlerts, privacy, language)**: Missing / Partial
  - No dedicated donor settings endpoints discovered. There are hospital settings endpoints (see [src/controllers/hospital.controller.js](src/controllers/hospital.controller.js)).

- **Notifications**: Implemented
  - Present: notification routes and utilities ([src/routes/notification.routes.js](src/routes/notification.routes.js), [src/utils/fcm.js](src/utils/fcm.js), [src/services/notification.service.js](src/services/notification.service.js)).

- **Caching (Redis) for profile/dashboard**: Missing
  - The codebase uses in-memory caching for maintenance middleware but no Redis-based caching was found.

- **Geospatial index (Mongo 2dsphere) for hospitals**: Missing / Partial
  - `Hospital.model` stores `lat`/`long` numerically but does not include a GeoJSON `location` field or a `2dsphere` index.

- **Available Time Slots endpoint**: Missing
  - No `available-slots` or equivalent endpoint found for listing/time-slot capacity per hospital.

- **Appointment details (GET /appointments/{id})**: Partial
  - Appointment listing (`my-appointments`) exists; explicit `get by id` endpoint not found.

---

Summary & Next Steps
- Implement missing endpoints: `POST /donations/qr/scan`, `/appointments/available-slots`, donor settings endpoints.
- Add GeoJSON `location` + `2dsphere` index to `Hospital` model and migrate or map existing lat/long usage where needed.
- Add transactional slot locking or capacity checks in `appointment.service.js` to prevent double-booking.
- Add Redis caching for donor dashboard/profile responses if required for performance.


